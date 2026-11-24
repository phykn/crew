import { type FormEvent, useEffect, useState } from 'react';
import type { Account } from '../../backend/domain/providers';
import { josa } from '../korean';
import { call, follow } from '../api';
import { PROVIDER_NAMES, say } from '../locale';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Confirm } from '../ui/Confirm';
import { Input } from '../ui/Field';

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
  if ('key' in p) return '키가 맞습니다.';
  const plan = account.plan ? `${account.plan[0].toUpperCase()}${account.plan.slice(1)} 요금제` : '';
  const about = [account.who, plan].filter(Boolean).join(', ');
  return `${josa(PROVIDER_NAMES[p.id].means, '으로')} 연결했습니다${about ? ` (${about})` : ''}.`;
}

function Connection({ provider: p }: { provider: Provider }) {
  const [key, setKey] = useState('');
  const [account, setAccount] = useState<Account | 'checking' | null>(null);
  const [asking, setAsking] = useState(false);
  const names = PROVIDER_NAMES[p.id];
  // A check made with the old key says nothing about the new one
  useEffect(() => setAccount(null), [p.saved]);

  const check = async () => {
    setAccount('checking');
    setAccount(await call('connections.check', { id: p.id }));
  };
  const save = async (e: FormEvent) => {
    e.preventDefault();
    await call('connections.saveKey', { id: p.id, key });
    setKey('');
  };
  const needsKey = 'key' in p && !p.saved;

  return (
    <section className="connection" aria-label={names.label} data-active={p.active || undefined}>
      <header className="connection-head">
        <h3>{names.label}</h3>
        {p.active && <Badge>사용 중</Badge>}
        {account === 'checking' && <Badge tone="wait">확인 중</Badge>}
        {account && account !== 'checking' && (
          <Badge tone={account.ok ? 'ok' : 'bad'}>{account.ok ? '연결됨' : '연결 안 됨'}</Badge>
        )}
        <span className="connection-actions">
          {!p.active && (
            <Button disabled={needsKey} onClick={() => void call('connections.use', { id: p.id })}>
              이걸로 쓰기
            </Button>
          )}
          <Button disabled={account === 'checking' || needsKey} onClick={check}>
            연결 확인
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
              ? '저장한 키로 연결합니다. 쓴 만큼 청구됩니다.'
              : '키를 저장하면 쓸 수 있습니다. 쓴 만큼 청구됩니다.'
            : `이 컴퓨터의 ${josa(names.means, '으로')} 연결합니다. 요금제 한도 안에서 씁니다.`}
      </p>
      {'key' in p && (
        <form className="connection-key" onSubmit={save}>
          <Input
            type="password"
            size="md"
            className="connection-input"
            aria-label={names.means}
            placeholder={p.saved ? '새 키로 바꾸기' : names.means}
            value={key}
            autoComplete="off"
            onChange={(e) => setKey(e.target.value)}
          />
          <Button type="submit" variant="primary" disabled={!key.trim()}>
            저장
          </Button>
          {p.saved && (
            <Button tone="danger" onClick={() => setAsking(true)}>
              키 지우기
            </Button>
          )}
        </form>
      )}
      {asking && 'key' in p && (
        <Confirm
          label="키 지우기"
          text={`저장한 ${josa(names.means, '을')} 지웁니다.${p.active ? ' 그 뒤로는 Claude 구독으로 돕니다.' : ''}`}
          actions={[
            {
              label: '지우기',
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
