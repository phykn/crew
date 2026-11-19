import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { expect, test, vi } from 'vitest';
import { loadSdk } from '../../src/main/agents/run';
import { Chat } from '../../src/main/chat';
import { Store } from '../../src/main/db';
import { CREW, makeScratch, recordedRuns } from '../support';

const SEARCH = `export function search(items, query) {
  if (!query) return [];
  return items.filter((item) => item.includes(query));
}
`;
const SEARCH_TEST = `import { test } from 'node:test';
import assert from 'node:assert/strict';
import { search } from './search.js';

test('finds items containing the query', () => {
  assert.deepEqual(search(['apple', 'banana'], 'an'), ['banana']);
});
`;

test('real Claude: 비서 opens a code task and the crew changes and verifies it', async () => {
  const scratch = makeScratch({
    'package.json': JSON.stringify({ name: 'demo', type: 'module', scripts: { test: 'node --test' } }, null, 2),
    'search.js': SEARCH,
    'search.test.js': SEARCH_TEST,
  });
  const store = new Store(scratch.db);
  // Any approval card is refused at once and logged, so a live run never hangs on a question nobody answers
  const asked: string[] = [];
  const chat: Chat = new Chat(
    store,
    loadSdk,
    CREW,
    (channel, topic) => {
      if (channel !== 'changed' || topic !== 'messages') return;
      for (const m of store.listMessages(s.id)) {
        if (m.question && m.question.answer === null) {
          asked.push(m.question.prompt);
          chat.questions.answer(m.question.id, m.question.options.at(-1)!);
        }
      }
    },
    scratch.paths,
  );
  const p = store.addProject(scratch.project);
  chat.members.seed(p.id);
  const s = store.createSession(p.id);
  // Sonnet everywhere keeps the live run affordable while still doing real work
  for (const m of store.listMembers(p.id)) store.updateMember(m.id, { model: 'sonnet' });

  await chat.send(s.id, '빈 검색어는 전체 목록을 보여주게 바꿔줘');
  await vi.waitFor(
    () => {
      const [task] = store.listTasks(s.id);
      expect(task && ['done', 'failed'].includes(task.status)).toBe(true);
    },
    { timeout: 900_000, interval: 2000 },
  );
  // The report is the last thing 비서 writes after the task closes
  await vi.waitFor(() => expect(store.listMessages(s.id).at(-1)!.author).toBe('secretary'), { timeout: 120_000 });

  const [task] = store.listTasks(s.id);
  const steps = store.listStepRuns(task.id).map((r) => `${r.stepId}:${r.status}:${r.verdict ?? ''}`);
  console.log({
    errors: store.listStepRuns(task.id).map((r) => r.error),
    runs: recordedRuns(store, s.id).map((r) => r.error),
    steps,
    asked,
    report: store.listMessages(s.id).at(-1)!.text,
  });
  expect(task.status).toBe('done');
  // 비서 sizes the change: a large one starts with the plan, a small one with development
  expect(['plan:done:', 'develop:done:']).toContain(steps[0]);
  const out = execFileSync(
    process.execPath,
    ['-e', `import('./search.js').then(m => console.log(JSON.stringify(m.search(['a','b'], ''))))`],
    {
      cwd: scratch.project,
      encoding: 'utf-8',
    },
  );
  expect(JSON.parse(out)).toEqual(['a', 'b']);
  expect(store.listEvents(s.id).some((e) => e.kind === 'step' && e.text.includes('개발: 개발 완료'))).toBe(true);
  expect(path.basename(scratch.project)).toBe('demo');
}, 1_200_000);
