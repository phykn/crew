import fs from 'node:fs';
import path from 'node:path';
import type { Options } from '@anthropic-ai/claude-agent-sdk';
import { AgentRun, type RunOutput, type Sdk } from './agent';
import type { Member, Project, Store } from './db';
import { Config, type Crew, type Settings, toolsOf } from './crew';
import { guardMember, projectWrites, type Policy } from './guard';
import { Locks, realPath } from './locks';
import { Questions } from './questions';
import { secretaryTools } from './crew-tools';
import { Tasks } from './task';
import { readWorkflows, type Workflow } from './workflow';

export type Emit = (channel: 'changed' | 'stream', payload: unknown) => void;
// Where members' own files go, and the files no member may touch
export type Paths = { output: string; protected: string[] };

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
    return this.crew.settings(this.crew.find(member.key), Config.parse(member.config));
  }

  policy(member: Member, project: Project, scope: string): Policy {
    const def = this.crew.find(member.key);
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
    const def = this.crew.find(member.key);
    const settings = this.settings(member);
    const agentSession = store.openAgentSession(sessionId, member.id);
    const run = new AgentRun((await this.sdk()).query, {
      cwd: project.path,
      model: member.model,
      system: this.crew.system(def, settings),
      mcpServers: { ...this.crew.mcpServers(settings), ...opts.mcpServers },
      resume: agentSession.claudeId,
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
    const out = await run.run(prompt).finally(() => {
      if (secretary) this.live.delete(sessionId);
      mine?.delete(run);
    });
    if (out.claudeId) store.writeClaudeId(agentSession.id, out.claudeId);
    store.finishRun(runId, out);
    return out;
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
