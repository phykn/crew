import { expect, test, vi } from 'vitest';
import type { Options } from '@anthropic-ai/claude-agent-sdk';
import { ClaudeAgent, Inbox, type Sdk } from '../../../src/backend/adapters/claude/agent';

test('a closed inbox refuses a line, so 비서 is told it in a new run instead of losing it', () => {
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

test('without a saved key a check reads whose Claude login the computer runs on, and the session is closed', async () => {
  const { seen, sdk } = account({ email: 'me@example.com', tokenSource: 'claude.ai' });
  const agent = new ClaudeAgent(sdk, () => null);
  expect(await agent.check()).toEqual({ ok: true, who: 'me@example.com', via: 'login' });
  expect(seen.closed).toBe(true);
  expect(agent.env()).toBeUndefined();
});

test('no login and no key is reported as not connected', async () => {
  const { sdk } = account({ tokenSource: 'none' });
  expect(await new ClaudeAgent(sdk, () => null).check()).toEqual({ ok: false, error: '로그인도 저장한 키도 없습니다' });
});

test('a saved key goes to every run in place of the login, and a check asks Anthropic whether it is right', async () => {
  const { sdk } = account({});
  const agent = new ClaudeAgent(sdk, () => 'sk-ant-wrong');
  expect(agent.env()!.ANTHROPIC_API_KEY).toBe('sk-ant-wrong');
  const fetched: [string, RequestInit][] = [];
  vi.stubGlobal('fetch', async (url: string, init: RequestInit) => {
    fetched.push([url, init]);
    return new Response('{}', { status: 401 });
  });
  expect(await agent.check()).toEqual({ ok: false, error: '키가 맞지 않습니다' });
  expect((fetched[0][1].headers as Record<string, string>)['x-api-key']).toBe('sk-ant-wrong');
  vi.unstubAllGlobals();
});
