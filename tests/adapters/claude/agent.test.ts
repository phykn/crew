import { expect, test } from 'vitest';
import { Inbox } from '../../../src/backend/adapters/claude/agent';

test('a closed inbox refuses a line, so 비서 is told it in a new run instead of losing it', () => {
  const inbox = new Inbox();
  inbox.close();
  expect(inbox.push('늦은 보고')).toBe(false);
});
