import fs from 'node:fs';
import { expect, test, vi } from 'vitest';
import { loadSdk, type QueryFn, type Sdk } from '../../src/backend/adapters/claude/agent';
import { wire } from '../../src/backend/wire';
import type { Chat } from '../../src/backend/app/chat';
import { Store } from '../../src/backend/adapters/sqlite/store';
import { CREW, MemorySecrets, makeScratch } from '../support';

const SEARCH = `export function search(items, query) {
  if (!query) return [];
  return items.filter((item) => item.includes(query));
}
`;
const SEARCH_TEST = `import { test } from 'node:test';
import assert from 'node:assert/strict';
import { search } from './search.js';

test('finds items containing the query', () => {
  assert.deepEqual(search(['apple', 'banana'], 'an'), ['banana']);
});
`;

// Every tool call a real run makes, with the role that made it and the session it ran in
type Call = { role: string; tool: string; input: unknown };
function recording(calls: Call[]): () => Promise<Sdk> {
  return async () => {
    const real = await loadSdk();
    const query: QueryFn = (params) => {
      const role = String(params.options.systemPrompt).match(/You are the crew's \*\*(.+?)\*\*/)?.[1] ?? '?';
      const q = real.query(params);
      async function* watch() {
        for await (const m of q) {
          if (m.type === 'assistant')
            for (const b of m.message.content)
              if (b.type === 'tool_use') calls.push({ role, tool: b.name, input: b.input });
          yield m;
        }
      }
      return Object.assign(watch(), { interrupt: () => q.interrupt() }) as unknown as ReturnType<QueryFn>;
    };
    return { ...real, query };
  };
}

test('real Claude: what the crew writes to the wiki and memory, and whether a later session uses it', async () => {
  const scratch = makeScratch({
    'package.json': JSON.stringify({ name: 'demo', type: 'module', scripts: { test: 'node --test' } }, null, 2),
    'search.js': SEARCH,
    'search.test.js': SEARCH_TEST,
  });
  const store = new Store(scratch.db);
  const calls: Call[] = [];
  let mark = 0;
  const since = () => calls.slice(mark).map((c) => `${c.role}:${c.tool.replace(/^mcp__\w+__/, '')}`);
  // Cards are answered with their main option so a live run never hangs
  const chat: Chat = wire({
    records: store,
    secrets: new MemorySecrets(),
    sdk: recording(calls),
    crew: CREW,
    emit: (channel, topic) => {
      if (channel !== 'changed' || (topic as { topic: string }).topic !== 'messages') return;
      for (const s of store.listSessions(p.id))
        for (const m of store.listMessages(s.id))
          if (m.question && m.question.answer === null)
            chat.questions.answer(m.question.id, m.question.options.at(-1)!);
    },
    paths: scratch.paths,
  });
  const p = store.addProject(scratch.project);
  chat.members.seed(p.id);
  for (const m of store.listMembers(p.id)) store.updateMember(m.id, { model: 'sonnet' });
  const report: Record<string, unknown> = {};
  const last = (sessionId: number) => store.listMessages(sessionId).at(-1)!.text;

  // 1. A fact told to 통역 to keep, asked back in a fresh session
  const a = store.createSession(p.id);
  await chat.send(a.id, '참고로 이 프로젝트 담당자인 내가 좋아하는 색은 초록이야. 다음 대화에서도 쓰게 기억해 둬.');
  report.rememberTurn = { tools: since(), reply: last(a.id) };
  mark = calls.length;
  const b = store.createSession(p.id);
  await chat.send(b.id, '내가 좋아하는 색이 뭐였지?');
  report.recallTurn = { tools: since(), reply: last(b.id) };
  mark = calls.length;

  // 2. A real task, then what the crew left in the wiki and memory
  await chat.send(a.id, '빈 검색어는 전체 목록을 보여주게 바꿔줘');
  await vi.waitFor(
    () => {
      const [task] = store.listTasks(a.id);
      expect(task && ['done', 'failed'].includes(task.status)).toBe(true);
    },
    { timeout: 900_000, interval: 2000 },
  );
  await vi.waitFor(() => expect(store.listMessages(a.id).at(-1)!.author).toBe('secretary'), { timeout: 120_000 });
  report.task = {
    status: store.listTasks(a.id)[0].status,
    // Each role's tools in order, so it shows who worked and whether anyone reached for the wiki
    tools: Object.entries(Object.groupBy(since(), (c) => c.split(':')[0])).map(
      ([r, cs]) => `${r}: ${cs!.map((c) => c.split(':')[1]).join(' ')}`,
    ),
    steps: store.listStepRuns(store.listTasks(a.id)[0].id).map((r) => `${r.stepId}:${r.status}`),
    docs: chat.wiki.list(p.id).map((d) => ({ title: d.title, firstLine: d.body.split('\n')[0] })),
    memories: chat.wiki.memories(p.id).map((m) => `${m.key}: ${m.text}`),
  };
  mark = calls.length;

  // 3. A later session asks what the task settled
  await chat.send(b.id, 'search 함수는 지금 빈 검색어를 어떻게 처리해? 그리고 이 프로젝트 테스트는 어떻게 돌려?');
  report.useTurn = { tools: since(), reply: last(b.id) };

  // The report says what the agents chose to do; MEMORY_REPORT names where to keep it
  fs.writeFileSync(
    process.env.MEMORY_REPORT ?? `${scratch.project}/../memory-report.json`,
    JSON.stringify(report, null, 2),
  );
  expect(store.listTasks(a.id)[0].status).toBe('done');
  expect((report.recallTurn as { reply: string }).reply).toMatch(/초록/);
  // A code task leaves the next one something: how to test, or what the module does
  expect(chat.wiki.list(p.id).length).toBeGreaterThan(0);
}, 1_500_000);
