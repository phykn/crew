import { expect, test, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  assigns,
  judges,
  broken,
  type fakeCrew,
  handback,
  never,
  openChat,
  recordedAgents,
  reopenChat,
  reply,
  type Turn,
  words,
} from '../support';
import { DiskFiles } from '../../src/backend/adapters/files/files';
import { usage } from '../../src/backend/domain/usage';

const snapshot = (dir: string) => new DiskFiles().snapshot(dir);

// 통역 opens the task the way the model would: by calling its start_task tool mid-turn
const opening = (fake: () => ReturnType<typeof fakeCrew>, input: Record<string, unknown>): Turn => {
  return (prompt, options) => {
    void fake().tools.get('start_task')!({ request: prompt, original: prompt, ...input });
    return reply('업무를 시작했습니다.', 'claude-secretary')(prompt, options);
  };
};

test('지휘 → 코드 검토 (sent back once) → 지휘 → 코드 검토 → 코드 작성 → 코드 검토·시험, each role in its own Claude session', async () => {
  const opens = opening(() => fake, { title: '검색 개선' });
  const { store, fake, chat, s } = openChat(
    {
      통역: [opens, reply('검색을 고쳤고 코드 검토와 시험을 통과했습니다.', 'claude-secretary')],
      지휘: [
        assigns('claude-plan', { kind: 'code' }),
        handback('claude-plan', { summary: '계획 v1' }),
        handback('claude-plan', { summary: '계획 v2' }),
      ],
      '코드 검토': [
        handback('claude-review', { summary: '범위 누락', verdict: 'rework', points: ['빈 검색어 경우가 없습니다'] }),
        handback('claude-review', { summary: '계획 통과', verdict: 'pass' }),
        handback('claude-review', { summary: '코드 통과', verdict: 'pass' }),
      ],
      '코드 작성': [handback('claude-code', { summary: '검색 수정', files: ['search.js'] })],
      시험: [handback('claude-test', { summary: '시험 통과', verdict: 'pass', checks: ['npm test: 3 passed'] })],
    },
    { files: { 'search.js': 'export const search = () => []' } },
  );

  await chat.send(s.id, '빈 검색어는 전체 목록을 보여주게 바꿔줘');
  await vi.waitFor(() => expect(store.listMessages(s.id).at(-1)!.text).toContain('통과했습니다'), { timeout: 3000 });

  const [task] = store.listTasks(s.id);
  expect([task.status, task.kind]).toEqual(['done', 'code']);
  expect(store.listStepRuns(task.id).map((r) => [r.stepId, r.verdict])).toEqual([
    ['assign', null],
    ['plan', null],
    ['plan_review', 'rework'],
    ['plan', null],
    ['plan_review', 'pass'],
    ['develop', null],
    ['review', 'pass'],
    ['test', 'pass'],
    ['judge', 'pass'],
  ]);
  // The code review gets the coder's files, never the coder's own account of them, and not the plan its session already read
  const review = fake.calls.filter((c) => c.role === '코드 검토')[2].prompt;
  expect([review.includes('계획 v2'), review.includes('search.js'), review.includes('검색 수정')]).toEqual([
    false,
    true,
    false,
  ]);
  expect(review).not.toContain("The user's request");
  // The fix round gets the reviewer's point, and the second plan run resumes the first one's session
  const plans = fake.calls.filter((c) => c.role === '지휘');
  expect(plans[2].prompt).toContain('빈 검색어 경우가 없습니다');
  expect(plans.map((c) => c.options.resume)).toEqual([undefined, 'claude-plan', 'claude-plan']);
  expect(recordedAgents(store, s.id).map((a) => [a.key, a.claudeId])).toEqual([
    ['interpreter', 'claude-secretary'],
    ['conductor', 'claude-plan'],
    ['reviewer', 'claude-review'],
    ['coder', 'claude-code'],
    ['tester', 'claude-test'],
    // The librarian folds the finished task into the wiki on its own
    ['librarian', null],
  ]);
  expect(
    store
      .listEvents(s.id)
      .filter((e) => e.kind === 'status')
      .map((e) => e.detail),
  ).toEqual([
    'running',
    'running',
    'running',
    'reviewing',
    'fixing',
    'reviewing',
    'running',
    'reviewing',
    'reviewing',
    'done',
  ]);
  // The report 통역 is asked to give carries the changed files and the checks
  const report = fake.calls.filter((c) => c.role === '통역')[1].prompt;
  expect(report).toContain('[Task #1 finished]');
  expect(report).toContain('search.js');
  expect(report).toContain('npm test: 3 passed');
  // One log line per finished step: its start shows in the task's own status line
  const steps = store.listEvents(s.id).filter((e) => e.kind === 'step');
  expect([steps.length, steps.filter((e) => words(e).endsWith(' 시작')).length]).toEqual([9, 0]);
});

test('a small change and one given to a member who writes the project skip the plan and keep every check; others work alone', () => {
  const { store, chat, p, s } = openChat({ '코드 작성': [never], 조사: [never] });
  const ids = (t: { workflow: { steps: { id: string }[] } }) => t.workflow.steps.map((x) => x.id);
  const checked = ['develop', 'review', 'test'];
  expect(ids(chat.tasks.start(s.id, 'code', 'small', 'r', undefined, true))).toEqual(checked);
  const given = chat.tasks.start(s.id, 'research', 'coder', 'r', store.readMember(p.id, 'coder'));
  expect([given.kind, ...ids(given)]).toEqual(['code', ...checked]);
  expect(store.assignee(given.id, 'develop')).toBe(store.readMember(p.id, 'coder').id);
  expect(ids(chat.tasks.start(s.id, 'research', 'researcher', 'r', store.readMember(p.id, 'researcher')))).toEqual([
    'work',
  ]);
});

test('지휘 decides how a task 통역 opens is done: a wrong answer goes back to it, and one member can take it alone', async () => {
  const { store, fake, chat, s } = openChat({
    통역: [reply('조사했습니다.', 'claude-secretary')],
    지휘: [
      assigns('claude-plan', { kind: 'nope' }),
      assigns('claude-plan', { kind: 'research', member: 'researcher' }),
    ],
    조사: [handback('claude-research', { summary: '조사 끝' })],
  });
  const task = chat.tasks.open(s.id, '조사', 'r');
  expect([task.kind, task.workflow.steps.map((x) => x.id)]).toEqual(['assign', ['assign']]);
  await vi.waitFor(() => expect(store.readTask(task.id).status).toBe('done'), { timeout: 3000 });
  const done = store.readTask(task.id);
  expect([done.kind, done.workflow.steps.map((x) => x.id)]).toEqual(['research', ['work']]);
  expect(fake.calls.filter((c) => c.role === '지휘')[1].prompt).toContain('kind nope is not one of');
});

test('지휘 judges a finished task: a rework goes back to its step and is judged again, and a failure stops it for the user', async () => {
  const { store, fake, chat, s } = openChat({
    통역: [reply('보고 1'), reply('보고 2')],
    조사: [
      handback('r', { summary: '조사 1' }),
      handback('r', { summary: '조사 2' }),
      handback('r', { summary: '조사 3' }),
    ],
    감독: [
      judges('rework', { target: 'work' }),
      judges('rework', { target: 'work', points: ['출처가 없습니다'] }),
      judges('done'),
      judges('fail', { summary: '사용자가 범위를 정해야 합니다' }),
    ],
  });
  const researcher = store.readMember(store.projectOf(s.id).id, 'researcher');
  const one = chat.tasks.start(s.id, 'research', '조사 1', 'r', researcher);
  await vi.waitFor(() => expect(store.readTask(one.id).status).toBe('done'), { timeout: 3000 });
  // A rework without points goes back to 지휘 first; the next one sends the step back with its points
  const research = fake.calls.filter((c) => c.role === '조사');
  expect([research.length, research[1].prompt]).toEqual([2, expect.stringContaining('출처가 없습니다')]);
  expect(fake.calls.filter((c) => c.role === '감독')[1].prompt).toContain('rework needs the points to fix');
  expect(fake.calls.filter((c) => c.role === '통역')[0].prompt).toContain('[Task #1 finished]');

  const two = chat.tasks.start(s.id, 'research', '조사 2', 'r', researcher);
  await vi.waitFor(() => expect(store.readTask(two.id).status).toBe('failed'), { timeout: 3000 });
  expect(fake.calls.filter((c) => c.role === '통역')[1].prompt).toContain('사용자가 범위를 정해야 합니다');
});

test("지휘's question to the user waits on a card under 통역's message, and a stop closes it", async () => {
  let asked: Promise<unknown> = Promise.resolve();
  const asks: Turn = (prompt, options) => {
    asked = fake.tools.get('ask_user')!({ question: '어느 쪽인가요?', options: ['A', 'B'] });
    return asked.then((r) => assigns('claude-plan', { kind: 'research', summary: JSON.stringify(r) })(prompt, options));
  };
  const { store, fake, chat, s } = openChat({ 지휘: [asks], 조사: [never], 통역: [reply('멈춤')] });
  const task = chat.tasks.open(s.id, '조사', 'r');
  await vi.waitFor(() => expect(store.openQuestionIds(s.id, task.id)).toHaveLength(1));
  const [id] = store.openQuestionIds(s.id, task.id);
  expect(store.readQuestion(id).say).toMatchObject({ code: 'card.decision', question: '어느 쪽인가요?' });
  chat.tasks.stop(task.id);
  expect(await asked).toMatchObject({ content: [{ text: 'The user did not answer; the task was stopped.' }] });
  expect(store.readQuestion(id).answer).toBe('cancel');
});

test('a task past its loop limit goes back to 지휘 once to re-plan, and stops for the user when it fails again', async () => {
  const opens = opening(() => fake, { title: '검색 개선' });
  const again = handback('claude-review', { summary: '범위 누락', verdict: 'rework', points: ['빈 검색어'] });
  const plan = (v: number) => handback('claude-plan', { summary: `계획 v${v}` });
  const { store, fake, chat, p, s } = openChat({
    통역: [opens, reply('멈췄습니다.', 'claude-secretary')],
    지휘: [assigns('claude-plan', { kind: 'code' }), plan(1), plan(2), plan(3), plan(4)],
    '코드 검토': [again, again, again, again],
  });
  const base = chat.workflows.current(p.id, 'code');
  const steps = base.rules.steps.map((st) => (st.id === 'plan_review' ? { ...st, loops: 1 } : st));
  chat.workflows.save({
    projectId: p.id,
    kind: 'code',
    base: base.version,
    rules: { ...base.rules, steps },
    by: { name: 't' },
    scope: 'future',
  });

  await chat.send(s.id, '검색 고쳐줘');
  await vi.waitFor(() => expect(store.listTasks(s.id)[0].status).toBe('failed'), { timeout: 3000 });
  const plans = fake.calls.filter((c) => c.role === '지휘');
  expect([plans.length, plans[3].prompt]).toEqual([5, expect.stringContaining('Re-plan: 계획 was fixed 1 times')]);
  expect(fake.calls.filter((c) => c.role === '통역')[1].prompt).toContain('계획 was fixed 1 times');
});

test('a redo that changes no file and is sent back again stops the task for the user instead of looping', async () => {
  const opens = opening(() => fake, { title: '수정' });
  const edits: Turn = (prompt, options) => {
    fs.writeFileSync(path.join(project, 'a.js'), 'b');
    return handback('claude-code', { summary: '고침', files: ['a.js'] })(prompt, options);
  };
  const no = handback('claude-review', { summary: '범위 밖', verdict: 'rework', points: ['범위 밖'] });
  const pass = (id: string) => handback(id, { summary: '통과', verdict: 'pass', checks: ['ok'] });
  const { store, fake, chat, s, project } = openChat(
    {
      통역: [opens, reply('멈췄습니다.', 'claude-secretary')],
      지휘: [assigns('claude-plan', { kind: 'code', size: 'small' })],
      '코드 작성': [edits, handback('claude-code', { summary: '그대로 둠' })],
      감독: [judges('fail', { summary: '사용자가 정해야 합니다' })],
      '코드 검토': [no, no],
      시험: [pass('t'), pass('t')],
    },
    { files: { 'a.js': 'a' } },
  );

  await chat.send(s.id, '고쳐줘');
  await vi.waitFor(() => expect(store.listTasks(s.id)[0].status).toBe('failed'), { timeout: 3000 });
  expect(store.listStepRuns(1).filter((r) => r.stepId === 'develop')).toHaveLength(2);
  // With no plan to redo, 지휘 judges how to go on, and its failure is what 통역 reports
  expect(fake.calls.filter((c) => c.role === '감독')[0].prompt).toContain('was redone without changing anything');
  expect(fake.calls.filter((c) => c.role === '통역')[1].prompt).toContain('사용자가 정해야 합니다');
});

test('a broken step fails after its retries; a stopped task leaves the other running; a restart is resumed', async () => {
  let release = () => {};
  // Answers only when released, like a long real step
  const held: Turn = (p, o) => new Promise((r) => (release = () => r(reply('', 'claude-research')(p, o) as never)));
  const broken = reply('형식 없음', 'claude-research');
  const { store, fake, chat, s, db, paths } = openChat(
    {
      통역: [reply('실패 보고', 'claude-secretary')],
      조사: [broken, broken, broken, broken, held],
      지휘: [never],
    },
    { files: { 'a.js': 'a' } },
  );

  const one = chat.tasks.start(s.id, 'research', '조사 1', 'r');
  await vi.waitFor(() => expect(store.readTask(one.id).status).toBe('failed'));
  expect(store.listStepRuns(one.id).map((r) => r.status)).toEqual(['failed', 'failed', 'failed', 'failed']);
  await vi.waitFor(() => expect(fake.calls.at(-1)!.prompt).toContain(`[Task #${one.id} stopped]`));

  const two = chat.tasks.start(s.id, 'research', '조사 2', 'r');
  const three = chat.tasks.start(s.id, 'code', '코드', 'r');
  await vi.waitFor(() => expect(fake.calls.filter((c) => c.role === '조사' || c.role === '지휘')).toHaveLength(6));
  expect(chat.tasks.stop(two.id)).toBe(true);
  expect(store.readTask(two.id).status).toBe('stopping');
  release();
  await vi.waitFor(() => expect(store.readTask(two.id).status).toBe('stopped'));
  expect(store.readTask(three.id).status).toBe('running');

  // A restart cuts off what was running; the user's word resumes it from the unfinished step
  const {
    store: after,
    fake: fresh,
    chat: again,
  } = reopenChat({ db, paths }, { 지휘: [handback('p', { summary: '계획' }), never], '코드 검토': [never] });
  const recovered = after.listEvents(s.id).filter((e) => e.say?.code === 'task.restarted');
  expect([recovered.map((e) => e.taskId), after.readTask(three.id).status]).toEqual([[three.id], 'stopped']);
  expect(again.tasks.resume(three.id)).toBe(true);
  await vi.waitFor(() => expect(fresh.calls.map((c) => c.role)).toEqual(['지휘', '코드 검토']));
});

test('a step queued before a stop is not run again by the resume', async () => {
  let release = () => {};
  const held: Turn = (p, o) => new Promise((r) => (release = () => r(reply('', 'claude-plan')(p, o) as never)));
  const { store, fake, chat, p, s } = openChat({
    지휘: [held, handback('claude-plan', { summary: '계획' })],
    '코드 검토': [never],
  });
  // 지휘's lane is busy, so the task's plan step waits behind it
  void chat.runs.run(store.readMember(p.id, 'conductor'), s.id, null, 'hold');
  await vi.waitFor(() => expect(fake.calls).toHaveLength(1));
  const task = chat.tasks.start(s.id, 'code', 't', 'r');
  expect(store.listStepRuns(task.id).map((r) => r.stepId)).toEqual(['plan']);

  chat.tasks.stop(task.id);
  chat.tasks.resume(task.id);
  release();
  await vi.waitFor(() => expect(fake.calls.map((c) => c.role)).toContain('코드 검토'));
  expect(fake.calls.filter((c) => c.role === '지휘')).toHaveLength(2);
});

test('a usage limit pauses the task and 통역 reports what is done and left; usage adds up per role and model', async () => {
  const limited: Turn = (p, o) => [
    { type: 'rate_limit_event', rate_limit_info: { status: 'rejected' } } as never,
    ...(reply('', 'r')(p, o) as never[]),
  ];
  const { store, fake, chat, s } = openChat({
    지휘: [handback('p', { summary: '계획 완료' })],
    '코드 검토': [limited],
    통역: [reply('한도 보고')],
  });
  const task = chat.tasks.start(s.id, 'code', '검색', 'r');
  await vi.waitFor(() => expect(fake.calls.at(-1)!.role).toBe('통역'));
  expect(store.readTask(task.id).status).toBe('stopped');
  const report = fake.calls.at(-1)!.prompt;
  expect(report).toContain(`[Task #${task.id} paused]`);
  expect(report).toContain('계획 완료');
  expect(report).toMatch(/Left to do\n- 계획 검토\n- 코드 작성/);
  // reply() charges 10 in, 5 out, $0.01 per run
  expect(usage(store.listRunSpend(s.id)).map((u) => [u.model, u.runs, u.inputTokens, u.outputTokens])).toEqual(
    expect.arrayContaining([
      ['opus', 1, 10, 5],
      ['opus', 1, 10, 5],
    ]),
  );
});

test('each change is a version the verdicts judge, and a follow-up reopens the same task at the plan of 지휘', async () => {
  // 코드 작성 really edits the project, so the version comes from the files, not from what the handback claims
  const edit =
    (text: string): Turn =>
    (prompt, options) => {
      fs.writeFileSync(path.join(project, 'search.js'), text);
      return handback('claude-code', { summary: text, files: ['wrong.js'] })(prompt, options);
    };
  const pass = (sid: string): Turn => handback(sid, { summary: '통과', verdict: 'pass', checks: ['ok'] });
  const { store, fake, chat, s, project } = openChat(
    {
      통역: [reply('보고 1', 'claude-secretary'), reply('보고 2', 'claude-secretary')],
      지휘: [handback('claude-plan', { summary: '계획' }), handback('claude-plan', { summary: '계획 2' })],
      '코드 검토': [pass('claude-review'), pass('claude-review'), pass('claude-review'), pass('claude-review')],
      '코드 작성': [edit('v1'), edit('v2')],
      시험: [pass('claude-test'), pass('claude-test')],
    },
    { files: { 'search.js': 'v0', 'old.txt': 'before the task' } },
  );

  const task = chat.tasks.start(s.id, 'code', '검색', '검색 고쳐줘');
  await vi.waitFor(() => expect(store.readTask(task.id).status).toBe('done'));
  expect(store.latestVersion(task.id)!.files).toEqual(['search.js']);

  expect(chat.tasks.reopen(task.id, '대소문자 무시')).toBe(true);
  await vi.waitFor(() => expect(store.readTask(task.id).status).toBe('done'));
  const v2 = store.latestVersion(task.id)!;
  const verdicts = store.listStepRuns(task.id).filter((r) => ['review', 'test'].includes(r.stepId));
  expect(verdicts.slice(-2).map((r) => r.versionId)).toEqual([v2.id, v2.id]);
  expect(store.readTask(task.id).request).toContain('More from the user: 대소문자 무시');
  expect(fake.calls.filter((c) => c.role === '지휘')[1].prompt).toContain('대소문자 무시');
  expect(store.listTasks(s.id)).toHaveLength(1);
});

test('words added while 코드 작성 is at work go to 지휘, who sends 코드 작성 back with them, and the checks judge the redo', async () => {
  let release = () => {};
  const edit =
    (text: string): Turn =>
    (prompt, options) => {
      fs.writeFileSync(path.join(project, 'calc.js'), text);
      return handback('claude-code', { summary: text })(prompt, options);
    };
  // The first turn waits, so the words arrive while 코드 작성 is still working
  const held: Turn = (p, o) => new Promise((r) => (release = () => r(edit('v1')(p, o) as never)));
  const pass = (sid: string): Turn => handback(sid, { summary: '통과', verdict: 'pass', checks: ['ok'] });
  const { store, fake, chat, s, project } = openChat(
    {
      통역: [reply('보고', 'claude-secretary')],
      '코드 작성': [held, edit('v2')],
      감독: [judges('rework', { target: 'develop', points: ['에러 메시지는 영어로'] })],
      '코드 검토': [pass('r'), pass('r')],
      시험: [pass('t'), pass('t')],
    },
    { files: { 'calc.js': 'v0' } },
  );
  const task = chat.tasks.start(s.id, 'code', 'sqrt', 'sqrt 추가', undefined, true);
  await vi.waitFor(() => expect(fake.calls.map((c) => c.role)).toContain('코드 작성'));

  expect(chat.tasks.reopen(task.id, '에러 메시지는 영어로')).toBe(true);
  release();
  await vi.waitFor(() => expect(store.readTask(task.id).status).toBe('done'));
  const coder = fake.calls.filter((c) => c.role === '코드 작성');
  expect(coder).toHaveLength(2);
  expect(coder[1].prompt).toContain('에러 메시지는 영어로');
  expect(store.readTask(task.id).request).toContain('More from the user: 에러 메시지는 영어로');
  // Each check's last verdict is on the redo's version
  const v = store.latestVersion(task.id)!.id;
  const checks = store.listStepRuns(task.id).filter((r) => ['review', 'test'].includes(r.stepId));
  expect(checks.slice(-2).map((r) => r.versionId)).toEqual([v, v]);
});

test('a step cut off right after saving resumes from that step and checks the saved file', async () => {
  const { store, chat, p, s, db, project, paths } = openChat({}, { files: { 'search.js': 'v0' } });
  const task = store.createTask({
    sessionId: s.id,
    kind: 'code',
    title: '검색',
    request: 'r',
    workflow: chat.workflows.shipped.find((w) => w.kind === 'code')!,
  });
  store.writeBaseline(task.id, snapshot(project));
  const member = (key: string) => store.readMember(p.id, key).id;
  store.finishStepRun(store.startStepRun(task.id, 'plan', member('conductor')), 'done', {
    summary: '계획',
    body: '',
    points: [],
    files: [],
    checks: [],
    notes: [],
  });
  store.finishStepRun(store.startStepRun(task.id, 'plan_review', member('reviewer')), 'done', {
    summary: '통과',
    body: '',
    verdict: 'pass',
    points: [],
    files: [],
    checks: [],
    notes: [],
  });
  store.startStepRun(task.id, 'develop', member('coder'));
  store.writeTaskStatus(task.id, 'running', '코드 작성', { code: 'task.stage', stage: '코드 작성' });
  fs.writeFileSync(path.join(project, 'search.js'), 'v1');

  const { fake: fresh, chat: again } = reopenChat({ db, paths }, { '코드 작성': [never] });
  expect(again.tasks.resume(task.id)).toBe(true);
  await vi.waitFor(() => expect(fresh.calls.map((c) => c.role)).toEqual(['코드 작성']));
  expect(fresh.calls[0].prompt).toContain('cut off after changing: search.js');
});

test("reopening a task without a plan takes the change to 지휘's judgment", () => {
  const { store, chat, s } = openChat({ '코드 검토': [never] });
  const task = store.createTask({
    sessionId: s.id,
    kind: 'improve',
    title: '개선',
    request: 'r',
    workflow: chat.workflows.shipped.find((w) => w.kind === 'improve')!,
  });
  store.writeTaskStatus(task.id, 'done', '', { code: 'task.done', title: '개선' });
  expect(chat.tasks.reopen(task.id, '다시 봐줘')).toBe(true);
  expect(
    store
      .listStepRuns(task.id)
      .filter((r) => r.stepId === '_user')
      .map((r) => r.handback?.target),
  ).toEqual(['judge']);
});

test('a step whose SDK cannot load fails after its retries and 통역 hears of it, instead of the task hanging', async () => {
  const { store, chat, s } = openChat({}, { sdk: broken });
  chat.tasks.retryWaits = [0, 0, 0];
  const task = chat.tasks.start(s.id, 'research', '조사', 'r');
  await vi.waitFor(() => expect(store.readTask(task.id).status).toBe('failed'));
  expect(store.listStepRuns(task.id).map((r) => r.error)).toEqual(Array(4).fill('SDK를 불러오지 못함'));
});

test('a run that meets a passing fault is tried again after a wait', async () => {
  const at: number[] = [];
  const failed =
    (subtype: string, errors: string[]): Turn =>
    (_p, o) => {
      at.push(Date.now());
      return [
        { type: 'system', subtype: 'init', session_id: 'r', model: o.model },
        { type: 'result', subtype, errors, num_turns: 1, total_cost_usd: 0, modelUsage: {} },
      ] as never;
    };
  const { store, chat, s } = openChat({
    통역: [reply('보고 1')],
    조사: [failed('error_during_execution', ['overloaded']), handback('r', { summary: '조사' })],
  });
  chat.tasks.retryWaits = [50, 50, 50];
  const first = chat.tasks.start(s.id, 'research', '조사 1', 'r');
  await vi.waitFor(() => expect(store.readTask(first.id).status).toBe('done'));
  expect(Date.now() - at[0]).toBeGreaterThanOrEqual(45);
});

test("a step's files are the ones it wrote, not a file someone else changed meanwhile", async () => {
  const edit: Turn = async (prompt, options) => {
    const file = path.join(project, 'search.js');
    // The write goes through the guard, as the model's Write call would
    await options.canUseTool!('Write', { file_path: file, content: 'v1' }, {
      signal: new AbortController().signal,
    } as never);
    fs.writeFileSync(file, 'v1');
    fs.writeFileSync(path.join(project, 'notes.md'), 'the user, in another window');
    return handback('c', { summary: '수정' })(prompt, options);
  };
  const pass = handback('x', { summary: '통과', verdict: 'pass', checks: ['ok'] });
  const { store, chat, s, project } = openChat(
    { 통역: [reply('보고')], '코드 작성': [edit], '코드 검토': [pass], 시험: [pass] },
    { files: { 'search.js': 'v0', 'notes.md': 'n0' } },
  );
  const task = chat.tasks.start(s.id, 'code', '검색', '검색 고쳐줘', undefined, true);
  await vi.waitFor(() => expect(store.readTask(task.id).status).toBe('done'));
  expect(store.latestVersion(task.id)!.files).toEqual(['search.js']);
  expect(store.listStepRuns(task.id).find((r) => r.stepId === 'develop')!.handback!.files).toEqual(['search.js']);
});

test('a step that ends first leaves the write reservation of the step still at work beside it', async () => {
  let finish = () => {};
  const write: Turn = async (prompt, options) => {
    await options.canUseTool!('Write', { file_path: path.join(project, 'a.js'), content: 'v1' }, {
      signal: new AbortController().signal,
    } as never);
    await new Promise<void>((r) => (finish = r));
    return handback('c', { summary: '수정' })(prompt, options);
  };
  const { store, chat, p, s, project } = openChat(
    { '코드 작성': [write], 시험: [handback('t', { summary: '시험' })], 통역: [reply('보고')] },
    { files: { 'a.js': 'v0' } },
  );
  // 시험 may write the project here, so both steps hold the task's reservations side by side
  chat.members.setPermissions(store.readMember(p.id, 'tester').id, { write: 'project' });
  const step = (id: string, role: string) => ({
    id,
    role,
    label: id,
    does: id,
    after: [],
    verdict: false,
    loops: 3,
    requires: [],
  });
  const task = store.createTask({
    sessionId: s.id,
    kind: 'code',
    title: '둘',
    request: 'r',
    workflow: { kind: 'code', label: '둘', use: 'u', steps: [step('make', 'coder'), step('check', 'tester')] },
  });
  store.writeBaseline(task.id, snapshot(project));
  void chat.tasks.drive(task.id);
  const locks = chat.runs.locksOf(p);
  await vi.waitFor(() => expect(store.listStepRuns(task.id).find((r) => r.stepId === 'check')?.status).toBe('done'));
  expect([...(locks.held.get(task.id) ?? [])].some((f) => f.endsWith('a.js'))).toBe(true);
  finish();
  await vi.waitFor(() => expect(store.readTask(task.id).status).toBe('done'));
  expect(locks.held.has(task.id)).toBe(false);
});

test('two steps for one role at once run side by side through a copy, which leaves when the task ends', async () => {
  let release = () => {};
  const gate = new Promise<void>((r) => (release = r));
  const waits: Turn = (prompt, options) =>
    gate.then(() => handback('r', { summary: '조사' })(prompt, options) as never);
  const { store, fake, chat, p, s } = openChat({ 조사: [waits, waits], 통역: [reply('보고')] });
  const base = chat.workflows.current(p.id, 'research');
  const step = (id: string) => ({ id, role: 'researcher', label: `조사 ${id}`, does: '조사한다.' });
  chat.workflows.save({
    projectId: p.id,
    kind: 'research',
    base: base.version,
    rules: { ...base.rules, steps: [step('a'), step('b')] },
    by: { name: 't' },
    scope: 'future',
  });

  const task = chat.tasks.start(s.id, 'research', '조사', 'r');
  await vi.waitFor(() => expect(fake.calls.filter((c) => c.role === '조사')).toHaveLength(2));
  const copy = store.listMembers(p.id).find((m) => m.temp)!;
  expect([store.assignee(task.id, 'b'), copy.key, copy.status]).toEqual([copy.id, 'researcher-1-b', 'hired']);
  release();
  await vi.waitFor(() => expect(store.readTask(task.id).status).toBe('done'));
  expect(store.readMemberById(copy.id).status).toBe('unhired');
});
