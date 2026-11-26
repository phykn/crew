import { expect, test } from 'vitest';
import { openScratch } from '../../support';
import { usage as sumUsage } from '../../../src/backend/domain/usage';

test("a resumed Claude session reports running totals, so usage counts only each run's own share", () => {
  const { store, project } = openScratch();
  const p = store.addProject(project);
  const s = store.createSession(p.id);
  store.seedMembers(p.id, [{ key: 'coder', nickname: '지안', model: 'sonnet' }]);
  const agent = store.openAgentSession(s.id, store.readMember(p.id, 'coder').id).id;
  const run = (model: string, costUsd: number, inputTokens: number, side = false) =>
    store.finishRun(store.startRun(agent, model, null, side), {
      status: 'done',
      usage: { turns: 1, inputTokens, outputTokens: 0, costUsd },
    });
  run('sonnet', 0.01, 10);
  run('sonnet', 0.03, 30);
  // A side question on a copy adds its own share but is not the session's own report
  run('sonnet', 0.04, 40, true);
  // Cut before its result: it reported nothing
  run('sonnet', 0, 0);
  run('sonnet', 0.06, 60);
  // A model change starts a fresh session, and coming back starts another
  run('opus', 0.02, 20);
  run('sonnet', 0.01, 10);
  const usage = Object.fromEntries(
    sumUsage(store.listRunSpend(s.id)).map((u) => [u.model, [u.runs, u.inputTokens, +u.costUsd.toFixed(4)]]),
  );
  expect(usage).toEqual({ sonnet: [6, 80, 0.08], opus: [1, 20, 0.02] });
});
