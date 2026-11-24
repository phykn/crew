import type { Image, Mode, Say } from '../../shared';
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
// The hub of one app: the user's conversation with the interpreter, and the parts the crew works through
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

  // Hands the interpreter something to answer in the chat: the user's words, or a task's result to report
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
          // A message said mid-run is still to be answered, so the chat keeps showing the interpreter at it
          if (more) this.emit('stream', { sessionId, delta: '' });
        },
      });
      if (out.status !== 'done') this.post(sessionId, '', null, failure(out.status, out.error));
    } catch (err) {
      // Without a message the chat would show the interpreter answering forever
      this.post(sessionId, '', null, failure('failed', err instanceof Error ? err.message : String(err)));
    }
    // A card the interpreter left open, as when its answer was stopped, has no one waiting for it any more
    for (const id of store.openQuestionIds(sessionId, null)) this.questions.cancel(id);
  }

  // The interpreter's words in the chat: the message, the end of its stream, and a refresh
  post(sessionId: number, text: string, taskId: number | null = null, say: Say | null = null) {
    // A session deleted while the interpreter was answering has nowhere to take the words
    if (!this.store.hasSession(sessionId)) return;
    this.store.addMessage(sessionId, 'secretary', text, null, [], taskId, say);
    this.emit('stream', { sessionId, done: true });
    this.emit('changed', { topic: 'messages', sessionId });
    this.emit('notify', { sessionId, text, say });
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

  // A fresh session on the same project and crew (New session, /clear): the interpreter starts without context and older sessions' tasks go on
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

function failure(status: string, error?: string): Say {
  if (status === 'limit') return { code: 'chat.limit' };
  if (status === 'stopped') return { code: 'chat.stopped' };
  return { code: 'chat.error', error: error ?? null };
}
