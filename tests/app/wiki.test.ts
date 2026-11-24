import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from 'vitest';
import { checkCall } from '../../src/backend/domain/policy';
import { openChat, reply } from '../support';

test('a run starts with its own memory and this project wiki only', async () => {
  const { store, fake, chat, p: a } = openChat({ 시험: [reply('ok')] });
  const other = path.join(path.dirname(a.path), 'other');
  fs.mkdirSync(other);
  const b = store.addProject(other);
  chat.members.seed(b.id);
  const tester = store.readMember(a.id, 'tester');
  const user = { name: '사용자' };
  chat.wiki.write(a.id, '테스트 방법', 'npm test', user);
  chat.wiki.write(b.id, '다른 프로젝트 문서', 'x', user);
  chat.wiki.remember(a.id, tester.id, '- node --test를 쓴다');
  chat.wiki.remember(a.id, store.readMember(a.id, 'coder').id, '- 코드 작성의 기억');

  await chat.runs.run(tester, store.createSession(a.id).id, null, 'hi');
  const system = String(fake.calls[0].options.systemPrompt);
  expect(system).toContain('- 테스트 방법: npm test');
  expect(system).toContain('- coder (코드 작성):');
  expect(system).toContain('node --test를 쓴다');
  expect(system).not.toContain('다른 프로젝트 문서');
  expect(system).not.toContain('코드 작성의 기억');
});

test('the wiki graph draws each [[link]] once and shows a linked title with no document as one to write', () => {
  const { chat, p } = openChat();
  const user = { name: '사용자' };
  chat.wiki.write(p.id, '테스트 방법', '[[계산 모듈]]을 [[계산 모듈]]처럼 돌립니다. [[CLI]]도 봅니다.', user);
  chat.wiki.write(p.id, '계산 모듈', 'calc.py의 함수들', user);
  expect(chat.wiki.graph(p.id)).toEqual({
    nodes: [
      { title: '계산 모듈', missing: false },
      { title: '테스트 방법', missing: false },
      { title: 'CLI', missing: true },
    ],
    edges: [
      { from: '테스트 방법', to: '계산 모듈' },
      { from: '테스트 방법', to: 'CLI' },
    ],
  });
});

test("a document written again after its deletion keeps the old one's history on the timeline", () => {
  const { chat, p } = openChat();
  const user = { name: '사용자' };
  chat.wiki.write(p.id, 'A', '1', user);
  chat.wiki.write(p.id, 'A', '2', user);
  chat.wiki.remove(p.id, 'A', user);
  chat.wiki.write(p.id, 'A', '3', user);
  expect(chat.wiki.timeline(p.id).map((c) => c.kind)).toEqual(['create', 'delete', 'edit', 'create']);
  expect(chat.wiki.find(p.id, 'A')!.body).toBe('3\n');
  expect(fs.readFileSync(path.join(p.path, '.crew', 'wiki', 'index.md'), 'utf8')).toBe('# Index\n\n- [[A]]: 3\n');
});

test("each agent's memory is one file under the project's .crew/memory, a copy shares it, and no agent writes it directly", () => {
  const { store, chat, p } = openChat();
  const coder = store.readMember(p.id, 'coder');
  chat.wiki.remember(p.id, coder.id, '- 테스트는 pytest\n- 답은 짧게\n');
  const file = path.join(p.path, '.crew', 'memory', 'coder.md');
  expect(fs.readFileSync(file, 'utf8')).toBe('- 테스트는 pytest\n- 답은 짧게\n');

  // A rewrite replaces the whole memory, so a line that no longer holds is gone
  chat.wiki.remember(p.id, coder.id, '- 테스트는 npm test');
  expect(chat.wiki.memories(p.id)).toEqual([{ key: 'coder', text: '- 테스트는 npm test' }]);

  const copy = { ...coder, key: 'coder-1-develop' };
  expect(chat.wiki.memoryFile(p.id, copy.key)).toBe(file);
  expect(checkCall(chat.runs.policy(coder, p, 'x'), 'Write', { file_path: file }).kind).toBe('deny');
});

test('a project gets its .crew/memory and .crew/wiki folders as soon as it is added', () => {
  const { chat, p } = openChat();
  const dir = path.join(path.dirname(p.path), 'fresh');
  fs.mkdirSync(dir);
  chat.addProject(dir);
  expect(['memory', 'wiki'].map((f) => fs.statSync(path.join(dir, '.crew', f)).isDirectory())).toEqual([true, true]);
});
