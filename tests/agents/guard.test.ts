import path from 'node:path';
import { expect, test } from 'vitest';
import { Chat } from '../../src/backend/chat';
import { checkCall, writeTargets } from '../../src/backend/agents/guard';
import { realPath } from '../../src/backend/agents/locks';
import { CREW, fakeQuery, openScratch } from '../support';

function setup() {
  const scratch = openScratch();
  const chat = new Chat(
    scratch.store,
    async () => fakeQuery([]).sdk,
    CREW,
    () => {},
    scratch.paths,
  );
  const project = scratch.store.addProject(scratch.project);
  chat.members.seed(project.id);
  const session = scratch.store.createSession(project.id);
  return { ...scratch, chat, project, session };
}

type Options = Parameters<ReturnType<Chat['runs']['guard']>>[2];
const call = (tool: string, input: Record<string, unknown>) =>
  [tool, input, { signal: new AbortController().signal, toolUseID: 't', requestId: 'r' } as Options] as const;

test('리뷰 cannot write the project or push, and each refusal is logged', async () => {
  const { store, chat, project, session } = setup();
  const reviewer = store.readMember(project.id, 'reviewer');
  const guard = chat.runs.guard(reviewer, project, session.id, 7);

  const write = await guard(...call('Write', { file_path: path.join(project.path, 'app.js'), content: 'x' }));
  const push = await guard(...call('Bash', { command: 'git -C . push origin main' }));
  const redirect = await guard(...call('Bash', { command: `echo hi > ${path.join(project.path, 'out.txt')}` }));
  const own = await guard(...call('Bash', { command: 'npm test 2>&1 | tail -5' }));

  expect([write!.behavior, push!.behavior, redirect!.behavior, own!.behavior]).toEqual([
    'deny',
    'deny',
    'deny',
    'allow',
  ]);
  expect(store.listEvents(session.id).map((e) => [e.kind, e.memberId, e.taskId])).toEqual([
    ['denied', reviewer.id, 7],
    ['denied', reviewer.id, 7],
    ['denied', reviewer.id, 7],
  ]);
});

test('a tool outside the role becomes an answer card, and the approval holds only in that task', async () => {
  const { store, chat, project, session } = setup();
  const researcher = store.readMember(project.id, 'researcher');
  const inTask = chat.runs.guard(researcher, project, session.id, 1);

  const pending = inTask(...call('Bash', { command: 'ls' }));
  await new Promise((r) => setTimeout(r, 0));
  const card = store.listMessages(session.id).at(-1)!;
  expect(card.question?.kind).toBe('approval');
  expect(card.question?.options).toEqual(['거절', '허용']);
  chat.questions.answer(card.question!.id, '허용');
  expect((await pending)!.behavior).toBe('allow');

  // The same task asks no more; another task asks again
  expect((await inTask(...call('Bash', { command: 'ls -a' })))!.behavior).toBe('allow');
  const other = chat.runs.guard(researcher, project, session.id, 2)(...call('Bash', { command: 'ls' }));
  await new Promise((r) => setTimeout(r, 0));
  const second = store.listMessages(session.id).at(-1)!;
  expect(second.question!.id).not.toBe(card.question!.id);
  chat.questions.answer(second.question!.id, '거절');
  expect((await other)!.behavior).toBe('deny');
});

test('write targets are read from redirects, tee, cp, sed -i, and PowerShell, not from quoted text', () => {
  expect(writeTargets('echo "a > b" > out.txt 2>&1')).toEqual(['out.txt']);
  expect(writeTargets('cat x | tee log.txt; cp a.txt dist/a.txt')).toEqual(['log.txt', 'dist/a.txt']);
  expect(writeTargets("sed -i 's/a/b/' file.js")).toEqual(['file.js']);
  expect(writeTargets('Set-Content -Path notes.md -Value hi')).toEqual(['notes.md']);
  expect(writeTargets('x=$(python cli.py 2>/dev/null)')).toEqual(['/dev/null']);
});

test('비서 may edit the project itself, but not a file a task is writing', async () => {
  const { store, chat, project, session } = setup();
  const guard = chat.runs.guard(store.readMember(project.id, 'orchestrator'), project, session.id, null);
  const file = path.join(project.path, 'README.md');
  expect((await guard(...call('Edit', { file_path: file, old_string: 'a', new_string: 'b' })))!.behavior).toBe('allow');
  chat.runs.locksOf(project).held.set(3, new Set([realPath(file)]));
  const busy = await guard(...call('Edit', { file_path: file, old_string: 'a', new_string: 'b' }));
  expect(busy).toMatchObject({ behavior: 'deny', message: expect.stringContaining('task #3') });
});

test('the app record and crew files are protected even from 개발', () => {
  const { store, chat, project, paths } = setup();
  const policy = chat.runs.policy(store.readMember(project.id, 'coder'), project, 'task-1');
  expect(checkCall(policy, 'Write', { file_path: paths.protected[0] }).kind).toBe('deny');
  expect(checkCall(policy, 'Write', { file_path: path.join(project.path, 'src', 'a.ts') }).kind).toBe('allow');
  expect(checkCall(policy, 'Bash', { command: 'npm install -g left-pad' }).kind).toBe('deny');
  expect(checkCall(policy, 'Bash', { command: 'pip install requests' }).kind).toBe('deny');
  expect(checkCall(policy, 'Bash', { command: '.venv/Scripts/pip install requests' }).kind).toBe('allow');
  expect(checkCall(policy, 'Bash', { command: 'rm -rf build' }).kind).toBe('deny');
  // PowerShell is a shell too, so an approval for it never opens a forbidden command or a write outside scope
  expect(checkCall(policy, 'PowerShell', { command: 'Remove-Item -Recurse build' }).kind).toBe('deny');
  expect(checkCall(policy, 'PowerShell', { command: 'Set-Content -Path C:/elsewhere/x.txt -Value hi' }).kind).toBe(
    'deny',
  );
  expect(store.listMembers(project.id).length).toBe(11);
});

test('auto mode allows a tool outside the role without a card but still denies; bypass checks nothing', async () => {
  const { store, chat, project, session } = setup();
  const reviewer = store.readMember(project.id, 'reviewer');
  const researcher = store.readMember(project.id, 'researcher');
  const push = () =>
    chat.runs.guard(reviewer, project, session.id, 7)(...call('Bash', { command: 'git push origin main' }));

  store.setMode(project.id, 'auto');
  expect(
    (await chat.runs.guard(researcher, project, session.id, 7)(...call('Bash', { command: 'ls' })))!.behavior,
  ).toBe('allow');
  expect(store.listMessages(session.id)).toEqual([]);
  expect((await push())!.behavior).toBe('deny');
  store.setMode(project.id, 'bypass');
  expect((await push())!.behavior).toBe('allow');
});
