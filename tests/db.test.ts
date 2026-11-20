import { expect, test } from 'vitest';
import { Store } from '../src/backend/db';
import { openScratch } from './support';

test('skills set before a skill was renamed or split keep it under its new names', () => {
  const { store, project, db } = openScratch();
  const p = store.addProject(project);
  store.seedMembers(p.id, [{ key: 'coder', nickname: '모루', model: 'sonnet' }]);
  const coder = store.readMember(p.id, 'coder');
  store.writeConfig(coder.id, { skills: ['code', 'tools', 'review', 'report'], tools: ['read'] }, 'test');
  const version = (store.db.prepare('PRAGMA user_version').get() as { user_version: number }).user_version;
  // The renames rerun after them, so what was added since goes first
  store.db.exec(
    `DROP TABLE skills; ALTER TABLE projects DROP COLUMN mode; ALTER TABLE runs DROP COLUMN side; PRAGMA user_version = ${version - 6}`,
  );
  expect(new Store(db).readMemberById(coder.id).config).toEqual({
    skills: ['code', 'check', 'plan-review', 'code-review', 'report'],
    tools: ['read'],
  });
});

test('a record from when 도우미 was shipped opens without it, keeping the log lines and tasks', () => {
  const { store, project, db } = openScratch();
  const p = store.addProject(project);
  const s = store.createSession(p.id);
  store.seedMembers(p.id, [
    { key: 'orchestrator', nickname: '하람', model: 'sonnet' },
    { key: 'helper', nickname: '보람', model: 'haiku' },
  ]);
  const helper = store.readMember(p.id, 'helper');
  store.startRun(store.openAgentSession(s.id, helper.id).id, 'haiku');
  const task = store.createTask({
    sessionId: s.id,
    kind: 'research',
    title: '조사',
    request: 'r',
    workflow: { kind: 'research', label: '조사', use: '', steps: [] } as never,
  });
  store.addEvent({
    sessionId: s.id,
    taskId: task.id,
    memberId: helper.id,
    kind: 'note',
    text: '도우미가 열었습니다',
    detail: null,
  });
  const version = (store.db.prepare('PRAGMA user_version').get() as { user_version: number }).user_version;
  store.db.exec(`ALTER TABLE runs DROP COLUMN side; PRAGMA user_version = ${version - 2}`);

  const after = new Store(db);
  expect(after.listMembers(p.id).map((m) => m.key)).toEqual(['orchestrator']);
  expect(after.db.prepare('SELECT COUNT(*) AS n FROM runs').get()).toEqual({ n: 0 });
  expect(after.listEvents(s.id).map((e) => [e.text, e.memberId])).toEqual([['도우미가 열었습니다', null]]);
  expect(after.readTask(task.id).title).toBe('조사');
});

test("a resumed Claude session reports running totals, so usage counts only each run's own share", () => {
  const { store, project } = openScratch();
  const p = store.addProject(project);
  const s = store.createSession(p.id);
  store.seedMembers(p.id, [{ key: 'coder', nickname: '모루', model: 'sonnet' }]);
  const agent = store.openAgentSession(s.id, store.readMember(p.id, 'coder').id).id;
  const run = (model: string, costUsd: number, inputTokens: number, side = false) =>
    store.finishRun(store.startRun(agent, model, null, side), {
      status: 'done',
      usage: { turns: 1, inputTokens, outputTokens: 0, costUsd },
    });
  run('sonnet', 0.01, 10);
  run('sonnet', 0.03, 30);
  // A side question on a copy adds its own share but is not the session's own report
  run('sonnet', 0.04, 40, true);
  // Cut before its result: it reported nothing
  run('sonnet', 0, 0);
  run('sonnet', 0.06, 60);
  // A model change starts a fresh session, and coming back starts another
  run('opus', 0.02, 20);
  run('sonnet', 0.01, 10);
  const usage = Object.fromEntries(
    store.usage(s.id).map((u) => [u.model, [u.runs, u.inputTokens, +u.costUsd.toFixed(4)]]),
  );
  expect(usage).toEqual({ sonnet: [6, 80, 0.08], opus: [1, 20, 0.02] });
});
