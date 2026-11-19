import { expect, test, vi } from 'vitest';
import { Chat } from '../src/main/chat';
import { Store } from '../src/main/db';
import { CREW, fakeCrew, handback, openScratch, reply, type Turn } from './support';

test('a broken step fails after its retries; a stopped task leaves the other running; a restart is resumed', async () => {
  const { store, project, paths, db } = openScratch({ 'a.js': 'a' });
  let release = () => {};
  // Answers only when released, like a long real step
  const held: Turn = (p, o) => new Promise((r) => (release = () => r(reply('', 'claude-research')(p, o) as never)));
  const never: Turn = () => new Promise(() => {});
  const broken = reply('형식 없음', 'claude-research');
  const fake = fakeCrew({ 비서: [reply('실패 보고', 'claude-secretary')], 조사: [broken, broken, broken, broken, held], 기획: [never] });
  const chat = new Chat(store, async () => fake.sdk, CREW, () => {}, paths);
  const p = store.addProject(project);
  chat.seed(p.id);
  const s = store.createSession(p.id);

  const one = chat.tasks.start(s.id, 'research', '조사 1', 'r');
  await vi.waitFor(() => expect(store.readTask(one.id).status).toBe('failed'));
  expect(store.listStepRuns(one.id).map((r) => r.status)).toEqual(['failed', 'failed', 'failed', 'failed']);
  await vi.waitFor(() => expect(fake.calls.at(-1)!.prompt).toContain(`[Task #${one.id} stopped]`));

  const two = chat.tasks.start(s.id, 'research', '조사 2', 'r');
  const three = chat.tasks.start(s.id, 'code', '코드', 'r');
  await vi.waitFor(() => expect(fake.calls.filter((c) => c.role === '조사' || c.role === '기획')).toHaveLength(6));
  expect(chat.tasks.stop(two.id)).toBe(true);
  expect(store.readTask(two.id).status).toBe('stopping');
  release();
  await vi.waitFor(() => expect(store.readTask(two.id).status).toBe('stopped'));
  expect(store.readTask(three.id).status).toBe('running');

  // A restart cuts off what was running; the user's word resumes it from the unfinished step
  const after = new Store(db);
  expect(after.recoverInterrupted()).toEqual([three.id]);
  const fresh = fakeCrew({ 기획: [handback('p', { summary: '계획' }), never] , 리뷰: [never] });
  const again = new Chat(after, async () => fresh.sdk, CREW, () => {}, paths);
  expect(again.tasks.resume(three.id)).toBe(true);
  await vi.waitFor(() => expect(fresh.calls.map((c) => c.role)).toEqual(['기획', '리뷰']));
});
