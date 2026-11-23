import type { Chat } from './chat';
import {
  changedFiles,
  type Handback,
  type Member,
  NOT_HIRED,
  skipped,
  type Snapshot,
  type Task,
} from '../domain/records';
import { ancestors, type Step } from '../domain/workflow';
import {
  CODE_SCOPE,
  DRIVEN,
  ENDED,
  HALTED,
  HANDBACK_SCHEMA,
  lastDone,
  makers,
  nextStatus,
  ReadHandback,
  RESTARTED,
  satisfied,
  sendsBack,
  sentBack,
  solo,
  stuck,
  type TaskEvent,
  withoutPlan,
} from '../domain/task';

import { REFUSE } from '../domain/answers';
import { josa } from '../../korean';
import { ACTIVE } from '../../shared';
const RETRIES = 3;
// What runStep returns when the model's usage limit stopped it
const LIMIT = 'usage limit';
const STOPPED = '중단되었습니다';
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

  start(sessionId: number, kind: string, title: string, request: string, one?: Member, small = false): Task {
    const { store } = this.chat;
    const projectId = store.projectOf(sessionId).id;
    // A member who writes the project makes a small code change, so its change gets every check; anyone else works alone
    const writer = one && this.chat.members.settings(one).write === 'project' ? one : undefined;
    const rules =
      one && !writer
        ? solo(this.chat.crew.defOf(one).role, one.key)
        : this.chat.workflows.current(projectId, writer ? 'code' : kind).rules;
    const workflow = small || writer ? withoutPlan(rules) : rules;
    // Set by the app rather than left to the brief's wording, so every step reads the same scope
    const task = store.createTask({
      sessionId,
      kind: one && !writer ? kind : workflow.kind,
      title,
      request: workflow.kind === 'code' ? `${request}\n\n${CODE_SCOPE}` : request,
      workflow,
    });
    if (writer) for (const s of makers(workflow)) store.assign(task.id, s.id, writer.id);
    const folder = this.projectOf(task).path;
    store.writeBaseline(task.id, this.chat.files.snapshot(folder));
    // In a git repository the starting point is also kept as a commit, so each version's diff can be shown
    const base = this.chat.versions.mark(folder, task.id, 'base').finally(() => this.starting.delete(task.id));
    this.starting.set(task.id, base);
    this.chat.emit('changed', { topic: 'tasks', sessionId: task.sessionId });
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
    return this.chat.store.projectOf(task.sessionId);
  }

  // A stopped task takes no new run, even one already waiting in a lane
  halted(taskId: number) {
    return HALTED.includes(this.chat.store.readTask(taskId).status);
  }

  // More from the user goes back to every step that made the task: a finished task opens again, one at work redoes once its turn ends
  reopen(taskId: number, text: string) {
    const { store } = this.chat;
    const task = store.readTask(taskId);
    const working = ACTIVE.includes(task.status);
    if (working) store.writeTaskStatus(taskId, task.status, task.stage, `${task.title} 업무 추가 요청: ${text}`);
    else if (!this.move(taskId, 'REOPEN', '', `${task.title} 업무 다시 진행: ${text}`)) return false;
    store.appendRequest(taskId, text);
    for (const target of makers(task.workflow))
      store.addUserRework(taskId, this.memberFor(task, target).id, target.id, text);
    if (!working) void this.drive(taskId, true);
    return true;
  }

  // Stops one task only: its running members are interrupted and its open cards refused; other tasks go on
  stop(taskId: number) {
    const { store } = this.chat;
    const task = store.readTask(taskId);
    if (!this.move(taskId, 'STOP', '', `${task.title} 업무 중단 요청`)) return false;
    for (const run of this.chat.runs.ofTask(taskId)) void run.stop();
    // A write waiting its turn is answered now, so the stopped run can end
    this.chat.runs.locksOf(this.projectOf(task)).cancel(taskId);
    for (const id of store.openQuestionIds(task.sessionId, taskId)) this.chat.questions.answer(id, REFUSE);
    // A task with nothing running reaches stopped at once; otherwise drive does when its runs end
    if (!this.chat.runs.ofTask(taskId).length) this.move(taskId, 'STOPPED', '', `${task.title} 업무 중단됨`);
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
    if (!this.move(taskId, 'RESUME', '', `${task.title} 업무 재개`)) return false;
    void this.drive(taskId, true);
    return true;
  }

  move(taskId: number, type: TaskEvent['type'], stage: string, log: string) {
    const { store } = this.chat;
    const task = store.readTask(taskId);
    const next = nextStatus(task.status, type);
    if (!next) return false;
    store.writeTaskStatus(taskId, next, stage, log);
    this.chat.emit('changed', { topic: 'tasks', sessionId: task.sessionId });
    return true;
  }

  async drive(taskId: number, resumed = false) {
    const { store } = this.chat;
    const first = store.readTask(taskId);
    const drive = ++this.drives;
    this.driving.set(taskId, drive);
    const current = () => this.driving.get(taskId) === drive;
    if (!resumed) this.move(taskId, 'START', '', `${first.title} 업무 시작`);
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
      if (task.status === 'stopping') return this.move(taskId, 'STOPPED', '', `${task.title} 업무 중단됨`);
      if (!DRIVEN.includes(task.status)) return;
      const w = task.workflow;
      const runs = store.listStepRuns(taskId);
      const holds = (id: string) => satisfied(w, runs, id);
      if (w.steps.every((s) => holds(s.id))) return this.finish(task);
      const stuckWhy = stuck(w, runs, store.latestVersion(taskId)?.id ?? null);
      if (stuckWhy) return this.fail(task, stuckWhy);
      const ready = w.steps.filter((s) => !holds(s.id) && s.after.every(holds));
      const fixing = ready.some((s) => lastDone(runs, s.id) && sentBack(w, runs, s.id, lastDone(runs, s.id)!.id));
      const stage = ready.map((s) => s.label).join(', ');
      this.move(taskId, fixing ? 'REWORK' : ready.every((s) => s.verdict) ? 'REVIEW' : 'WORK', stage, `${stage} 진행`);
      const results = await Promise.all(ready.map((s) => this.runStep(task, s, current)));
      if (!current()) return;
      // A usage limit pauses the task instead of failing it: nothing is wrong with the work, it can resume later
      if (results.includes(LIMIT)) return this.pause(store.readTask(taskId));
      const broken = results.find((r) => r !== 'done');
      if (broken && store.readTask(taskId).status !== 'stopping') return this.fail(store.readTask(taskId), broken);
    }
  }

  async runStep(task: Task, step: Step, current: () => boolean): Promise<string> {
    const { store, crew } = this.chat;
    const project = this.projectOf(task);
    const member = this.memberFor(task, step);
    const role = crew.defOf(member).role;
    // A member let go takes no new step; 비서 hears of it and can hand the step to someone else
    const absent = `${josa(role, '이')} 고용되어 있지 않아 ${josa(step.label, '을')} 진행할 수 없습니다. 다른 담당자를 붙여야 합니다`;
    if (member.status !== 'hired' || member.leaving) return absent;
    let prompt = this.brief(task, step);
    const log = (text: string, detail: unknown = null) =>
      store.addEvent({
        sessionId: task.sessionId,
        taskId: task.id,
        memberId: member.id,
        kind: 'step',
        text,
        detail: detail ? JSON.stringify(detail) : null,
      });
    // Retries stay out of the log until the last one fails; that one line carries every error
    const errors: string[] = [];
    for (let attempt = 0; attempt <= RETRIES; attempt++) {
      const runId = store.startStepRun(task.id, step.id, member.id, store.latestVersion(task.id)?.id ?? null);
      this.chat.emit('changed', { topic: 'tasks', sessionId: task.sessionId });
      await this.starting.get(task.id);
      const out = await this.chat.tools
        .member(task, step, member)
        .then((crew) =>
          this.chat.runs.run(member, task.sessionId, task.id, prompt, {
            schema: HANDBACK_SCHEMA,
            mcpServers: { crew },
            alive: () => current() && !this.halted(task.id),
          }),
        )
        .catch((err: unknown) => skipped('failed', err instanceof Error ? err.message : String(err)))
        // Once the task's last run has really ended, nothing it started can still be writing; a step beside it may still be
        .finally(() => {
          if (!this.chat.runs.ofTask(task.id).length) this.chat.runs.locksOf(project).release(task.id);
        });
      // A drive no longer current, such as one for a deleted session, leaves the record alone
      if (!current()) return STOPPED;
      if (out.error === NOT_HIRED) {
        store.finishStepRun(runId, 'stopped', null, out.error);
        return absent;
      }
      if (out.status === 'limit' || out.status === 'stopped') {
        store.finishStepRun(runId, 'stopped', null, out.error ?? out.status);
        return out.status === 'limit' ? LIMIT : STOPPED;
      }
      const parsed = out.status === 'done' ? ReadHandback.safeParse(out.structured) : null;
      if (!parsed?.success) {
        const why = out.error ?? 'the result did not match the handback format';
        store.finishStepRun(runId, 'failed', null, why);
        errors.push(why.slice(0, 400));
        // A run that failed, rather than one that answered in the wrong shape, may have met a passing fault
        if (out.status === 'failed' && attempt < RETRIES) await sleep(this.retryWaits[attempt]);
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
        log(`${role}: ${step.label} 인계 보완 요청 — ${missing.join(', ')} 없음`, { missing });
        prompt = `Your handback is missing ${missing.join(' and ')}, which the next step needs. Answer again with the complete handback.`;
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
        `${role}: ${step.label} ${hb.verdict === 'rework' ? '수정 요청' : '완료'}${hb.summary === step.label ? '' : ` — ${hb.summary}`}`,
        kept ? { ...hb, version } : hb,
      );
      this.chat.emit('changed', { topic: 'tasks', sessionId: task.sessionId });
      return 'done';
    }
    log(`${role}: ${step.label} 실패 (${RETRIES}번 다시 시도)`, { errors });
    return `${josa(step.label, '이')} ${RETRIES}번 다시 시도해도 실패했습니다`;
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

  // What one member needs to do its step: the request, its step, and every earlier step's handback
  brief(task: Task, step: Step) {
    const { store } = this.chat;
    const w = task.workflow;
    const runs = store.listStepRuns(task.id);
    const project = this.projectOf(task);
    const own = lastDone(runs, step.id);
    // A run cut off by a restart may have saved files already; the new run checks them instead of starting over
    const cut = runs.filter((r) => r.stepId === step.id).at(-1)?.error === RESTARTED;
    const saved =
      cut && !step.verdict ? changedFiles(store.readBaseline(task.id), this.chat.files.snapshot(project.path)) : [];
    const earlier = w.steps
      .filter(
        (s) =>
          s.id !== step.id &&
          lastDone(runs, s.id) &&
          (step.after.includes(s.id) || (s.after.length === 0 && ancestors(w, step.id).includes(s.id))),
      )
      .map((s) => section(`${s.label} (${this.roleOf(task, s)})`, lastDone(runs, s.id)!.handback!));
    const sentBackBy = sendsBack(w, runs, step.id, own?.id).map((r) =>
      section(
        `Sent back by ${w.steps.find((s) => s.id === r.stepId)?.label ?? 'the user after the report'}`,
        r.handback!,
      ),
    );
    return [
      `[Task #${task.id}] ${task.title}`,
      `The user's request, through 비서:\n${task.request}`,
      `Your step: ${step.label}. ${step.does}`,
      `Project folder: ${project.path}\nYour output folder for files you produce: ${this.chat.runs.outputDir(project, `task-${task.id}`)}`,
      ...(earlier.length ? ['# Earlier steps', ...earlier] : []),
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
      'Answer with the structured handback: summary, body, and where they apply verdict, points, files, checks. Write them in Korean.',
    ].join('\n\n');
  }

  finish(task: Task) {
    this.move(task.id, 'DONE', '', `${task.title} 업무 완료`);
    // Before the temps leave, while the record still says who they are
    const note = this.bringTempFiles(task);
    this.dismissTemps(task);
    void this.chat.tell(task.sessionId, [this.report(task, 'done'), note].filter(Boolean).join('\n\n'));
  }

  // A temp may write only to its output folder, but what it made is meant for the project, so it moves there
  bringTempFiles(task: Task) {
    if (!makers(task.workflow).some((s) => this.memberFor(task, s).temp)) return '';
    const project = this.projectOf(task);
    const dir = this.chat.runs.outputDir(project, `task-${task.id}`);
    let files: string[], taken: string[];
    try {
      ({ moved: files, replaced: taken } = this.chat.files.moveAll(dir, project.path));
    } catch (err) {
      // A file held open by another program cannot move; the rest of the ending still has to happen
      return `[Files] The temp's files could not all be moved from ${dir} into the project folder: ${err instanceof Error ? err.message : String(err)}`;
    }
    if (!files.length) return '';
    return [
      `[Files] The temp's files were moved into the project folder: ${files.join(', ')}`,
      ...(taken.length ? [`They replaced files already there: ${taken.join(', ')}`] : []),
    ].join('\n');
  }

  pause(task: Task) {
    if (!this.move(task.id, 'STOP', '', `${task.title} 업무 사용 한도로 멈춤`)) return;
    this.move(task.id, 'STOPPED', '', `${task.title} 업무 중단됨`);
    void this.chat.tell(task.sessionId, this.report(task, LIMIT));
  }

  fail(task: Task, why: string) {
    if (!this.move(task.id, 'FAIL', '', `${task.title} 업무 실패: ${why}`)) return;
    void this.chat.tell(task.sessionId, this.report(task, why));
  }

  // A temp's work is the task it came for; once that is done and nothing else needs it, it leaves
  dismissTemps(task: Task) {
    const { store } = this.chat;
    const open = store.listTasks(task.sessionId).filter((t) => t.id !== task.id && !ENDED.includes(t.status));
    for (const s of task.workflow.steps) {
      const m = this.memberFor(task, s);
      if (m.temp && !open.some((t) => t.workflow.steps.some((x) => this.memberFor(t, x).id === m.id)))
        this.chat.members.fire(m.id);
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
        ? `[Task #${task.id} finished] "${task.title}" passed every check.`
        : outcome === LIMIT
          ? `[Task #${task.id} paused] "${task.title}" stopped at the model usage limit; it can resume once the limit resets.`
          : `[Task #${task.id} stopped] "${task.title}" could not finish: ${outcome}.`;
    return [
      head,
      ...steps,
      ...(outcome !== 'done' && left.length ? [`## Left to do\n${left.map((l) => `- ${l}`).join('\n')}`] : []),
    ].join('\n\n');
  }
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
    hb.wiki ? `Wiki: ${hb.wiki}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}
