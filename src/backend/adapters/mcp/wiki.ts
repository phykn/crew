import { z } from 'zod';
import type { Sdk } from '../claude/agent';
import { text } from './text';
import type { Chat } from '../../app/chat';
import type { Member } from '../../domain/records';

// Reading and writing the project wiki and one's own memory, for 통역 and members alike
export function wikiTools(sdk: Sdk, chat: Chat, member: Member, sessionId: number, taskId: number | null) {
  const { store, wiki } = chat;
  const projectId = store.projectOf(sessionId).id;
  const by = () => ({ memberId: member.id, name: chat.crew.defOf(store.readMemberById(member.id)).role, taskId });
  // In the prompt from the first turn: a tool found only by searching is passed over for the files at hand
  const loaded = { alwaysLoad: true };
  // When this run began, and the titles it was already told overlap a newer document, which it may then write anyway
  const since = new Date().toISOString(),
    warned = new Set<string>();
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
        const old = wiki.find(projectId, a.title),
          fresh = old || warned.has(a.title) ? [] : wiki.createdSince(projectId, since, by().name, a.files);
        if (fresh.length) {
          warned.add(a.title);
          return text(
            `Not written: since your run began, ${fresh.map((t) => `"${t}"`).join(', ')} was written on the same files. ` +
              'Read it with wiki_read and add to it if it covers your topic; if yours is a separate topic, call wiki_write again with the same title.',
          );
        }
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
