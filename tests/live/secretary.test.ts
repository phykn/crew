import { expect, test } from 'vitest';
import { loadSdk } from '../../src/backend/adapters/claude/agent';
import { wire } from '../../src/backend/wire';
import { Store } from '../../src/backend/adapters/sqlite/store';
import { ALLOW } from '../../src/backend/domain/answers';
import { CREW, makeScratch, recordedAgents, recordedRuns } from '../support';

test('real Claude: 비서 lists files itself, remembers after a restart, and switches model', async () => {
  const scratch = makeScratch({ 'notes.txt': 'hello', 'todo.md': '- buy milk' });
  let store = new Store(scratch.db);
  let chat = wire({ records: store, sdk: loadSdk, crew: CREW, emit: () => {}, paths: scratch.paths });
  const p = store.addProject(scratch.project);
  chat.members.seed(p.id);
  const s = store.createSession(p.id);
  // Haiku keeps the live run cheap; the model switch below proves the choice reaches the run
  store.updateMember(store.readMember(p.id, 'orchestrator').id, { model: 'haiku' });

  await chat.send(s.id, '이 폴더에 무슨 파일 있어?');
  const first = store.listMessages(s.id).at(-1)!;
  expect(first.author).toBe('secretary');
  expect(first.text).toMatch(/notes\.txt/);
  expect(first.text).toMatch(/todo\.md/);

  // A new store and chat on the same file is what the app sees after a restart
  store.db.close();
  store = new Store(scratch.db);
  chat = wire({ records: store, sdk: loadSdk, crew: CREW, emit: () => {}, paths: scratch.paths });
  store.updateMember(store.readMember(p.id, 'orchestrator').id, { model: 'sonnet' });
  await chat.send(s.id, '방금 내가 뭘 물어봤고 너는 어떤 파일들을 말했지? 파일 이름만 다시 말해줘.');
  const second = store.listMessages(s.id).at(-1)!;
  expect(second.text).toMatch(/notes\.txt/);

  expect(recordedRuns(store, s.id).map((r) => [r.model, r.status])).toEqual([
    ['haiku', 'done'],
    ['sonnet', 'done'],
  ]);
});

test('real Claude: 비서 works the app itself, asking on cards only for what needs the user', async () => {
  const scratch = makeScratch();
  const store = new Store(scratch.db);
  const navigated: unknown[] = [];
  const chat = wire({
    records: store,
    sdk: loadSdk,
    crew: CREW,
    emit: (ch, e) => ch === 'navigate' && navigated.push(e),
    paths: scratch.paths,
  });
  const p = store.addProject(scratch.project);
  chat.members.seed(p.id);
  const s = store.createSession(p.id);
  // Every card is allowed as the user would, and kept so each step can say whether one was asked
  const cards: string[] = [];
  const answering = setInterval(() => {
    for (const m of store.listMessages(s.id))
      if (m.question && m.question.answer === null) {
        cards.push(m.question.prompt);
        chat.questions.answer(m.question.id, m.question.options.includes(ALLOW) ? ALLOW : m.question.options[0]);
      }
  }, 200);
  const say = async (text: string) => {
    const before = cards.length;
    await chat.send(s.id, text);
    const asked = cards.slice(before);
    console.log(`> ${text}\n  cards: ${JSON.stringify(asked)}\n  비서: ${store.listMessages(s.id).at(-1)!.text}`);
    return asked;
  };
  const tester = () => store.readMember(p.id, 'tester');
  try {
    expect(await say('이 세션 이름을 "앱 점검"으로 바꿔줘')).toEqual([]);
    expect(store.readSession(s.id).title).toBe('앱 점검');

    expect((await say('승인 모드를 자동으로 바꿔줘')).join()).toContain('자동');
    expect(store.readProject(p.id).mode).toBe('auto');

    await say('로그 화면 열어줘');
    expect(navigated).toContainEqual(expect.objectContaining({ view: 'log' }));

    expect((await say('시험 담당 내보내줘')).join()).toContain('내보낼까요');
    expect(tester().status).toBe('unhired');

    const crewSize = store.listMembers(p.id).length;
    expect((await say('시험 담당 다시 고용해줘')).join()).toContain('다시 고용할까요');
    expect(tester().status).toBe('hired');
    expect(store.listMembers(p.id)).toHaveLength(crewSize);

    await say('엑셀 매크로를 정리하는 알바 한 명 고용해줘');
    const temp = store.listMembers(p.id).find((m) => m.temp)!;
    expect(temp.status).toBe('hired');
    expect(await say('방금 고용한 알바는 이제 내보내줘')).toEqual([]);
    expect(store.readMemberById(temp.id).status).toBe('unhired');

    // 비서 did the app work itself: only 인사 ran besides it, to design the temp
    expect([...new Set(recordedAgents(store, s.id).map((a) => a.key))].sort()).toEqual(['hr', 'orchestrator']);
  } finally {
    clearInterval(answering);
  }
}, 600_000);

test('real Claude: a question about a member at work is answered from a copy of its session, and the work goes on', async () => {
  const scratch = makeScratch();
  const store = new Store(scratch.db);
  const chat = wire({ records: store, sdk: loadSdk, crew: CREW, emit: () => {}, paths: scratch.paths });
  const p = store.addProject(scratch.project);
  chat.members.seed(p.id);
  const s = store.createSession(p.id);
  for (const key of ['orchestrator', 'coder']) store.updateMember(store.readMember(p.id, key).id, { model: 'haiku' });
  store.setMode(p.id, 'auto');
  const coder = store.readMember(p.id, 'coder');

  // Only 개발's own conversation knows the codeword, so an answer that has it came from a copy of that conversation
  const work = chat.runs.run(
    coder,
    s.id,
    null,
    "The codeword for this job is 'blue-17'. Run the shell command `sleep 30`, then reply with just DONE.",
  );
  await expect
    .poll(() => [...chat.runs.active].find((a) => a.memberId === coder.id)?.run.claudeId, { timeout: 60_000 })
    .toBeTruthy();
  await chat.send(s.id, '개발한테 지금 뭐 하고 있는지, 이번 일의 코드워드가 뭔지 물어봐줘.');
  expect(store.listMessages(s.id).at(-1)!.text).toMatch(/blue-17/);
  const side = store.db.prepare('SELECT COUNT(*) AS n FROM runs WHERE side = 1').get() as { n: number };
  expect(side.n).toBe(1);

  const out = await work;
  expect([out.status, out.text.trim()]).toEqual(['done', 'DONE']);
  expect(recordedAgents(store, s.id).find((a) => a.key === 'coder')!.claudeId).toBe(out.claudeId);
});
