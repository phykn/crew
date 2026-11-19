import fs from 'node:fs';
import path from 'node:path';
import { expect, test, vi } from 'vitest';
import { Chat } from '../src/main/chat';
import { satisfied } from '../src/main/task';
import { readWorkflows } from '../src/main/workflow';
import { CREW, fakeCrew, handback, openScratch, reply, type Turn } from './support';

test('each change is a version the verdicts judge, and a follow-up reopens the same task', async () => {
  const { store, project, paths } = openScratch({ 'search.js': 'v0', 'old.txt': 'before the task' });
  // 개발 really edits the project, so the version comes from the files, not from what the handback claims
  const edit =
    (text: string): Turn =>
    (prompt, options) => {
      fs.writeFileSync(path.join(project, 'search.js'), text);
      return handback('claude-code', { summary: text, files: ['wrong.js'] })(prompt, options);
    };
  const pass = (sid: string): Turn => handback(sid, { summary: '통과', verdict: 'pass', checks: ['ok'] });
  const fake = fakeCrew({
    비서: [reply('보고 1', 'claude-secretary'), reply('보고 2', 'claude-secretary')],
    기획: [handback('claude-plan', { summary: '계획' })],
    리뷰: [pass('claude-review'), pass('claude-review'), pass('claude-review')],
    개발: [edit('v1'), edit('v2')],
    시험: [pass('claude-test'), pass('claude-test')],
    표준: [pass('claude-style'), pass('claude-style')],
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

const CREW_CODE = () => readWorkflows(CREW.dir).find((w) => w.kind === 'code')!;

test('a review of an older version that arrives late does not satisfy the newer one', () => {
  const w = CREW_CODE();
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
