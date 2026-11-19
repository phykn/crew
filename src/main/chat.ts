import fs from 'node:fs';
import path from 'node:path';
import type { Options } from '@anthropic-ai/claude-agent-sdk';
import { AgentRun, NOT_HIRED, type RunOutput, type Sdk, skipped } from './agent';
import type { Member, Project, Store } from './db';
import { z } from 'zod';
import { Config, type Crew, parseDefinition, type Settings, toolsOf } from './crew';
import { guardMember, projectWrites, type Policy } from './guard';
import { Locks, realPath } from './locks';
import { Questions } from './questions';
import { secretaryTools } from './crew-tools';
import { appServer } from './app-mcp';
import { Tasks } from './task';
import { Wiki } from './wiki';
import { readWorkflows, validateWorkflow, Workflow as WorkflowShape, type Workflow } from './workflow';

// 앞으로: new tasks from now on; 이번 업무에도: also this task's remaining steps; 이번에만: this task only
export type Scope = 'future' | 'current' | 'once';

export type Emit = (channel: 'changed' | 'stream' | 'navigate', payload: unknown) => void;
// Where members' own files go, and the files no member may touch
export type Paths = { output: string; protected: string[] };

const Draft = z.object({
  fits: z
    .object({ key: z.string(), reason: z.string() })
    .optional()
    .describe('An existing member who already fits the work, instead of a new one: its key and why, in Korean'),
  key: z
    .string()
    .regex(/^[a-z][a-z0-9_]*$/)
    .optional()
    .describe('The role in lowercase English, such as translator'),
  nickname: z.string().min(1).max(12).optional().describe('A Korean nickname unlike the ones in use'),
  definition: z.string().optional().describe('The whole definition: front matter and instructions'),
});
const HIRE_SCHEMA = z.toJSONSchema(Draft, { target: 'draft-7', io: 'input' }) as Record<string, unknown>;

type RunOptions = {
  schema?: Record<string, unknown>;
  mcpServers?: Options['mcpServers'];
  onText?: (delta: string) => void;
  onReply?: (text: string) => void;
  // False once the run is no longer wanted, such as a step of a stopped task or of a drive since replaced
  alive?: () => boolean;
};

type Active = { run: AgentRun; memberId: number; sessionId: number; taskId: number | null; secretary: boolean };

// The hub of one app: the user's conversation with 비서, and every member run the crew's tasks start
export class Chat {
  // Every run at work now: who is busy, what a task has running, and 비서's live run are all read from it
  active = new Set<Active>();
  // One lane per agent session: a member works on one task at a time and the rest wait their turn
  lanes = new Map<number, Promise<unknown>>();
  questions: Questions;
  tasks: Tasks;
  wiki: Wiki;
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
    this.wiki = new Wiki(store);
    this.workflows = readWorkflows(crew.dir);
    this.tasks = new Tasks(this);
  }

  busy(memberId: number) {
    return [...this.active].some((a) => a.memberId === memberId);
  }

  runsOf(taskId: number) {
    return [...this.active].filter((a) => a.taskId === taskId).map((a) => a.run);
  }

  // 비서's run in this session, so what the user adds mid-answer joins it
  liveOf(sessionId: number) {
    return [...this.active].find((a) => a.secretary && a.sessionId === sessionId)?.run;
  }

  // Who a member can name or ask right now, by key
  roster(projectId: number) {
    const hired = this.store.listMembers(projectId).filter((m) => m.status === 'hired');
    return [
      '# Crew now',
      ...hired.map((m) => `- ${m.key} (${this.crew.defOf(m).role}): ${this.crew.defOf(m).description}`),
    ].join('\n');
  }

  // A member as the crew names it: by key, as the rules say, or by its Korean role
  findMember(projectId: number, name: string) {
    return this.store.listMembers(projectId).find((m) => m.key === name || this.crew.defOf(m).role === name) ?? null;
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
    return {
      key: def.key,
      role: def.role,
      tools: toolsOf(settings),
      write: settings.write,
      mcp,
      project: project.path,
      output,
      protected: this.paths.protected,
    };
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
    this.store.writeConfig(
      memberId,
      merged,
      describeChange(this.settings(member), this.settings({ ...member, config: merged })),
    );
  }

  guard(member: Member, project: Project, sessionId: number, taskId: number | null) {
    const scope = taskId ? `task-${taskId}` : `session-${sessionId}`;
    // Read from the record on every call, so a permission changed or revoked mid-run applies to the next call
    const policy = () => this.policy(this.store.readMemberById(member.id), project, scope);
    const reserve = taskId
      ? (tool: string, input: Record<string, unknown>) => this.reserve(project, taskId, policy(), tool, input)
      : undefined;
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
      this.store.addEvent({
        sessionId: task.sessionId,
        taskId,
        memberId: null,
        kind: 'waiting',
        text: `쓰기 예약 대기: 업무 #${holders.join(', #')}가 같은 범위를 쓰는 중`,
        detail: JSON.stringify({ paths }),
      });
      this.emit('changed', 'tasks');
    });
    if (got === 'deadlock')
      return `Blocked by the crew guard: another task is waiting on files you hold. Finish your step without ${paths.join(', ')} and say so in your handback.`;
    const stale = locks.stale(taskId, this.store.readBaseline(taskId), fresh);
    if (!stale.length) return null;
    this.store.addEvent({
      sessionId: task.sessionId,
      taskId,
      memberId: null,
      kind: 'stale',
      text: `다시 읽어야 할 파일: ${stale.join(', ')}`,
      detail: null,
    });
    return `Not written: ${stale.join(', ')} changed since this task last read it (another task or the user changed it while you waited). Read it again and redo your change on top of the current content.`;
  }

  seed(projectId: number) {
    this.store.seedMembers(
      projectId,
      this.crew.defs.map((d) => ({ ...d, nickname: this.crew.nicknames[d.key] })),
    );
  }

  // Runs one member in its own Claude session for this app session, after whatever it is already doing
  runMember(
    member: Member,
    sessionId: number,
    taskId: number | null,
    prompt: string,
    opts: RunOptions = {},
  ): Promise<RunOutput> {
    const agentSession = this.store.openAgentSession(sessionId, member.id);
    const before = this.lanes.get(agentSession.id) ?? Promise.resolve();
    const turn = before.then(() => this.execute(member, sessionId, taskId, prompt, opts));
    this.lanes.set(
      agentSession.id,
      turn.catch(() => undefined),
    );
    return turn;
  }

  async execute(member: Member, sessionId: number, taskId: number | null, prompt: string, opts: RunOptions) {
    const { store } = this;
    // The member may have changed while it waited in its lane
    member = store.readMemberById(member.id);
    if (member.status !== 'hired' || member.leaving) return skipped('failed', NOT_HIRED);
    const project = store.projectOf(sessionId);
    const def = this.crew.defOf(member);
    const settings = this.settings(member);
    const agentSession = store.openAgentSession(sessionId, member.id);
    // A Claude session started on another model is not continued; the new one is handed what came before
    const resume = agentSession.claudeId && agentSession.model === member.model ? agentSession.claudeId : null;
    if (agentSession.claudeId && !resume) prompt = `${this.handoff(member, sessionId)}\n\n${prompt}`;
    const sdk = await this.sdk();
    const run = new AgentRun(sdk.query, {
      cwd: project.path,
      model: member.model,
      system: [this.crew.system(def, settings), this.roster(project.id), this.wiki.context(project.id, member.id)].join(
        '\n\n',
      ),
      mcpServers: {
        ...this.crew.mcpServers(settings),
        ...(settings.mcp.some((m) => m.server === 'app') ? { app: appServer(sdk, this, sessionId) } : {}),
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
    const out = await run.run(prompt).finally(() => this.active.delete(active));
    // A member let go mid-run leaves once this run, its last, has ended
    if (!this.busy(member.id) && store.readMemberById(member.id).leaving) this.leave(member.id);
    if (out.claudeId) store.writeClaudeId(agentSession.id, out.claudeId, member.model);
    store.finishRun(runId, out);
    return out;
  }

  // The rules a project runs for a kind: its latest saved version, or the shipped one as version 0
  workflowFor(projectId: number, kind: string) {
    const saved = this.store.latestWorkflow(projectId, kind);
    if (saved) return saved;
    const shipped = this.workflows.find((w) => w.kind === kind);
    if (!shipped) throw new Error(`no workflow ${kind}`);
    return { version: 0, rules: shipped, layout: null };
  }

  // One place for the editor's and 비서's changes, so both make the same kind of version
  saveWorkflow(o: {
    projectId: number;
    kind: string;
    base: number;
    rules: unknown;
    layout?: unknown;
    author: string;
    scope: Scope;
    taskId?: number;
  }) {
    const parsed = WorkflowShape.safeParse(o.rules);
    if (!parsed.success)
      return { ok: false as const, problems: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`) };
    const rules = { ...parsed.data, kind: o.kind };
    const keys = this.store
      .listMembers(o.projectId)
      .filter((m) => m.status === 'hired')
      .map((m) => m.key);
    const problems = validateWorkflow(rules, keys);
    // A broken edit is refused whole, so the last valid version stays in force
    if (problems.length) return { ok: false as const, problems };
    if (o.scope !== 'future' && !o.taskId) return { ok: false as const, problems: ['적용할 업무가 없습니다'] };
    if (o.scope !== 'once') {
      const version = this.store.addWorkflowVersion(o.projectId, o.kind, o.base, rules, o.layout, o.author);
      if (version === null)
        return {
          ok: false as const,
          problems: [`버전 ${o.base} 이후에 다른 변경이 저장되었습니다. 최신 규칙을 다시 읽고 고치세요`],
        };
    }
    if (o.taskId && o.scope !== 'future') this.store.writeTaskWorkflow(o.taskId, rules);
    this.emit('changed', 'workflows');
    return { ok: true as const, version: this.workflowFor(o.projectId, o.kind).version };
  }

  // Deleting a document tied to a rule either leaves the rule in force or puts back the rule from before it
  removeDoc(docId: number, releaseRule: boolean, by: { memberId: number | null; name: string }) {
    const doc = this.wiki.read(docId);
    if (releaseRule && doc.workflowKind && doc.workflowVersion) {
      if (this.workflowFor(doc.projectId, doc.workflowKind).version !== doc.workflowVersion) {
        return {
          ok: false as const,
          problems: ['이 문서 뒤에 저장된 규칙이 있어 되돌리지 않았습니다. 워크플로우 탭에서 직접 고치세요'],
        };
      }
      const prev =
        this.store.readWorkflowVersion(doc.projectId, doc.workflowKind, doc.workflowVersion - 1) ??
        this.workflows.find((w) => w.kind === doc.workflowKind)!;
      const base = this.workflowFor(doc.projectId, doc.workflowKind).version;
      const r = this.saveWorkflow({
        projectId: doc.projectId,
        kind: doc.workflowKind,
        base,
        rules: prev,
        author: by.name,
        scope: 'future',
      });
      if (!r.ok) return r;
    }
    this.wiki.remove(docId, by);
    this.emit('changed', 'wiki');
    return { ok: true as const };
  }

  // /clear: a fresh session on the same project and crew; 비서 starts without context and the old session's tasks go on
  clear(sessionId: number) {
    const { store } = this;
    const old = store.readSession(sessionId);
    const next = store.createSession(old.projectId);
    store.addEvent({
      sessionId,
      taskId: null,
      memberId: null,
      kind: 'clear',
      text: `/clear: 세션 ${String(next.number).padStart(2, '0')}에서 새로 시작`,
      detail: null,
    });
    return next;
  }

  // A deleted session's work stops first, so nothing keeps writing for a record that is gone
  deleteSession(sessionId: number) {
    for (const t of this.store.listTasks(sessionId)) this.tasks.drop(t.id);
    this.liveOf(sessionId)?.stop();
    this.store.deleteSession(sessionId);
  }

  removeProject(projectId: number) {
    for (const s of this.store.listSessions(projectId)) this.deleteSession(s.id);
    this.store.removeProject(projectId);
  }

  // Letting go is idempotent: a second press while leaving or gone changes nothing
  fire(memberId: number) {
    const m = this.store.readMemberById(memberId);
    if (m.status !== 'hired' || m.leaving) return false;
    if (this.busy(memberId)) {
      this.store.writeLeaving(memberId, true);
      this.note(m, 'leave', `${this.crew.defOf(m).role}(${m.nickname}) 퇴장 예정: 맡은 단계를 마치고 나갑니다`);
    } else this.leave(memberId);
    return true;
  }

  rehire(memberId: number) {
    this.store.transact(() => {
      this.store.writeLeaving(memberId, false);
      this.store.updateMember(memberId, { status: 'hired' });
    });
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
    const project = store.projectOf(sessionId);
    const members = store.listMembers(project.id);
    const existing = members
      .map((m) => `- ${this.crew.defOf(m).role} (${m.key}): ${this.crew.defOf(m).description}`)
      .join('\n');
    const nicknames = members.map((m) => m.nickname).join(', ');
    const kit = `Skills: ${Object.keys(this.crew.kit.skills).join(', ')}. MCP servers: ${Object.keys(this.crew.kit.mcp).join(', ')}.`;
    const prompt = [
      `[Hire] The crew needs: ${need}`,
      `As a ${temp ? 'temp (알바)' : 'regular'}.`,
      `# Existing members\n${existing}`,
      `# Nicknames in use\n${nicknames}`,
      `# Kit\n${kit}`,
    ].join('\n\n');
    const out = await this.runMember(store.readMember(project.id, 'hr'), sessionId, null, prompt, {
      schema: HIRE_SCHEMA,
    });
    const draft = Draft.safeParse(out.structured);
    if (!draft.success) return `인사가 정의를 만들지 못했습니다: ${out.error ?? '형식이 맞지 않습니다'}`;
    const { fits, key, nickname } = draft.data;
    const fit = fits && this.findMember(project.id, fits.key);
    if (fit) return `새로 뽑지 않았습니다. ${this.crew.defOf(fit).role}(${fit.key})이 이미 맞습니다: ${fits.reason}`;
    if (!key || !nickname || !draft.data.definition)
      return '인사가 정의를 만들지 못했습니다: 키, 별명, 정의가 모두 있어야 합니다';
    let definition = draft.data.definition;
    let def;
    try {
      def = parseDefinition(key, definition);
      this.crew.checkConfig({ skills: def.skills, mcp: def.mcp.map((server) => ({ server, access: 'all' as const })) });
    } catch (err) {
      return `인사의 정의가 맞지 않습니다: ${String(err)}`;
    }
    if (members.some((m) => m.key === key || this.crew.defOf(m).role === def.role))
      return `${def.role}(${key})는 이미 있습니다.`;
    // The role line is how a run knows who it is; a draft that left it out still gets it
    if (!def.instructions.includes(`**${def.role}**`))
      definition = definition.replace(/\n---\r?\n/, `\n---\n\nYou are the crew's **${def.role}** (${key}).\n\n`);
    const member = store.addMember(project.id, { key, nickname, model: def.model, definition, temp });
    this.note(member, 'hire', `${def.role}(${nickname}) ${temp ? '알바로' : '정규로'} 고용`);
    this.emit('changed', 'members');
    return `${def.role}(${nickname})을 ${temp ? '알바로' : '정규로'} 고용했습니다. key: ${key}`;
  }

  // What a member's earlier Claude session knew, for a fresh one: the conversation for 비서, its own handbacks for the rest
  handoff(member: Member, sessionId: number) {
    const { store } = this;
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

  async send(sessionId: number, text: string) {
    this.store.addMessage(sessionId, 'user', text);
    const name = text.replace(/\s+/g, ' ').trim();
    this.store.nameSession(sessionId, name.length > 18 ? `${name.slice(0, 18)}…` : name);
    this.emit('changed', 'sessions');
    this.emit('changed', 'messages');
    await this.tell(sessionId, text);
  }

  // Hands 비서 something to answer in the chat: the user's words, or a task's result to report
  async tell(sessionId: number, text: string) {
    if (this.liveOf(sessionId)?.say(text)) return;
    const { store } = this;
    const member = store.readMember(store.projectOf(sessionId).id, 'orchestrator');
    const sdk = await this.sdk();
    const out = await this.runMember(member, sessionId, null, text, {
      mcpServers: { crew: secretaryTools(sdk, this, sessionId) },
      onText: (delta) => this.emit('stream', { sessionId, delta }),
      onReply: (reply) => this.post(sessionId, reply),
    });
    if (out.status !== 'done') this.post(sessionId, failureText(out.status, out.error));
  }

  // 비서's words in the chat: the message, the end of its stream, and a refresh
  post(sessionId: number, text: string) {
    this.store.addMessage(sessionId, 'secretary', text);
    this.emit('stream', { sessionId, done: true });
    this.emit('changed', 'messages');
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
