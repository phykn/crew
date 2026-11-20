import fs from 'node:fs';
import path from 'node:path';
import type { Options } from '@anthropic-ai/claude-agent-sdk';
import { AgentRun, NOT_HIRED, type RunOutput, skipped } from './run';
import type { Chat } from '../chat';
import type { Member, Project } from '../db';
import { toolsOf } from '../crew/shipped';
import { guardMember, projectWrites, type Policy } from './guard';
import { Locks, realPath } from './locks';
import { appServer } from '../tools/app';
import { josa } from '../../korean';

type RunOptions = {
  schema?: Record<string, unknown>;
  mcpServers?: Options['mcpServers'];
  onText?: (delta: string) => void;
  onReply?: (text: string, more: boolean) => void;
  // False once the run is no longer wanted, such as a step of a stopped task or of a drive since replaced
  alive?: () => boolean;
};

type Active = { run: AgentRun; memberId: number; sessionId: number; taskId: number | null; secretary: boolean };

// Every member run: one at a time per member and session, each behind its own guard
export class Runs {
  // Every run at work now: who is busy, what a task has running, and 비서's live run are all read from it
  active = new Set<Active>();
  // One lane per agent session: a member works on one task at a time and the rest wait their turn
  lanes = new Map<number, Promise<unknown>>();
  // Write reservations per project folder
  locks = new Map<number, Locks>();

  constructor(public chat: Chat) {}

  busy(memberId: number) {
    return [...this.active].some((a) => a.memberId === memberId);
  }

  ofTask(taskId: number) {
    return [...this.active].filter((a) => a.taskId === taskId).map((a) => a.run);
  }

  // 비서's run in this session, so what the user adds mid-answer joins it
  live(sessionId: number) {
    return [...this.active].find((a) => a.secretary && a.sessionId === sessionId)?.run;
  }

  // Runs one member in its own Claude session for this app session, after whatever it is already doing
  run(member: Member, sessionId: number, taskId: number | null, prompt: string, opts: RunOptions = {}) {
    const agentSession = this.chat.store.openAgentSession(sessionId, member.id);
    const before = this.lanes.get(agentSession.id) ?? Promise.resolve();
    const turn = before.then(() => this.execute(member, sessionId, taskId, prompt, opts));
    this.lanes.set(
      agentSession.id,
      turn.catch(() => undefined),
    );
    return turn;
  }

  async execute(member: Member, sessionId: number, taskId: number | null, prompt: string, opts: RunOptions) {
    const { store, crew, members, wiki } = this.chat;
    // The member may have changed while it waited in its lane
    member = store.readMemberById(member.id);
    if (member.status !== 'hired' || member.leaving) return skipped('failed', NOT_HIRED);
    const project = store.projectOf(sessionId);
    const settings = members.settings(member);
    const agentSession = store.openAgentSession(sessionId, member.id);
    // A Claude session started on another model is not continued; the new one is handed what came before
    const resume = agentSession.claudeId && agentSession.model === member.model ? agentSession.claudeId : null;
    if (agentSession.claudeId && !resume) prompt = `${this.handoff(member, sessionId)}\n\n${prompt}`;
    const sdk = await this.chat.sdk();
    const run = new AgentRun(sdk.query, {
      cwd: project.path,
      model: member.model,
      system: [
        crew.system(crew.defOf(member), settings, members.kit(project.id)),
        members.roster(project.id),
        wiki.context(project.id, member.id),
      ].join('\n\n'),
      mcpServers: {
        ...crew.mcpServers(settings),
        ...(settings.mcp.some((m) => m.server === 'app') ? { app: appServer(sdk, this.chat, sessionId) } : {}),
        ...opts.mcpServers,
      },
      resume,
      canUseTool: this.guard(member, project, sessionId, taskId),
      schema: opts.schema,
      onText: opts.onText,
      onReply: opts.onReply,
    });
    // A run that waited in its lane for work no longer wanted never starts
    if (opts.alive?.() === false) return skipped('stopped');
    const active = { run, memberId: member.id, sessionId, taskId, secretary: member.key === 'orchestrator' };
    this.active.add(active);
    const runId = store.startRun(agentSession.id, member.model, taskId);
    const out: RunOutput = await run.run(prompt).finally(() => this.active.delete(active));
    // A member let go mid-run leaves once this run, its last, has ended
    if (!this.busy(member.id) && store.readMemberById(member.id).leaving) members.leave(member.id);
    if (out.claudeId) store.writeClaudeId(agentSession.id, out.claudeId, member.model);
    store.finishRun(runId, out);
    return out;
  }

  // What a member's earlier Claude session knew, for a fresh one: the conversation for 비서, its own handbacks for the rest
  handoff(member: Member, sessionId: number) {
    const { store } = this.chat;
    const lines =
      member.key === 'orchestrator'
        ? store
            .listMessages(sessionId)
            .slice(-30)
            .map((m) => `${m.author === 'user' ? 'User' : '비서'}: ${m.text}`)
        : store
            .listTasks(sessionId)
            .flatMap((t) => store.listStepRuns(t.id).filter((r) => r.memberId === member.id && r.handback))
            .slice(-10)
            .map((r) => `Task #${r.taskId} ${r.stepId}: ${r.handback!.summary}`);
    return [
      '[Handoff] Your earlier session in this conversation cannot be continued (the model changed). What happened so far:',
      ...lines,
    ].join('\n');
  }

  policy(member: Member, project: Project, scope: string): Policy {
    const { crew, members, store, paths } = this.chat;
    const def = crew.defOf(member);
    const settings = members.settings(member);
    return {
      key: def.key,
      role: def.role,
      tools: toolsOf(settings),
      write: settings.write,
      mcp: settings.mcp.map(({ server, access }) => ({
        server,
        readTools: access === 'read' ? (crew.kit.mcp[server].readTools ?? []) : null,
      })),
      project: project.path,
      output: this.outputDir(project, scope),
      protected: paths.protected,
      // Read fresh, so a mode changed mid-run applies to the next call
      mode: store.readProject(project.id).mode,
    };
  }

  outputDir(project: Project, scope: string) {
    const dir = path.join(this.chat.paths.output, String(project.id), scope);
    fs.mkdirSync(dir, { recursive: true });
    return dir;
  }

  guard(member: Member, project: Project, sessionId: number, taskId: number | null) {
    const scope = taskId ? `task-${taskId}` : `session-${sessionId}`;
    // Read from the record on every call, so a permission changed or revoked mid-run applies to the next call
    const policy = () => this.policy(this.chat.store.readMemberById(member.id), project, scope);
    const reserve = taskId
      ? (tool: string, input: Record<string, unknown>) => this.reserve(project, taskId, policy(), tool, input)
      : (tool: string, input: Record<string, unknown>) => this.checkFree(project, policy(), tool, input);
    const { store, questions } = this.chat;
    return guardMember({ store, questions, policy, sessionId, taskId, member, reserve });
  }

  locksOf(project: Project) {
    let locks = this.locks.get(project.id);
    if (!locks) this.locks.set(project.id, (locks = new Locks(realPath(project.path))));
    return locks;
  }

  // A write waits for any other task holding an overlapping path, then must not land on a file it has not seen
  async reserve(project: Project, taskId: number, policy: Policy, tool: string, input: Record<string, unknown>) {
    const { store, emit } = this.chat;
    const paths = projectWrites(policy, tool, input).map(realPath);
    if (!paths.length) return null;
    const locks = this.locksOf(project);
    const task = store.readTask(taskId);
    // Only paths newly taken are checked: while the task holds a path, the changes on it are its own
    const own = [...(locks.held.get(taskId) ?? [])];
    const fresh = paths.filter((p) => !own.includes(p));
    const got = await locks.reserve(taskId, paths, (holders) => {
      store.addEvent({
        sessionId: task.sessionId,
        taskId,
        memberId: null,
        kind: 'waiting',
        text: `쓰기 예약 대기: 업무 ${josa(`#${holders.join(', #')}`, '이')} 같은 범위를 쓰는 중`,
        detail: JSON.stringify({ paths }),
      });
      emit('changed', 'tasks');
    });
    if (got === 'deadlock')
      return `Blocked by the crew guard: another task is waiting on files you hold. Finish your step without ${paths.join(', ')} and say so in your handback.`;
    const stale = locks.stale(taskId, store.readBaseline(taskId), fresh, own);
    if (!stale.length) return null;
    store.addEvent({
      sessionId: task.sessionId,
      taskId,
      memberId: null,
      kind: 'stale',
      text: `다시 읽어야 할 파일: ${stale.join(', ')}`,
      detail: null,
    });
    return `Not written: ${stale.join(', ')} changed since this task last read it (another task or the user changed it while you waited). Read it again and redo your change on top of the current content.`;
  }

  // A write outside any task, such as 비서's own small edit, waits for no one but never lands on a file a task is writing
  async checkFree(project: Project, policy: Policy, tool: string, input: Record<string, unknown>) {
    const paths = projectWrites(policy, tool, input).map(realPath);
    const holders = paths.length ? this.locksOf(project).blockers(0, paths) : [];
    return holders.length
      ? `Not written: task #${holders.join(', #')} is changing ${paths.join(', ')}. Hand the change to that task with reopen_task or wait until it ends.`
      : null;
  }
}
