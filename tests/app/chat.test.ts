import { expect, test, vi } from 'vitest';
import { handback, never, openChat, recordedRuns, reply, type Turn } from '../support';
import { ClaudeAgent } from '../../src/backend/adapters/claude/agent';
import { mcpServers } from '../../src/backend/adapters/mcp/servers';

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

test('pictures go to 비서 before the words, stay with the message, and may go without words, which name no session', async () => {
  const { store, fake, chat, s } = openChat({ 비서: [reply('고양이네요.'), reply('같은 고양이네요.')] });
  const png = { mediaType: 'image/png' as const, data: 'aGk=' };

  await chat.send(s.id, '', [png]);
  await chat.send(s.id, '이거 뭐야?', [png]);

  expect(fake.calls.map((c) => c.prompt)).toEqual(['[image]', '[image]\n이거 뭐야?']);
  expect(store.listMessages(s.id).map((m) => [m.author, m.text, m.imageCount])).toEqual([
    ['user', '', 1],
    ['secretary', '고양이네요.', 0],
    ['user', '이거 뭐야?', 1],
    ['secretary', '같은 고양이네요.', 0],
  ]);
  const [first] = store.listMessages(s.id);
  expect([store.readImage(first.id, 0), store.readImage(first.id, 1)]).toEqual([png, null]);
  expect(store.listSessions(s.projectId)[0].title).toBe('이거 뭐야?');
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

test('stopping 비서 mid-answer ends that run, closes the card it left open, and says so in the chat', async () => {
  const { store, chat, s } = openChat({ 비서: [never] });
  const answering = chat.send(s.id, '길게 설명해줘');
  await vi.waitFor(() => expect(chat.runs.live(s.id)).toBeDefined());
  const picked = chat.questions.choose(s.id, '어느 업무를 다시 할까요?', ['#1', '#2']);
  await chat.runs.live(s.id)!.stop();
  await answering;
  expect(await picked).toBe('취소');
  expect(
    store
      .listMessages(s.id)
      .map((m) => m.question?.answer ?? m.text)
      .slice(-2),
  ).toEqual(['취소', '답변을 멈췄습니다.']);
});

test('an error before 비서 can run is said in the chat instead of leaving 비서 answering', async () => {
  const { store, chat, s } = openChat();
  const broken = async (): Promise<never> => {
    throw new Error('SDK를 불러오지 못함');
  };
  chat.agent = new ClaudeAgent(broken);
  chat.tools = mcpServers(broken, chat);
  await chat.send(s.id, '안녕');
  expect(store.listMessages(s.id).at(-1)!.text).toBe('답하는 중 오류가 났습니다: SDK를 불러오지 못함');
});

test('a new session (/clear) starts an empty 비서 on the same crew while the old session works on; deleting counts what goes', async () => {
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

  const next = chat.createSession(p.id);
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

test('each change to the record is announced by the part that made it, whether the window or 비서 asked', () => {
  const changed: { topic: string; sessionId?: number }[] = [];
  const { store, chat, p, s } = openChat(
    {},
    { emit: (channel, change) => channel === 'changed' && changed.push(change as (typeof changed)[number]) },
  );
  const said = (act: () => unknown) => {
    changed.length = 0;
    act();
    return [...new Set(changed.map((c) => c.topic))];
  };
  const coder = store.readMember(p.id, 'coder');
  expect(said(() => chat.setMode(p.id, 'auto'))).toEqual(['projects']);
  const next = chat.createSession(p.id);
  expect(said(() => chat.renameSession(next.id, '이름'))).toEqual(['sessions']);
  // A message names its session, so a window showing another one leaves its list alone
  expect(said(() => chat.post(next.id, '네'))).toEqual(['messages']);
  expect(changed).toEqual([{ topic: 'messages', sessionId: next.id }]);
  expect(said(() => chat.deleteSession(s.id))).toEqual(['sessions']);
  expect(said(() => chat.members.update(coder.id, { nickname: '망치' }))).toEqual(['members']);
  expect(said(() => chat.members.setPermissions(coder.id, { tools: ['read'] }))).toEqual(['members']);
  expect(said(() => chat.removeProject(p.id))).toEqual(['sessions', 'projects']);
});

test('a session deleted while 비서 answers takes no failure message, and the send settles quietly', async () => {
  const { store, chat, s } = openChat({ 비서: [never] });
  const sent = chat.send(s.id, '안녕');
  await vi.waitFor(() => expect(chat.runs.live(s.id)).toBeTruthy());
  chat.deleteSession(s.id);
  await expect(sent).resolves.toBeUndefined();
  expect(store.hasSession(s.id)).toBe(false);
});
