import { type FormEvent, useEffect, useState } from 'react';
import type { Account } from '../../backend/domain/providers';
import { call, follow } from '../api';
import { providerName, say } from '../locale';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Confirm } from '../ui/Confirm';
import { Input } from '../ui/Field';
import { t } from '../lang';

type Provider = Awaited<ReturnType<typeof call<'connections.list'>>>[number];

// The connections tab: each service the app can run the crew on, for every project, and the one it runs on now
export function Connections() {
  const [providers, setProviders] = useState<Provider[]>([]);
  useEffect(
    () =>
      follow(
        () => call('connections.list'),
        setProviders,
        (t) => t === 'connections',
      ),
    [],
  );
  return (
    <div className="connections">
      {providers.map((p) => (
        <Connection key={p.id} provider={p} />
      ))}
    </div>
  );
}

// What a check found, in a line: who answers, and on which plan for a subscription
function found(account: Extract<Account, { ok: true }>, p: Provider) {
  if ('key' in p) return t('connect.keyOk');
  const plan = account.plan
    ? t('connect.plan', { plan: `${account.plan[0].toUpperCase()}${account.plan.slice(1)}` })
    : '';
  const about = [account.who, plan].filter(Boolean).join(', ');
  return t('connect.connected', { means: providerName(p.id).means, about: about ? ` (${about})` : '' });
}

function Connection({ provider: p }: { provider: Provider }) {
  const [key, setKey] = useState('');
  const [account, setAccount] = useState<Account | 'checking' | null>(null);
  const [asking, setAsking] = useState(false);
  const names = providerName(p.id);
  // A check made with a key that is gone says nothing about the connection now
  useEffect(() => setAccount(null), [p.saved]);

  const check = async () => {
    setAccount('checking');
    setAccount(await call('connections.check', { id: p.id }));
  };
  const save = async (e: FormEvent) => {
    e.preventDefault();
    await call('connections.saveKey', { id: p.id, key });
    setKey('');
    // A check made with the old key says nothing about the new one
    setAccount(null);
  };
  const needsKey = 'key' in p && !p.saved;

  return (
    <section className="connection" aria-label={names.label} data-active={p.active || undefined}>
      <header className="connection-head">
        <h3>{names.label}</h3>
        {p.active && <Badge>{t('connect.inUse')}</Badge>}
        {account === 'checking' && <Badge tone="wait">{t('connect.checking')}</Badge>}
        {account && account !== 'checking' && (
          <Badge tone={account.ok ? 'ok' : 'bad'}>{account.ok ? t('connect.ok') : t('connect.notOk')}</Badge>
        )}
        <span className="connection-actions">
          {!p.active && (
            <Button disabled={needsKey} onClick={() => void call('connections.use', { id: p.id })}>
              {t('connect.use')}
            </Button>
          )}
          <Button disabled={account === 'checking' || needsKey} onClick={check}>
            {t('connect.check')}
          </Button>
        </span>
      </header>
      <p className="connection-how" role="status">
        {account && account !== 'checking'
          ? account.ok
            ? found(account, p)
            : say(account.error)
          : 'key' in p
            ? p.saved
              ? t('connect.savedKey')
              : t('connect.noKey')
            : t('connect.login', { means: names.means })}
      </p>
      {'key' in p && (
        <form className="connection-key" onSubmit={save}>
          <Input
            type="password"
            size="md"
            className="connection-input"
            aria-label={names.means}
            placeholder={p.saved ? t('connect.newKey') : names.means}
            value={key}
            autoComplete="off"
            onChange={(e) => setKey(e.target.value)}
          />
          <Button type="submit" variant="primary" disabled={!key.trim()}>
            {t('action.save')}
          </Button>
          {p.saved && (
            <Button tone="danger" onClick={() => setAsking(true)}>
              {t('connect.removeKey')}
            </Button>
          )}
        </form>
      )}
      {asking && 'key' in p && (
        <Confirm
          label={t('connect.removeKey')}
          text={t('connect.removeText', { means: names.means }) + (p.active ? t('connect.fallback') : '')}
          actions={[
            {
              label: t('action.remove'),
              danger: true,
              run: () => {
                setAsking(false);
                void call('connections.removeKey', { id: p.id });
              },
            },
          ]}
          onCancel={() => setAsking(false)}
        />
      )}
    </section>
  );
}
