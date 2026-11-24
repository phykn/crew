import { z } from 'zod';
import { baseKey } from '../../../shared';
import type { Sdk } from '../claude/agent';
import { text } from './text';
import type { Chat } from '../../app/chat';
import type { Member } from '../../domain/records';

// Reading the project wiki and keeping one's own memory, for everyone; writing the wiki is the librarian's alone
export function wikiTools(sdk: Sdk, chat: Chat, member: Member, sessionId: number, taskId: number | null) {
  const { store, wiki } = chat;
  const projectId = store.projectOf(sessionId).id;
  // In the prompt from the first turn: a tool found only by searching is passed over for the files at hand
  const loaded = { alwaysLoad: true };
  const tools = [
    sdk.tool(
      'wiki_read',
      'Read one project wiki document by its title.',
      { title: z.string() },
      async (a) => {
        const doc = wiki.find(projectId, a.title);
        return text(
          doc
            ? `# ${doc.title}\n\n${doc.body}`
            : `"${a.title}" is not in the wiki. Documents: ${
                wiki
                  .list(projectId)
                  .map((d) => d.title)
                  .join(', ') || 'none'
              }`,
        );
      },
      loaded,
    ),
    sdk.tool(
      'remember',
      'Rewrite your own memory for later runs in this project: the whole of it, one line per item, keeping what still holds and fixing what changed. Your current memory is in your prompt.',
      { text: z.string().describe('Your whole memory after this change') },
      async (a) => {
        wiki.remember(projectId, member.id, a.text);
        chat.emit('changed', { topic: 'wiki' });
        return text('Remembered.');
      },
      loaded,
    ),
  ];
  if (baseKey(member.key) !== 'librarian') return tools;
  const by = { name: 'librarian', taskId };
  return [
    ...tools,
    sdk.tool(
      'wiki_write',
      'Create or replace one wiki document on one topic. Its first line says what it covers; point to related documents with [[title]]. The app logs the change and rebuilds index.md.',
      { title: z.string().min(1).max(60), body: z.string().min(1) },
      async (a) => {
        const old = wiki.find(projectId, a.title);
        try {
          wiki.write(projectId, a.title, a.body, by);
        } catch (err) {
          return text(err instanceof Error ? err.message : String(err));
        }
        chat.emit('changed', { topic: 'wiki' });
        return text(`${old ? 'Changed' : 'Written'}: ${wiki.title(a.title)}`);
      },
      loaded,
    ),
    sdk.tool(
      'wiki_delete',
      'Delete one wiki document, such as one merged into another; fix the links that pointed to it.',
      { title: z.string() },
      async (a) => {
        try {
          wiki.remove(projectId, a.title, by);
        } catch (err) {
          return text(err instanceof Error ? err.message : String(err));
        }
        chat.emit('changed', { topic: 'wiki' });
        return text(`Deleted: ${a.title}`);
      },
      loaded,
    ),
  ];
}

// The librarian's own server, for a run outside any task
export function librarianTools(sdk: Sdk, chat: Chat, sessionId: number) {
  const member = chat.store.readMember(chat.store.projectOf(sessionId).id, 'librarian');
  return sdk.createSdkMcpServer({ name: 'crew', tools: wikiTools(sdk, chat, member, sessionId, null) });
}
