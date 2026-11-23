import { type FormEvent, useEffect, useState } from 'react';
import type { Account } from '../../backend/domain/providers';
import { josa } from '../../korean';
import { call, follow } from '../api';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Confirm } from '../ui/Confirm';
import { Input } from '../ui/Field';

type Provider = Awaited<ReturnType<typeof call<'connections.list'>>>[number];

// The connections tab: each model service the app can run the crew on, for every project
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

function Connection({ provider: p }: { provider: Provider }) {
  const [key, setKey] = useState('');
  const [account, setAccount] = useState<Account | 'checking' | null>(null);
  const [asking, setAsking] = useState(false);
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

  return (
    <section className="connection" aria-label={p.label}>
      <header className="connection-head">
        <h3>{p.label}</h3>
        {account === 'checking' && <Badge tone="wait">확인 중</Badge>}
        {account && account !== 'checking' && (
          <Badge tone={account.ok ? 'ok' : 'bad'}>{account.ok ? '연결됨' : '연결 안 됨'}</Badge>
        )}
        <Button className="connection-check" disabled={account === 'checking'} onClick={check}>
          연결 확인
        </Button>
      </header>
      <p className="connection-how" role="status">
        {account && account !== 'checking'
          ? account.ok
            ? `${josa(account.via === 'key' ? '저장한 키' : p.login, '으로')} 연결했습니다${account.who ? ` (${account.who})` : ''}.`
            : account.error
          : p.saved
            ? '저장한 키로 연결합니다.'
            : `키가 없으면 이 컴퓨터의 ${josa(p.login, '으로')} 연결합니다.`}
      </p>
      <form className="connection-key" onSubmit={save}>
        <Input
          type="password"
          size="md"
          className="connection-input"
          aria-label={p.key}
          placeholder={p.saved ? '새 키로 바꾸기' : p.key}
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
      {asking && (
        <Confirm
          label="키 지우기"
          text={`저장한 ${josa(p.key, '을')} 지웁니다. 그 뒤로는 ${josa(p.login, '으로')} 연결합니다.`}
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
