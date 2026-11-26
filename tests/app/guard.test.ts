import path from 'node:path';
import { expect, test } from 'vitest';
import { checkCall } from '../../src/backend/domain/policy';

import { say } from '../../src/frontend/locale';
import { openChat } from '../support';

const call = (tool: string, input: Record<string, unknown>) => [tool, input] as const;
const tick = () => new Promise((r) => setTimeout(r, 0));

test('코드 검토 cannot write the project or push, and each refusal is logged', async () => {
  const { store, chat, p, s } = openChat();
  const reviewer = store.readMember(p.id, 'reviewer');
  const guard = chat.runs.guard(reviewer, p, s.id, 7);

  const write = await guard(...call('Write', { file_path: path.join(p.path, 'app.js'), content: 'x' }));
  const push = await guard(...call('Bash', { command: 'git -C . push origin main' }));
  const redirect = await guard(...call('Bash', { command: `echo hi > ${path.join(p.path, 'out.txt')}` }));
  const own = await guard(...call('Bash', { command: 'npm test 2>&1 | tail -5' }));

  expect([write!.behavior, push!.behavior, redirect!.behavior, own!.behavior]).toEqual([
    'deny',
    'deny',
    'deny',
    'allow',
  ]);
  expect(store.listEvents(s.id).map((e) => [e.kind, e.memberId, e.taskId])).toEqual([
    ['denied', reviewer.id, 7],
    ['denied', reviewer.id, 7],
    ['denied', reviewer.id, 7],
  ]);
});

test('a tool outside the role becomes an answer card, and the approval holds only in that task', async () => {
  const { store, chat, p, s } = openChat();
  const interpreter = store.readMember(p.id, 'interpreter');
  const inTask = chat.runs.guard(interpreter, p, s.id, 1);

  const pending = inTask(...call('Bash', { command: 'ls' }));
  await tick();
  const card = store.listMessages(s.id).at(-1)!;
  expect(card.question?.kind).toBe('approval');
  expect(card.question?.options).toEqual(['refuse', 'allow']);
  // The member is named once, then what it lacks
  expect(say(card.question!.say!)).toBe('통역 유진: Bash 도구가 역할에 없습니다.\nls');
  chat.questions.answer(card.question!.id, 'allow');
  expect((await pending)!.behavior).toBe('allow');

  // The same task asks no more; another task asks again
  expect((await inTask(...call('Bash', { command: 'ls -a' })))!.behavior).toBe('allow');
  const other = chat.runs.guard(interpreter, p, s.id, 2)(...call('Bash', { command: 'ls' }));
  await tick();
  const second = store.listMessages(s.id).at(-1)!;
  expect(second.question!.id).not.toBe(card.question!.id);
  chat.questions.answer(second.question!.id, 'refuse');
  expect((await other)!.behavior).toBe('deny');
});

test('on one MCP server 코드 작성 may use every tool and 코드 검토 only the looking ones', async () => {
  const { store, chat, p, s } = openChat();
  const coder = store.readMember(p.id, 'coder');
  const reviewer = store.readMember(p.id, 'reviewer');
  chat.members.setPermissions(coder.id, { mcp: [{ server: 'browser', access: 'all' }] });
  chat.members.setPermissions(reviewer.id, { mcp: [{ server: 'browser', access: 'read' }] });

  const coderGuard = chat.runs.guard(coder, p, s.id, 1);
  const reviewerGuard = chat.runs.guard(reviewer, p, s.id, 1);
  expect((await coderGuard(...call('mcp__browser__browser_click', {})))!.behavior).toBe('allow');
  expect((await reviewerGuard(...call('mcp__browser__browser_snapshot', {})))!.behavior).toBe('allow');

  const click = reviewerGuard(...call('mcp__browser__browser_click', {}));
  await tick();
  expect(store.listMessages(s.id).at(-1)!.question?.kind).toBe('approval');
  chat.questions.answer(store.listMessages(s.id).at(-1)!.question!.id, 'refuse');
  expect((await click)!.behavior).toBe('deny');
});

test('a permission revoked while a call waits blocks that call and the next call of an older session', async () => {
  const { store, chat, p, s } = openChat();
  // The task the coder's shell calls reserve the project in
  const task = store.createTask({
    sessionId: s.id,
    kind: 'code',
    title: 't',
    request: 'r',
    workflow: chat.workflows.shipped[0],
  });
  const reviewer = store.readMember(p.id, 'reviewer');
  chat.members.setPermissions(reviewer.id, { mcp: [{ server: 'browser', access: 'read' }] });
  const older = chat.runs.guard(reviewer, p, s.id, task.id);

  // The browser click waits for approval; the user takes the browser away before answering it
  const waiting = older(...call('mcp__browser__browser_click', {}));
  await tick();
  chat.members.setPermissions(reviewer.id, { mcp: [] });
  chat.questions.answer(store.listMessages(s.id).at(-1)!.question!.id, 'allow');
  expect((await waiting)!.behavior).toBe('deny');

  // 코드 작성 had the shell approved in this task once; after the shell is revoked from its tools, the approval no longer holds
  const coder = store.readMember(p.id, 'coder');
  chat.members.setPermissions(coder.id, { tools: ['read', 'search', 'write', 'edit'] });
  const shell = chat.runs.guard(coder, p, s.id, task.id)(...call('Bash', { command: 'ls' }));
  await tick();
  const card = store.listMessages(s.id).at(-1)!.question!;
  expect(card.payload).toMatchObject({ memberId: coder.id, tool: 'Bash' });
  chat.questions.answer(card.id, 'allow');
  expect((await shell)!.behavior).toBe('allow');
  chat.members.setPermissions(coder.id, { tools: ['read', 'search'] });
  const again = chat.runs.guard(coder, p, s.id, task.id)(...call('Bash', { command: 'ls' }));
  await tick();
  expect(store.listMessages(s.id).at(-1)!.question!.id).not.toBe(card.id);
  chat.questions.answer(store.listMessages(s.id).at(-1)!.question!.id, 'refuse');
  expect((await again)!.behavior).toBe('deny');
});

test('통역 changes no project file, even a typo: that is a task', () => {
  const { store, chat, p } = openChat();
  const policy = chat.runs.policy(store.readMember(p.id, 'interpreter'), p, 'chat');
  expect(checkCall(policy, 'Edit', { file_path: path.join(p.path, 'README.md') }).kind).toBe('deny');
});

test('the app record and crew files are protected even from 코드 작성', () => {
  const { store, chat, p, paths } = openChat();
  const policy = chat.runs.policy(store.readMember(p.id, 'coder'), p, 'task-1');
  expect(checkCall(policy, 'Write', { file_path: paths.protected[0] }).kind).toBe('deny');
  expect(checkCall(policy, 'Write', { file_path: path.join(p.path, 'src', 'a.ts') }).kind).toBe('allow');
  // A name that starts with two dots is still inside the project; only a real parent folder is outside
  expect(checkCall(policy, 'Write', { file_path: path.join(p.path, '..env') }).kind).toBe('allow');
  expect(checkCall(policy, 'Write', { file_path: path.join(p.path, '..', 'x.ts') }).kind).toBe('deny');
  expect(checkCall(policy, 'Bash', { command: 'npm install -g left-pad' }).kind).toBe('deny');
  expect(checkCall(policy, 'Bash', { command: 'pip install requests' }).kind).toBe('deny');
  expect(checkCall(policy, 'Bash', { command: '.venv/Scripts/pip install requests' }).kind).toBe('allow');
  expect(checkCall(policy, 'Bash', { command: 'rm -rf build' }).kind).toBe('deny');
  // PowerShell is a shell too, so an approval for it never opens a forbidden command or a write outside scope
  expect(checkCall(policy, 'PowerShell', { command: 'Remove-Item -Recurse build' }).kind).toBe('deny');
  expect(checkCall(policy, 'PowerShell', { command: 'Set-Content -Path C:/elsewhere/x.txt -Value hi' }).kind).toBe(
    'deny',
  );
});

test('auto mode allows a tool outside the role without a card but still denies; bypass checks nothing', async () => {
  const { store, chat, p, s } = openChat();
  const reviewer = store.readMember(p.id, 'reviewer');
  const interpreter = store.readMember(p.id, 'interpreter');
  const push = () => chat.runs.guard(reviewer, p, s.id, 7)(...call('Bash', { command: 'git push origin main' }));

  store.setMode(p.id, 'auto');
  expect((await chat.runs.guard(interpreter, p, s.id, 7)(...call('Bash', { command: 'ls' })))!.behavior).toBe('allow');
  expect(store.listMessages(s.id)).toEqual([]);
  expect((await push())!.behavior).toBe('deny');
  store.setMode(p.id, 'bypass');
  expect((await push())!.behavior).toBe('allow');
});
