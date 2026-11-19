import { getNextSnapshot, setup } from 'xstate';
import { z } from 'zod';
import type { Chat } from './chat';
import type { Handback, Member, StepRun, Task, TaskStatus } from './db';
import type { Step, Workflow } from './workflow';
import { memberTools } from './crew-tools';
import { changedFiles, snapshot } from './changes';
import { REFUSE } from './questions';

type TaskEvent = { type: 'START' | 'WORK' | 'REVIEW' | 'REWORK' | 'ASK' | 'ANSWERED' | 'DONE' | 'FAIL' | 'STOP' | 'STOPPED' | 'RESUME' | 'REOPEN' };

// Which status a task may move to from which; the engine decides when, this decides whether
export const taskMachine = setup({ types: { events: {} as TaskEvent } }).createMachine({
  id: 'task',
  initial: 'queued',
  states: {
    queued: { on: { START: 'running', STOP: 'stopped' } },
    running: { on: { WORK: 'running', REVIEW: 'reviewing', REWORK: 'fixing', ASK: 'waiting', DONE: 'done', FAIL: 'failed', STOP: 'stopping' } },
    reviewing: { on: { WORK: 'running', REVIEW: 'reviewing', REWORK: 'fixing', ASK: 'waiting', DONE: 'done', FAIL: 'failed', STOP: 'stopping' } },
    fixing: { on: { WORK: 'running', REVIEW: 'reviewing', REWORK: 'fixing', ASK: 'waiting', DONE: 'done', FAIL: 'failed', STOP: 'stopping' } },
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

const HandbackShape = z.object({
  summary: z.string().describe('One Korean sentence: what you did and the outcome'),
  body: z.string().describe('Your full result in Korean: the plan, the review, the test output, or the change made'),
  verdict: z.enum(['pass', 'rework']).optional().describe('Review and test steps only: pass, or rework with points'),
  points: z.array(z.string()).default([]).describe('For rework: each point to fix, with file and line'),
  files: z.array(z.string()).default([]).describe('Project files you changed, relative to the project folder'),
  checks: z.array(z.string()).default([]).describe('Commands you ran, each with its result'),
});
// Claude Code validates --json-schema as draft-7 and refuses the 2020-12 tag zod writes by default
const HANDBACK_SCHEMA = z.toJSONSchema(HandbackShape, { target: 'draft-7', io: 'input' }) as Record<string, unknown>;

// Transient failures of one step are retried this many times; verification sends work back at most this many times
const RETRIES = 3;
// What runStep returns when the model's usage limit stopped it
const LIMIT = 'usage limit';
const FIXES = 3;

function lastDone(runs: StepRun[], id: string) {
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

function sentBack(w: Workflow, runs: StepRun[], id: string, since: number) {
  return runs.some(
    (r) => r.id > since && r.status === 'done' && r.verdict === 'rework' && (w.steps.find((s) => s.id === r.stepId)?.rework ?? r.handback?.target) === id,
  );
}

export class Tasks {
  constructor(public chat: Chat) {}

  start(sessionId: number, kind: string, title: string, request: string, one?: Member): Task {
    const { store } = this.chat;
    // A request given to one member is a one-step task of its own
    const projectId = store.readSession(sessionId).projectId;
    const workflow = one ? solo(this.chat.crew.defOf(one).role, one.key) : this.chat.workflowFor(projectId, kind).rules;
    const task = store.createTask({ sessionId, kind: one ? kind : workflow.kind, title, request, workflow });
    store.writeBaseline(task.id, snapshot(this.projectOf(task).path));
    this.chat.emit('changed', 'tasks');
    void this.drive(task.id);
    return task;
  }

  // Who does a step: the member it was handed to, or the one holding its role
  memberFor(task: Task, step: Step) {
    const { store } = this.chat;
    const id = store.assignee(task.id, step.id);
    return id ? store.readMemberById(id) : store.readMember(this.projectOf(task).id, step.role);
  }

  roleOf(task: Task, step: Step) {
    return this.chat.crew.defOf(this.memberFor(task, step)).role;
  }

  reassign(task: Task, fromRole: string, to: Member) {
    const steps = task.workflow.steps.filter((s) => this.roleOf(task, s) === fromRole);
    for (const s of steps) this.chat.store.assign(task.id, s.id, to.id);
    return steps.map((s) => s.label);
  }

  projectOf(task: Task) {
    const { store } = this.chat;
    return store.readProject(store.readSession(task.sessionId).projectId);
  }

  // The user asks for more on a finished task: same task, earlier report kept, the work goes back to its last making step
  reopen(taskId: number, text: string) {
    const { store } = this.chat;
    const task = store.readTask(taskId);
    const target = [...task.workflow.steps].reverse().find((s) => !s.verdict)!;
    store.appendRequest(taskId, text);
    store.addUserRework(taskId, store.readMember(this.projectOf(task).id, target.role).id, target.id, text);
    if (!this.move(taskId, 'REOPEN', '', `업무 "${task.title}" 다시 진행: ${text}`)) return false;
    void this.drive(taskId, true);
    return true;
  }

  // Stops one task only: its running members are interrupted and its open cards refused; other tasks go on
  stop(taskId: number) {
    const { store } = this.chat;
    const task = store.readTask(taskId);
    if (!this.move(taskId, 'STOP', '', `업무 "${task.title}" 중단 요청`)) return false;
    for (const run of this.chat.working.get(taskId) ?? []) void run.stop();
    for (const id of store.openQuestionIds(taskId)) this.chat.questions.answer(id, REFUSE);
    // A task with nothing running reaches stopped at once; otherwise drive does when its runs end
    if (!this.chat.working.get(taskId)?.size) this.move(taskId, 'STOPPED', '', `업무 "${task.title}" 중단됨`);
    return true;
  }

  // Continues a stopped or failed task from the steps it has not finished
  resume(taskId: number) {
    const task = this.chat.store.readTask(taskId);
    if (!this.move(taskId, 'RESUME', '', `업무 "${task.title}" 재개`)) return false;
    void this.drive(taskId, true);
    return true;
  }

  move(taskId: number, type: TaskEvent['type'], stage: string, log: string) {
    const { store } = this.chat;
    const next = nextStatus(store.readTask(taskId).status, type);
    if (!next) return false;
    store.writeTaskStatus(taskId, next, stage, log);
    this.chat.emit('changed', 'tasks');
    return true;
  }

  async drive(taskId: number, resumed = false) {
    const { store } = this.chat;
    const first = store.readTask(taskId);
    if (!resumed) this.move(taskId, 'START', '', `업무 "${first.title}" 시작`);
    while (true) {
      const task = store.readTask(taskId);
      if (task.status === 'stopping') return this.move(taskId, 'STOPPED', '', `업무 "${task.title}" 중단됨`);
      if (!['running', 'reviewing', 'fixing'].includes(task.status)) return;
      const w = task.workflow;
      const runs = store.listStepRuns(taskId);
      const holds = (id: string) => satisfied(w, runs, id);
      if (w.steps.every((s) => holds(s.id))) return this.finish(task);
      const overworked = w.steps.find((s) => {
        const reruns = runs.filter((r) => r.stepId === s.id && r.status === 'done').length - 1;
        return reruns >= FIXES && sentBack(w, runs, s.id, lastDone(runs, s.id)!.id);
      });
      if (overworked) return this.fail(task, `${overworked.label}을 ${FIXES}번 고쳤지만 검증을 통과하지 못했습니다`);

      const ready = w.steps.filter((s) => !holds(s.id) && s.after.every(holds));
      const latest = (s: Step) => lastDone(runs, s.id);
      const fixing = ready.some((s) => latest(s) && sentBack(w, runs, s.id, latest(s)!.id));
      const stage = ready.map((s) => s.label).join('·');
      this.move(taskId, fixing ? 'REWORK' : ready.every((s) => s.verdict) ? 'REVIEW' : 'WORK', stage, `${stage} 진행`);
      const results = await Promise.all(ready.map((s) => this.runStep(task, s)));
      // A usage limit pauses the task instead of failing it: nothing is wrong with the work, it can resume later
      if (results.includes(LIMIT)) return this.pause(store.readTask(taskId));
      const broken = results.find((r) => r !== 'done');
      if (broken && store.readTask(taskId).status !== 'stopping') return this.fail(store.readTask(taskId), broken);
    }
  }

  async runStep(task: Task, step: Step): Promise<string> {
    const { store, crew } = this.chat;
    const project = store.readProject(store.readSession(task.sessionId).projectId);
    const member = this.memberFor(task, step);
    const role = crew.defOf(member).role;
    // A member let go takes no new step; 비서 hears of it and can hand the step to someone else
    if (member.status !== 'hired' || member.leaving) return `${role}이 고용되어 있지 않아 ${step.label}을 진행할 수 없습니다. 다른 담당자를 붙여야 합니다`;
    let prompt = this.brief(task, step);
    const log = (text: string, detail: unknown = null) =>
      store.addEvent({ sessionId: task.sessionId, taskId: task.id, memberId: member.id, kind: 'step', text, detail: detail ? JSON.stringify(detail) : null });
    // Retries stay out of the log until the last one fails; that one line carries every error
    const errors: string[] = [];
    for (let attempt = 0; attempt <= RETRIES; attempt++) {
      const runId = store.startStepRun(task.id, step.id, member.id, store.latestVersion(task.id)?.id ?? null);
      if (attempt === 0) log(`${role}: ${step.label} 시작`);
      this.chat.emit('changed', 'tasks');
      const out = await this.chat
        .runMember(member, task.sessionId, task.id, prompt, {
          schema: HANDBACK_SCHEMA,
          mcpServers: { crew: memberTools(await this.chat.sdk(), this.chat, task, step, member) },
        })
        // The run has really ended here, so nothing it started can still be writing
        .finally(() => this.chat.locksOf(project).release(task.id));
      const handback = out.status === 'done' ? HandbackShape.safeParse(out.structured) : null;
      // A making step's files are what really changed since the task began, whatever the handback lists
      const snap = !step.verdict && handback?.success ? snapshot(project.path) : null;
      const files = snap ? changedFiles(store.readBaseline(task.id), snap) : [];
      if (handback?.success && files.length) handback.data.files = files;
      const missing = handback?.success ? step.requires.filter((k) => handback.data[k].length === 0) : [];
      if (handback?.success && missing.length) {
        // An incomplete handoff goes back to the same member, in its own session, before anyone takes it
        store.finishStepRun(runId, 'failed', handback.data, `missing ${missing.join(', ')}`);
        log(`${role}: ${step.label} 인계 보완 요청 — ${missing.join(', ')} 없음`);
        prompt = `Your handback is missing ${missing.join(' and ')}, which the next step needs. Answer again with the complete handback.`;
        continue;
      }
      if (handback?.success) {
        const hb: Handback = handback.data;
        // A verdict step that gives no verdict has not judged anything
        if (step.verdict && !hb.verdict) hb.verdict = 'rework';
        store.finishStepRun(runId, 'done', hb);
        // A making step's result is a new change version
        if (snap && files.length) store.addVersion(task.id, files, snap);
        log(`${role}: ${step.label} ${hb.verdict === 'rework' ? '수정 요청' : '완료'} — ${hb.summary}`, hb);
        this.chat.emit('changed', 'tasks');
        return 'done';
      }
      if (out.status === 'limit' || out.status === 'stopped') {
        store.finishStepRun(runId, 'stopped', null, out.error ?? out.status);
        return out.status === 'limit' ? LIMIT : '중단되었습니다';
      }
      const why = out.error ?? 'the result did not match the handback format';
      store.finishStepRun(runId, 'failed', null, why);
      errors.push(why.slice(0, 400));
    }
    log(`${role}: ${step.label} 실패 (${RETRIES}번 다시 시도)`, { errors });
    return `${step.label}이 ${RETRIES}번 다시 시도해도 실패했습니다`;
  }

  // What one member needs to do its step: the request, its step, and every earlier step's handback
  brief(task: Task, step: Step) {
    const { store, crew } = this.chat;
    const w = task.workflow;
    const runs = store.listStepRuns(task.id);
    const project = store.readProject(store.readSession(task.sessionId).projectId);
    const own = lastDone(runs, step.id);
    // A run cut off by a restart may have saved files already; the new run checks them instead of starting over
    const cut = runs.filter((r) => r.stepId === step.id).at(-1)?.error === 'app restarted';
    const saved = cut && !step.verdict ? changedFiles(store.readBaseline(task.id), snapshot(project.path)) : [];
    const earlier = w.steps
      .filter((s) => s.id !== step.id && lastDone(runs, s.id) && (step.after.includes(s.id) || isAncestor(w, s.id, step.id)))
      .map((s) => section(`${s.label} (${this.roleOf(task, s)})`, lastDone(runs, s.id)!.handback!));
    const sentBackBy = runs
      .filter((r) => r.status === 'done' && r.verdict === 'rework' && (!own || r.id > own.id) && (w.steps.find((s) => s.id === r.stepId)?.rework ?? r.handback?.target) === step.id)
      .map((r) => section(`Sent back by ${w.steps.find((s) => s.id === r.stepId)?.label ?? 'the user after the report'}`, r.handback!));
    return [
      `[Task #${task.id}] ${task.title}`,
      `The user's request, through 비서:\n${task.request}`,
      `Your step: ${step.label}. ${step.does}`,
      `Project folder: ${project.path}\nYour output folder for reports: ${this.chat.outputDir(project, `task-${task.id}`)}`,
      ...(earlier.length ? ['# Earlier steps', ...earlier] : []),
      // A step handed over from a member who left continues from what they saved
      ...(own && own.memberId !== this.memberFor(task, step).id ? ['# This step so far, by the member before you', section(step.label, own.handback!)] : []),
      ...(sentBackBy.length ? ['# Fix exactly these points', ...sentBackBy] : []),
      ...(saved.length ? [`# Cut off by a restart\nYour earlier run of this step was cut off after changing: ${saved.join(', ')}. Read them, keep what is right, and finish the step.`] : []),
      step.verdict
        ? 'Judge it and answer with verdict pass, or rework with each point to fix.'
        : 'Do the step, then answer with your handback.',
      'Answer with the structured handback: summary, body, and where they apply verdict, points, files, checks. Write them in Korean.',
    ].join('\n\n');
  }

  finish(task: Task) {
    this.move(task.id, 'DONE', '', `업무 "${task.title}" 완료`);
    this.dismissTemps(task);
    void this.chat.tell(task.sessionId, this.report(task, 'done'));
  }

  pause(task: Task) {
    if (!this.move(task.id, 'STOP', '', `업무 "${task.title}" 사용 한도로 멈춤`)) return;
    this.move(task.id, 'STOPPED', '', `업무 "${task.title}" 중단됨`);
    void this.chat.tell(task.sessionId, this.report(task, LIMIT));
  }

  fail(task: Task, why: string) {
    if (!this.move(task.id, 'FAIL', '', `업무 "${task.title}" 실패: ${why}`)) return;
    void this.chat.tell(task.sessionId, this.report(task, why));
  }

  // A temp's work is the task it came for; once that is done and nothing else needs it, it leaves
  dismissTemps(task: Task) {
    const { store } = this.chat;
    const open = store.listTasks(task.sessionId).filter((t) => t.id !== task.id && !['done', 'failed', 'stopped'].includes(t.status));
    for (const s of task.workflow.steps) {
      const m = this.memberFor(task, s);
      if (m.temp && !open.some((t) => t.workflow.steps.some((x) => this.memberFor(t, x).id === m.id))) this.chat.fire(m.id);
    }
  }

  // 비서 is told what happened and words the report to the user itself
  report(task: Task, outcome: string) {
    const runs = this.chat.store.listStepRuns(task.id);
    const steps = task.workflow.steps
      .filter((s) => lastDone(runs, s.id))
      .map((s) => section(`${s.label} (${this.roleOf(task, s)})`, lastDone(runs, s.id)!.handback!));
    const left = task.workflow.steps.filter((s) => !satisfied(task.workflow, runs, s.id)).map((s) => s.label);
    const head =
      outcome === 'done'
        ? `[Task #${task.id} finished] "${task.title}" passed every check. Report it to the user now: what changed (files), how it was verified, and anything left.`
        : outcome === LIMIT
          ? `[Task #${task.id} paused] "${task.title}" stopped at the model usage limit. Tell the user what is done, what is left, and that they can resume it once the limit resets.`
          : `[Task #${task.id} stopped] "${task.title}" could not finish: ${outcome}. Tell the user what was done, what blocked it, and what they can decide.`;
    return [head, ...steps, ...(outcome !== 'done' && left.length ? [`## Left to do\n${left.map((l) => `- ${l}`).join('\n')}`] : [])].join('\n\n');
  }
}

function solo(role: string, key: string): Workflow {
  return { kind: 'solo', label: role, use: '', steps: [{ id: 'work', role: key, label: `${role} 작업`, does: 'Do the request.', after: [], verdict: false, requires: [] }] };
}

function isAncestor(w: Workflow, maybe: string, of: string): boolean {
  const step = w.steps.find((s) => s.id === of);
  return !!step && step.after.some((a) => a === maybe || isAncestor(w, maybe, a));
}

function section(title: string, hb: Handback) {
  return [
    `## ${title}`,
    hb.summary,
    hb.body,
    hb.verdict ? `Verdict: ${hb.verdict}` : '',
    hb.points.length ? `Points:\n${hb.points.map((p) => `- ${p}`).join('\n')}` : '',
    hb.files.length ? `Files: ${hb.files.join(', ')}` : '',
    hb.checks.length ? `Checks:\n${hb.checks.map((c) => `- ${c}`).join('\n')}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}
