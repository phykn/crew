import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from 'vitest';
import { openChat, reply } from '../support';

test('a run starts with its own memory and this project wiki only', async () => {
  const { store, fake, chat, p: a } = openChat({ 시험: [reply('ok')] });
  const other = path.join(path.dirname(a.path), 'other');
  fs.mkdirSync(other);
  const b = store.addProject(other);
  chat.members.seed(b.id);
  const tester = store.readMember(a.id, 'tester');
  const user = { memberId: null, name: '사용자' };
  chat.wiki.write(a.id, '테스트 방법', 'npm test', user);
  chat.wiki.write(b.id, '다른 프로젝트 문서', 'x', user);
  chat.wiki.remember(a.id, tester.id, 'node --test를 쓴다', { taskId: null, sessionId: null });
  chat.wiki.remember(a.id, store.readMember(a.id, 'coder').id, '개발의 기억', { taskId: null, sessionId: null });

  await chat.runs.run(tester, store.createSession(a.id).id, null, 'hi');
  const system = String(fake.calls[0].options.systemPrompt);
  expect(system).toContain('- 테스트 방법: npm test');
  expect(system).toContain('- coder (개발):');
  expect(system).toContain('node --test를 쓴다');
  expect(system).not.toContain('다른 프로젝트 문서');
  expect(system).not.toContain('개발의 기억');
});

test('the wiki graph draws each [[link]] once and shows a linked title with no document as one to write', () => {
  const { chat, p } = openChat();
  const user = { memberId: null, name: '사용자' };
  chat.wiki.write(p.id, '테스트 방법', '[[계산 모듈]]을 [[계산 모듈]]처럼 돌립니다. [[CLI]]도 봅니다.', user);
  chat.wiki.write(p.id, '계산 모듈', 'calc.py의 함수들', user);
  expect(chat.wiki.graph(p.id)).toEqual({
    nodes: [
      { title: '계산 모듈', id: 2 },
      { title: '테스트 방법', id: 1 },
      { title: 'CLI', id: null },
    ],
    edges: [
      { from: '테스트 방법', to: '계산 모듈' },
      { from: '테스트 방법', to: 'CLI' },
    ],
  });
});

test("a document written again after its deletion keeps the old one's history on the timeline", () => {
  const { chat, p } = openChat();
  const user = { memberId: null, name: '사용자' };
  const doc = chat.wiki.write(p.id, 'A', '1', user);
  chat.wiki.write(p.id, 'A', '2', user);
  chat.wiki.remove(doc.id, user);
  chat.wiki.write(p.id, 'A', '3', user);
  expect(chat.wiki.timeline(p.id).map((c) => c.kind)).toEqual(['create', 'delete', 'edit', 'create']);
  expect(chat.wiki.find(p.id, 'A')!.body).toBe('3');
});
