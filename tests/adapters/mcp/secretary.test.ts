import { expect, test, vi } from 'vitest';
import { secretaryTools } from '../../../src/backend/adapters/mcp/secretary';
import { never, openChat, recordedAgents, reply, toolText } from '../../support';

test('"그거 다시 해줘" with two finished tasks waits on a card, then reopens the one picked', async () => {
  const { store, fake, chat, s } = openChat({ '코드 작성': [never] });
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
  const { fake, chat, s } = openChat({ 지휘: [never] });
  secretaryTools(fake.sdk, chat, s.id);
  expect(await toolText(fake, 'start_task', { kind: 'code', title: '검색 고치기', request: 'r', original: 'r' })).toBe(
    '업무 #1 "검색 고치기"를 시작했습니다.',
  );
});

test('a question to a member at work is answered by a copy of its session, which cannot write, while the work goes on', async () => {
  const { store, fake, chat, p, s } = openChat({
    '코드 작성': [
      reply('검색을 맡았습니다', 'claude-dev'),
      never,
      reply('빈 검색어 처리를 고치는 중입니다', 'claude-copy'),
    ],
  });
  const coder = store.readMember(p.id, 'coder');
  secretaryTools(fake.sdk, chat, s.id);
  expect(await toolText(fake, 'ask_member', { role: '코드 작성', question: '지금 뭐 해?' })).toBe(
    '코드 작성은 이 세션에서 아직 일하지 않아 물어볼 대화가 없습니다.',
  );
  await chat.runs.run(coder, s.id, null, '검색 고쳐줘');
  void chat.runs.run(coder, s.id, null, '이어서 해줘');
  await vi.waitFor(() => expect(chat.runs.busy(coder.id)).toBe(true));

  expect(await toolText(fake, 'ask_member', { role: '코드 작성', question: '지금 뭐 해?' })).toBe(
    '빈 검색어 처리를 고치는 중입니다',
  );
  const copy = fake.calls.at(-1)!;
  expect([copy.options.resume, copy.options.forkSession]).toEqual(['claude-dev', true]);
  expect(copy.prompt).toContain('지금 뭐 해?');
  const write = await copy.options.canUseTool!('Write', { file_path: 'x' }, {
    signal: new AbortController().signal,
  } as never);
  expect(write?.behavior).toBe('deny');
  // The work is still at work in its own session, and that session is still the one the member continues
  expect(chat.runs.busy(coder.id)).toBe(true);
  expect(fake.calls.filter((c) => c.prompt.includes('지금 뭐 해?'))).toHaveLength(1);
  expect(recordedAgents(store, s.id).find((a) => a.key === 'coder')!.claudeId).toBe('claude-dev');
});

test("change_workflow for one task takes only a task of this conversation and kind, never another project's", async () => {
  const { store, fake, chat, s, project } = openChat();
  const code = chat.workflows.shipped.find((w) => w.kind === 'code')!;
  const elsewhere = store.createSession(store.addProject(`${project}-other`).id);
  const foreign = store.createTask({
    sessionId: elsewhere.id,
    kind: 'code',
    title: '남의 업무',
    request: 'r',
    workflow: code,
  });
  secretaryTools(fake.sdk, chat, s.id);
  const change = (task_id: number) =>
    toolText(fake, 'change_workflow', {
      kind: 'code',
      base_version: 0,
      rules: { ...code, label: '바뀜' },
      scope: 'once',
      task_id,
    });
  expect(await change(foreign.id)).toContain('저장하지 않았습니다');
  expect(await change(999)).toContain('저장하지 않았습니다');
  expect(store.readTask(foreign.id).workflow.label).toBe(code.label);
});
