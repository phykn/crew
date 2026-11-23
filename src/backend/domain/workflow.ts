import { z } from 'zod';
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

// A workflow the engine can run to the end: known roles, real references, no cycle (so some step can start), rework only backwards
export function validateWorkflow(w: Workflow, roles: string[]): string[] {
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

// 앞으로: new tasks from now on; 이번 업무에도: also this task's remaining steps; 이번에만: this task only
export type Scope = 'future' | 'current' | 'once';
