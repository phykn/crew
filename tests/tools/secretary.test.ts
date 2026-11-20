import { expect, test, vi } from 'vitest';
import { secretaryTools } from '../../src/backend/tools/secretary';
import { never, openChat } from '../support';

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
