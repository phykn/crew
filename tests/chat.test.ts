import { expect, test, vi } from 'vitest';
import { Inbox } from '../src/backend/agents/run';
import { Chat } from '../src/backend/chat';
import { CREW, fakeCrew, fakeQuery, openScratch, recordedRuns, reply, handback, type Turn } from './support';

test('비서 answers in its own Claude session and runs on the model chosen last', async () => {
  const { store, project, paths } = openScratch();
  const fake = fakeQuery([reply('파일은 README.md 하나입니다.'), reply('README.md라고 했습니다.')]);
  const streamed: string[] = [];
  const chat = new Chat(
    store,
    async () => fake.sdk,
    CREW,
    (channel, p) => {
      if (channel === 'stream' && (p as { delta?: string }).delta) streamed.push((p as { delta: string }).delta);
    },
    paths,
  );
  const p = store.addProject(project);
  chat.members.seed(p.id);
  const s = store.createSession(p.id);

  await chat.send(s.id, '이 폴더에 무슨 파일 있어?');
  const secretary = store.readMember(p.id, 'orchestrator');
  store.updateMember(secretary.id, { model: 'haiku' });
  await chat.send(s.id, '방금 뭐라고 했지?');

  expect(store.listMessages(s.id).map((m) => [m.author, m.text])).toEqual([
    ['user', '이 폴더에 무슨 파일 있어?'],
    ['secretary', '파일은 README.md 하나입니다.'],
    ['user', '방금 뭐라고 했지?'],
    ['secretary', 'README.md라고 했습니다.'],
  ]);
  expect(streamed).toEqual(['파일은 README.md 하나입니다.', 'README.md라고 했습니다.']);
  expect(fake.calls.map((o) => [o.resume, o.model, o.cwd])).toEqual([
    [undefined, 'sonnet', store.readProject(p.id).path],
    [undefined, 'haiku', store.readProject(p.id).path],
  ]);
  expect(recordedRuns(store, s.id).map((r) => [r.model, r.status, r.costUsd])).toEqual([
    ['sonnet', 'done', 0.01],
    ['haiku', 'done', 0.01],
  ]);
});

test("비서's replies and cards reach the notification feed, so a user in another window hears of them", async () => {
  const { store, project, paths } = openScratch();
  const notes: unknown[] = [];
  const chat = new Chat(
    store,
    async () => fakeQuery([reply('끝났습니다.')]).sdk,
    CREW,
    (channel, p) => channel === 'notify' && notes.push(p),
    paths,
  );
  const p = store.addProject(project);
  chat.members.seed(p.id);
  const s = store.createSession(p.id);
  await chat.send(s.id, '어떻게 됐어?');
  void chat.questions.choose(s.id, '어느 업무를 말씀하시나요?', ['#1', '#2']);
  expect(notes).toEqual([
    { sessionId: s.id, text: '끝났습니다.' },
    { sessionId: s.id, text: '어느 업무를 말씀하시나요?' },
  ]);
});

test('a closed inbox refuses a line, so 비서 is told it in a new run instead of losing it', () => {
  const inbox = new Inbox();
  inbox.close();
  expect(inbox.push('늦은 보고')).toBe(false);
});

test('a message said while 비서 is answering keeps the chat showing 비서 at work after the first reply', async () => {
  const { store, project, paths } = openScratch();
  let release = () => {};
  const held: Turn = (p, o) => new Promise((r) => (release = () => r(reply('첫 답', 's')(p, o) as never)));
  const fake = fakeCrew({ 비서: [held, reply('둘째 답', 's')] });
  const streams: { delta?: string; done?: boolean }[] = [];
  const chat = new Chat(
    store,
    async () => fake.sdk,
    CREW,
    (ch, p) => ch === 'stream' && streams.push(p as never),
    paths,
  );
  const p = store.addProject(project);
  chat.members.seed(p.id);
  const s = store.createSession(p.id);
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
  const { store, project, paths } = openScratch();
  const fake = fakeCrew({ 비서: [() => new Promise(() => {})] });
  const chat = new Chat(
    store,
    async () => fake.sdk,
    CREW,
    () => {},
    paths,
  );
  const p = store.addProject(project);
  chat.members.seed(p.id);
  const s = store.createSession(p.id);

  const answering = chat.send(s.id, '길게 설명해줘');
  await vi.waitFor(() => expect(chat.runs.live(s.id)).toBeDefined());
  await chat.runs.live(s.id)!.stop();
  await answering;
  expect(store.listMessages(s.id).at(-1)!.text).toBe('답변을 멈췄습니다.');
});

test('/clear starts an empty 비서 on the same crew while the old session works on; deleting counts what goes', async () => {
  const { store, project, paths } = openScratch({ 'a.md': 'x' });
  let release = () => {};
  const held: Turn = (p, o) =>
    new Promise((r) => (release = () => r(handback('r', { summary: '조사 끝' })(p, o) as never)));
  const fake = fakeCrew({ 조사: [held], 비서: [reply('새 세션입니다', 'claude-new'), reply('보고', 'claude-old')] });
  const chat = new Chat(
    store,
    async () => fake.sdk,
    CREW,
    () => {},
    paths,
  );
  const p = store.addProject(project);
  chat.members.seed(p.id);
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
  expect(impact).toEqual({
    sessions: 1,
    tasks: 1,
    events: store.listEvents(old.id).length,
    messages: store.listMessages(old.id).length,
  });
  chat.deleteSession(old.id);
  expect(store.listSessions(p.id).map((s) => s.id)).toEqual([next.id]);
  chat.removeProject(p.id);
  expect(store.listProjects()).toEqual([]);
});
