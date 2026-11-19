import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from 'vitest';
import { Chat } from '../src/main/chat';
import { CREW, fakeCrew, openScratch, reply } from './support';

test('a run starts with its own memory and this project wiki only; a rule document deletes alone or with its rule', async () => {
  const { store, project, paths } = openScratch();
  const fake = fakeCrew({ 시험: [reply('ok')] });
  const chat = new Chat(
    store,
    async () => fake.sdk,
    CREW,
    () => {},
    paths,
  );
  const other = path.join(path.dirname(project), 'other');
  fs.mkdirSync(other);
  const [a, b] = [store.addProject(project), store.addProject(other)];
  for (const p of [a, b]) chat.members.seed(p.id);
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

  const code = chat.workflows.current(a.id, 'code').rules;
  const lean = { ...code, steps: code.steps.filter((s) => s.id !== 'test') };
  const link = (version: number) =>
    chat.wiki.write(a.id, `워크플로우 ${version}`, '이유', user, { kind: 'code', version });
  chat.workflows.save({
    projectId: a.id,
    kind: 'code',
    base: 0,
    rules: lean,
    by: { memberId: null, name: '비서' },
    scope: 'future',
  });
  chat.workflows.removeDoc(link(1).id, false, user);
  expect(chat.workflows.current(a.id, 'code')).toMatchObject({ version: 1, rules: { steps: lean.steps } });
  chat.workflows.removeDoc(link(1).id, true, user);
  expect(chat.workflows.current(a.id, 'code').version).toBe(2);
  expect(chat.workflows.current(a.id, 'code').rules.steps.map((s) => s.id)).toContain('test');
});

test('the wiki graph draws each [[link]] once and shows a linked title with no document as one to write', () => {
  const { store, project, paths } = openScratch();
  const chat = new Chat(
    store,
    async () => fakeCrew({}).sdk,
    CREW,
    () => {},
    paths,
  );
  const p = store.addProject(project);
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
