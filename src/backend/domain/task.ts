import type { Say } from '../../shared';
import { getNextSnapshot, setup } from 'xstate';
import { z } from 'zod';
import type { StepRun, TaskStatus } from './records';
import { ancestors, type Step, Workflow } from './workflow';

// The error left on a step run cut off by an app restart
export const RESTARTED = 'app restarted';
// A task whose drive is stepping through its workflow
export const DRIVEN: readonly TaskStatus[] = ['running', 'reviewing', 'fixing'];
export const HALTED: readonly TaskStatus[] = ['stopping', 'stopped'];
export const ENDED: readonly TaskStatus[] = ['done', 'failed', 'stopped'];

export type TaskEvent = {
  type:
    | 'START'
    | 'WORK'
    | 'REVIEW'
    | 'REWORK'
    | 'ASK'
    | 'ANSWERED'
    | 'DONE'
    | 'FAIL'
    | 'STOP'
    | 'STOPPED'
    | 'RESUME'
    | 'REOPEN';
};

// A task at work moves the same way whether its steps make, review, or fix
const AT_WORK = {
  on: {
    WORK: 'running',
    REVIEW: 'reviewing',
    REWORK: 'fixing',
    ASK: 'waiting',
    DONE: 'done',
    FAIL: 'failed',
    STOP: 'stopping',
  },
} as const;

// Which status a task may move to from which; the engine decides when, this decides whether
const taskMachine = setup({ types: { events: {} as TaskEvent } }).createMachine({
  id: 'task',
  initial: 'queued',
  states: {
    queued: { on: { START: 'running', STOP: 'stopped' } },
    running: AT_WORK,
    reviewing: AT_WORK,
    fixing: AT_WORK,
    waiting: { on: { ANSWERED: 'running', FAIL: 'failed', STOP: 'stopping' } },
    stopping: { on: { STOPPED: 'stopped' } },
    stopped: { on: { RESUME: 'running' } },
    failed: { on: { RESUME: 'running' } },
    done: { on: { REOPEN: 'running' } },
  },
});

export function nextStatus(status: TaskStatus, type: TaskEvent['type']): TaskStatus | null {
  const from = taskMachine.resolveState({ value: status, context: undefined });
  if (!from.can({ type })) return null;
  return getNextSnapshot(taskMachine, from, { type }).value as TaskStatus;
}

export const HandbackShape = z.object({
  summary: z.string().describe('One Korean sentence: what you did and the outcome'),
  body: z.string().describe('Your full result in Korean: the plan, the review, the test output, or the change made'),
  verdict: z.enum(['pass', 'rework']).optional().describe('Review and test steps only: pass, or rework with points'),
  points: z.array(z.string()).default([]).describe('For rework: each point to fix, with file and line'),
  files: z.array(z.string()).default([]).describe('Project files you changed, relative to the project folder'),
  checks: z.array(z.string()).default([]).describe('Commands you ran, each with its result'),
});
// Claude Code validates --json-schema as draft-7 and refuses the 2020-12 tag zod writes by default
export const HANDBACK_SCHEMA = z.toJSONSchema(HandbackShape, { target: 'draft-7', io: 'input' }) as Record<
  string,
  unknown
>;

// Transient failures of one step are retried this many times

// Set by the app rather than left to the brief's wording, so every step of a code task reads the same scope
export const CODE_SCOPE =
  'Always in scope (set by the app): a test for each new behavior or fixed bug, and the README or documents that describe what changed. This overrides any line above that leaves them out.';

export function lastDone(runs: StepRun[], id: string) {
  return runs.filter((r) => r.stepId === id && r.status === 'done').at(-1);
}

// A step holds when its latest run passed after every step it depends on last ran, and nothing sent it back since
export function satisfied(w: Workflow, runs: StepRun[], id: string): boolean {
  const step = w.steps.find((s) => s.id === id)!;
  const latest = lastDone(runs, id);
  if (!latest) return false;
  if (step.verdict && latest.verdict !== 'pass') return false;
  // Run ids follow start order, so a verdict begun on an older change version never counts for a newer one
  for (const a of step.after) {
    const before = lastDone(runs, a);
    if (!before || before.id > latest.id) return false;
  }
  return !sentBack(w, runs, id, latest.id);
}

// The reworks that send a step back after the run since: a check's, or the user's after the report
export function sendsBack(w: Workflow, runs: StepRun[], id: string, since = 0) {
  return runs.filter(
    (r) =>
      r.id > since &&
      r.status === 'done' &&
      r.verdict === 'rework' &&
      (w.steps.find((s) => s.id === r.stepId)?.rework ?? r.handback?.target) === id,
  );
}

export function sentBack(w: Workflow, runs: StepRun[], id: string, since: number) {
  return sendsBack(w, runs, id, since).length > 0;
}

// Why going on would only repeat itself, or null: a step sent back past its loop limit, or a redo that changed nothing
export function stuck(w: Workflow, runs: StepRun[], version: number | null): Say | null {
  const back = w.steps
    .map((s) => ({ s, done: runs.filter((r) => r.stepId === s.id && r.status === 'done') }))
    .filter(({ s, done }) => done.length > 0 && sentBack(w, runs, s.id, done.at(-1)!.id));
  // A step sent back to stops at the smallest loop count among the checks that send work to it
  const limit = (s: Step) => Math.min(...w.steps.filter((v) => v.rework === s.id).map((v) => v.loops));
  const over = back.find(({ s, done }) => done.length - 1 >= limit(s));
  if (over) return { code: 'overLimit', step: over.s.label, loops: limit(over.s) };
  // A redo that left the files as they were and is sent back again would only repeat itself: the user decides
  const idle = back.find(
    ({ s, done }) => version !== null && !s.verdict && done.length > 1 && done.at(-1)!.versionId === version,
  );
  return idle ? { code: 'noChange', step: idle.s.label } : null;
}

// Why a task stopped, as the interpreter reads it in the report
export function whyText(why: Say) {
  if (why.code === 'overLimit') return `${why.step} was fixed ${why.loops} times and still did not pass the checks`;
  if (why.code === 'noChange')
    return `${why.step} was redone without changing anything and sent back again; the points and the instructions disagree, so the user must decide`;
  if (why.code === 'retries') return `${why.step} failed after ${why.n} retries`;
  if (why.code === 'absent')
    return `${why.role} is not hired, so ${why.step} cannot go on; another member must take it`;
  return 'it was stopped';
}

export function solo(role: string, key: string, label: string): Workflow {
  const work = { id: 'work', role: key, label, does: 'Do the request.' };
  return Workflow.parse({ kind: 'solo', label: role, use: '', steps: [work] });
}

// The steps that make a task's result: not verdicts, and followed by no other making step
export function makers(w: Workflow) {
  const making = w.steps.filter((s) => !s.verdict);
  return making.filter((s) => !making.some((o) => ancestors(w, o.id).includes(s.id)));
}

// The conductor's plan step, which a failure or a changed request goes back to
export function planStep(w: Workflow) {
  return w.steps.find((s) => !s.verdict && s.role === 'conductor');
}

// A small change skips what comes before its making steps, such as the plan and its review
export function withoutPlan(w: Workflow): Workflow {
  const dropped = new Set(makers(w).flatMap((s) => ancestors(w, s.id)));
  return {
    ...w,
    steps: w.steps
      .filter((s) => !dropped.has(s.id))
      .map((s) => ({ ...s, after: s.after.filter((a) => !dropped.has(a)) })),
  };
}
