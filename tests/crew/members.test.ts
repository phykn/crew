import fs from 'node:fs';
import path from 'node:path';
import { expect, test, vi } from 'vitest';
import { Chat } from '../../src/backend/chat';
import { secretaryTools } from '../../src/backend/tools/secretary';
import { CREW, fakeCrew, handback, openScratch, reply, fakeQuery, type Turn } from '../support';
import { kitTools } from '../../src/backend/tools/kit';
import { Crew } from '../../src/backend/crew/shipped';
import { Store } from '../../src/backend/db';

// mcp: none is how models often write an empty list
const md = (role: string) => `---
role: ${role}
color: #44aa88
model: sonnet
tools: read, search, write, shell
write: project
skills: research
mcp: none
look: hood, robe, boots
description: Translates the project's text.
---

You are the crew's **${role}**. You translate.
`;

test('인사 drafts a temp, 비서 brings it in and it leaves once; its work is fixed by the next temp, not by it', async () => {
  const { store, project, paths } = openScratch({ 'a.md': 'hello' });
  let release = () => {};
  const held: Turn = (p, o) =>
    new Promise((r) => (release = () => r(handback('t2', { summary: '번역 수정' })(p, o) as never)));
  const fake = fakeCrew({
    인사: [
      reply('', 'hr', { key: 'translator', nickname: '라온', definition: md('번역') }),
      reply('', 'hr', { key: 'translator2', nickname: '가람', definition: md('통역') }),
    ],
    // The temp may write only to its output folder, and its file moves into the project once the task is done
    번역: [
      (p, o) => {
        fs.writeFileSync(
          path.join(p.match(/Your output folder for files you produce: (.+)/)![1], 'a.ja.md'),
          'こんにちは',
        );
        return handback('t1', { summary: '번역 완료', body: '안녕하세요' })(p, o);
      },
    ],
    통역: [held],
    비서: [reply('보고 1'), reply('보고 2')],
  });
  const chat = new Chat(
    store,
    async () => fake.sdk,
    CREW,
    () => {},
    paths,
  );
  const p = store.addProject(project);
  chat.members.seed(p.id);
  const s = store.createSession(p.id);
  secretaryTools(fake.sdk, chat, s.id);
  const tool = (name: string, a: Record<string, unknown>) =>
    fake.tools.get(name)!(a) as Promise<{ content: { text: string }[] }>;
  const roles = () => CREW.describe(store.listMembers(p.id), chat.members.kit(p.id)).map((m) => m.role);

  expect((await tool('hire', { need: '문서 번역', temp: true })).content[0].text).toContain('번역(라온)을 알바로');
  const temp = store.readMember(p.id, 'translator');
  // A temp gets no shell and writes only into its output folder
  expect(chat.members.settings(temp)).toMatchObject({ tools: ['read', 'search', 'write'], write: 'output' });
  expect(roles()).toContain('번역');
  await tool('start_task', { kind: 'code', title: '번역', request: 'a.md 번역', role: '번역' });
  const [task] = store.listTasks(s.id);
  await vi.waitFor(() => expect(fs.readFileSync(path.join(p.path, 'a.ja.md'), 'utf8')).toBe('こんにちは'));
  expect(store.readTask(task.id).status).toBe('done');
  expect(roles()).not.toContain('번역');
  chat.members.fire(temp.id);
  expect(
    store
      .listEvents(s.id)
      .filter((e) => e.kind === 'leave')
      .map((e) => e.text),
  ).toEqual(['번역(라온) 퇴장']);

  // The fix goes to a new temp, handed what the first one saved; the one who left gets nothing
  await tool('hire', { need: '번역 수정', temp: true });
  expect((await tool('reassign', { task_id: task.id, from_role: '번역', to_role: '통역' })).content[0].text).toContain(
    '번역 작업',
  );
  expect(chat.tasks.reopen(task.id, '존댓말로')).toBe(true);
  await vi.waitFor(() => expect(fake.calls.filter((c) => c.role === '통역')).toHaveLength(1));
  expect(fake.calls.find((c) => c.role === '통역')!.prompt).toContain('안녕하세요');
  expect(fake.calls.filter((c) => c.role === '번역')).toHaveLength(1);

  // Let go twice while at work: one 퇴장 예정, one 퇴장, after its step
  const second = store.readMember(p.id, 'translator2');
  chat.members.fire(second.id);
  chat.members.fire(second.id);
  expect(store.readMemberById(second.id).leaving).toBe(true);
  release();
  await vi.waitFor(() => expect(store.readMemberById(second.id).status).toBe('unhired'));
  expect(
    store
      .listEvents(s.id)
      .filter((e) => e.kind === 'leave')
      .map((e) => e.text),
  ).toEqual(['번역(라온) 퇴장', '통역(가람) 퇴장 예정: 맡은 단계를 마치고 나갑니다', '통역(가람) 퇴장']);
});

test('인사 names a member who already fits instead of drafting, and a draft with a sprite part the camp lacks is refused', async () => {
  const { store, project, paths } = openScratch();
  const fake = fakeCrew({
    인사: [
      reply('', 'hr', { fits: { key: 'researcher', reason: '공식 문서 조사가 이미 조사의 일입니다' } }),
      reply('', 'hr', {
        key: 'translator',
        nickname: '라온',
        definition: md('번역').replace('hood, robe, boots', 'cap, coat, boots'),
      }),
    ],
  });
  const chat = new Chat(
    store,
    async () => fake.sdk,
    CREW,
    () => {},
    paths,
  );
  const p = store.addProject(project);
  chat.members.seed(p.id);
  const s = store.createSession(p.id);
  expect(await chat.members.hire(s.id, '버전 조사', false)).toContain('조사(researcher)가 이미 맞습니다');
  expect(await chat.members.hire(s.id, '번역', false)).toContain('정의가 맞지 않습니다');
  expect(store.listMembers(p.id)).toHaveLength(11);
});

test('asked to hire a role that was let go, 인사 names it and it comes back instead of a twin', async () => {
  const { store, project, paths } = openScratch();
  const fake = fakeCrew({ 인사: [reply('', 'hr', { fits: { key: 'tester', reason: '시험 담당이 있습니다' } })] });
  const chat = new Chat(
    store,
    async () => fake.sdk,
    CREW,
    () => {},
    paths,
  );
  const p = store.addProject(project);
  chat.members.seed(p.id);
  const s = store.createSession(p.id);
  const tester = store.readMember(p.id, 'tester');
  chat.members.fire(tester.id);
  expect(await chat.members.hire(s.id, '시험 담당 다시', false)).toContain('다시 고용했습니다');
  expect(store.readMemberById(tester.id).status).toBe('hired');
  expect(store.listMembers(p.id)).toHaveLength(11);
  // 인사 is told who was let go, so it can name them
  expect(fake.calls.find((c) => c.role === '인사')!.prompt).toContain('(tester) [let go]');
});

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
  chat.members.seed(project.id);
  const session = scratch.store.createSession(project.id);
  // Task 1, which the guards below work in
  scratch.store.createTask({
    sessionId: session.id,
    kind: 'code',
    title: 't',
    request: 'r',
    workflow: chat.workflows.shipped[0],
  });
  return { ...scratch, chat, project, session };
}

type Options = Parameters<ReturnType<Chat['runs']['guard']>>[2];
const opts = { signal: new AbortController().signal, toolUseID: 't', requestId: 'r' } as Options;
const tick = () => new Promise((r) => setTimeout(r, 0));

test('on one MCP server 개발 may use every tool and 리뷰 only the looking ones', async () => {
  const { store, chat, project, session } = setup();
  const coder = store.readMember(project.id, 'coder');
  const reviewer = store.readMember(project.id, 'reviewer');
  chat.members.setPermissions(coder.id, { mcp: [{ server: 'browser', access: 'all' }] });
  chat.members.setPermissions(reviewer.id, { mcp: [{ server: 'browser', access: 'read' }] });

  const coderGuard = chat.runs.guard(coder, project, session.id, 1);
  const reviewerGuard = chat.runs.guard(reviewer, project, session.id, 1);
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
  chat.members.setPermissions(reviewer.id, { mcp: [{ server: 'browser', access: 'read' }] });
  const older = chat.runs.guard(reviewer, project, session.id, 1);

  // The browser click waits for approval; the user takes the browser away before answering it
  const waiting = older('mcp__browser__browser_click', {}, opts);
  await tick();
  chat.members.setPermissions(reviewer.id, { mcp: [] });
  chat.questions.answer(store.listMessages(session.id).at(-1)!.question!.id, '허용');
  expect((await waiting)!.behavior).toBe('deny');

  // 개발 had the shell approved in this task once; after the shell is revoked from its tools, the approval no longer holds
  const coder = store.readMember(project.id, 'coder');
  chat.members.setPermissions(coder.id, { tools: ['read', 'search', 'write', 'edit'] });
  const shell = chat.runs.guard(coder, project, session.id, 1)('Bash', { command: 'ls' }, opts);
  await tick();
  const card = store.listMessages(session.id).at(-1)!.question!;
  expect(card.payload).toMatchObject({ memberId: coder.id, tool: 'Bash' });
  chat.questions.answer(card.id, '허용');
  expect((await shell)!.behavior).toBe('allow');
  chat.members.setPermissions(coder.id, { tools: ['read', 'search'] });
  const again = chat.runs.guard(coder, project, session.id, 1)('Bash', { command: 'ls' }, opts);
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
    chat.members.setPermissions(reviewer.id, {
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
  chat.members.seed(p.id);
  chat.members.seed(other.id);
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
  expect(chat.members.kit(p.id).texts.changelog).toBe('Add one line per change.');
  await run('write_skill', {
    name: 'changelog',
    label: '변경 기록',
    use: 'Keep CHANGELOG.md.',
    body: 'Add one line per release.',
    reason: '릴리스 단위로',
  });
  expect(store.listMessages(s.id).at(-1)!.text).toContain('− Add one line per change.\n+ Add one line per release.');
  await run('delete_skill', { name: 'code', reason: '쓰지 않습니다' });
  expect(chat.members.kit(p.id).skills.code).toBeUndefined();
  expect(chat.members.settings(store.readMember(p.id, 'coder')).skills).not.toContain('code');
  expect(chat.members.kit(other.id).skills.code).toBeDefined();
  expect(chat.members.kit(other.id).skills.changelog).toBeUndefined();

  // Back to the shipped kit: the made skill goes, the deleted one returns to the members who held it
  await run('reset_skills', { reason: '처음대로' });
  expect(chat.members.kit(p.id).skills.changelog).toBeUndefined();
  expect(chat.members.settings(store.readMember(p.id, 'coder')).skills).toContain('code');
  // Outside manual mode a change applies without a card
  store.setMode(p.id, 'auto');
  const cards = store.listMessages(s.id).length;
  await fake.tools.get('delete_skill')!({ name: 'code', reason: '쓰지 않습니다' });
  expect([chat.members.kit(p.id).skills.code, store.listMessages(s.id).length]).toEqual([undefined, cards]);
});
