import { expect, test, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { nextStatus, satisfied } from '../../src/backend/tasks/engine';
import {
  CREW,
  type fakeCrew,
  handback,
  never,
  openChat,
  recordedAgents,
  reopenChat,
  reply,
  type Turn,
} from '../support';
import { Workflow } from '../../src/backend/tasks/workflow';
import { snapshot } from '../../src/backend/tasks/changes';

// 비서 opens the task the way the model would: by calling its start_task tool mid-turn
const opening = (fake: () => ReturnType<typeof fakeCrew>, input: Record<string, unknown>): Turn => {
  return (prompt, options) => {
    void fake().tools.get('start_task')!({ request: prompt, ...input });
    return reply('업무를 시작했습니다.', 'claude-secretary')(prompt, options);
  };
};

test('기획 → 리뷰 (sent back once) → 기획 → 리뷰 → 개발 → 리뷰·시험, each role in its own Claude session', async () => {
  const opens = opening(() => fake, { kind: 'code', title: '검색 개선' });
  const { store, fake, chat, s } = openChat(
    {
      비서: [opens, reply('검색을 고쳤고 리뷰와 시험을 통과했습니다.', 'claude-secretary')],
      기획: [handback('claude-plan', { summary: '계획 v1' }), handback('claude-plan', { summary: '계획 v2' })],
      리뷰: [
        handback('claude-review', { summary: '범위 누락', verdict: 'rework', points: ['빈 검색어 경우가 없습니다'] }),
        handback('claude-review', { summary: '계획 통과', verdict: 'pass' }),
        handback('claude-review', { summary: '코드 통과', verdict: 'pass' }),
      ],
      개발: [handback('claude-code', { summary: '검색 수정', files: ['search.js'] })],
      시험: [handback('claude-test', { summary: '시험 통과', verdict: 'pass', checks: ['npm test: 3 passed'] })],
      표준: [handback('claude-style', { summary: '스타일 통과', verdict: 'pass' })],
    },
    { files: { 'search.js': 'export const search = () => []' } },
  );

  await chat.send(s.id, '빈 검색어는 전체 목록을 보여주게 바꿔줘');
  await vi.waitFor(() => expect(store.listMessages(s.id).at(-1)!.text).toContain('통과했습니다'), { timeout: 3000 });

  const [task] = store.listTasks(s.id);
  expect(task.status).toBe('done');
  expect(store.listStepRuns(task.id).map((r) => [r.stepId, r.verdict])).toEqual([
    ['plan', null],
    ['plan_review', 'rework'],
    ['plan', null],
    ['plan_review', 'pass'],
    ['develop', null],
    ['review', 'pass'],
    ['test', 'pass'],
    ['style', 'pass'],
  ]);
  // The fix round gets the reviewer's point, and the second plan run resumes the first one's session
  const plans = fake.calls.filter((c) => c.role === '기획');
  expect(plans[1].prompt).toContain('빈 검색어 경우가 없습니다');
  expect(plans.map((c) => c.options.resume)).toEqual([undefined, 'claude-plan']);
  expect(recordedAgents(store, s.id).map((a) => [a.key, a.claudeId])).toEqual([
    ['orchestrator', 'claude-secretary'],
    ['advisor', 'claude-plan'],
    ['reviewer', 'claude-review'],
    ['coder', 'claude-code'],
    ['tester', 'claude-test'],
    ['stylist', 'claude-style'],
  ]);
  expect(
    store
      .listEvents(s.id)
      .filter((e) => e.kind === 'status')
      .map((e) => e.detail),
  ).toEqual(['running', 'running', 'reviewing', 'fixing', 'reviewing', 'running', 'reviewing', 'done']);
  // The report 비서 is asked to give carries the changed files and the checks
  const report = fake.calls.filter((c) => c.role === '비서')[1].prompt;
  expect(report).toContain('[Task #1 finished]');
  expect(report).toContain('search.js');
  expect(report).toContain('npm test: 3 passed');
});

test('a small change and one given to a member who writes the project skip the plan and keep every check; others work alone', () => {
  const { store, chat, p, s } = openChat({ 개발: [never], 조사: [never] });
  const ids = (t: { workflow: { steps: { id: string }[] } }) => t.workflow.steps.map((x) => x.id);
  const checked = ['develop', 'review', 'test', 'style'];
  expect(ids(chat.tasks.start(s.id, 'code', 'small', 'r', undefined, true))).toEqual(checked);
  const given = chat.tasks.start(s.id, 'research', 'coder', 'r', store.readMember(p.id, 'coder'));
  expect([given.kind, ...ids(given)]).toEqual(['code', ...checked]);
  expect(store.assignee(given.id, 'develop')).toBe(store.readMember(p.id, 'coder').id);
  expect(ids(chat.tasks.start(s.id, 'research', 'researcher', 'r', store.readMember(p.id, 'researcher')))).toEqual([
    'work',
  ]);
});

test('the status machine refuses moves a task cannot make', () => {
  expect(nextStatus('done', 'REOPEN')).toBe('running');
  expect(nextStatus('stopping', 'STOPPED')).toBe('stopped');
  expect(nextStatus('done', 'WORK')).toBeNull();
  expect(nextStatus('stopped', 'DONE')).toBeNull();
});

test('a check with one loop stops the task when its second look still sends the work back', async () => {
  const opens = opening(() => fake, { kind: 'code', title: '검색 개선' });
  const again = handback('claude-review', { summary: '범위 누락', verdict: 'rework', points: ['빈 검색어'] });
  const { store, fake, chat, p, s } = openChat({
    비서: [opens, reply('멈췄습니다.', 'claude-secretary')],
    기획: [handback('claude-plan', { summary: '계획 v1' }), handback('claude-plan', { summary: '계획 v2' })],
    리뷰: [again, again],
  });
  const base = chat.workflows.current(p.id, 'code');
  const steps = base.rules.steps.map((st) => (st.id === 'plan_review' ? { ...st, loops: 1 } : st));
  chat.workflows.save({
    projectId: p.id,
    kind: 'code',
    base: base.version,
    rules: { ...base.rules, steps },
    by: { memberId: null, name: 't' },
    scope: 'future',
  });

  await chat.send(s.id, '검색 고쳐줘');
  await vi.waitFor(() => expect(store.listTasks(s.id)[0].status).toBe('failed'), { timeout: 3000 });
  expect(fake.calls.filter((c) => c.role === '비서')[1].prompt).toContain('계획을 1번 고쳤지만');
});

test('a redo that changes no file and is sent back again stops the task for the user instead of looping', async () => {
  const opens = opening(() => fake, { kind: 'code', title: '수정', size: 'small' });
  const edits: Turn = (prompt, options) => {
    fs.writeFileSync(path.join(project, 'a.js'), 'b');
    return handback('claude-code', { summary: '고침', files: ['a.js'] })(prompt, options);
  };
  const no = handback('claude-review', { summary: '범위 밖', verdict: 'rework', points: ['범위 밖'] });
  const pass = (id: string) => handback(id, { summary: '통과', verdict: 'pass', checks: ['ok'] });
  const { store, fake, chat, s, project } = openChat(
    {
      비서: [opens, reply('멈췄습니다.', 'claude-secretary')],
      개발: [edits, handback('claude-code', { summary: '그대로 둠' })],
      리뷰: [no, no],
      시험: [pass('t'), pass('t')],
      표준: [pass('s'), pass('s')],
    },
    { files: { 'a.js': 'a' } },
  );

  await chat.send(s.id, '고쳐줘');
  await vi.waitFor(() => expect(store.listTasks(s.id)[0].status).toBe('failed'), { timeout: 3000 });
  expect(store.listStepRuns(1).filter((r) => r.stepId === 'develop')).toHaveLength(2);
  expect(fake.calls.filter((c) => c.role === '비서')[1].prompt).toContain('바뀐 것이 없는데 또 되돌려졌습니다');
});

test('a broken step fails after its retries; a stopped task leaves the other running; a restart is resumed', async () => {
  let release = () => {};
  // Answers only when released, like a long real step
  const held: Turn = (p, o) => new Promise((r) => (release = () => r(reply('', 'claude-research')(p, o) as never)));
  const broken = reply('형식 없음', 'claude-research');
  const { store, fake, chat, s, db, paths } = openChat(
    {
      비서: [reply('실패 보고', 'claude-secretary')],
      조사: [broken, broken, broken, broken, held],
      기획: [never],
    },
    { files: { 'a.js': 'a' } },
  );

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
  const {
    store: after,
    fake: fresh,
    chat: again,
  } = reopenChat({ db, paths }, { 기획: [handback('p', { summary: '계획' }), never], 리뷰: [never] });
  const recovered = after.listEvents(s.id).filter((e) => e.text === '앱이 다시 시작되어 업무가 멈췄습니다');
  expect([recovered.map((e) => e.taskId), after.readTask(three.id).status]).toEqual([[three.id], 'stopped']);
  expect(again.tasks.resume(three.id)).toBe(true);
  await vi.waitFor(() => expect(fresh.calls.map((c) => c.role)).toEqual(['기획', '리뷰']));
});

test('a step queued before a stop is not run again by the resume', async () => {
  let release = () => {};
  const held: Turn = (p, o) => new Promise((r) => (release = () => r(reply('', 'claude-plan')(p, o) as never)));
  const { store, fake, chat, p, s } = openChat({
    기획: [held, handback('claude-plan', { summary: '계획' })],
    리뷰: [never],
  });
  // 기획's lane is busy, so the task's plan step waits behind it
  void chat.runs.run(store.readMember(p.id, 'advisor'), s.id, null, 'hold');
  await vi.waitFor(() => expect(fake.calls).toHaveLength(1));
  const task = chat.tasks.start(s.id, 'code', 't', 'r');
  expect(store.listStepRuns(task.id).map((r) => r.stepId)).toEqual(['plan']);

  chat.tasks.stop(task.id);
  chat.tasks.resume(task.id);
  release();
  await vi.waitFor(() => expect(fake.calls.map((c) => c.role)).toContain('리뷰'));
  expect(fake.calls.filter((c) => c.role === '기획')).toHaveLength(2);
});

test('a usage limit pauses the task and 비서 reports what is done and left; usage adds up per role and model', async () => {
  const limited: Turn = (p, o) => [
    { type: 'rate_limit_event', rate_limit_info: { status: 'rejected' } } as never,
    ...(reply('', 'r')(p, o) as never[]),
  ];
  const { store, fake, chat, s } = openChat({
    기획: [handback('p', { summary: '계획 완료' })],
    리뷰: [limited],
    비서: [reply('한도 보고')],
  });
  const task = chat.tasks.start(s.id, 'code', '검색', 'r');
  await vi.waitFor(() => expect(fake.calls.at(-1)!.role).toBe('비서'));
  expect(store.readTask(task.id).status).toBe('stopped');
  const report = fake.calls.at(-1)!.prompt;
  expect(report).toContain(`[Task #${task.id} paused]`);
  expect(report).toContain('계획 완료');
  expect(report).toMatch(/Left to do\n- 계획 검토\n- 개발/);
  // reply() charges 10 in, 5 out, $0.01 per run
  expect(store.usage(s.id).map((u) => [u.model, u.runs, u.inputTokens, u.outputTokens])).toEqual(
    expect.arrayContaining([
      ['opus', 1, 10, 5],
      ['opus', 1, 10, 5],
    ]),
  );
});

test('each change is a version the verdicts judge, and a follow-up reopens the same task', async () => {
  // 개발 really edits the project, so the version comes from the files, not from what the handback claims
  const edit =
    (text: string): Turn =>
    (prompt, options) => {
      fs.writeFileSync(path.join(project, 'search.js'), text);
      return handback('claude-code', { summary: text, files: ['wrong.js'] })(prompt, options);
    };
  const pass = (sid: string): Turn => handback(sid, { summary: '통과', verdict: 'pass', checks: ['ok'] });
  const { store, fake, chat, s, project } = openChat(
    {
      비서: [reply('보고 1', 'claude-secretary'), reply('보고 2', 'claude-secretary')],
      기획: [handback('claude-plan', { summary: '계획' })],
      리뷰: [pass('claude-review'), pass('claude-review'), pass('claude-review')],
      개발: [edit('v1'), edit('v2')],
      시험: [pass('claude-test'), pass('claude-test')],
      표준: [pass('claude-style'), pass('claude-style')],
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
  expect(store.readTask(task.id).request).toContain('추가 요청: 대소문자 무시');
  expect(fake.calls.filter((c) => c.role === '개발')[1].prompt).toContain('대소문자 무시');
  expect(store.listTasks(s.id)).toHaveLength(1);
});

test('words added while 개발 is at work join the task: 개발 redoes with them and the checks judge the redo', async () => {
  let release = () => {};
  const edit =
    (text: string): Turn =>
    (prompt, options) => {
      fs.writeFileSync(path.join(project, 'calc.js'), text);
      return handback('claude-code', { summary: text })(prompt, options);
    };
  // The first turn waits, so the words arrive while 개발 is still working
  const held: Turn = (p, o) => new Promise((r) => (release = () => r(edit('v1')(p, o) as never)));
  const pass = (sid: string): Turn => handback(sid, { summary: '통과', verdict: 'pass', checks: ['ok'] });
  const { store, fake, chat, s, project } = openChat(
    {
      비서: [reply('보고', 'claude-secretary')],
      개발: [held, edit('v2')],
      리뷰: [pass('r'), pass('r')],
      시험: [pass('t'), pass('t')],
      표준: [pass('s'), pass('s')],
    },
    { files: { 'calc.js': 'v0' } },
  );
  const task = chat.tasks.start(s.id, 'code', 'sqrt', 'sqrt 추가', undefined, true);
  await vi.waitFor(() => expect(fake.calls.map((c) => c.role)).toContain('개발'));

  expect(chat.tasks.reopen(task.id, '에러 메시지는 영어로')).toBe(true);
  release();
  await vi.waitFor(() => expect(store.readTask(task.id).status).toBe('done'));
  const coder = fake.calls.filter((c) => c.role === '개발');
  expect(coder).toHaveLength(2);
  expect(coder[1].prompt).toContain('에러 메시지는 영어로');
  expect(store.readTask(task.id).request).toContain('추가 요청: 에러 메시지는 영어로');
  // Each check's last verdict is on the redo's version
  const v = store.latestVersion(task.id)!.id;
  const checks = store.listStepRuns(task.id).filter((r) => ['review', 'test', 'style'].includes(r.stepId));
  expect(checks.slice(-3).map((r) => r.versionId)).toEqual([v, v, v]);
});

test('a review of an older version that arrives late does not satisfy the newer one', () => {
  const w = Workflow.parse(JSON.parse(fs.readFileSync(path.join(CREW.dir, 'workflows', 'code.json'), 'utf-8')));
  const run = (id: number, stepId: string, verdict: 'pass' | 'rework' | null = null) =>
    ({
      id,
      taskId: 1,
      stepId,
      memberId: 1,
      status: 'done',
      verdict,
      handback: null,
      error: null,
      versionId: null,
    }) as const;
  // develop v1 (3), review starts on v1 (4), test sends back (5), develop v2 (6), then review of v1 finishes with pass
  const runs = [
    run(1, 'plan'),
    run(2, 'plan_review', 'pass'),
    run(3, 'develop'),
    run(5, 'test', 'rework'),
    run(6, 'develop'),
    run(4, 'review', 'pass'),
  ];
  expect(satisfied(w, runs, 'review')).toBe(false);
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
  store.finishStepRun(store.startStepRun(task.id, 'plan', member('advisor')), 'done', {
    summary: '계획',
    body: '',
    points: [],
    files: [],
    checks: [],
  });
  store.finishStepRun(store.startStepRun(task.id, 'plan_review', member('reviewer')), 'done', {
    summary: '통과',
    body: '',
    verdict: 'pass',
    points: [],
    files: [],
    checks: [],
  });
  store.startStepRun(task.id, 'develop', member('coder'));
  store.writeTaskStatus(task.id, 'running', '개발', '개발 진행');
  fs.writeFileSync(path.join(project, 'search.js'), 'v1');

  const { fake: fresh, chat: again } = reopenChat({ db, paths }, { 개발: [never] });
  expect(again.tasks.resume(task.id)).toBe(true);
  await vi.waitFor(() => expect(fresh.calls.map((c) => c.role)).toEqual(['개발']));
  expect(fresh.calls[0].prompt).toContain('cut off after changing: search.js');
});

test('reopening a task sends the change back to every step that made it', () => {
  const { store, chat, s } = openChat({ 기획: [never], 표준: [never] });
  const task = store.createTask({
    sessionId: s.id,
    kind: 'improve',
    title: '개선',
    request: 'r',
    workflow: chat.workflows.shipped.find((w) => w.kind === 'improve')!,
  });
  store.writeTaskStatus(task.id, 'done', '', '완료');
  expect(chat.tasks.reopen(task.id, '다시 봐줘')).toBe(true);
  expect(
    store
      .listStepRuns(task.id)
      .filter((r) => r.stepId === '_user')
      .map((r) => r.handback?.target),
  ).toEqual(['advise', 'structure']);
});
