import type { Chat } from './chat';
import {
  changedFiles,
  type Handback,
  type Member,
  NOT_HIRED,
  skipped,
  type Snapshot,
  type StepRun,
  type Task,
} from '../domain/records';
import { ancestors, type Step, type Workflow } from '../domain/workflow';
import {
  ASSIGN,
  ASSIGN_SCHEMA,
  type Assignment,
  AssignShape,
  assignFlow,
  CODE_SCOPE,
  JUDGE,
  JUDGE_LOOPS,
  JUDGE_SCHEMA,
  type Judgment,
  JudgeShape,
  judgeStep,
  DRIVEN,
  ENDED,
  HALTED,
  HANDBACK_SCHEMA,
  lastDone,
  makers,
  planStep,
  nextStatus,
  HandbackShape,
  RESTARTED,
  satisfied,
  sendsBack,
  sentBack,
  solo,
  stuck,
  type TaskEvent,
  withoutPlan,
  whyText,
} from '../domain/task';
import { REFUSE } from '../domain/answers';
import { ACTIVE, type Say, baseKey } from '../../shared';

// Transient failures of one step are retried this many times
const RETRIES = 3;
// What runStep returns when the model's usage limit stopped it
const LIMIT: Say = { code: 'limit' };
const STOPPED: Say = { code: 'stopped' };
const DONE: Say = { code: 'done' };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export class Tasks {
  // Each task's current drive; a loop or a queued step from an earlier drive sees it is no longer current and ends
  driving = new Map<number, number>();
  drives = 0;
  // Each new task's starting commit, which its first step waits for so nothing is written before it is taken
  starting = new Map<number, Promise<boolean>>();
  // How long to wait before each retry of a failed run, so an overloaded server has time to recover
  retryWaits = [2_000, 10_000, 30_000];

  constructor(public chat: Chat) {}

  // What the interpreter opens: the conductor's assign step decides the rest
  open(sessionId: number, title: string, request: string): Task {
    const label = this.chat.crew.names.workflows[ASSIGN]?.steps[ASSIGN] ?? ASSIGN;
    return this.create(sessionId, ASSIGN, title, request, assignFlow(label));
  }

  // A task whose kind is already decided, as the conductor's assignment or a test gives it
  start(sessionId: number, kind: string, title: string, request: string, one?: Member, small = false): Task {
    const shaped = this.shape(this.chat.store.projectOf(sessionId).id, kind, one, small);
    const task = this.create(sessionId, shaped.kind, title, scoped(shaped.workflow, request), shaped.workflow);
    if (shaped.writer) for (const s of makers(shaped.workflow)) this.chat.store.assign(task.id, s.id, shaped.writer.id);
    return task;
  }

  // The steps a kind, size, and lone member make
  shape(projectId: number, kind: string, one?: Member, small = false) {
    // A member who writes the project makes a small code change, so its change gets every check; anyone else works alone
    const writer = one && this.chat.members.settings(one).write === 'project' ? one : undefined;
    const rules =
      one && !writer
        ? solo(this.chat.crew.defOf(one).role, one.key, this.chat.crew.soloStep(one))
        : this.chat.workflows.current(projectId, writer ? 'code' : kind).rules;
    const workflow = small || writer ? withoutPlan(rules) : rules;
    return { kind: one && !writer ? kind : workflow.kind, workflow, writer };
  }

  create(sessionId: number, kind: string, title: string, request: string, workflow: Workflow): Task {
    const { store } = this.chat;
    const task = store.createTask({ sessionId, kind, title, request, workflow });
    const folder = this.projectOf(task).path;
    store.writeBaseline(task.id, this.chat.files.snapshot(folder));
    // In a git repository the starting point is also kept as a commit, so each version's diff can be shown
    const base = this.chat.versions.mark(folder, task.id, 'base').finally(() => this.starting.delete(task.id));
    this.starting.set(task.id, base);
    this.chat.emit('changed', { topic: 'tasks', sessionId: task.sessionId });
    void this.drive(task.id);
    return task;
  }

  // The conductor's answer, checked against the kinds and members there are; a problem goes back to it
  settle(task: Task, a: Assignment): string | null {
    const projectId = this.projectOf(task).id;
    const kinds = this.chat.workflows.shipped.map((w) => w.kind);
    if (!kinds.includes(a.kind)) return `kind ${a.kind} is not one of ${kinds.join(', ')}`;
    // The conductor may name the member by key or by role, as members.find reads either
    const named = a.member ? this.chat.members.find(projectId, a.member) : null;
    const one = named ? this.alone(projectId).find((m) => m.id === named.id) : undefined;
    if (a.member && !one) return `${a.member} is not one of the members listed`;
    const shaped = this.shape(projectId, a.kind, one, a.size === 'small');
    const { store } = this.chat;
    // The request read now, so words the user added while the conductor decided are kept
    store.settleTask(task.id, shaped.kind, scoped(shaped.workflow, store.readTask(task.id).request), shaped.workflow);
    if (shaped.writer) for (const s of makers(shaped.workflow)) store.assign(task.id, s.id, shaped.writer.id);
    return null;
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
    return this.chat.store.projectOf(task.sessionId);
  }

  // A stopped task takes no new run, even one already waiting in a lane
  halted(taskId: number) {
    return HALTED.includes(this.chat.store.readTask(taskId).status);
  }

  // More from the user goes to the conductor's plan, or without one to every step that made the task: a finished task opens again, one at work redoes once its turn ends
  reopen(taskId: number, text: string) {
    const { store } = this.chat;
    const task = store.readTask(taskId);
    const working = ACTIVE.includes(task.status);
    if (working) store.writeTaskStatus(taskId, task.status, task.stage, { code: 'task.more', title: task.title, text });
    else if (!this.move(taskId, 'REOPEN', '', { code: 'task.reopen', title: task.title, text })) return false;
    store.appendRequest(taskId, text);
    // While the conductor assigns, the words join the request it settles on; after, its plan or its judgment takes them
    if (task.kind !== ASSIGN) {
      const target = planStep(task.workflow) ?? this.judgeStep();
      store.addUserRework(taskId, this.memberFor(task, target).id, target.id, text);
    }
    if (!working) {
      this.rehire(task);
      void this.drive(taskId, true);
    }
    return true;
  }

  // Stops one task only: its running members are interrupted and its open cards refused; other tasks go on
  stop(taskId: number) {
    const { store } = this.chat;
    const task = store.readTask(taskId);
    if (!this.move(taskId, 'STOP', '', { code: 'task.stopRequest', title: task.title })) return false;
    for (const run of this.chat.runs.ofTask(taskId)) void run.stop();
    // A write waiting its turn is answered now, so the stopped run can end
    this.chat.runs.locksOf(this.projectOf(task)).cancel(taskId);
    // An approval is refused; the conductor's own question, which has no refuse, is closed
    for (const id of store.openQuestionIds(task.sessionId, taskId))
      if (store.readQuestion(id).kind === 'approval') this.chat.questions.answer(id, REFUSE);
      else this.chat.questions.cancel(id);
    // A task with nothing running reaches stopped at once; otherwise drive does when its runs end
    if (!this.chat.runs.ofTask(taskId).length)
      this.move(taskId, 'STOPPED', '', { code: 'task.stopped', title: task.title });
    return true;
  }

  // A deleted session's task: stopped, and its drive ends without touching the record that is gone
  drop(taskId: number) {
    this.stop(taskId);
    this.driving.delete(taskId);
    this.chat.runs.locksOf(this.projectOf(this.chat.store.readTask(taskId))).forget(taskId);
  }

  // Continues a stopped or failed task from the steps it has not finished
  resume(taskId: number) {
    const task = this.chat.store.readTask(taskId);
    if (!this.move(taskId, 'RESUME', '', { code: 'task.resume', title: task.title })) return false;
    this.rehire(task);
    void this.drive(taskId, true);
    return true;
  }

  move(taskId: number, type: TaskEvent['type'], stage: string, say: Say) {
    const { store } = this.chat;
    const task = store.readTask(taskId);
    const next = nextStatus(task.status, type);
    if (!next) return false;
    store.writeTaskStatus(taskId, next, stage, say);
    this.chat.emit('changed', { topic: 'tasks', sessionId: task.sessionId });
    return true;
  }

  async drive(taskId: number, resumed = false) {
    const { store } = this.chat;
    const first = store.readTask(taskId);
    const drive = ++this.drives;
    this.driving.set(taskId, drive);
    const current = () => this.driving.get(taskId) === drive;
    if (!resumed) this.move(taskId, 'START', '', { code: 'task.start', title: first.title });
    try {
      await this.steps(taskId, current);
    } finally {
      if (current()) this.driving.delete(taskId);
    }
  }

  async steps(taskId: number, current: () => boolean) {
    const { store } = this.chat;
    while (current()) {
      const task = store.readTask(taskId);
      if (task.status === 'stopping')
        return this.move(taskId, 'STOPPED', '', { code: 'task.stopped', title: task.title });
      if (!DRIVEN.includes(task.status)) return;
      const w = task.workflow;
      const runs = store.listStepRuns(taskId);
      const holds = (id: string) => satisfied(w, runs, id);
      const word = pendingJudge(runs);
      if (word || w.steps.every((s) => holds(s.id))) {
        // The conductor's pass on everything since is what ends a task
        const last = runs.at(-1);
        if (!word && last?.stepId === JUDGE && last.status === 'done' && last.verdict === 'pass')
          return this.finish(task);
        const judge = this.judgeStep();
        const m = this.memberFor(task, judge);
        if (this.chat.runs.busy(m.id, task.sessionId)) this.copy(task, judge, m);
        this.move(taskId, 'REVIEW', judge.label, { code: 'task.stage', stage: judge.label });
        const r = await this.runStep(task, judge, current);
        if (!current()) return;
        if (r === LIMIT) return this.pause(store.readTask(taskId));
        if (r !== DONE && store.readTask(taskId).status !== 'stopping') return this.fail(store.readTask(taskId), r);
        continue;
      }
      // What went before a re-plan or the user's new words counts no more, so the loop counts start over
      const since = runs.findLast((r) => r.stepId === USER)?.id ?? 0;
      const stuckWhy = stuck(
        w,
        runs.filter((r) => r.id > since),
        store.latestVersion(taskId)?.id ?? null,
      );
      if (stuckWhy) {
        if (!this.replan(task, runs, stuckWhy)) return this.fail(task, stuckWhy);
        continue;
      }
      const ready = w.steps.filter((s) => !holds(s.id) && s.after.every(holds));
      const fixing = ready.some((s) => lastDone(runs, s.id) && sentBack(w, runs, s.id, lastDone(runs, s.id)!.id));
      const stage = ready.map((s) => s.label).join(', ');
      this.move(taskId, fixing ? 'REWORK' : ready.every((s) => s.verdict) ? 'REVIEW' : 'WORK', stage, {
        code: 'task.stage',
        stage,
      });
      // A member already at work in this session, or given another step of this round, works through a copy
      const taken = new Set<number>();
      for (const s of ready) {
        const m = this.memberFor(task, s);
        taken.add(taken.has(m.id) || this.chat.runs.busy(m.id, task.sessionId) ? this.copy(task, s, m).id : m.id);
      }
      const results = await Promise.all(ready.map((s) => this.runStep(task, s, current)));
      if (!current()) return;
      // A usage limit pauses the task instead of failing it: nothing is wrong with the work, it can resume later
      if (results.includes(LIMIT)) return this.pause(store.readTask(taskId));
      const broken = results.find((r) => r !== DONE);
      if (broken && store.readTask(taskId).status !== 'stopping') return this.fail(store.readTask(taskId), broken);
    }
  }

  async runStep(task: Task, step: Step, current: () => boolean): Promise<Say> {
    const { store } = this.chat;
    const project = this.projectOf(task);
    const member = this.memberFor(task, step);
    const role = baseKey(member.key);
    // A member let go takes no new step; the interpreter hears of it and can hand the step to someone else
    const absent: Say = { code: 'absent', role, step: step.label };
    if (member.status !== 'hired' || member.leaving) return absent;
    const assigning = task.kind === ASSIGN && step.id === ASSIGN;
    const judging = step.id === JUDGE;
    // Built when the run leaves the member's lane, so it reads the request and the session as they are then
    let retry: string | null = null;
    const prompt = (resumes: boolean) => {
      if (resumes && retry) return retry;
      const now = store.readTask(task.id);
      return assigning ? this.assignBrief(now) : judging ? this.judgeBrief(now) : this.brief(now, step);
    };
    const log = (say: Say, detail: unknown = null) =>
      store.addEvent({
        sessionId: task.sessionId,
        taskId: task.id,
        memberId: member.id,
        kind: 'step',
        say,
        detail: detail ? JSON.stringify(detail) : null,
      });
    // Retries stay out of the log until the last one fails; that one line carries every error
    const errors: string[] = [];
    for (let attempt = 0; attempt <= RETRIES; attempt++) {
      // A task stopped or resumed while this one waited to retry is no longer this loop's
      if (!current() || this.halted(task.id)) return STOPPED;
      const runId = store.startStepRun(task.id, step.id, member.id, store.latestVersion(task.id)?.id ?? null);
      this.chat.emit('changed', { topic: 'tasks', sessionId: task.sessionId });
      await this.starting.get(task.id);
      const out = await this.chat.tools
        .member(task, step, member)
        .then((crew) =>
          this.chat.runs.run(member, task.sessionId, task.id, prompt, {
            schema: assigning ? ASSIGN_SCHEMA : judging ? JUDGE_SCHEMA : HANDBACK_SCHEMA,
            mcpServers: { crew },
            alive: () => current() && !this.halted(task.id),
          }),
        )
        .catch((err: unknown) => skipped('failed', err instanceof Error ? err.message : String(err)))
        // Once the task's last run has really ended, nothing it started can still be writing; a step beside it may still be
        .finally(() => {
          if (!this.chat.runs.ofTask(task.id).length) this.chat.runs.locksOf(project).release(task.id);
        });
      if (!current()) {
        store.finishStepRun(runId, 'stopped', null, 'stopped');
        return STOPPED;
      }
      if (out.error === NOT_HIRED) {
        store.finishStepRun(runId, 'stopped', null, out.error);
        return absent;
      }
      if (out.status === 'limit' || out.status === 'stopped') {
        store.finishStepRun(runId, 'stopped', null, out.error ?? out.status);
        return out.status === 'limit' ? LIMIT : STOPPED;
      }
      if (assigning && out.status === 'done') {
        const a = AssignShape.safeParse(out.structured);
        const problem = a.success ? this.settle(task, a.data) : 'the result did not match the assignment format';
        if (problem || !a.success) {
          store.finishStepRun(runId, 'failed', null, problem);
          errors.push(problem!);
          retry = `Your assignment could not be used: ${problem}. Answer again with a valid assignment.`;
          continue;
        }
        // The log line carries a handback like every step's, so the window reads and marks it the same way
        const done = HandbackShape.parse({ summary: a.data.summary, body: a.data.body });
        store.finishStepRun(runId, 'done', done);
        log({ code: 'step.done', role, step: step.label, verdict: null, summary: a.data.summary }, done);
        this.chat.emit('changed', { topic: 'tasks', sessionId: task.sessionId });
        return DONE;
      }
      if (judging && out.status === 'done') {
        const j = JudgeShape.safeParse(out.structured);
        const problem = j.success ? this.judgeProblem(task, j.data) : 'the result did not match the judgment format';
        if (problem || !j.success) {
          store.finishStepRun(runId, 'failed', null, problem);
          errors.push(problem!);
          retry = `Your step: judge. Your judgment could not be used: ${problem}. Answer again with a valid judgment.`;
          continue;
        }
        const verdict = j.data.decision === 'rework' ? 'rework' : j.data.decision === 'done' ? 'pass' : undefined;
        const judged: Handback = {
          ...HandbackShape.parse({ summary: j.data.summary, body: j.data.body, points: j.data.points }),
          verdict,
          // A rework names the step it sends back to, as the user's does
          ...(j.data.decision === 'rework' ? { target: j.data.target } : {}),
        };
        store.finishStepRun(runId, 'done', judged);
        log({ code: 'step.done', role, step: step.label, verdict: verdict ?? null, summary: j.data.summary }, judged);
        this.chat.emit('changed', { topic: 'tasks', sessionId: task.sessionId });
        return this.judged(task, j.data);
      }
      const parsed = out.status === 'done' ? HandbackShape.safeParse(out.structured) : null;
      if (!parsed?.success) {
        const why = out.error ?? 'the result did not match the handback format';
        store.finishStepRun(runId, 'failed', null, why);
        errors.push(why.slice(0, 400));
        // A run that failed, rather than one that answered in the wrong shape, may have met a passing fault
        if (out.status === 'failed' && attempt < RETRIES) await sleep(this.retryWaits[attempt]);
        // An answer in the wrong shape means the session holds the brief, so the retry says only what went wrong
        if (out.status === 'done')
          retry = `Your answer could not be used: ${why.slice(0, 400)}. Answer again with the complete structured handback.`;
        continue;
      }
      const hb: Handback = parsed.data;
      // A making step's files are what really changed since the task began, whatever the handback lists
      const snap = step.verdict ? null : this.chat.files.snapshot(project.path);
      const files = snap ? this.ownChanges(task, step, snap) : [];
      if (files.length) hb.files = files;
      const missing = step.requires.filter((k) => hb[k].length === 0);
      if (missing.length) {
        // An incomplete handoff goes back to the same member, in its own session, before anyone takes it
        store.finishStepRun(runId, 'failed', hb, `missing ${missing.join(', ')}`);
        log({ code: 'step.incomplete', role, step: step.label, missing }, { missing });
        retry = `Your handback is missing ${missing.join(' and ')}, which the next step needs. Answer again with the complete handback.`;
        continue;
      }
      // A verdict step that gives no verdict has not judged anything
      if (step.verdict && !hb.verdict) hb.verdict = 'rework';
      store.finishStepRun(runId, 'done', hb);
      // A making step's result is a new change version, unless it left the files as the last one did
      const last = store.latestVersion(task.id);
      const same = last && JSON.stringify(store.versionSnapshot(last.id)) === JSON.stringify(snap);
      const version = snap && files.length && !same ? store.addVersion(task.id, files, snap) : null;
      // The log line names its version only when git kept it, so only then does the window offer its diff
      const kept = version !== null && (await this.chat.versions.mark(project.path, task.id, `version-${version}`));
      log(
        { code: 'step.done', role, step: step.label, verdict: hb.verdict ?? null, summary: hb.summary },
        kept ? { ...hb, version } : hb,
      );
      this.chat.emit('changed', { topic: 'tasks', sessionId: task.sessionId });
      return DONE;
    }
    log({ code: 'step.failed', role, step: step.label, n: RETRIES }, { errors });
    return { code: 'retries', step: step.label, n: RETRIES };
  }

  // The task's versions that git kept, numbered as the user sees them; none outside a git repository
  async versions(taskId: number, folder = this.projectOf(this.chat.store.readTask(taskId)).path) {
    const kept = await this.chat.versions.kept(folder, taskId);
    if (!kept.includes('base')) return [];
    return this.chat.store
      .listVersions(taskId)
      .map((v, n) => ({ id: v.id, label: `v${n + 1}`, files: v.files }))
      .filter((v) => kept.includes(`version-${v.id}`));
  }

  // What one version changed in one of the task's own files since the task began, with the version's number
  async change(taskId: number, versionId: number, file: string) {
    const folder = this.projectOf(this.chat.store.readTask(taskId)).path;
    const v = (await this.versions(taskId, folder)).find((x) => x.id === versionId);
    if (!v?.files.includes(file)) return null;
    const [d] = await this.chat.versions.diff(folder, taskId, 'base', `version-${v.id}`, [file]);
    return d ? { label: v.label, diff: d } : null;
  }

  // Files changed since the task began that this task wrote: under a path it reserved, or handed back by an earlier step
  ownChanges(task: Task, step: Step, snap: Snapshot) {
    const { store, runs } = this.chat;
    const all = changedFiles(store.readBaseline(task.id), snap);
    const locks = runs.locksOf(this.projectOf(task));
    const done = store.listStepRuns(task.id);
    // Reservations live in memory: with none seen, or a run of this step cut by a restart, nothing tells the task's writes apart
    const cut = done.some((r) => r.stepId === step.id && r.error === RESTARTED);
    if (!locks.touched.get(task.id)?.size || cut) return all;
    const making = new Set(task.workflow.steps.filter((s) => !s.verdict).map((s) => s.id));
    const earlier = done.flatMap((r) => (making.has(r.stepId) && r.status === 'done' ? (r.handback?.files ?? []) : []));
    return all.filter((f) => earlier.includes(f) || locks.wrote(task.id, f));
  }

  judgeStep() {
    return judgeStep(this.chat.crew.names.workflows[JUDGE]?.steps[JUDGE] ?? JUDGE);
  }

  // A judgment the task cannot follow goes back to the conductor
  judgeProblem(task: Task, j: Judgment): string | null {
    const ids = task.workflow.steps.filter((s) => !s.verdict).map((s) => s.id);
    if (j.decision === 'rework' && !ids.includes(j.target ?? ''))
      return `rework needs a target, one of ${ids.join(', ')}`;
    if (j.decision === 'rework' && j.points.length === 0) return 'rework needs the points to fix';
    const runs = this.chat.store.listStepRuns(task.id);
    const all = task.workflow.steps.every((s) => satisfied(task.workflow, runs, s.id));
    if (j.decision === 'done' && !all && !pendingJudge(runs))
      return 'not every step has passed, so done cannot end it; send a step back or fail';
    if (j.decision === 'replan' && !planStep(task.workflow))
      return 'this task has no plan step to plan again; send a step back or fail';
    return null;
  }

  // What follows the conductor's judgment: a rework past its limit, a second re-plan, or a failure stops the task for the user
  judged(task: Task, j: Judgment): Say {
    const why: Say = { code: 'judged', text: j.summary };
    const runs = this.chat.store.listStepRuns(task.id);
    if (j.decision === 'done') return DONE;
    if (j.decision === 'fail') return why;
    if (j.decision === 'replan') return this.replan(task, runs, why) ? DONE : why;
    const since = runs.findLast((r) => r.stepId === USER)?.id ?? 0;
    const sent = runs.filter(
      (r) => r.id > since && r.stepId === JUDGE && r.status === 'done' && r.verdict === 'rework' && r.handback?.target,
    );
    return sent.length > JUDGE_LOOPS ? { code: 'overLimit', step: this.judgeStep().label, loops: JUDGE_LOOPS } : DONE;
  }

  // What the conductor needs to judge a task: the request, and every step's report as it stands
  judgeBrief(task: Task) {
    const runs = this.chat.store.listStepRuns(task.id);
    const making = task.workflow.steps
      .filter((s) => !s.verdict)
      .map((s) => `- ${s.id}: ${s.label} (${this.roleOf(task, s)})`);
    const word = pendingJudge(runs);
    const before = this.seenBy(task, this.memberFor(task, this.judgeStep()));
    const reports = task.workflow.steps
      .filter((s) => lastDone(runs, s.id) && (!before || lastDone(runs, s.id)!.id > before.id))
      .map((s) => section(`${s.id}: ${s.label} (${this.roleOf(task, s)})`, lastDone(runs, s.id)!.handback!));
    return [
      ...(before
        ? [`[Task #${task.id}] ${task.title}, continued`]
        : [`[Task #${task.id}] ${task.title}`, `The user's request, through the interpreter:\n${task.request}`]),
      word && isReplan(word)
        ? `Your step: judge. The task got stuck: ${word.handback!.summary.slice(REPLAN.length)}. Decide how it goes on: send a step back with new points that get past it, or fail.`
        : word
          ? `Your step: judge. The user added to the request: ${word.handback!.summary}\nDecide which step redoes what, as rework with its points; done only when nothing needs redoing.`
          : 'Your step: judge. Every step has finished and every check passed. Decide from the reports whether the task reached the goal the user asked for.',
      ...(reports.length ? [before ? '# Reports since your last turn' : '# Reports', ...reports] : []),
      `# Steps that can fix points\n${making.join('\n')}`,
      'Answer done when the goal is reached; rework with a target step and its points when something the user asked for is missing or wrong; replan when the plan itself was wrong; fail when only the user can decide. Do not send work back for what the request did not ask.',
      'Answer with the structured judgment. Write summary, body, and points in the user’s language.',
    ].join('\n\n');
  }

  // The members the conductor may give a whole request: hired, not a copy, and not one who runs the crew itself
  alone(projectId: number) {
    return this.chat.store
      .listMembers(projectId)
      .filter((m) => m.status === 'hired' && !m.temp && !['interpreter', 'conductor', 'librarian'].includes(m.key));
  }

  // What the conductor needs to assign a task: the request, and the kinds and members to choose from
  assignBrief(task: Task) {
    const { store } = this.chat;
    const project = this.projectOf(task);
    const kinds = this.chat.workflows.shipped.map((w) => `- ${w.kind}: ${w.use}`);
    const members = this.alone(project.id).map(
      (m) => `- ${m.key} (${this.chat.crew.defOf(m).role}): ${this.chat.crew.defOf(m).description}`,
    );
    return [
      `[Task #${task.id}] ${task.title}`,
      `The user's request, through the interpreter:\n${task.request}`,
      `Your step: assign. Decide how this task is done.`,
      `Project folder: ${project.path}`,
      `# Kinds\n${kinds.join('\n')}`,
      `# Members who can take a request alone\n${members.join('\n')}`,
      'A kind runs its steps with the members its workflow names. Give one member the whole request only when the request is that member’s work alone and needs none of the checks. A code change is small when it stays within one or two files and needs no design choice, which skips the plan and its review.',
      'Answer with the structured assignment: summary, body, kind, size, and member only when one member takes it alone. Write summary and body in the user’s language.',
    ].join('\n\n');
  }

  // The member's last finished run of this task, when its Claude session goes on and so still holds what that run was told
  seenBy(task: Task, member: Member) {
    if (!this.chat.runs.resumes(member, task.sessionId)) return null;
    return (
      this.chat.store
        .listStepRuns(task.id)
        .findLast((r) => r.memberId === member.id && ![USER, ASSIGN].includes(r.stepId) && r.status === 'done') ?? null
    );
  }

  // What one member needs to do its step: the request, its step, and every earlier step's handback
  brief(task: Task, step: Step) {
    const { store } = this.chat;
    const w = task.workflow;
    const runs = store.listStepRuns(task.id);
    const project = this.projectOf(task);
    const own = lastDone(runs, step.id);
    const before = this.seenBy(task, this.memberFor(task, step));
    // A run cut off by a restart may have saved files already; the new run checks them instead of starting over
    // The run this brief is for is already open, so the one before it is the one that may have been cut
    const cut = runs.filter((r) => r.stepId === step.id && r.status !== 'running').at(-1)?.error === RESTARTED;
    const saved =
      cut && !step.verdict ? changedFiles(store.readBaseline(task.id), this.chat.files.snapshot(project.path)) : [];
    const earlier = w.steps
      .filter(
        (s) =>
          s.id !== step.id &&
          lastDone(runs, s.id) &&
          // A Claude session that already read a handback is not sent it again
          (!before || lastDone(runs, s.id)!.id > before.id) &&
          (step.after.includes(s.id) || (s.after.length === 0 && ancestors(w, step.id).includes(s.id))),
      )
      .map((s) => {
        const hb = lastDone(runs, s.id)!.handback!;
        // A check judges what was made, not what its maker says of it: only the files reach it
        const made = step.verdict && !s.verdict && baseKey(this.memberFor(task, s).key) !== 'conductor';
        return section(
          `${s.label} (${this.roleOf(task, s)})`,
          made ? { ...hb, summary: '', body: '', points: [], checks: [] } : hb,
        );
      });
    const sentBackBy = sendsBack(w, runs, step.id, own?.id).map((r) =>
      section(
        `Sent back by ${w.steps.find((s) => s.id === r.stepId)?.label ?? (r.stepId === JUDGE ? this.judgeStep().label : isReplan(r) ? 'the app, to plan again' : 'the user')}`,
        r.handback!,
      ),
    );
    return [
      ...(before
        ? [`[Task #${task.id}] ${task.title}, continued`]
        : [`[Task #${task.id}] ${task.title}`, `The user's request, through the interpreter:\n${task.request}`]),
      `Your step: ${step.label}. ${step.does}`,
      ...(before
        ? []
        : [
            `Project folder: ${project.path}\nYour output folder for files you produce: ${this.chat.runs.outputDir(project, `task-${task.id}`)}`,
          ]),
      ...(earlier.length ? [before ? '# New from earlier steps' : '# Earlier steps', ...earlier] : []),
      // A step handed over from a member who left continues from what they saved
      ...(own && own.memberId !== this.memberFor(task, step).id
        ? ['# This step so far, by the member before you', section(step.label, own.handback!)]
        : []),
      ...(sentBackBy.length ? ['# Fix exactly these points', ...sentBackBy] : []),
      ...(saved.length
        ? [
            `# Cut off by a restart\nYour earlier run of this step was cut off after changing: ${saved.join(', ')}. Read them, keep what is right, and finish the step.`,
          ]
        : []),
      step.verdict
        ? 'Judge it and answer with verdict pass, or rework with each point to fix.'
        : 'Do the step, then answer with your handback.',
      'Answer with the structured handback: summary, body, and where they apply verdict, points, files, checks. Write them in the user’s language.',
    ].join('\n\n');
  }

  finish(task: Task) {
    this.move(task.id, 'DONE', '', { code: 'task.done', title: task.title });
    this.dismissTemps(task);
    void this.chat.tell(task.sessionId, this.report(task, DONE), [], task.id);
    this.chat.librarian.afterTask(task, this.report(task, DONE, true));
  }

  pause(task: Task) {
    if (!this.move(task.id, 'STOP', '', { code: 'task.limit', title: task.title })) return;
    this.move(task.id, 'STOPPED', '', { code: 'task.stopped', title: task.title });
    void this.chat.tell(task.sessionId, this.report(task, LIMIT));
  }

  // A copy of a member for one step: the same definition and permissions, gone once the task ends
  copy(task: Task, step: Step, m: Member) {
    const { store } = this.chat;
    const project = this.projectOf(task);
    const key = `${m.key}-${task.id}-${step.id}`;
    const members = store.listMembers(project.id);
    const n = members.filter((x) => x.key.startsWith(`${m.key}-`)).length + 2;
    const copy =
      members.find((x) => x.key === key) ??
      store.addMember(project.id, {
        key,
        nickname: `${this.chat.crew.nicknameOf(m)}${n}`,
        model: m.model,
        temp: true,
      });
    if (copy.status !== 'hired') this.chat.members.rehire(copy.id);
    if (Object.keys(m.config).length) store.writeConfig(copy.id, m.config, { code: 'perm.copied' });
    store.assign(task.id, step.id, copy.id);
    this.chat.emit('changed', { topic: 'members' });
    return copy;
  }

  // A failing task goes back to the conductor once, to plan the steps still left; a second failure stops it for the user
  replan(task: Task, runs: StepRun[], why: Say) {
    if (runs.some((r) => isReplan(r))) return false;
    // A task with no plan of the conductor's goes to its judgment instead, to send a step back in a new way
    const target = planStep(task.workflow) ?? this.judgeStep();
    const { store } = this.chat;
    store.addUserRework(task.id, this.memberFor(task, target).id, target.id, `${REPLAN}${whyText(why)}`);
    store.writeTaskStatus(task.id, task.status, task.stage, { code: 'task.replan', title: task.title, why });
    return true;
  }

  fail(task: Task, why: Say) {
    if (!this.move(task.id, 'FAIL', '', { code: 'task.fail', title: task.title, why })) return;
    this.dismissTemps(task);
    void this.chat.tell(task.sessionId, this.report(task, why));
    this.chat.librarian.afterTask(task, this.report(task, why, true));
  }

  // A copy's work is the task it came for; once that ends and nothing else needs it, it leaves
  dismissTemps(task: Task) {
    const { store } = this.chat;
    const open = store.listTasks(task.sessionId).filter((t) => t.id !== task.id && !ENDED.includes(t.status));
    for (const m of this.copies(task))
      if (!open.some((t) => this.copies(t).some((x) => x.id === m.id))) this.chat.members.fire(m.id);
  }

  // The copies a task's steps were handed to, its assign and judge steps included
  copies(task: Task) {
    const { store } = this.chat;
    return [...task.workflow.steps.map((s) => s.id), ASSIGN, JUDGE]
      .map((id) => store.assignee(task.id, id))
      .flatMap((id) => (id ? [store.readMemberById(id)] : []))
      .filter((m) => m.temp);
  }

  // A task taken up again gets back the copies that left when it ended
  rehire(task: Task) {
    for (const m of this.copies(task)) if (m.status !== 'hired') this.chat.members.rehire(m.id);
  }

  // The interpreter words the report itself from each step's outcome; the librarian, who keeps the wiki from it, gets every body
  report(task: Task, outcome: Say, full = false) {
    const runs = this.chat.store.listStepRuns(task.id);
    const plan = planStep(task.workflow);
    // A step that changed no file, such as research or a review of the project, found something: its body is the result
    const found = (s: Step, hb: Handback) => !s.verdict && s !== plan && hb.files.length === 0;
    const steps = task.workflow.steps
      .filter((s) => lastDone(runs, s.id))
      .map((s) => {
        const hb = lastDone(runs, s.id)!.handback!;
        return (full || found(s, hb) ? section : outcomeOf)(`${s.label} (${this.roleOf(task, s)})`, hb);
      });
    const judged = lastDone(runs, JUDGE);
    if (judged)
      steps.push(
        (full ? section : outcomeOf)(
          `${this.judgeStep().label} (${this.chat.crew.defOf(this.memberFor(task, this.judgeStep())).role})`,
          judged.handback!,
        ),
      );
    const left = task.workflow.steps.filter((s) => !satisfied(task.workflow, runs, s.id)).map((s) => s.label);
    const head =
      outcome === DONE
        ? `[Task #${task.id} finished] "${task.title}" passed every check.`
        : outcome === LIMIT
          ? `[Task #${task.id} paused] "${task.title}" stopped at the model usage limit; it can resume once the limit resets.`
          : `[Task #${task.id} stopped] "${task.title}" could not finish: ${whyText(outcome)}.`;
    return [
      head,
      ...steps,
      ...(outcome !== DONE && left.length ? [`## Left to do\n${left.map((l) => `- ${l}`).join('\n')}`] : []),
    ].join('\n\n');
  }
}
const REPLAN = 'Re-plan: ';
// The step id of words the user or the app added to a task
const USER = '_user';
// Every code task carries the scope the app sets
const scoped = (w: Workflow, request: string) => (w.kind === 'code' ? `${request}\n\n${CODE_SCOPE}` : request);
// New words or a stuck task waiting for the conductor's judgment, newer than its last one
const pendingJudge = (runs: StepRun[]) => {
  const word = runs.findLast((r) => r.stepId === USER && r.handback?.target === JUDGE);
  const judged = runs.findLast((r) => r.stepId === JUDGE && r.status === 'done');
  return word && (!judged || judged.id < word.id) ? word : null;
};
const isReplan = (r: StepRun) => r.stepId === USER && !!r.handback?.summary.startsWith(REPLAN);

// A step's outcome only: what the interpreter reports to the user, who can ask the member for more
function outcomeOf(title: string, hb: Handback) {
  return section(title, { ...hb, body: '' });
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
    hb.notes?.length ? `Notes:\n${hb.notes.map((n) => `- ${n}`).join('\n')}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}
