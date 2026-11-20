import { z } from 'zod';
import { type Sdk, text } from '../agents/run';
import type { Chat } from '../chat';
import type { Member } from '../db';

// Reading and writing the project wiki and one's own memory, for 비서 and members alike
export function wikiTools(sdk: Sdk, chat: Chat, member: Member, sessionId: number, taskId: number | null) {
  const { store, wiki } = chat;
  const projectId = store.projectOf(sessionId).id;
  const by = () => ({ memberId: member.id, name: chat.crew.defOf(store.readMemberById(member.id)).role, taskId });
  // In the prompt from the first turn: a tool found only by searching is passed over for the files at hand
  const loaded = { alwaysLoad: true };
  return [
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
      'wiki_write',
      'Create or replace a project wiki document on one topic, its first line saying what it covers; point to related documents with [[title]]. Read it first and keep what is still right.',
      {
        title: z.string().min(1).max(60),
        body: z.string().min(1),
        files: z.array(z.string()).default([]).describe('Project files it is about'),
      },
      async (a) => {
        const old = wiki.find(projectId, a.title);
        wiki.write(projectId, a.title, a.body, { ...by(), files: a.files });
        chat.emit('changed', { topic: 'wiki' });
        return text(`${old ? '수정' : '작성'}: ${a.title}`);
      },
      loaded,
    ),
    sdk.tool(
      'remember',
      'Keep a note only you need in later runs in this project.',
      { text: z.string().min(1) },
      async (a) => {
        wiki.remember(projectId, member.id, a.text, { taskId, sessionId });
        chat.emit('changed', { topic: 'wiki' });
        return text('기억했습니다.');
      },
      loaded,
    ),
  ];
}
