import type { CanUseTool } from '@anthropic-ai/claude-agent-sdk';
import { AgentRun, type QueryFn } from './agent';
import type { Store } from './db';
import { type Crew, toolsOf } from './crew';

export type Emit = (channel: 'changed' | 'stream', payload: unknown) => void;

// The user's conversation with 비서, one live run per session at most
export class Chat {
  live = new Map<number, AgentRun>();

  constructor(
    public store: Store,
    public queryFn: () => Promise<QueryFn>,
    public crew: Crew,
    public emit: Emit,
  ) {}

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
      system: this.crew.system(def),
      resume: agentSession.claudeId,
      allowedTools: toolsOf(def),
      canUseTool: denyOthers,
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

// Until the guard exists, anything a role does not pre-allow is refused
const denyOthers: CanUseTool = async (name) => ({ behavior: 'deny', message: `${name} is not allowed for this role` });

function failureText(status: string, error?: string) {
  if (status === 'limit') return '모델 사용 한도에 도달해 답하지 못했습니다. 한도가 풀린 뒤 다시 말씀해 주세요.';
  if (status === 'stopped') return '답변을 멈췄습니다.';
  return `답하는 중 오류가 났습니다: ${error ?? '알 수 없는 오류'}`;
}
