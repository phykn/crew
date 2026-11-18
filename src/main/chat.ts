import fs from 'node:fs';
import path from 'node:path';
import { AgentRun, type QueryFn } from './agent';
import type { Member, Project, Store } from './db';
import { Config, type Crew, type Settings, toolsOf } from './crew';
import { guardMember, type Policy } from './guard';
import { Questions } from './questions';

export type Emit = (channel: 'changed' | 'stream', payload: unknown) => void;
// Where members' own files go, and the files no member may touch
export type Paths = { output: string; protected: string[] };

// The user's conversation with 비서, one live run per session at most
export class Chat {
  live = new Map<number, AgentRun>();
  questions: Questions;

  constructor(
    public store: Store,
    public queryFn: () => Promise<QueryFn>,
    public crew: Crew,
    public emit: Emit,
    public paths: Paths,
  ) {
    this.questions = new Questions(store, emit);
  }

  settings(member: Member) {
    return this.crew.settings(this.crew.find(member.key), Config.parse(member.config));
  }

  policy(member: Member, project: Project, scope: string): Policy {
    const def = this.crew.find(member.key);
    const settings = this.settings(member);
    const output = path.join(this.paths.output, String(project.id), scope);
    fs.mkdirSync(output, { recursive: true });
    const mcp = settings.mcp.map(({ server, access }) => ({
      server,
      readTools: access === 'read' ? (this.crew.kit.mcp[server].readTools ?? []) : null,
    }));
    return { key: def.key, role: def.role, tools: toolsOf(settings), write: settings.write, mcp, project: project.path, output, protected: this.paths.protected };
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
    return guardMember({ store: this.store, questions: this.questions, policy, sessionId, taskId, member });
  }

  seed(projectId: number) {
    this.store.seedMembers(projectId, this.crew.defs);
  }

  async send(sessionId: number, text: string) {
    const { store } = this;
    store.addMessage(sessionId, 'user', text);
    this.emit('changed', 'messages');
    const live = this.live.get(sessionId);
    // 비서 is already answering in this session: what the user adds joins that run instead of starting a second one
    if (live) return live.say(text);

    const project = store.readProject(store.readSession(sessionId).projectId);
    const def = this.crew.find('orchestrator');
    const member = store.readMember(project.id, def.key);
    const agentSession = store.openAgentSession(sessionId, member.id);
    const run = new AgentRun(await this.queryFn(), {
      cwd: project.path,
      model: member.model,
      system: this.crew.system(def, this.settings(member)),
      mcpServers: this.crew.mcpServers(this.settings(member)),
      resume: agentSession.claudeId,
      canUseTool: this.guard(member, project, sessionId, null),
      onText: (delta) => this.emit('stream', { sessionId, delta }),
      onReply: (reply) => {
        store.addMessage(sessionId, 'secretary', reply);
        this.emit('stream', { sessionId, done: true });
        this.emit('changed', 'messages');
      },
    });
    this.live.set(sessionId, run);
    const runId = store.startRun(agentSession.id, member.model);
    const out = await run.run(text).finally(() => this.live.delete(sessionId));
    if (out.claudeId) store.writeClaudeId(agentSession.id, out.claudeId);
    store.finishRun(runId, out);
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
