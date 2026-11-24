import type { Image, Mode } from '../../shared';
import type { Crew } from '../domain/crew';
import type { Agent, Feed, Files, Paths, Ports, Records, Secrets, ToolServers, Versions } from './ports';
import { Connections } from './connections';
import { Questions } from './questions';
import { Requests } from './requests';
import { Members } from './members';
import { Runs } from './runs';
import { Tasks } from './tasks';
import { Wiki } from './wiki';
import { Workflows } from './workflows';
// The hub of one app: the user's conversation with 통역, and the parts the crew works through
export class Chat {
  readonly questions: Questions;
  readonly requests: Requests;
  readonly wiki: Wiki;
  readonly members: Members;
  readonly runs: Runs;
  readonly workflows: Workflows;
  readonly tasks: Tasks;

  readonly store: Records;
  readonly agent: Agent;
  readonly secrets: Secrets;
  readonly connections: Connections;
  readonly files: Files;
  readonly versions: Versions;
  readonly crew: Crew;
  readonly emit: Feed;
  readonly paths: Paths;
  readonly tools: ToolServers;

  constructor(ports: Ports) {
    this.store = ports.records;
    this.agent = ports.agent;
    this.secrets = ports.secrets;
    this.files = ports.files;
    this.versions = ports.versions;
    this.crew = ports.crew;
    this.emit = ports.emit;
    this.paths = ports.paths;
    const { store, emit } = this;
    this.questions = new Questions(store, emit);
    this.requests = new Requests(this);
    this.wiki = new Wiki(store);
    this.members = new Members(this);
    this.runs = new Runs(this);
    this.workflows = new Workflows(this);
    this.tasks = new Tasks(this);
    this.connections = new Connections(this);
    this.tools = ports.tools(this);
  }

  async send(sessionId: number, text: string, images: Image[] = []) {
    this.store.addMessage(sessionId, 'user', text, null, images);
    const name = text.replace(/\s+/g, ' ').trim();
    if (name) this.store.nameSession(sessionId, name.length > 18 ? `${name.slice(0, 18)}…` : name);
    this.emit('changed', { topic: 'sessions' });
    this.emit('changed', { topic: 'messages', sessionId });
    await this.tell(sessionId, text, images);
  }

  // Hands 통역 something to answer in the chat: the user's words, or a task's result to report
  async tell(sessionId: number, text: string, images: Image[] = [], taskId: number | null = null) {
    if (this.runs.live(sessionId)?.say(text, images)) return;
    const { store } = this;
    try {
      const member = store.readMember(store.projectOf(sessionId).id, 'interpreter');
      const out = await this.runs.run(member, sessionId, null, text, {
        images,
        mcpServers: { crew: await this.tools.secretary(sessionId) },
        onText: (delta) => this.emit('stream', { sessionId, delta }),
        onReply: (reply, more) => {
          this.post(sessionId, reply, taskId);
          // A message said mid-run is still to be answered, so the chat keeps showing 통역 at it
          if (more) this.emit('stream', { sessionId, delta: '' });
        },
      });
      if (out.status !== 'done') this.post(sessionId, failureText(out.status, out.error));
    } catch (err) {
      // Without a message the chat would show 통역 answering forever
      this.post(sessionId, failureText('failed', err instanceof Error ? err.message : String(err)));
    }
    // A card 통역 left open, as when its answer was stopped, has no one waiting for it any more
    for (const id of store.openQuestionIds(sessionId, null)) this.questions.cancel(id);
  }

  // 통역's words in the chat: the message, the end of its stream, and a refresh
  post(sessionId: number, text: string, taskId: number | null = null) {
    // A session deleted while 통역 was answering has nowhere to take the words
    if (!this.store.hasSession(sessionId)) return;
    this.store.addMessage(sessionId, 'secretary', text, null, [], taskId);
    this.emit('stream', { sessionId, done: true });
    this.emit('changed', { topic: 'messages', sessionId });
    this.emit('notify', { sessionId, text });
  }

  // A folder becomes a project with its own crew
  addProject(dir: string) {
    const project = this.store.addProject(dir);
    this.members.seed(project.id);
    this.emit('changed', { topic: 'projects' });
    return project;
  }

  setMode(projectId: number, mode: Mode) {
    this.store.setMode(projectId, mode);
    this.emit('changed', { topic: 'projects' });
  }

  // A fresh session on the same project and crew (새 세션, /clear): 통역 starts without context and older sessions' tasks go on
  createSession(projectId: number) {
    const session = this.store.createSession(projectId);
    this.emit('changed', { topic: 'sessions' });
    return session;
  }

  renameSession(sessionId: number, title: string) {
    this.store.renameSession(sessionId, title);
    this.emit('changed', { topic: 'sessions' });
  }

  // A deleted session's work stops first, so nothing keeps writing for a record that is gone
  deleteSession(sessionId: number) {
    const tasks = this.store.listTasks(sessionId);
    for (const t of tasks) this.tasks.drop(t.id);
    void this.versions.forget(
      this.store.projectOf(sessionId).path,
      tasks.map((t) => t.id),
    );
    this.runs.live(sessionId)?.stop();
    this.store.deleteSession(sessionId);
    this.emit('changed', { topic: 'sessions' });
  }

  removeProject(projectId: number) {
    for (const s of this.store.listSessions(projectId)) this.deleteSession(s.id);
    this.store.removeProject(projectId);
    this.runs.locks.delete(projectId);
    this.emit('changed', { topic: 'projects' });
  }
}

function failureText(status: string, error?: string) {
  if (status === 'limit') return '모델 사용 한도에 도달해 답하지 못했습니다. 한도가 풀린 뒤 다시 말씀해 주세요.';
  if (status === 'stopped') return '답변을 멈췄습니다.';
  return `답하는 중 오류가 났습니다: ${error ?? '알 수 없는 오류'}`;
}
