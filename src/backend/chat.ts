import type { Sdk } from './agents/run';
import type { Store } from './db';
import type { Crew } from './crew/shipped';
import { Questions } from './questions';
import { secretaryTools } from './tools/secretary';
import { Members } from './crew/members';
import { Runs } from './agents/runs';
import { Tasks } from './tasks/engine';
import { Wiki } from './wiki';
import { Workflows } from './tasks/workflow';

export type Emit = (channel: 'changed' | 'stream' | 'navigate' | 'notify', payload: unknown) => void;
// Where members' own files go, and the files no member may touch
export type Paths = { output: string; protected: string[] };

// The hub of one app: the user's conversation with 비서, and the parts the crew works through
export class Chat {
  questions: Questions;
  wiki: Wiki;
  members: Members;
  runs: Runs;
  workflows: Workflows;
  tasks: Tasks;

  constructor(
    public store: Store,
    public sdk: () => Promise<Sdk>,
    public crew: Crew,
    public emit: Emit,
    public paths: Paths,
  ) {
    this.questions = new Questions(store, emit);
    this.wiki = new Wiki(store);
    this.members = new Members(this);
    this.runs = new Runs(this);
    this.workflows = new Workflows(this);
    this.tasks = new Tasks(this);
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
    if (this.runs.live(sessionId)?.say(text)) return;
    const { store } = this;
    const member = store.readMember(store.projectOf(sessionId).id, 'orchestrator');
    const sdk = await this.sdk();
    const out = await this.runs.run(member, sessionId, null, text, {
      mcpServers: { crew: secretaryTools(sdk, this, sessionId) },
      onText: (delta) => this.emit('stream', { sessionId, delta }),
      onReply: (reply, more) => {
        this.post(sessionId, reply);
        // A message said mid-run is still to be answered, so the chat keeps showing 비서 at it
        if (more) this.emit('stream', { sessionId, delta: '' });
      },
    });
    if (out.status !== 'done') this.post(sessionId, failureText(out.status, out.error));
  }

  // 비서's words in the chat: the message, the end of its stream, and a refresh
  post(sessionId: number, text: string) {
    this.store.addMessage(sessionId, 'secretary', text);
    this.emit('stream', { sessionId, done: true });
    this.emit('changed', 'messages');
    this.emit('notify', { sessionId, text });
  }

  // /clear: a fresh session on the same project and crew; 비서 starts without context and the old session's tasks go on
  clear(sessionId: number) {
    const { store } = this;
    const next = store.createSession(store.readSession(sessionId).projectId);
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
    this.runs.live(sessionId)?.stop();
    this.store.deleteSession(sessionId);
  }

  removeProject(projectId: number) {
    for (const s of this.store.listSessions(projectId)) this.deleteSession(s.id);
    this.store.removeProject(projectId);
  }
}

function failureText(status: string, error?: string) {
  if (status === 'limit') return '모델 사용 한도에 도달해 답하지 못했습니다. 한도가 풀린 뒤 다시 말씀해 주세요.';
  if (status === 'stopped') return '답변을 멈췄습니다.';
  return `답하는 중 오류가 났습니다: ${error ?? '알 수 없는 오류'}`;
}
