import fs from 'node:fs';
import path from 'node:path';
import { expect, test, vi } from 'vitest';
import { Chat } from '../src/main/chat';
import { snapshot } from '../src/main/changes';
import { secretaryTools } from '../src/main/crew-tools';
import { Store } from '../src/main/db';
import { CREW, fakeCrew, openScratch, reply, type Turn } from './support';

function setup(scripts: Record<string, Turn[]>, files?: Record<string, string>) {
  const scratch = openScratch(files);
  const fake = fakeCrew(scripts);
  const chat = new Chat(scratch.store, async () => fake.sdk, CREW, () => {}, scratch.paths);
  const p = scratch.store.addProject(scratch.project);
  chat.seed(p.id);
  return { ...scratch, fake, chat, p, s: scratch.store.createSession(p.id) };
}
const never: Turn = () => new Promise(() => {});

test('"그거 다시 해줘" with two finished tasks waits on a card, then reopens the one picked', async () => {
  const { store, fake, chat, s } = setup({ 개발: [never] });
  const code = chat.workflows.find((w) => w.kind === 'code')!;
  const [one, two] = ['검색', '정렬'].map((title) => store.createTask({ sessionId: s.id, kind: 'code', title, request: 'r', workflow: code }));
  for (const t of [one, two]) store.writeTaskStatus(t.id, 'done', '', 'done');
  secretaryTools(fake.sdk, chat, s.id);
  const reopened = fake.tools.get('reopen_task')!({ change: '그거 다시 해줘' });
  await vi.waitFor(() => expect(store.listMessages(s.id).at(-1)!.question!.options).toEqual([`#${one.id} 검색`, `#${two.id} 정렬`]));
  expect([store.readTask(one.id).status, store.readTask(two.id).status]).toEqual(['done', 'done']);
  chat.questions.answer(store.listMessages(s.id).at(-1)!.question!.id, `#${two.id} 정렬`);
  await reopened;
  expect([store.readTask(one.id).status, store.readTask(two.id).status]).toEqual(['done', 'running']);
});

test('a model change starts a fresh Claude session that is handed the conversation', async () => {
  const { store, fake, chat, p, s } = setup({ 비서: [reply('안녕하세요', 'claude-a'), reply('네', 'claude-b')] });
  await chat.send(s.id, '첫 질문');
  store.updateMember(store.readMember(p.id, 'orchestrator').id, { model: 'opus' });
  await chat.send(s.id, '두 번째');
  expect(fake.calls.map((c) => c.options.resume)).toEqual([undefined, undefined]);
  expect(fake.calls[1].prompt).toContain('[Handoff]');
  expect(fake.calls[1].prompt).toContain('User: 첫 질문');
});

test('a step cut off right after saving resumes from that step and checks the saved file', async () => {
  const { store, chat, p, s, db, project, paths } = setup({}, { 'search.js': 'v0' });
  const task = store.createTask({ sessionId: s.id, kind: 'code', title: '검색', request: 'r', workflow: chat.workflows.find((w) => w.kind === 'code')! });
  store.writeBaseline(task.id, snapshot(project));
  const member = (key: string) => store.readMember(p.id, key).id;
  store.finishStepRun(store.startStepRun(task.id, 'plan', member('advisor')), 'done', { summary: '계획', body: '', points: [], files: [], checks: [] });
  store.finishStepRun(store.startStepRun(task.id, 'plan_review', member('reviewer')), 'done', { summary: '통과', body: '', verdict: 'pass', points: [], files: [], checks: [] });
  store.startStepRun(task.id, 'develop', member('coder'));
  store.writeTaskStatus(task.id, 'running', '개발', '개발 진행');
  fs.writeFileSync(path.join(project, 'search.js'), 'v1');

  const after = new Store(db);
  after.recoverInterrupted();
  const fresh = fakeCrew({ 개발: [never] });
  const again = new Chat(after, async () => fresh.sdk, CREW, () => {}, paths);
  expect(again.tasks.resume(task.id)).toBe(true);
  await vi.waitFor(() => expect(fresh.calls.map((c) => c.role)).toEqual(['개발']));
  expect(fresh.calls[0].prompt).toContain('cut off after changing: search.js');
});
