import { expect, test } from 'vitest';
import { loadQuery } from '../../src/main/agent';
import { Chat } from '../../src/main/chat';
import { Store } from '../../src/main/db';
import { CREW, makeScratch } from '../support';

test('real Claude: 비서 lists files itself, remembers after a restart, and switches model', async () => {
  const scratch = makeScratch({ 'notes.txt': 'hello', 'todo.md': '- buy milk' });
  let store = new Store(scratch.db);
  let chat = new Chat(store, loadQuery, CREW, () => {});
  const p = store.addProject(scratch.project);
  chat.seed(p.id);
  const s = store.createSession(p.id);
  // Haiku keeps the live run cheap; the model switch below proves the choice reaches the run
  store.updateMember(store.readMember(p.id, 'orchestrator').id, { model: 'haiku' });

  await chat.send(s.id, '이 폴더에 무슨 파일 있어?');
  const first = store.listMessages(s.id).at(-1)!;
  expect(first.author).toBe('orchestrator');
  expect(first.text).toMatch(/notes\.txt/);
  expect(first.text).toMatch(/todo\.md/);

  // A new store and chat on the same file is what the app sees after a restart
  store.db.close();
  store = new Store(scratch.db);
  chat = new Chat(store, loadQuery, CREW, () => {});
  store.updateMember(store.readMember(p.id, 'orchestrator').id, { model: 'sonnet' });
  await chat.send(s.id, '방금 내가 뭘 물어봤고 너는 어떤 파일들을 말했지? 파일 이름만 다시 말해줘.');
  const second = store.listMessages(s.id).at(-1)!;
  expect(second.text).toMatch(/notes\.txt/);

  expect(store.listRuns(s.id).map((r) => [r.model, r.status])).toEqual([
    ['haiku', 'done'],
    ['sonnet', 'done'],
  ]);
});
