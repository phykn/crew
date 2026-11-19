import { expect, test, vi } from 'vitest';
import { Chat } from '../src/main/chat';
import { CREW, fakeCrew, handback, openScratch, reply, type Turn } from './support';

test('a usage limit pauses the task and 비서 reports what is done and left; usage adds up per role and model', async () => {
  const { store, project, paths } = openScratch();
  const limited: Turn = (p, o) => [{ type: 'rate_limit_event', rate_limit_info: { status: 'rejected' } } as never, ...(reply('', 'r')(p, o) as never[])];
  const fake = fakeCrew({ 기획: [handback('p', { summary: '계획 완료' })], 리뷰: [limited], 비서: [reply('한도 보고')] });
  const chat = new Chat(store, async () => fake.sdk, CREW, () => {}, paths);
  const p = store.addProject(project);
  chat.seed(p.id);
  const s = store.createSession(p.id);
  const task = chat.tasks.start(s.id, 'code', '검색', 'r');
  await vi.waitFor(() => expect(fake.calls.at(-1)!.role).toBe('비서'));
  expect(store.readTask(task.id).status).toBe('stopped');
  const report = fake.calls.at(-1)!.prompt;
  expect(report).toContain(`[Task #${task.id} paused]`);
  expect(report).toContain('계획 완료');
  expect(report).toMatch(/Left to do\n- 계획 검토\n- 개발/);
  // reply() charges 10 in, 5 out, $0.01 per run
  expect(store.usage(s.id).map((u) => [u.model, u.runs, u.inputTokens, u.outputTokens])).toEqual(
    expect.arrayContaining([['opus', 1, 10, 5], ['opus', 1, 10, 5]]),
  );
});
