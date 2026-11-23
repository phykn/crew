// The connections the crew can run on, each its own service: a subscription signed in on this computer, or an API billed
// by its key; another joins here, with an adapter that runs the crew on it
export const PROVIDERS = [
  { id: 'claude-subscription', label: 'Claude 구독', login: 'Claude Code 로그인' },
  { id: 'claude-api', label: 'Claude API', key: 'Anthropic API 키' },
] as const;
export type ProviderId = (typeof PROVIDERS)[number]['id'];
export const DEFAULT_PROVIDER: ProviderId = 'claude-subscription';

// Who a connection answers as, and on which plan when it is a subscription
export type Account = { ok: true; who: string; plan?: string } | { ok: false; error: string };

// Where a connection's saved key is kept among the secrets
export const keyOf = (id: ProviderId) => `${id}.key`;
