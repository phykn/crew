import path from 'node:path';
import { expect, test } from 'vitest';
import { Chat } from '../src/main/chat';
import { checkCall, writeTargets } from '../src/main/guard';
import { CREW, fakeQuery, openScratch } from './support';

function setup() {
  const scratch = openScratch();
  const chat = new Chat(scratch.store, async () => fakeQuery([]).sdk, CREW, () => {}, scratch.paths);
  const project = scratch.store.addProject(scratch.project);
  chat.seed(project.id);
  const session = scratch.store.createSession(project.id);
  return { ...scratch, chat, project, session };
}

type Options = Parameters<ReturnType<Chat['guard']>>[2];
const call = (tool: string, input: Record<string, unknown>) =>
  [tool, input, { signal: new AbortController().signal, toolUseID: 't', requestId: 'r' } as Options] as const;

test('리뷰 cannot write the project or push, and each refusal is logged', async () => {
  const { store, chat, project, session } = setup();
  const reviewer = store.readMember(project.id, 'reviewer');
  const guard = chat.guard(reviewer, project, session.id, 7);

  const write = await guard(...call('Write', { file_path: path.join(project.path, 'app.js'), content: 'x' }));
  const push = await guard(...call('Bash', { command: 'git -C . push origin main' }));
  const redirect = await guard(...call('Bash', { command: `echo hi > ${path.join(project.path, 'out.txt')}` }));
  const own = await guard(...call('Bash', { command: 'npm test 2>&1 | tail -5' }));

  expect([write!.behavior, push!.behavior, redirect!.behavior, own!.behavior]).toEqual(['deny', 'deny', 'deny', 'allow']);
  expect(store.listEvents(session.id).map((e) => [e.kind, e.memberId, e.taskId])).toEqual([
    ['denied', reviewer.id, 7],
    ['denied', reviewer.id, 7],
    ['denied', reviewer.id, 7],
  ]);
});

test('a tool outside the role becomes an answer card, and the approval holds only in that task', async () => {
  const { store, chat, project, session } = setup();
  const secretary = store.readMember(project.id, 'orchestrator');
  const inTask = chat.guard(secretary, project, session.id, 1);

  const pending = inTask(...call('Bash', { command: 'ls' }));
  await new Promise((r) => setTimeout(r, 0));
  const card = store.listMessages(session.id).at(-1)!;
  expect(card.question?.kind).toBe('approval');
  expect(card.question?.options).toEqual(['허용', '거절']);
  chat.questions.answer(card.question!.id, '허용');
  expect((await pending)!.behavior).toBe('allow');

  // The same task asks no more; another task asks again
  expect((await inTask(...call('Bash', { command: 'ls -a' })))!.behavior).toBe('allow');
  const other = chat.guard(secretary, project, session.id, 2)(...call('Bash', { command: 'ls' }));
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
});

test('the app record and crew files are protected even from 개발', () => {
  const { store, chat, project, paths } = setup();
  const policy = chat.policy(store.readMember(project.id, 'coder'), project, 'task-1');
  expect(checkCall(policy, 'Write', { file_path: paths.protected[0] }).kind).toBe('deny');
  expect(checkCall(policy, 'Write', { file_path: path.join(project.path, 'src', 'a.ts') }).kind).toBe('allow');
  expect(checkCall(policy, 'Bash', { command: 'npm install -g left-pad' }).kind).toBe('deny');
  expect(checkCall(policy, 'Bash', { command: 'pip install requests' }).kind).toBe('deny');
  expect(checkCall(policy, 'Bash', { command: '.venv/Scripts/pip install requests' }).kind).toBe('allow');
  expect(checkCall(policy, 'Bash', { command: 'rm -rf build' }).kind).toBe('deny');
  expect(store.listMembers(project.id).length).toBe(10);
});
