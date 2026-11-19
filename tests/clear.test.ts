import { expect, test, vi } from 'vitest';
import { Chat } from '../src/main/chat';
import { CREW, fakeCrew, handback, openScratch, reply, type Turn } from './support';

test('/clear starts an empty 비서 on the same crew while the old session works on; deleting counts what goes', async () => {
  const { store, project, paths } = openScratch({ 'a.md': 'x' });
  let release = () => {};
  const held: Turn = (p, o) => new Promise((r) => (release = () => r(handback('r', { summary: '조사 끝' })(p, o) as never)));
  const fake = fakeCrew({ 조사: [held], 비서: [reply('새 세션입니다', 'claude-new'), reply('보고', 'claude-old')] });
  const chat = new Chat(store, async () => fake.sdk, CREW, () => {}, paths);
  const p = store.addProject(project);
  chat.seed(p.id);
  const old = store.createSession(p.id);
  store.updateMember(store.readMember(p.id, 'researcher').id, { model: 'haiku' });
  const task = chat.tasks.start(old.id, 'research', '조사', 'r');
  await vi.waitFor(() => expect(fake.calls).toHaveLength(1));

  const next = chat.clear(old.id);
  await chat.send(next.id, '안녕');
  expect(fake.calls[1].options.resume).toBeUndefined();
  expect(store.readMember(p.id, 'researcher').model).toBe('haiku');
  release();
  await vi.waitFor(() => expect(store.readTask(task.id).status).toBe('done'));

  const impact = store.impact({ sessionId: old.id });
  expect(impact).toEqual({ sessions: 1, tasks: 1, events: store.listEvents(old.id).length, messages: store.listMessages(old.id).length });
  chat.deleteSession(old.id);
  expect(store.listSessions(p.id).map((s) => s.id)).toEqual([next.id]);
  chat.removeProject(p.id);
  expect(store.listProjects()).toEqual([]);
});
