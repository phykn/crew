import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import type { Chat } from '../chat';
import type { Author } from '../wiki';
import { josa } from '../../korean';

const Step = z.object({
  id: z.string().regex(/^[a-z_]+$/),
  role: z.string(),
  label: z.string(),
  does: z.string(),
  after: z.array(z.string()).default([]),
  // A verdict step returns pass or rework; rework sends the work back to the named earlier step
  verdict: z.boolean().default(false),
  rework: z.string().optional(),
  // How many times this check may send the work back before the task stops
  loops: z.number().int().min(1).max(9).default(3),
  // What the handback must carry before the next step may take it, such as files for a code change
  requires: z.array(z.enum(['files', 'checks'])).default([]),
});

export const Workflow = z.object({ kind: z.string(), label: z.string(), use: z.string(), steps: z.array(Step).min(1) });
export type Workflow = z.infer<typeof Workflow>;
export type Step = z.infer<typeof Step>;

// A workflow the engine can run to the end: known roles, real references, no cycle, rework only backwards
function validateWorkflow(w: Workflow, roles: string[]): string[] {
  const ids = w.steps.map((s) => s.id);
  const problems: string[] = [];
  if (new Set(ids).size !== ids.length) problems.push('단계 ID가 겹칩니다');
  for (const s of w.steps) {
    if (!roles.includes(s.role)) problems.push(`${s.label}: 없는 역할 ${s.role}`);
    for (const a of s.after) if (!ids.includes(a)) problems.push(`${s.label}: 없는 선행 단계 ${a}`);
    if (s.verdict && !s.rework) problems.push(`${s.label}: 판정 단계에 되돌릴 단계가 없습니다`);
    if (s.rework && !ancestors(w, s.id).includes(s.rework))
      problems.push(`${s.label}: ${josa(s.rework, '은')} 앞선 단계가 아닙니다`);
  }
  if (problems.length === 0 && hasCycle(w)) problems.push('단계가 순환합니다');
  if (problems.length === 0 && !w.steps.some((s) => s.after.length === 0))
    problems.push('시작할 수 있는 단계가 없어 완료에 닿지 못합니다');
  return problems;
}

export function ancestors(w: Workflow, id: string, seen = new Set<string>()): string[] {
  for (const a of w.steps.find((s) => s.id === id)?.after ?? []) {
    if (!seen.has(a)) {
      seen.add(a);
      ancestors(w, a, seen);
    }
  }
  return [...seen];
}

function hasCycle(w: Workflow) {
  return w.steps.some((s) => ancestors(w, s.id).includes(s.id));
}

export function readWorkflows(crewDir: string): Workflow[] {
  const dir = path.join(crewDir, 'workflows');
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => Workflow.parse(JSON.parse(fs.readFileSync(path.join(dir, f), 'utf-8'))));
}

// 앞으로: new tasks from now on; 이번 업무에도: also this task's remaining steps; 이번에만: this task only
type Scope = 'future' | 'current' | 'once';

// The shipped rules for each task kind, and each project's saved versions of them
export class Workflows {
  shipped: Workflow[];

  constructor(public chat: Chat) {
    this.shipped = readWorkflows(chat.crew.dir);
  }

  // The rules a project runs for a kind: its latest saved version, or the shipped one as version 0
  current(projectId: number, kind: string) {
    const saved = this.chat.store.latestWorkflow(projectId, kind);
    if (saved) return saved;
    const shipped = this.shipped.find((w) => w.kind === kind);
    if (!shipped) throw new Error(`no workflow ${kind}`);
    return { version: 0, rules: shipped, layout: null };
  }

  // One place for the editor's and 비서's changes, so both make the same kind of version
  save(o: {
    projectId: number;
    kind: string;
    base: number;
    rules: unknown;
    layout?: unknown;
    by: Author;
    scope: Scope;
    taskId?: number;
    // Why, kept in the wiki as the rule's decision document
    reason?: string;
  }) {
    const { store, emit, wiki } = this.chat;
    const parsed = Workflow.safeParse(o.rules);
    if (!parsed.success)
      return { ok: false as const, problems: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`) };
    const rules = { ...parsed.data, kind: o.kind };
    const keys = store
      .listMembers(o.projectId)
      .filter((m) => m.status === 'hired')
      .map((m) => m.key);
    const problems = validateWorkflow(rules, keys);
    // A broken edit is refused whole, so the last valid version stays in force
    if (problems.length) return { ok: false as const, problems };
    if (o.scope !== 'future' && !o.taskId) return { ok: false as const, problems: ['적용할 업무가 없습니다'] };
    if (o.scope !== 'once') {
      const version = store.addWorkflowVersion(o.projectId, o.kind, o.base, rules, o.layout, o.by.name);
      if (version === null)
        return {
          ok: false as const,
          problems: [`버전 ${o.base} 이후에 다른 변경이 저장되었습니다. 최신 규칙을 다시 읽고 고치세요`],
        };
      if (o.reason) {
        wiki.write(o.projectId, `워크플로우: ${o.kind}`, o.reason, o.by, { kind: o.kind, version });
        emit('changed', 'wiki');
      }
    }
    if (o.taskId && o.scope !== 'future') store.writeTaskWorkflow(o.taskId, rules);
    emit('changed', 'workflows');
    return { ok: true as const, version: this.current(o.projectId, o.kind).version };
  }

  // Deleting a document tied to a rule either leaves the rule in force or puts back the rule from before it
  removeDoc(docId: number, releaseRule: boolean, by: Author) {
    const { store, wiki, emit } = this.chat;
    const doc = wiki.read(docId);
    if (releaseRule && doc.workflowKind && doc.workflowVersion) {
      const now = this.current(doc.projectId, doc.workflowKind).version;
      if (now !== doc.workflowVersion) {
        return {
          ok: false as const,
          problems: ['이 문서 뒤에 저장된 규칙이 있어 되돌리지 않았습니다. 워크플로우 탭에서 직접 고치세요'],
        };
      }
      const prev =
        store.readWorkflowVersion(doc.projectId, doc.workflowKind, doc.workflowVersion - 1) ??
        this.shipped.find((w) => w.kind === doc.workflowKind)!;
      const r = this.save({
        projectId: doc.projectId,
        kind: doc.workflowKind,
        base: now,
        rules: prev,
        by,
        scope: 'future',
      });
      if (!r.ok) return r;
    }
    wiki.remove(docId, by);
    emit('changed', 'wiki');
    return { ok: true as const };
  }
}
