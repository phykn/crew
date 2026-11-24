import type { Chat } from './chat';
import type { Task } from '../domain/records';

const HEAD = (projectId: number) => `wiki.head.${projectId}`;

// The librarian keeps the wiki on its own, beside the crew's work: after each task ends, and for commits made outside the app
export class Librarian {
  // One run at a time per project, so two never rewrite the same documents at once
  queues = new Map<number, Promise<unknown>>();

  constructor(private chat: Chat) {}

  afterTask(task: Task, report: string) {
    this.run(
      task.sessionId,
      [
        `[Task #${task.id} ended] Fold what it settled into the wiki.`,
        'Sources: the report below, every agent memory in .crew/memory/, and the files and commits it changed.',
        report,
      ].join('\n\n'),
    );
  }

  // A project seen for the first time only marks where it stands; reading its whole history would cost a run nobody asked for
  async catchUp(projectId: number) {
    const { store, versions } = this.chat;
    const head = await versions.head(store.readProject(projectId).path);
    const seen = store.readSetting(HEAD(projectId));
    if (!head || head === seen) return;
    const [session] = store.listSessions(projectId);
    if (seen && session)
      this.run(
        session.id,
        `[Commits since ${seen}] Read them with \`git log --stat ${seen}..${head}\` and fold what they settled into the wiki.`,
      );
    store.writeSetting(HEAD(projectId), head);
  }

  run(sessionId: number, prompt: string) {
    const { store } = this.chat;
    const projectId = store.projectOf(sessionId).id;
    const member = store.listMembers(projectId).find((m) => m.key === 'librarian');
    if (!member || member.status !== 'hired') return;
    const before = this.queues.get(projectId) ?? Promise.resolve();
    const turn = before.then(async () => {
      // A session deleted while waiting has nowhere to run
      if (!store.hasSession(sessionId)) return;
      await this.chat.runs.run(member, sessionId, null, prompt, {
        mcpServers: { crew: await this.chat.tools.librarian(sessionId) },
      });
    });
    this.queues.set(
      projectId,
      turn.catch(() => undefined),
    );
  }
}
