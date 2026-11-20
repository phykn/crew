import { expect, test, vi } from 'vitest';
import { secretaryTools } from '../../src/backend/tools/secretary';
import { never, openChat, toolText } from '../support';

test('"그거 다시 해줘" with two finished tasks waits on a card, then reopens the one picked', async () => {
  const { store, fake, chat, s } = openChat({ 개발: [never] });
  const code = chat.workflows.shipped.find((w) => w.kind === 'code')!;
  const [one, two] = ['검색', '정렬'].map((title) =>
    store.createTask({ sessionId: s.id, kind: 'code', title, request: 'r', workflow: code }),
  );
  for (const t of [one, two]) store.writeTaskStatus(t.id, 'done', '', 'done');
  secretaryTools(fake.sdk, chat, s.id);
  const reopened = fake.tools.get('reopen_task')!({ change: '그거 다시 해줘' });
  await vi.waitFor(() =>
    expect(store.listMessages(s.id).at(-1)!.question!.options).toEqual([`#${one.id} 검색`, `#${two.id} 정렬`]),
  );
  expect([store.readTask(one.id).status, store.readTask(two.id).status]).toEqual(['done', 'done']);
  chat.questions.answer(store.listMessages(s.id).at(-1)!.question!.id, `#${two.id} 정렬`);
  await reopened;
  expect([store.readTask(one.id).status, store.readTask(two.id).status]).toEqual(['done', 'running']);
});

test("start_task names the task with the particle its title's last sound takes, past the closing quote", async () => {
  const { fake, chat, s } = openChat({ 기획: [never] });
  secretaryTools(fake.sdk, chat, s.id);
  expect(await toolText(fake, 'start_task', { kind: 'code', title: '검색 고치기', request: 'r' })).toBe(
    '업무 #1 "검색 고치기"를 시작했습니다.',
  );
});
