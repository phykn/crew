import { expect, test } from 'vitest';
import { Store } from '../../../src/backend/adapters/sqlite/store';
import { openScratch } from '../../support';
import { usage as sumUsage } from '../../../src/backend/domain/usage';

test('a record from before the rebuild opens with 비서 as 통역, without the roles that went, and with shipped skills', () => {
  const { store, project, db } = openScratch();
  const p = store.addProject(project);
  const s = store.createSession(p.id);
  store.seedMembers(
    p.id,
    ['orchestrator', 'hr', 'tools', 'advisor', 'stylist', 'coder'].map((key) => ({
      key,
      nickname: key,
      model: 'sonnet',
    })),
  );
  const coder = store.readMember(p.id, 'coder');
  store.writeConfig(coder.id, { skills: ['code', 'check'], tools: ['read'] }, 'test');
  const advisor = store.readMember(p.id, 'advisor');
  store.startRun(store.openAgentSession(s.id, advisor.id).id, 'opus');
  store.addEvent({ sessionId: s.id, taskId: null, memberId: advisor.id, kind: 'note', text: '계획', detail: null });
  const version = (store.db.prepare('PRAGMA user_version').get() as { user_version: number }).user_version;
  store.db.exec(`CREATE TABLE skills (project_id INTEGER, name TEXT); PRAGMA user_version = ${version - 2}`);

  const after = new Store(db);
  expect(after.listMembers(p.id).map((m) => m.key)).toEqual(['interpreter', 'coder']);
  expect(after.readMemberById(coder.id).config).toEqual({ tools: ['read'] });
  expect(after.listEvents(s.id).map((e) => [e.text, e.memberId])).toEqual([['계획', null]]);
});

test('a record from when 도우미 was shipped opens without it, keeping the log lines and tasks', () => {
  const { store, project, db } = openScratch();
  const p = store.addProject(project);
  const s = store.createSession(p.id);
  store.seedMembers(p.id, [
    { key: 'interpreter', nickname: '하람', model: 'sonnet' },
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
  store.db.exec(
    `CREATE TABLE skills (project_id INTEGER, name TEXT); ALTER TABLE runs DROP COLUMN side; DROP TABLE message_images; ALTER TABLE messages DROP COLUMN task_id; PRAGMA user_version = ${version - 7}`,
  );

  const after = new Store(db);
  expect(after.listMembers(p.id).map((m) => m.key)).toEqual(['interpreter']);
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
    sumUsage(store.listRunSpend(s.id)).map((u) => [u.model, [u.runs, u.inputTokens, +u.costUsd.toFixed(4)]]),
  );
  expect(usage).toEqual({ sonnet: [6, 80, 0.08], opus: [1, 20, 0.02] });
});
