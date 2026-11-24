import { expect, test } from 'vitest';
import { nextStatus, satisfied } from '../../src/backend/domain/task';
import { CREW } from '../support';

test('the status machine refuses moves a task cannot make', () => {
  expect(nextStatus('done', 'REOPEN')).toBe('running');
  expect(nextStatus('stopping', 'STOPPED')).toBe('stopped');
  expect(nextStatus('done', 'WORK')).toBeNull();
  expect(nextStatus('stopped', 'DONE')).toBeNull();
});

test('a review of an older version that arrives late does not satisfy the newer one', () => {
  const w = CREW.workflows.find((x) => x.kind === 'code')!;
  const run = (id: number, stepId: string, verdict: 'pass' | 'rework' | null = null) =>
    ({
      id,
      taskId: 1,
      stepId,
      memberId: 1,
      status: 'done',
      verdict,
      handback: null,
      error: null,
      versionId: null,
    }) as const;
  // develop v1 (3), review starts on v1 (4), test sends back (5), develop v2 (6), then review of v1 finishes with pass
  const runs = [
    run(1, 'plan'),
    run(2, 'plan_review', 'pass'),
    run(3, 'develop'),
    run(5, 'test', 'rework'),
    run(6, 'develop'),
    run(4, 'review', 'pass'),
  ];
  expect(satisfied(w, runs, 'review')).toBe(false);
});
