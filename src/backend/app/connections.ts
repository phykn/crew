import { DEFAULT_PROVIDER, keyOf, PROVIDERS, type ProviderId } from '../domain/providers';
import type { Chat } from './chat';

const IN_USE = 'connection';
const find = (id: ProviderId) => PROVIDERS.find((p) => p.id === id)!;

// The connections the 연결 tab shows, for the whole app: each its own service, and one of them the crew runs on
export class Connections {
  constructor(private chat: Chat) {}

  list() {
    const active = this.active();
    return PROVIDERS.map((p) => ({
      ...p,
      saved: 'key' in p ? !!this.chat.secrets.read(keyOf(p.id)) : false,
      active: p.id === active,
    }));
  }

  active(): ProviderId {
    const id = this.chat.store.readSetting(IN_USE);
    return PROVIDERS.find((p) => p.id === id)?.id ?? DEFAULT_PROVIDER;
  }

  // The key runs go with: the API's while it is in use, none on the subscription, so the two never mix
  key() {
    const p = find(this.active());
    return 'key' in p ? this.chat.secrets.read(keyOf(p.id)) : null;
  }

  use(id: ProviderId) {
    if ('key' in find(id) && !this.chat.secrets.read(keyOf(id))) throw new Error('API 키를 먼저 저장하세요');
    this.chat.store.writeSetting(IN_USE, id);
    this.chat.emit('changed', { topic: 'connections' });
  }

  saveKey(id: ProviderId, key: string) {
    if (!('key' in find(id))) throw new Error(`${find(id).label}은 키 없이 연결합니다`);
    this.chat.secrets.write(keyOf(id), key);
    this.chat.emit('changed', { topic: 'connections' });
  }

  // A connection in use whose key goes falls back to the subscription rather than running on nothing
  removeKey(id: ProviderId) {
    this.chat.secrets.remove(keyOf(id));
    if (this.active() === id) this.chat.store.writeSetting(IN_USE, DEFAULT_PROVIDER);
    this.chat.emit('changed', { topic: 'connections' });
  }

  // Asks one connection who it answers as, whether or not it is in use, so a wrong key shows before any work runs on it
  async check(id: ProviderId) {
    if (!('key' in find(id))) return this.chat.agent.check(null);
    const key = this.chat.secrets.read(keyOf(id));
    return key ? this.chat.agent.check(key) : ({ ok: false, error: '저장한 키가 없습니다' } as const);
  }
}
