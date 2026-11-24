import { expect, test } from 'vitest';
import { openChat } from '../support';

test('the crew runs on the subscription with no key until the API, once its key is saved, is put in use', () => {
  const topics: unknown[] = [];
  const { chat } = openChat({}, { emit: (_ch, e) => topics.push(e) });
  const active = () => chat.connections.list().find((c) => c.active)!.id;
  expect(active()).toBe('claude-subscription');
  expect(chat.connections.key()).toBeNull();
  expect(() => chat.connections.use('claude-api')).toThrow('save the API key first');
  expect(() => chat.connections.saveKey('claude-subscription', 'x')).toThrow();

  chat.connections.saveKey('claude-api', 'sk-ant-test');
  // Saved but not in use: the subscription still runs without it
  expect(chat.connections.key()).toBeNull();
  chat.connections.use('claude-api');
  expect(active()).toBe('claude-api');
  expect(chat.connections.key()).toBe('sk-ant-test');

  // The key going takes the API out of use, back to the subscription
  chat.connections.removeKey('claude-api');
  expect(active()).toBe('claude-subscription');
  expect(chat.connections.key()).toBeNull();
  expect(topics.filter((t) => (t as { topic: string }).topic === 'connections')).toHaveLength(3);
});

test("the API's check without a saved key says so instead of asking anyone", async () => {
  const { chat } = openChat();
  expect(await chat.connections.check('claude-api')).toEqual({ ok: false, error: { code: 'account.noKey' } });
});
