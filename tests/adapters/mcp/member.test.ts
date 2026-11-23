import { expect, test, vi } from 'vitest';
import { askPeer } from '../../../src/backend/adapters/mcp/member';
import { handback, openChat, reply } from '../../support';

test('a peer request asked back stays one thread, a resent line runs once, and a test handback without checks is sent back', async () => {
  const { store, fake, chat, p, s } = openChat({
    표준: [
      reply('', 'claude-style', { answer: '', ask_back: '어느 파일인가요?' }),
      reply('', 'claude-style', { answer: 'searchItems가 맞습니다' }),
    ],
    시험: [
      handback('claude-test', { summary: '통과', verdict: 'pass' }),
      handback('claude-test', { summary: '통과', verdict: 'pass', checks: ['npm test: 3 passed'] }),
    ],
  });
  const task = store.createTask({
    sessionId: s.id,
    kind: 'code',
    title: 't',
    request: 'r',
    workflow: chat.workflows.shipped.find((w) => w.kind === 'code')!,
  });
  const coder = store.readMember(p.id, 'coder');
  const step = task.workflow.steps.find((x) => x.id === 'develop')!;

  // Asking oneself would wait on one's own run
  expect(await askPeer(chat, task, step, coder, { role: 'coder', message: '?' })).toContain('cannot ask yourself');
  const first = await askPeer(chat, task, step, coder, { role: '표준', message: '이름 괜찮나요?' });
  expect(first).toContain('asks back: 어느 파일인가요?');
  const id = Number(first.match(/Request (\d+)/)![1]);
  const second = await askPeer(chat, task, step, coder, { role: '표준', message: 'search.js입니다', request_id: id });
  const again = await askPeer(chat, task, step, coder, { role: '표준', message: 'search.js입니다', request_id: id });
  expect(second).toContain('searchItems가 맞습니다');
  expect(again).toBe(second);
  expect(store.readRequest(id).thread.map((l) => l.from)).toEqual(['개발', '표준', '개발', '표준']);
  // The log says who each line went to, so the camp can walk it over without reading the words
  const stylist = store.readMember(p.id, 'stylist');
  expect(
    store
      .listEvents(s.id)
      .filter((e) => e.kind === 'request')
      .map((e) => JSON.parse(e.detail!)),
  ).toEqual([
    { requestId: id, to: stylist.id },
    { requestId: id, to: coder.id, answer: true },
    { requestId: id, to: stylist.id },
    { requestId: id, to: coder.id, answer: true },
  ]);

  const test = task.workflow.steps.find((x) => x.id === 'test')!;
  await expect(chat.tasks.runStep(task, test, () => true)).resolves.toBe('done');
  expect(store.listStepRuns(task.id).map((r) => [r.status, r.error])).toEqual([
    ['failed', 'missing checks'],
    ['done', null],
  ]);
  await vi.waitFor(() => expect(fake.calls.filter((c) => c.role === '시험')[1].prompt).toContain('missing checks'));
});
