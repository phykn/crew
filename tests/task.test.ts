import { expect, test, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { Chat } from '../src/main/chat';
import { nextStatus } from '../src/main/task';
import { CREW, fakeCrew, handback, openScratch, reply, type Turn } from './support';

test('기획 → 리뷰 (sent back once) → 기획 → 리뷰 → 개발 → 리뷰·시험, each role in its own Claude session', async () => {
  const { store, project, paths } = openScratch({ 'search.js': 'export const search = () => []' });
  let fake: ReturnType<typeof fakeCrew>;
  // 비서 opens the task the way the model would: by calling its start_task tool mid-turn
  const opens: Turn = (prompt, options) => {
    void fake.tools.get('start_task')!({ kind: 'code', title: '검색 개선', request: prompt });
    return reply('업무를 시작했습니다.', 'claude-secretary')(prompt, options);
  };
  fake = fakeCrew({
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
  });
  const chat = new Chat(
    store,
    async () => fake.sdk,
    CREW,
    () => {},
    paths,
  );
  const p = store.addProject(project);
  chat.seed(p.id);
  const s = store.createSession(p.id);

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
  expect(store.listAgentSessions(s.id).map((a) => [a.key, a.claudeId])).toEqual([
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
  const { store, project, paths } = openScratch();
  const never: Turn = () => new Promise(() => {});
  const chat = new Chat(
    store,
    async () => fakeCrew({ 개발: [never], 조사: [never] }).sdk,
    CREW,
    () => {},
    paths,
  );
  const p = store.addProject(project);
  chat.seed(p.id);
  const s = store.createSession(p.id);
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
  const { store, project, paths } = openScratch();
  let fake: ReturnType<typeof fakeCrew>;
  const opens: Turn = (prompt, options) => {
    void fake.tools.get('start_task')!({ kind: 'code', title: '검색 개선', request: prompt });
    return reply('업무를 시작했습니다.', 'claude-secretary')(prompt, options);
  };
  const again = handback('claude-review', { summary: '범위 누락', verdict: 'rework', points: ['빈 검색어'] });
  fake = fakeCrew({
    비서: [opens, reply('멈췄습니다.', 'claude-secretary')],
    기획: [handback('claude-plan', { summary: '계획 v1' }), handback('claude-plan', { summary: '계획 v2' })],
    리뷰: [again, again],
  });
  const chat = new Chat(
    store,
    async () => fake.sdk,
    CREW,
    () => {},
    paths,
  );
  const p = store.addProject(project);
  chat.seed(p.id);
  const s = store.createSession(p.id);
  const base = chat.workflowFor(p.id, 'code');
  const steps = base.rules.steps.map((st) => (st.id === 'plan_review' ? { ...st, loops: 1 } : st));
  chat.saveWorkflow({
    projectId: p.id,
    kind: 'code',
    base: base.version,
    rules: { ...base.rules, steps },
    author: 't',
    scope: 'future',
  });

  await chat.send(s.id, '검색 고쳐줘');
  await vi.waitFor(() => expect(store.listTasks(s.id)[0].status).toBe('failed'), { timeout: 3000 });
  expect(fake.calls.filter((c) => c.role === '비서')[1].prompt).toContain('계획을 1번 고쳤지만');
});

test('a redo that changes no file and is sent back again stops the task for the user instead of looping', async () => {
  const { store, project, paths } = openScratch({ 'a.js': 'a' });
  let fake: ReturnType<typeof fakeCrew>;
  const opens: Turn = (prompt, options) => {
    void fake.tools.get('start_task')!({ kind: 'code', title: '수정', request: prompt, size: 'small' });
    return reply('업무를 시작했습니다.', 'claude-secretary')(prompt, options);
  };
  const edits: Turn = (prompt, options) => {
    fs.writeFileSync(path.join(project, 'a.js'), 'b');
    return handback('claude-code', { summary: '고침', files: ['a.js'] })(prompt, options);
  };
  const no = handback('claude-review', { summary: '범위 밖', verdict: 'rework', points: ['범위 밖'] });
  const pass = (id: string) => handback(id, { summary: '통과', verdict: 'pass', checks: ['ok'] });
  fake = fakeCrew({
    비서: [opens, reply('멈췄습니다.', 'claude-secretary')],
    개발: [edits, handback('claude-code', { summary: '그대로 둠' })],
    리뷰: [no, no],
    시험: [pass('t'), pass('t')],
    표준: [pass('s'), pass('s')],
  });
  const chat = new Chat(
    store,
    async () => fake.sdk,
    CREW,
    () => {},
    paths,
  );
  const p = store.addProject(project);
  chat.seed(p.id);
  const s = store.createSession(p.id);

  await chat.send(s.id, '고쳐줘');
  await vi.waitFor(() => expect(store.listTasks(s.id)[0].status).toBe('failed'), { timeout: 3000 });
  expect(store.listStepRuns(1).filter((r) => r.stepId === 'develop')).toHaveLength(2);
  expect(fake.calls.filter((c) => c.role === '비서')[1].prompt).toContain('바뀐 것이 없는데 또 되돌려졌습니다');
});
