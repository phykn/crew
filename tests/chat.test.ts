import { expect, test } from 'vitest';
import { Chat } from '../src/main/chat';
import { CREW, fakeQuery, openScratch, reply } from './support';

test('비서 answers in its own Claude session and runs on the model chosen last', async () => {
  const { store, project, paths } = openScratch();
  const fake = fakeQuery([reply('파일은 README.md 하나입니다.'), reply('README.md라고 했습니다.')]);
  const streamed: string[] = [];
  const chat = new Chat(store, async () => fake.sdk, CREW, (channel, p) => {
    if (channel === 'stream' && (p as { delta?: string }).delta) streamed.push((p as { delta: string }).delta);
  }, paths);
  const p = store.addProject(project);
  chat.seed(p.id);
  const s = store.createSession(p.id);

  await chat.send(s.id, '이 폴더에 무슨 파일 있어?');
  const secretary = store.readMember(p.id, 'orchestrator');
  store.updateMember(secretary.id, { model: 'haiku' });
  await chat.send(s.id, '방금 뭐라고 했지?');

  expect(store.listMessages(s.id).map((m) => [m.author, m.text])).toEqual([
    ['user', '이 폴더에 무슨 파일 있어?'],
    ['secretary', '파일은 README.md 하나입니다.'],
    ['user', '방금 뭐라고 했지?'],
    ['secretary', 'README.md라고 했습니다.'],
  ]);
  expect(streamed).toEqual(['파일은 README.md 하나입니다.', 'README.md라고 했습니다.']);
  expect(fake.calls.map((o) => [o.resume, o.model, o.cwd])).toEqual([
    [undefined, 'sonnet', store.readProject(p.id).path],
    [undefined, 'haiku', store.readProject(p.id).path],
  ]);
  expect(store.listRuns(s.id).map((r) => [r.model, r.status, r.costUsd])).toEqual([
    ['sonnet', 'done', 0.01],
    ['haiku', 'done', 0.01],
  ]);
});
