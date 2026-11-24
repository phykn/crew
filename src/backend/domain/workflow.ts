import { z } from 'zod';
import type { Say } from '../../shared';

const Step = z.object({
  id: z.string().regex(/^[a-z_]+$/),
  role: z.string(),
  label: z.string().default(''),
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

export const Workflow = z.object({
  kind: z.string(),
  label: z.string().default(''),
  use: z.string(),
  steps: z.array(Step).min(1),
});
export type Workflow = z.infer<typeof Workflow>;
export type Step = z.infer<typeof Step>;

// A workflow the engine can run to the end: known roles, real references, no cycle (so some step can start), rework only backwards
export function validateWorkflow(w: Workflow, roles: string[]): Say[] {
  const ids = w.steps.map((s) => s.id);
  const problems: Say[] = [];
  if (new Set(ids).size !== ids.length) problems.push({ code: 'wf.dupId' });
  for (const s of w.steps) {
    const step = s.label || s.id;
    if (!roles.includes(s.role)) problems.push({ code: 'wf.noRole', step, role: s.role });
    for (const a of s.after) if (!ids.includes(a)) problems.push({ code: 'wf.noAfter', step, after: a });
    if (s.verdict && !s.rework) problems.push({ code: 'wf.noRework', step });
    if (s.rework && !ancestors(w, s.id).includes(s.rework))
      problems.push({ code: 'wf.reworkLate', step, rework: s.rework });
  }
  if (problems.length === 0 && hasCycle(w)) problems.push({ code: 'wf.cycle' });
  return problems;
}

// Why a workflow change was refused, as the interpreter reads it in a tool answer
export function problemText(p: Say): string {
  const a = p as Record<string, unknown>;
  switch (p.code) {
    case 'wf.dupId':
      return 'two steps have the same id';
    case 'wf.noRole':
      return `${a.step}: no hired member is ${a.role}`;
    case 'wf.noAfter':
      return `${a.step}: no step ${a.after} to come after`;
    case 'wf.noRework':
      return `${a.step}: a verdict step needs a step to send work back to`;
    case 'wf.reworkLate':
      return `${a.step}: ${a.rework} is not an earlier step`;
    case 'wf.cycle':
      return 'the steps go round in a cycle';
    case 'wf.schema':
      return String(a.text);
    case 'wf.noTask':
      return 'there is no task to apply it to';
    case 'wf.notHere':
      return `this project has no ${a.kind} task #${a.task}`;
    case 'wf.stale':
      return `another change was saved after version ${a.base}; read the latest rules and edit again`;
    case 'wf.laterRule':
      return 'a rule saved after this document is in force, so it was not put back; change it in the workflow editor';
    default:
      return p.code;
  }
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

// future: new tasks from now on; current: also this task's remaining steps; once: this task only
export type Scope = 'future' | 'current' | 'once';
