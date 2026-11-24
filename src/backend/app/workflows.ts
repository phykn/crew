import type { Chat } from './chat';
import type { Author } from '../domain/wiki';
import { type Scope, validateWorkflow, Workflow } from '../domain/workflow';

// The shipped rules for each task kind, and each project's saved versions of them
export class Workflows {
  shipped: Workflow[];

  constructor(public chat: Chat) {
    this.shipped = chat.crew.workflows;
  }

  // The rules a project runs for a kind: its latest saved version, or the shipped one as version 0
  current(projectId: number, kind: string) {
    const saved = this.chat.store.latestWorkflow(projectId, kind);
    if (saved) return saved;
    const shipped = this.shipped.find((w) => w.kind === kind);
    if (!shipped) throw new Error(`no workflow ${kind}`);
    return { version: 0, rules: shipped, layout: null };
  }

  // One place for the editor's and 통역's changes, so both make the same kind of version
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
    // A rule for one task applies only to a task of this project and kind
    if (o.scope !== 'future' && !this.ownTask(o.projectId, o.kind, o.taskId!))
      return { ok: false as const, problems: [`이 프로젝트에 ${o.kind} 업무 #${o.taskId}이 없습니다`] };
    const stale = store.transact(() => {
      if (o.scope !== 'once') {
        const version = store.addWorkflowVersion(o.projectId, o.kind, o.base, rules, o.layout, o.by.name);
        if (version === null) return true;
        if (o.reason) wiki.write(o.projectId, `워크플로우: ${o.kind}`, o.reason, o.by, { kind: o.kind, version });
      }
      if (o.taskId && o.scope !== 'future') store.writeTaskWorkflow(o.taskId, rules);
      return false;
    });
    if (stale)
      return {
        ok: false as const,
        problems: [`버전 ${o.base} 이후에 다른 변경이 저장되었습니다. 최신 규칙을 다시 읽고 고치세요`],
      };
    if (o.reason && o.scope !== 'once') emit('changed', { topic: 'wiki' });
    emit('changed', { topic: 'workflows' });
    return { ok: true as const, version: this.current(o.projectId, o.kind).version };
  }

  ownTask(projectId: number, kind: string, taskId: number) {
    const { store } = this.chat;
    return store
      .listSessions(projectId)
      .some((s) => store.listTasks(s.id).some((t) => t.id === taskId && t.kind === kind));
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
    emit('changed', { topic: 'wiki' });
    return { ok: true as const };
  }
}
