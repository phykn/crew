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
  store.db.exec(`DROP TABLE skills; ALTER TABLE projects DROP COLUMN mode; PRAGMA user_version = ${version - 5}`);
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
  store.db.exec(`PRAGMA user_version = ${version - 1}`);

  const after = new Store(db);
  expect(after.listMembers(p.id).map((m) => m.key)).toEqual(['orchestrator']);
  expect(after.db.prepare('SELECT COUNT(*) AS n FROM runs').get()).toEqual({ n: 0 });
  expect(after.listEvents(s.id).map((e) => [e.text, e.memberId])).toEqual([['도우미가 열었습니다', null]]);
  expect(after.readTask(task.id).title).toBe('조사');
});
