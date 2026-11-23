import { expect, test } from 'vitest';
import { openChat } from '../support';

test('a saved key is listed as saved, announced to the window, and gone once removed', () => {
  const topics: unknown[] = [];
  const { chat } = openChat({}, { emit: (_ch, e) => topics.push(e) });
  expect(chat.connections.list()).toEqual([expect.objectContaining({ id: 'claude', label: 'Claude', saved: false })]);
  chat.connections.saveKey('claude', 'sk-ant-test');
  expect(chat.secrets.read('claude.key')).toBe('sk-ant-test');
  expect(chat.connections.list()[0].saved).toBe(true);
  chat.connections.removeKey('claude');
  expect(chat.connections.list()[0].saved).toBe(false);
  expect(topics.filter((t) => (t as { topic: string }).topic === 'connections')).toHaveLength(2);
});
