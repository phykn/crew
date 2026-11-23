import { keyOf, PROVIDERS, type ProviderId } from '../domain/providers';
import type { Chat } from './chat';

// The model services the app connects to, for the whole app: a saved key, or the computer's own login without one
export class Connections {
  constructor(private chat: Chat) {}

  list() {
    return PROVIDERS.map((p) => ({ ...p, saved: !!this.chat.secrets.read(keyOf(p.id)) }));
  }

  saveKey(id: ProviderId, key: string) {
    this.chat.secrets.write(keyOf(id), key);
    this.chat.emit('changed', { topic: 'connections' });
  }

  removeKey(id: ProviderId) {
    this.chat.secrets.remove(keyOf(id));
    this.chat.emit('changed', { topic: 'connections' });
  }

  // Asks the service who it answers as, with the key saved now, so a wrong key shows before any work runs on it
  check(_id: ProviderId) {
    return this.chat.agent.check();
  }
}
