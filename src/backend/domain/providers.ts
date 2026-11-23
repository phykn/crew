// The model services the crew can connect to; another joins here, with an adapter that runs the crew on it
export const PROVIDERS = [
  { id: 'claude', label: 'Claude', key: 'Anthropic API 키', login: 'Claude Code 로그인' },
] as const;
export type ProviderId = (typeof PROVIDERS)[number]['id'];

// Who a service answers as: the account behind it and whether a saved key or the computer's own login got it there
export type Account = { ok: true; who: string; via: 'key' | 'login' } | { ok: false; error: string };

// Where a provider's saved key is kept among the secrets
export const keyOf = (id: ProviderId) => `${id}.key`;
