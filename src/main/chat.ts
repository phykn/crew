import fs from 'node:fs';
import path from 'node:path';
import type { Options } from '@anthropic-ai/claude-agent-sdk';
import { AgentRun, type RunOutput, type Sdk } from './agent';
import type { Member, Project, Store } from './db';
import { z } from 'zod';
import { Config, type Crew, parseDefinition, type Settings, toolsOf } from './crew';
import { guardMember, projectWrites, type Policy } from './guard';
import { Locks, realPath } from './locks';
import { Questions } from './questions';
import { secretaryTools } from './crew-tools';
import { Tasks } from './task';
import { readWorkflows, type Workflow } from './workflow';

export type Emit = (channel: 'changed' | 'stream', payload: unknown) => void;
// Where members' own files go, and the files no member may touch
export type Paths = { output: string; protected: string[] };

const Draft = z.object({
  key: z.string().regex(/^[a-z][a-z0-9_]*$/).describe('The role in lowercase English, such as translator'),
  definition: z.string().describe('The whole definition: front matter and instructions'),
});
const HIRE_SCHEMA = z.toJSONSchema(Draft, { target: 'draft-7', io: 'input' }) as Record<string, unknown>;

type RunOptions = {
  schema?: Record<string, unknown>;
  mcpServers?: Options['mcpServers'];
  onText?: (delta: string) => void;
  onReply?: (text: string) => void;
};

// The hub of one app: the user's conversation with 비서, and every member run the crew's tasks start
export class Chat {
  // 비서's live run per session, so what the user adds mid-answer joins it
  live = new Map<number, AgentRun>();
  // One lane per agent session: a member works on one task at a time and the rest wait their turn
  lanes = new Map<number, Promise<unknown>>();
  questions: Questions;
  tasks: Tasks;
  // Runs in progress per member, so a member let go at work leaves only when they end
  busy = new Map<number, number>();
  // Member runs at work on each task, so stopping a task can interrupt them
  working = new Map<number, Set<AgentRun>>();
  // Write reservations per project folder
  locks = new Map<number, Locks>();
  workflows: Workflow[];

  constructor(
    public store: Store,
    public sdk: () => Promise<Sdk>,
    public crew: Crew,
    public emit: Emit,
    public paths: Paths,
  ) {
    this.questions = new Questions(store, emit);
    this.workflows = readWorkflows(crew.dir);
    this.tasks = new Tasks(this);
  }

  settings(member: Member) {
    return this.crew.settings(this.crew.defOf(member), Config.parse(member.config));
  }

  policy(member: Member, project: Project, scope: string): Policy {
    const def = this.crew.defOf(member);
    const settings = this.settings(member);
    const output = this.outputDir(project, scope);
    const mcp = settings.mcp.map(({ server, access }) => ({
      server,
      readTools: access === 'read' ? (this.crew.kit.mcp[server].readTools ?? []) : null,
    }));
    return { key: def.key, role: def.role, tools: toolsOf(settings), write: settings.write, mcp, project: project.path, output, protected: this.paths.protected };
  }

  outputDir(project: Project, scope: string) {
    const dir = path.join(this.paths.output, String(project.id), scope);
    fs.mkdirSync(dir, { recursive: true });
    return dir;
  }

  setPermissions(memberId: number, config: Config) {
    this.crew.checkConfig(config);
    const member = this.store.readMemberById(memberId);
    const merged = { ...member.config, ...config };
    // Only names of what changed are recorded: server settings may hold credentials
    this.store.writeConfig(memberId, merged, describeChange(this.settings(member), this.settings({ ...member, config: merged })));
  }

  guard(member: Member, project: Project, sessionId: number, taskId: number | null) {
    const scope = taskId ? `task-${taskId}` : `session-${sessionId}`;
    // Read from the record on every call, so a permission changed or revoked mid-run applies to the next call
    const policy = () => this.policy(this.store.readMemberById(member.id), project, scope);
    const reserve = taskId ? (tool: string, input: Record<string, unknown>) => this.reserve(project, taskId, policy(), tool, input) : undefined;
    return guardMember({ store: this.store, questions: this.questions, policy, sessionId, taskId, member, reserve });
  }

  locksOf(project: Project) {
    let locks = this.locks.get(project.id);
    if (!locks) this.locks.set(project.id, (locks = new Locks(realPath(project.path))));
    return locks;
  }

  // A write waits for any other task holding an overlapping path, then must not land on a file it has not seen
  async reserve(project: Project, taskId: number, policy: Policy, tool: string, input: Record<string, unknown>) {
    const paths = projectWrites(policy, tool, input).map(realPath);
    if (!paths.length) return null;
    const locks = this.locksOf(project);
    const task = this.store.readTask(taskId);
    // Only paths newly taken are checked: while the task holds a path, the changes on it are its own
    const fresh = paths.filter((p) => !locks.held.get(taskId)?.has(p));
    const got = await locks.reserve(taskId, paths, (holders) => {
      this.store.addEvent({ sessionId: task.sessionId, taskId, memberId: null, kind: 'waiting', text: `쓰기 예약 대기: 업무 #${holders.join(', #')}가 같은 범위를 쓰는 중`, detail: JSON.stringify({ paths }) });
      this.emit('changed', 'tasks');
    });
    if (got === 'deadlock') return `Blocked by the crew guard: another task is waiting on files you hold. Finish your step without ${paths.join(', ')} and say so in your handback.`;
    const stale = locks.stale(taskId, this.store.readBaseline(taskId), fresh);
    if (!stale.length) return null;
    this.store.addEvent({ sessionId: task.sessionId, taskId, memberId: null, kind: 'stale', text: `다시 읽어야 할 파일: ${stale.join(', ')}`, detail: null });
    return `Not written: ${stale.join(', ')} changed since this task last read it (another task or the user changed it while you waited). Read it again and redo your change on top of the current content.`;
  }

  seed(projectId: number) {
    this.store.seedMembers(projectId, this.crew.defs);
  }

  // Runs one member in its own Claude session for this app session, after whatever it is already doing
  runMember(member: Member, sessionId: number, taskId: number | null, prompt: string, opts: RunOptions = {}): Promise<RunOutput> {
    const agentSession = this.store.openAgentSession(sessionId, member.id);
    const before = this.lanes.get(agentSession.id) ?? Promise.resolve();
    const turn = before.then(() => this.execute(member, sessionId, taskId, prompt, opts));
    this.lanes.set(agentSession.id, turn.catch(() => undefined));
    return turn;
  }

  async execute(member: Member, sessionId: number, taskId: number | null, prompt: string, opts: RunOptions) {
    const { store } = this;
    // The member may have changed while it waited in its lane
    member = store.readMemberById(member.id);
    const project = store.readProject(store.readSession(sessionId).projectId);
    const def = this.crew.defOf(member);
    const settings = this.settings(member);
    const agentSession = store.openAgentSession(sessionId, member.id);
    // A Claude session started on another model is not continued; the new one is handed what came before
    const resume = agentSession.claudeId && agentSession.model === member.model ? agentSession.claudeId : null;
    if (agentSession.claudeId && !resume) prompt = `${this.handoff(member, sessionId)}\n\n${prompt}`;
    const run = new AgentRun((await this.sdk()).query, {
      cwd: project.path,
      model: member.model,
      system: this.crew.system(def, settings),
      mcpServers: { ...this.crew.mcpServers(settings), ...opts.mcpServers },
      resume,
      canUseTool: this.guard(member, project, sessionId, taskId),
      schema: opts.schema,
      onText: opts.onText,
      onReply: opts.onReply,
    });
    const secretary = member.key === 'orchestrator';
    if (secretary) this.live.set(sessionId, run);
    // A run that waited in its lane for a task the user stopped meanwhile never starts
    if (taskId && ['stopping', 'stopped'].includes(store.readTask(taskId).status)) return { status: 'stopped', text: '' } as RunOutput;
    const mine = taskId ? (this.working.get(taskId) ?? new Set<AgentRun>()) : null;
    if (taskId && mine) this.working.set(taskId, mine.add(run));
    const runId = store.startRun(agentSession.id, member.model, taskId);
    this.busy.set(member.id, (this.busy.get(member.id) ?? 0) + 1);
    const out = await run.run(prompt).finally(() => {
      if (secretary) this.live.delete(sessionId);
      mine?.delete(run);
      this.busy.set(member.id, this.busy.get(member.id)! - 1);
    });
    // A member let go mid-run leaves once this run, its last, has ended
    if (!this.busy.get(member.id) && store.readMemberById(member.id).leaving) this.leave(member.id);
    if (out.claudeId) store.writeClaudeId(agentSession.id, out.claudeId, member.model);
    store.finishRun(runId, out);
    return out;
  }

  // Letting go is idempotent: a second press while leaving or gone changes nothing
  fire(memberId: number) {
    const m = this.store.readMemberById(memberId);
    if (m.status !== 'hired' || m.leaving) return false;
    if (this.busy.get(memberId)) {
      this.store.writeLeaving(memberId, true);
      this.note(m, 'leave', `${this.crew.defOf(m).role}(${m.nickname}) 퇴장 예정: 맡은 단계를 마치고 나갑니다`);
    } else this.leave(memberId);
    return true;
  }

  leave(memberId: number) {
    const m = this.store.readMemberById(memberId);
    this.store.transact(() => {
      this.store.writeLeaving(memberId, false);
      this.store.updateMember(memberId, { status: 'unhired' });
    });
    this.note(m, 'leave', `${this.crew.defOf(m).role}(${m.nickname}) 퇴장`);
    this.emit('changed', 'members');
  }

  // A crew change is logged in the project's latest session, where the user is looking
  note(m: Member, kind: string, text: string) {
    const session = this.store.listSessions(m.projectId).at(-1);
    if (session) this.store.addEvent({ sessionId: session.id, taskId: null, memberId: m.id, kind, text, detail: null });
  }

  // 인사 designs the missing member; the app checks the definition and adds it as a regular or a temp
  async hire(sessionId: number, need: string, temp: boolean) {
    const { store } = this;
    const project = store.readProject(store.readSession(sessionId).projectId);
    const members = store.listMembers(project.id);
    const existing = members.map((m) => `- ${this.crew.defOf(m).role} (${m.key}, ${m.nickname}): ${this.crew.defOf(m).description}`).join('\n');
    const kit = `Skills: ${Object.keys(this.crew.kit.skills).join(', ')}. MCP servers: ${Object.keys(this.crew.kit.mcp).join(', ')}.`;
    const prompt = [`[Hire] The crew needs: ${need}`, `As a ${temp ? 'temp (알바)' : 'regular'}.`, `# Existing members\n${existing}`, `# Kit\n${kit}`].join('\n\n');
    const out = await this.runMember(store.readMember(project.id, 'hr'), sessionId, null, prompt, { schema: HIRE_SCHEMA });
    const draft = Draft.safeParse(out.structured);
    if (!draft.success) return `인사가 정의를 만들지 못했습니다: ${out.error ?? '형식이 맞지 않습니다'}`;
    const { key } = draft.data;
    let definition = draft.data.definition;
    let def;
    try {
      def = parseDefinition(key, definition);
      this.crew.checkConfig({ skills: def.skills, mcp: def.mcp.map((server) => ({ server, access: 'all' as const })) });
    } catch (err) {
      return `인사의 정의가 맞지 않습니다: ${String(err)}`;
    }
    if (members.some((m) => m.key === key || this.crew.defOf(m).role === def.role)) return `${def.role}(${key})는 이미 있습니다.`;
    // The role line is how a run knows who it is; a draft that left it out still gets it
    if (!def.instructions.includes(`**${def.role}**`)) definition = definition.replace(/\n---\r?\n/, `\n---\n\nYou are the crew's **${def.role}**.\n\n`);
    const member = store.addMember(project.id, { key, nickname: def.nickname, model: def.model, definition, temp });
    this.note(member, 'hire', `${def.role}(${def.nickname}) ${temp ? '알바로' : '정규로'} 고용`);
    this.emit('changed', 'members');
    return `${def.role}(${def.nickname})을 ${temp ? '알바로' : '정규로'} 고용했습니다. key: ${key}`;
  }

  // What a member's earlier Claude session knew, for a fresh one: the conversation for 비서, its own handbacks for the rest
  handoff(member: Member, sessionId: number) {
    const { store } = this;
    const lines =
      member.key === 'orchestrator'
        ? store.listMessages(sessionId).slice(-30).map((m) => `${m.author === 'user' ? 'User' : '비서'}: ${m.text}`)
        : store
            .listTasks(sessionId)
            .flatMap((t) => store.listStepRuns(t.id).filter((r) => r.memberId === member.id && r.handback))
            .slice(-10)
            .map((r) => `Task #${r.taskId} ${r.stepId}: ${r.handback!.summary}`);
    return ['[Handoff] Your earlier session in this conversation cannot be continued (the model changed). What happened so far:', ...lines].join('\n');
  }

  async send(sessionId: number, text: string) {
    this.store.addMessage(sessionId, 'user', text);
    this.emit('changed', 'messages');
    await this.tell(sessionId, text);
  }

  // Hands 비서 something to answer in the chat: the user's words, or a task's result to report
  async tell(sessionId: number, text: string) {
    const live = this.live.get(sessionId);
    if (live) return live.say(text);
    const { store } = this;
    const project = store.readProject(store.readSession(sessionId).projectId);
    const member = store.readMember(project.id, 'orchestrator');
    const sdk = await this.sdk();
    const out = await this.runMember(member, sessionId, null, text, {
      mcpServers: { crew: secretaryTools(sdk, this, sessionId) },
      onText: (delta) => this.emit('stream', { sessionId, delta }),
      onReply: (reply) => {
        store.addMessage(sessionId, 'secretary', reply);
        this.emit('stream', { sessionId, done: true });
        this.emit('changed', 'messages');
      },
    });
    if (out.status !== 'done') {
      store.addMessage(sessionId, 'secretary', failureText(out.status, out.error));
      this.emit('stream', { sessionId, done: true });
      this.emit('changed', 'messages');
    }
  }
}

function describeChange(before: Settings, after: Settings) {
  const diff = (label: string, a: string[], b: string[]) => [
    ...b.filter((x) => !a.includes(x)).map((x) => `${label} +${x}`),
    ...a.filter((x) => !b.includes(x)).map((x) => `${label} -${x}`),
  ];
  const mcp = (s: Settings) => s.mcp.map((m) => `${m.server}(${m.access === 'all' ? '전체' : '읽기'})`);
  const parts = [
    ...diff('도구', before.tools, after.tools),
    ...diff('스킬', before.skills, after.skills),
    ...diff('MCP', mcp(before), mcp(after)),
    ...(before.write !== after.write ? [`쓰기 ${before.write} → ${after.write}`] : []),
  ];
  return parts.join(', ') || '변경 없음';
}

function failureText(status: string, error?: string) {
  if (status === 'limit') return '모델 사용 한도에 도달해 답하지 못했습니다. 한도가 풀린 뒤 다시 말씀해 주세요.';
  if (status === 'stopped') return '답변을 멈췄습니다.';
  return `답하는 중 오류가 났습니다: ${error ?? '알 수 없는 오류'}`;
}
