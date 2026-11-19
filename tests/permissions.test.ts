import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from 'vitest';
import { Chat } from '../src/main/chat';
import { kitTools } from '../src/main/crew-tools';
import { Crew } from '../src/main/crew';
import { Store } from '../src/main/db';
import { CREW, fakeQuery, openScratch } from './support';

function setup(crew = CREW) {
  const scratch = openScratch();
  const chat = new Chat(
    scratch.store,
    async () => fakeQuery([]).sdk,
    crew,
    () => {},
    scratch.paths,
  );
  const project = scratch.store.addProject(scratch.project);
  chat.seed(project.id);
  const session = scratch.store.createSession(project.id);
  // Task 1, which the guards below work in
  scratch.store.createTask({
    sessionId: session.id,
    kind: 'code',
    title: 't',
    request: 'r',
    workflow: chat.workflows[0],
  });
  return { ...scratch, chat, project, session };
}

type Options = Parameters<ReturnType<Chat['guard']>>[2];
const opts = { signal: new AbortController().signal, toolUseID: 't', requestId: 'r' } as Options;
const tick = () => new Promise((r) => setTimeout(r, 0));

test('on one MCP server 개발 may use every tool and 리뷰 only the looking ones', async () => {
  const { store, chat, project, session } = setup();
  const coder = store.readMember(project.id, 'coder');
  const reviewer = store.readMember(project.id, 'reviewer');
  chat.setPermissions(coder.id, { mcp: [{ server: 'browser', access: 'all' }] });
  chat.setPermissions(reviewer.id, { mcp: [{ server: 'browser', access: 'read' }] });

  const coderGuard = chat.guard(coder, project, session.id, 1);
  const reviewerGuard = chat.guard(reviewer, project, session.id, 1);
  expect((await coderGuard('mcp__browser__browser_click', {}, opts))!.behavior).toBe('allow');
  expect((await reviewerGuard('mcp__browser__browser_snapshot', {}, opts))!.behavior).toBe('allow');

  const click = reviewerGuard('mcp__browser__browser_click', {}, opts);
  await tick();
  expect(store.listMessages(session.id).at(-1)!.question?.kind).toBe('approval');
  chat.questions.answer(store.listMessages(session.id).at(-1)!.question!.id, '거절');
  expect((await click)!.behavior).toBe('deny');
});

test('a permission revoked while a call waits blocks that call and the next call of an older session', async () => {
  const { store, chat, project, session } = setup();
  const reviewer = store.readMember(project.id, 'reviewer');
  chat.setPermissions(reviewer.id, { mcp: [{ server: 'browser', access: 'read' }] });
  const older = chat.guard(reviewer, project, session.id, 1);

  // The browser click waits for approval; the user takes the browser away before answering it
  const waiting = older('mcp__browser__browser_click', {}, opts);
  await tick();
  chat.setPermissions(reviewer.id, { mcp: [] });
  chat.questions.answer(store.listMessages(session.id).at(-1)!.question!.id, '허용');
  expect((await waiting)!.behavior).toBe('deny');

  // 개발 had the shell approved in this task once; after the shell is revoked from its tools, the approval no longer holds
  const coder = store.readMember(project.id, 'coder');
  chat.setPermissions(coder.id, { tools: ['read', 'search', 'write', 'edit'] });
  const shell = chat.guard(coder, project, session.id, 1)('Bash', { command: 'ls' }, opts);
  await tick();
  const card = store.listMessages(session.id).at(-1)!.question!;
  expect(card.payload).toMatchObject({ memberId: coder.id, tool: 'Bash' });
  chat.questions.answer(card.id, '허용');
  expect((await shell)!.behavior).toBe('allow');
  chat.setPermissions(coder.id, { tools: ['read', 'search'] });
  const again = chat.guard(coder, project, session.id, 1)('Bash', { command: 'ls' }, opts);
  await tick();
  expect(store.listMessages(session.id).at(-1)!.question!.id).not.toBe(card.id);
  chat.questions.answer(store.listMessages(session.id).at(-1)!.question!.id, '거절');
  expect((await again)!.behavior).toBe('deny');
});

test('a permission change is recorded by name, never with the server settings it touches', () => {
  // A crew copy whose browser server carries a token in its environment
  const dir = fs.mkdtempSync(path.join(path.dirname(CREW.dir), '.crew-test-'));
  try {
    fs.cpSync(CREW.dir, dir, { recursive: true });
    const file = path.join(dir, 'mcp.json');
    const mcp = JSON.parse(fs.readFileSync(file, 'utf-8'));
    mcp.mcpServers.browser.env = { API_TOKEN: 'secret-123' };
    fs.writeFileSync(file, JSON.stringify(mcp));
    const { store, chat, project } = setup(new Crew(dir));
    const reviewer = store.readMember(project.id, 'reviewer');
    chat.setPermissions(reviewer.id, {
      mcp: [{ server: 'browser', access: 'read' }],
      skills: ['plan-review', 'code-review'],
    });

    const [change] = store.listPermissionChanges(reviewer.id);
    expect(change.change).toBe('스킬 -report, MCP +browser(읽기), MCP -browser(전체)');
    expect(JSON.stringify(store.listPermissionChanges(reviewer.id))).not.toContain('secret-123');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('skills set before a skill was renamed or split keep it under its new names', () => {
  const { store, project, db } = openScratch();
  const p = store.addProject(project);
  store.seedMembers(p.id, [{ key: 'coder', nickname: '모루', model: 'sonnet' }]);
  const coder = store.readMember(p.id, 'coder');
  store.writeConfig(coder.id, { skills: ['code', 'tools', 'review', 'report'], tools: ['read'] }, 'test');
  const version = (store.db.prepare('PRAGMA user_version').get() as { user_version: number }).user_version;
  // The renames rerun after them, so what was added since goes first
  store.db.exec(`DROP TABLE skills; ALTER TABLE projects DROP COLUMN mode; PRAGMA user_version = ${version - 4}`);
  expect(new Store(db).readMemberById(coder.id).config).toEqual({
    skills: ['code', 'check', 'plan-review', 'code-review', 'report'],
    tools: ['read'],
  });
});

test('도구 makes, deletes, and resets skills for this project only, each on an approved card in manual mode', async () => {
  const { store, project, paths } = openScratch();
  const fake = fakeQuery([]);
  const chat = new Chat(
    store,
    async () => fake.sdk,
    CREW,
    () => {},
    paths,
  );
  const p = store.addProject(project);
  const other = store.addProject(fs.mkdtempSync(path.join(path.dirname(project), 'other-')));
  chat.seed(p.id);
  chat.seed(other.id);
  const s = store.createSession(p.id);
  kitTools(fake.sdk, chat, s.id);
  const run = (name: string, a: Record<string, unknown>) => {
    const out = fake.tools.get(name)!(a) as Promise<{ content: { text: string }[] }>;
    const card = store.listMessages(s.id).at(-1)!.question!;
    chat.questions.answer(card.id, '적용');
    return out;
  };

  await run('write_skill', {
    name: 'changelog',
    label: '변경 기록',
    use: 'Keep CHANGELOG.md.',
    body: 'Add one line per change.',
    reason: '변경 기록이 필요합니다',
  });
  expect(chat.kit(p.id).texts.changelog).toBe('Add one line per change.');
  await run('write_skill', {
    name: 'changelog',
    label: '변경 기록',
    use: 'Keep CHANGELOG.md.',
    body: 'Add one line per release.',
    reason: '릴리스 단위로',
  });
  expect(store.listMessages(s.id).at(-1)!.text).toContain('− Add one line per change.\n+ Add one line per release.');
  await run('delete_skill', { name: 'code', reason: '쓰지 않습니다' });
  expect(chat.kit(p.id).skills.code).toBeUndefined();
  expect(chat.settings(store.readMember(p.id, 'coder')).skills).not.toContain('code');
  expect(chat.kit(other.id).skills.code).toBeDefined();
  expect(chat.kit(other.id).skills.changelog).toBeUndefined();

  // Back to the shipped kit: the made skill goes, the deleted one returns to the members who held it
  await run('reset_skills', { reason: '처음대로' });
  expect(chat.kit(p.id).skills.changelog).toBeUndefined();
  expect(chat.settings(store.readMember(p.id, 'coder')).skills).toContain('code');
  // Outside manual mode a change applies without a card
  store.setMode(p.id, 'auto');
  const cards = store.listMessages(s.id).length;
  await fake.tools.get('delete_skill')!({ name: 'code', reason: '쓰지 않습니다' });
  expect([chat.kit(p.id).skills.code, store.listMessages(s.id).length]).toEqual([undefined, cards]);
});
