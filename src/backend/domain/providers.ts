import type { Say } from '../../shared';

// Each connection is its own service, so another joins here with an adapter that runs the crew on it; one with a key needs it saved first
export const PROVIDERS = [{ id: 'claude-subscription' }, { id: 'claude-api', key: true }] as const;
export type ProviderId = (typeof PROVIDERS)[number]['id'];
export const DEFAULT_PROVIDER: ProviderId = 'claude-subscription';

// Who a connection answers as, and on which plan when it is a subscription
export type Account = { ok: true; who: string; plan?: string } | { ok: false; error: Say };

// Where a connection's saved key is kept among the secrets
export const keyOf = (id: ProviderId) => `${id}.key`;
