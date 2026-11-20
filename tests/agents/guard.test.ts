import path from 'node:path';
import { expect, test } from 'vitest';
import type { Chat } from '../../src/backend/chat';
import { checkCall, writeTargets } from '../../src/backend/agents/guard';
import { realPath } from '../../src/backend/agents/locks';
import { openChat } from '../support';

type Options = Parameters<ReturnType<Chat['runs']['guard']>>[2];
const call = (tool: string, input: Record<string, unknown>) =>
  [tool, input, { signal: new AbortController().signal, toolUseID: 't', requestId: 'r' } as Options] as const;
const tick = () => new Promise((r) => setTimeout(r, 0));

test('리뷰 cannot write the project or push, and each refusal is logged', async () => {
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
  const researcher = store.readMember(p.id, 'researcher');
  const inTask = chat.runs.guard(researcher, p, s.id, 1);

  const pending = inTask(...call('Bash', { command: 'ls' }));
  await tick();
  const card = store.listMessages(s.id).at(-1)!;
  expect(card.question?.kind).toBe('approval');
  expect(card.question?.options).toEqual(['거절', '허용']);
  // The member is named once, then what it lacks
  expect(card.question?.prompt).toBe('조사 누리: Bash 도구가 역할에 없습니다.\nls');
  chat.questions.answer(card.question!.id, '허용');
  expect((await pending)!.behavior).toBe('allow');

  // The same task asks no more; another task asks again
  expect((await inTask(...call('Bash', { command: 'ls -a' })))!.behavior).toBe('allow');
  const other = chat.runs.guard(researcher, p, s.id, 2)(...call('Bash', { command: 'ls' }));
  await tick();
  const second = store.listMessages(s.id).at(-1)!;
  expect(second.question!.id).not.toBe(card.question!.id);
  chat.questions.answer(second.question!.id, '거절');
  expect((await other)!.behavior).toBe('deny');
});

test('on one MCP server 개발 may use every tool and 리뷰 only the looking ones', async () => {
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
  chat.questions.answer(store.listMessages(s.id).at(-1)!.question!.id, '거절');
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
  chat.questions.answer(store.listMessages(s.id).at(-1)!.question!.id, '허용');
  expect((await waiting)!.behavior).toBe('deny');

  // 개발 had the shell approved in this task once; after the shell is revoked from its tools, the approval no longer holds
  const coder = store.readMember(p.id, 'coder');
  chat.members.setPermissions(coder.id, { tools: ['read', 'search', 'write', 'edit'] });
  const shell = chat.runs.guard(coder, p, s.id, task.id)(...call('Bash', { command: 'ls' }));
  await tick();
  const card = store.listMessages(s.id).at(-1)!.question!;
  expect(card.payload).toMatchObject({ memberId: coder.id, tool: 'Bash' });
  chat.questions.answer(card.id, '허용');
  expect((await shell)!.behavior).toBe('allow');
  chat.members.setPermissions(coder.id, { tools: ['read', 'search'] });
  const again = chat.runs.guard(coder, p, s.id, task.id)(...call('Bash', { command: 'ls' }));
  await tick();
  expect(store.listMessages(s.id).at(-1)!.question!.id).not.toBe(card.id);
  chat.questions.answer(store.listMessages(s.id).at(-1)!.question!.id, '거절');
  expect((await again)!.behavior).toBe('deny');
});

test('write targets are read from redirects, tee, cp, sed -i, and PowerShell, not from quoted text', () => {
  expect(writeTargets('echo "a > b" > out.txt 2>&1')).toEqual(['out.txt']);
  expect(writeTargets('cat x | tee log.txt; cp a.txt dist/a.txt')).toEqual(['log.txt', 'dist/a.txt']);
  expect(writeTargets("sed -i 's/a/b/' file.js")).toEqual(['file.js']);
  expect(writeTargets('Set-Content -Path notes.md -Value hi')).toEqual(['notes.md']);
  expect(writeTargets('x=$(python cli.py 2>/dev/null)')).toEqual(['/dev/null']);
});

test('비서 may edit the project itself, but not a file a task is writing', async () => {
  const { store, chat, p, s } = openChat();
  const guard = chat.runs.guard(store.readMember(p.id, 'orchestrator'), p, s.id, null);
  const file = path.join(p.path, 'README.md');
  expect((await guard(...call('Edit', { file_path: file, old_string: 'a', new_string: 'b' })))!.behavior).toBe('allow');
  chat.runs.locksOf(p).held.set(3, new Set([realPath(file)]));
  const busy = await guard(...call('Edit', { file_path: file, old_string: 'a', new_string: 'b' }));
  expect(busy).toMatchObject({ behavior: 'deny', message: expect.stringContaining('task #3') });
});

test('the app record and crew files are protected even from 개발', () => {
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
  const researcher = store.readMember(p.id, 'researcher');
  const push = () => chat.runs.guard(reviewer, p, s.id, 7)(...call('Bash', { command: 'git push origin main' }));

  store.setMode(p.id, 'auto');
  expect((await chat.runs.guard(researcher, p, s.id, 7)(...call('Bash', { command: 'ls' })))!.behavior).toBe('allow');
  expect(store.listMessages(s.id)).toEqual([]);
  expect((await push())!.behavior).toBe('deny');
  store.setMode(p.id, 'bypass');
  expect((await push())!.behavior).toBe('allow');
});
