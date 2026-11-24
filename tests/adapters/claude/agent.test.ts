import { expect, test, vi } from 'vitest';
import type { Options } from '@anthropic-ai/claude-agent-sdk';
import { ClaudeAgent, envWith, Inbox, type Sdk } from '../../../src/backend/adapters/claude/agent';

test('a closed inbox refuses a line, so 통역 is told it in a new run instead of losing it', () => {
  const inbox = new Inbox();
  inbox.close();
  expect(inbox.push('늦은 보고')).toBe(false);
});

// A query stand-in that records its options and answers who it runs as
const account = (info: Record<string, string>) => {
  const seen: { options?: Options; closed?: boolean } = {};
  const sdk = {
    query: ({ options }: { options: Options }) => {
      seen.options = options;
      return { accountInfo: async () => info, close: () => (seen.closed = true) };
    },
  } as unknown as Sdk;
  return { seen, sdk: async () => sdk };
};

test("the subscription's check reads whose Claude login and plan the computer runs on, with no key, and closes the session", async () => {
  const { seen, sdk } = account({ email: 'me@example.com', tokenSource: 'claude.ai', subscriptionType: 'max' });
  expect(await new ClaudeAgent(sdk, () => null).check(null)).toEqual({ ok: true, who: 'me@example.com', plan: 'max' });
  expect(seen.closed).toBe(true);
  expect(seen.options!.env!.ANTHROPIC_API_KEY).toBeUndefined();
});

test('no login on the computer is reported as not connected', async () => {
  const { sdk } = account({ tokenSource: 'none' });
  expect(await new ClaudeAgent(sdk, () => null).check(null)).toEqual({
    ok: false,
    error: '이 컴퓨터에 Claude Code 로그인이 없습니다',
  });
});

test('a run on the subscription drops a key it inherited, and a run on the API carries the saved one', () => {
  process.env.ANTHROPIC_API_KEY = 'sk-ant-from-the-shell';
  try {
    expect(envWith(null).ANTHROPIC_API_KEY).toBeUndefined();
    expect(envWith('sk-ant-saved').ANTHROPIC_API_KEY).toBe('sk-ant-saved');
  } finally {
    delete process.env.ANTHROPIC_API_KEY;
  }
});

test("the API's check asks Anthropic whether the key is right", async () => {
  const { sdk } = account({});
  const fetched: [string, RequestInit][] = [];
  vi.stubGlobal('fetch', async (url: string, init: RequestInit) => {
    fetched.push([url, init]);
    return new Response('{}', { status: 401 });
  });
  expect(await new ClaudeAgent(sdk, () => null).check('sk-ant-wrong')).toEqual({
    ok: false,
    error: '키가 맞지 않습니다',
  });
  expect((fetched[0][1].headers as Record<string, string>)['x-api-key']).toBe('sk-ant-wrong');
  vi.unstubAllGlobals();
});
