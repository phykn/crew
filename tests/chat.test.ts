import { expect, test, vi } from 'vitest';
import { handback, never, openChat, recordedRuns, reply, type Turn } from './support';

test('비서 answers in its own Claude session and runs on the model chosen last', async () => {
  const streamed: string[] = [];
  const { store, fake, chat, p, s } = openChat(
    { 비서: [reply('파일은 README.md 하나입니다.'), reply('README.md라고 했습니다.')] },
    {
      emit: (channel, payload) => {
        const delta = (payload as { delta?: string }).delta;
        if (channel === 'stream' && delta) streamed.push(delta);
      },
    },
  );

  await chat.send(s.id, '이 폴더에 무슨 파일 있어?');
  store.updateMember(store.readMember(p.id, 'orchestrator').id, { model: 'haiku' });
  await chat.send(s.id, '방금 뭐라고 했지?');

  expect(store.listMessages(s.id).map((m) => [m.author, m.text])).toEqual([
    ['user', '이 폴더에 무슨 파일 있어?'],
    ['secretary', '파일은 README.md 하나입니다.'],
    ['user', '방금 뭐라고 했지?'],
    ['secretary', 'README.md라고 했습니다.'],
  ]);
  expect(streamed).toEqual(['파일은 README.md 하나입니다.', 'README.md라고 했습니다.']);
  expect(fake.calls.map((c) => [c.options.resume, c.options.model, c.options.cwd])).toEqual([
    [undefined, 'sonnet', p.path],
    [undefined, 'haiku', p.path],
  ]);
  expect(recordedRuns(store, s.id).map((r) => [r.model, r.status, r.costUsd])).toEqual([
    ['sonnet', 'done', 0.01],
    ['haiku', 'done', 0.01],
  ]);
});

test("비서's replies and cards reach the notification feed, so a user in another window hears of them", async () => {
  const notes: unknown[] = [];
  const { chat, s } = openChat(
    { 비서: [reply('끝났습니다.')] },
    { emit: (channel, payload) => channel === 'notify' && notes.push(payload) },
  );
  await chat.send(s.id, '어떻게 됐어?');
  void chat.questions.choose(s.id, '어느 업무를 말씀하시나요?', ['#1', '#2']);
  expect(notes).toEqual([
    { sessionId: s.id, text: '끝났습니다.' },
    { sessionId: s.id, text: '어느 업무를 말씀하시나요?' },
  ]);
});

test('a message said while 비서 is answering keeps the chat showing 비서 at work after the first reply', async () => {
  let release = () => {};
  const held: Turn = (p, o) => new Promise((r) => (release = () => r(reply('첫 답', 's')(p, o) as never)));
  const streams: { delta?: string; done?: boolean }[] = [];
  const { store, fake, chat, s } = openChat(
    { 비서: [held, reply('둘째 답', 's')] },
    { emit: (channel, payload) => channel === 'stream' && streams.push(payload as never) },
  );
  const first = chat.send(s.id, '하나');
  await vi.waitFor(() => expect(fake.calls).toHaveLength(1));
  await chat.send(s.id, '둘');
  release();
  await first;
  const ends = streams.filter((e) => e.done || e.delta === '');
  // After the first reply the thinking state comes back; after the last one it ends
  expect(ends.map((e) => (e.done ? 'done' : 'thinking'))).toEqual(['done', 'thinking', 'done']);
  expect(store.listMessages(s.id).map((m) => m.text)).toEqual(['하나', '둘', '첫 답', '둘째 답']);
});

test('stopping 비서 mid-answer ends that run and says so in the chat', async () => {
  const { store, chat, s } = openChat({ 비서: [never] });
  const answering = chat.send(s.id, '길게 설명해줘');
  await vi.waitFor(() => expect(chat.runs.live(s.id)).toBeDefined());
  await chat.runs.live(s.id)!.stop();
  await answering;
  expect(store.listMessages(s.id).at(-1)!.text).toBe('답변을 멈췄습니다.');
});

test('/clear starts an empty 비서 on the same crew while the old session works on; deleting counts what goes', async () => {
  let release = () => {};
  const held: Turn = (p, o) =>
    new Promise((r) => (release = () => r(handback('r', { summary: '조사 끝' })(p, o) as never)));
  const {
    store,
    fake,
    chat,
    p,
    s: old,
  } = openChat(
    { 조사: [held], 비서: [reply('새 세션입니다', 'claude-new'), reply('보고', 'claude-old')] },
    { files: { 'a.md': 'x' } },
  );
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
  expect(impact).toEqual({
    sessions: 1,
    tasks: 1,
    events: store.listEvents(old.id).length,
    messages: store.listMessages(old.id).length,
  });
  chat.deleteSession(old.id);
  expect(store.listSessions(p.id).map((x) => x.id)).toEqual([next.id]);
  chat.removeProject(p.id);
  expect(store.listProjects()).toEqual([]);
});
