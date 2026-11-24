import path from 'node:path';
import type { Image } from '../../shared';
import type { Chat } from './chat';
import { type Member, NOT_HIRED, type Project, type RunOutput, skipped } from '../domain/records';
import type { AgentRun, ToolServer } from './ports';
import { toolsOf } from '../domain/crew';
import { guardMember } from './guard';
import { projectWrites, type Policy } from '../domain/policy';
import { Locks } from './locks';
import { usage } from '../domain/usage';

type RunOptions = {
  images?: Image[];
  schema?: Record<string, unknown>;
  mcpServers?: Record<string, ToolServer>;
  onText?: (delta: string) => void;
  onReply?: (text: string, more: boolean) => void;
  // False once the run is no longer wanted, such as a step of a stopped task or of a drive since replaced
  alive?: () => boolean;
};

type Active = { run: AgentRun; memberId: number; sessionId: number; taskId: number | null; secretary: boolean };

// Every member run: one at a time per member and session, each behind its own guard
export class Runs {
  // Every run at work now: who is busy, what a task has running, and the interpreter's live run are all read from it
  active = new Set<Active>();
  // One lane per agent session: a member works on one task at a time and the rest wait their turn
  lanes = new Map<number, Promise<unknown>>();
  // Write reservations per project folder
  locks = new Map<number, Locks>();

  constructor(public chat: Chat) {}

  busy(memberId: number, sessionId?: number) {
    return [...this.active].some(
      (a) => a.memberId === memberId && (sessionId === undefined || a.sessionId === sessionId),
    );
  }

  ofTask(taskId: number) {
    return [...this.active].filter((a) => a.taskId === taskId).map((a) => a.run);
  }

  // The interpreter's run in this session, so what the user adds mid-answer joins it
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
    const { store, crew, members } = this.chat;
    // The member may have changed while it waited in its lane
    member = store.readMemberById(member.id);
    if (member.status !== 'hired' || member.leaving) return skipped('failed', NOT_HIRED);
    const project = store.projectOf(sessionId);
    const settings = members.settings(member);
    const agentSession = store.openAgentSession(sessionId, member.id);
    // A Claude session started on another model is not continued; the new one is handed what came before
    const resume = agentSession.claudeId && agentSession.model === member.model ? agentSession.claudeId : null;
    if (agentSession.claudeId && !resume) prompt = `${this.handoff(member, sessionId)}\n\n${prompt}`;
    const run = this.chat.agent.start({
      cwd: project.path,
      model: member.model,
      system: this.system(member, project),
      mcpServers: {
        ...crew.mcpServers(settings),
        ...(settings.mcp.some((m) => m.server === 'app') ? { app: await this.chat.tools.app(sessionId) } : {}),
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
    const active = { run, memberId: member.id, sessionId, taskId, secretary: member.key === 'interpreter' };
    this.active.add(active);
    if (this.active.size === 1) this.chat.emit('busy', true);
    const runId = store.startRun(agentSession.id, member.model, taskId);
    const out: RunOutput = await run.run(prompt, opts.images).finally(() => {
      this.active.delete(active);
      if (this.active.size === 0) this.chat.emit('busy', false);
    });
    // A member let go mid-run leaves once this run, its last, has ended
    if (!this.busy(member.id) && store.readMemberById(member.id).leaving) members.leave(member.id);
    if (out.claudeId) store.writeClaudeId(agentSession.id, out.claudeId, member.model);
    store.finishRun(runId, out);
    return out;
  }

  // What this session's runs cost, per member and model, with the member's role
  spend(sessionId: number) {
    const { store, crew } = this.chat;
    return usage(store.listRunSpend(sessionId)).map((u) => ({
      ...u,
      role: crew.defOf(store.readMemberById(u.memberId)).role,
    }));
  }

  system(member: Member, project: Project) {
    const { crew, members, wiki } = this.chat;
    return [
      crew.system(crew.defOf(member), members.settings(member)),
      members.roster(project.id),
      wiki.context(project.id, member.id),
    ].join('\n\n');
  }

  // A question answered by a copy of the member's Claude session, beside its lane: the copy cannot write, and the work never hears of it
  async ask(member: Member, sessionId: number, question: string): Promise<RunOutput | null> {
    const { store } = this.chat;
    const project = store.projectOf(sessionId);
    const agentSession = store.openAgentSession(sessionId, member.id);
    const working = [...this.active].find((a) => a.memberId === member.id && a.sessionId === sessionId)?.run;
    const claudeId = working?.claudeId ?? agentSession.claudeId;
    if (!claudeId) return null;
    const model = working?.model ?? agentSession.model ?? member.model;
    const run = this.chat.agent.start({
      cwd: project.path,
      model,
      system: this.system(member, project),
      resume: claudeId,
      fork: true,
      // Read-only tools need no permission, so they still work; anything else would change what the member is working on
      canUseTool: async () => ({
        behavior: 'deny',
        message: 'This is a side question: answer from what you know and can read.',
      }),
    });
    const runId = store.startRun(agentSession.id, model, null, true);
    const out = await run.run(
      `[Side question from the user, through the interpreter] You are answering in a copy of your session: nothing you do here reaches your work, and you cannot change files. Answer in a few Korean sentences.\n\n${question}`,
    );
    store.finishRun(runId, out);
    return out;
  }

  // What a member's earlier Claude session knew, for a fresh one: the conversation for the interpreter, its own handbacks for the rest
  handoff(member: Member, sessionId: number) {
    const { store } = this.chat;
    const lines =
      member.key === 'interpreter'
        ? store
            .listMessages(sessionId)
            .slice(-30)
            // A card or a failed answer is the app's own line, not the conversation
            .filter((m) => m.text)
            .map((m) => `${m.author === 'user' ? 'User' : 'Interpreter'}: ${m.text}`)
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
        readTools: access === 'read' ? (crew.readTools[server] ?? []) : null,
      })),
      project: project.path,
      output: this.outputDir(project, scope),
      // The crew's memory changes only through remember, so no agent rewrites another's
      protected: [...paths.protected, path.join(project.path, '.crew')],
      // Read fresh, so a mode changed mid-run applies to the next call
      mode: store.readProject(project.id).mode,
    };
  }

  outputDir(project: Project, scope: string) {
    return this.chat.files.ensureDir(path.join(this.chat.paths.output, String(project.id), scope));
  }

  guard(member: Member, project: Project, sessionId: number, taskId: number | null) {
    const scope = taskId ? `task-${taskId}` : `session-${sessionId}`;
    // Read from the record on every call, so a permission changed or revoked mid-run applies to the next call
    const policy = () => this.policy(this.chat.store.readMemberById(member.id), project, scope);
    const reserve = taskId
      ? (tool: string, input: Record<string, unknown>) => this.reserve(project, taskId, policy(), tool, input)
      : (tool: string, input: Record<string, unknown>) => this.checkFree(project, policy(), tool, input);
    const { store, questions } = this.chat;
    const nickname = this.chat.crew.nicknameOf(member);
    return guardMember({ store, questions, policy, sessionId, taskId, member, nickname, reserve });
  }

  locksOf(project: Project) {
    let locks = this.locks.get(project.id);
    if (!locks)
      this.locks.set(project.id, (locks = new Locks(this.chat.files.realPath(project.path), this.chat.files)));
    return locks;
  }

  // A write waits for any other task holding an overlapping path, then must not land on a file it has not seen
  async reserve(project: Project, taskId: number, policy: Policy, tool: string, input: Record<string, unknown>) {
    const { store, emit } = this.chat;
    const paths = projectWrites(policy, tool, input).map((p) => this.chat.files.realPath(p));
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
        say: { code: 'write.wait', tasks: holders },
        detail: JSON.stringify({ paths }),
      });
      emit('changed', { topic: 'tasks', sessionId: task.sessionId });
    });
    if (got === 'cancelled') return 'Not written: the task was stopped while this write waited its turn.';
    if (got === 'deadlock')
      return `Blocked by the crew guard: another task is waiting on files you hold. Finish your step without ${paths.join(', ')} and say so in your handback.`;
    const stale = locks.stale(taskId, store.readBaseline(taskId), fresh, own);
    if (!stale.length) return null;
    store.addEvent({
      sessionId: task.sessionId,
      taskId,
      memberId: null,
      kind: 'stale',
      say: { code: 'write.stale', files: stale },
      detail: null,
    });
    return `Not written: ${stale.join(', ')} changed since this task last read it (another task or the user changed it while you waited). Read it again and redo your change on top of the current content.`;
  }

  // A write outside any task, such as the interpreter's own small edit, waits for no one but never lands on a file a task is writing
  async checkFree(project: Project, policy: Policy, tool: string, input: Record<string, unknown>) {
    const paths = projectWrites(policy, tool, input).map((p) => this.chat.files.realPath(p));
    const holders = paths.length ? this.locksOf(project).blockers(0, paths) : [];
    return holders.length
      ? `Not written: task #${holders.join(', #')} is changing ${paths.join(', ')}. Hand the change to that task with reopen_task or wait until it ends.`
      : null;
  }
}
