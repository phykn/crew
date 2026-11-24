import type { Chat } from './chat';
import type { Member } from '../domain/records';
import { Config, KEPT, type Settings } from '../domain/crew';
import { MEMBERS, type Say, baseKey } from '../../shared';

// A project's crew as hired: who is in it, what each may use, and who comes and goes
export class Members {
  constructor(public chat: Chat) {}

  seed(projectId: number) {
    const { crew } = this.chat;
    this.chat.store.seedMembers(
      projectId,
      crew.defs.map((d) => ({ key: d.key, nickname: '', model: MEMBERS[d.key].model })),
    );
  }

  // A member as the crew names it: by key, as the rules say, or by its Korean role
  find(projectId: number, name: string) {
    const { store, crew } = this.chat;
    return store.listMembers(projectId).find((m) => m.key === name || crew.defOf(m).role === name) ?? null;
  }

  // Who a member can name or ask right now, by key
  roster(projectId: number) {
    const { store, crew } = this.chat;
    const hired = store.listMembers(projectId).filter((m) => m.status === 'hired');
    return ['# Crew now', ...hired.map((m) => `- ${m.key} (${crew.defOf(m).role}): ${crew.defOf(m).description}`)].join(
      '\n',
    );
  }

  settings(member: Member) {
    return this.chat.crew.settings(this.chat.crew.defOf(member), Config.parse(member.config));
  }

  setPermissions(memberId: number, config: Config) {
    const { store, crew } = this.chat;
    const member = store.readMemberById(memberId);
    crew.checkConfig(config);
    const merged = { ...member.config, ...config };
    // Only names of what changed are recorded: server settings may hold credentials
    store.writeConfig(
      memberId,
      merged,
      describeChange(this.settings(member), this.settings({ ...member, config: merged })),
    );
    this.chat.emit('changed', { topic: 'members' });
  }

  // The one way the window and the interpreter change a member's nickname, model, or hiring
  update(memberId: number, change: { nickname?: string; model?: string; status?: Member['status'] }) {
    const { store } = this.chat;
    const m = store.readMemberById(memberId);
    // The crew stops working without the interpreter or the conductor
    if (change.status === 'unhired' && KEPT.includes(m.key)) {
      throw new Error(`${m.key} cannot be let go.`);
    }
    if (change.status === 'unhired') this.fire(memberId);
    if (change.status === 'hired') this.rehire(memberId);
    if (change.nickname === undefined && change.model === undefined) return;
    store.updateMember(memberId, { nickname: change.nickname, model: change.model });
    this.chat.emit('changed', { topic: 'members' });
  }

  // Back to how the member came: its shipped nickname and model, hired, and no permission changes
  reset(memberId: number) {
    const { store } = this.chat;
    const m = store.readMemberById(memberId);
    store.transact(() => {
      if (Object.keys(m.config).length)
        store.writeConfig(memberId, {}, describeChange(this.settings(m), this.settings({ ...m, config: {} })));
      store.updateMember(memberId, { nickname: m.temp ? m.nickname : '', model: MEMBERS[baseKey(m.key)].model });
    });
    if (m.status !== 'hired' || m.leaving) this.rehire(memberId);
    this.chat.emit('changed', { topic: 'members' });
  }

  // Letting go is idempotent: a second press while leaving or gone changes nothing
  fire(memberId: number) {
    const m = this.chat.store.readMemberById(memberId);
    if (m.status !== 'hired' || m.leaving) return;
    if (this.chat.runs.busy(memberId)) {
      this.chat.store.writeLeaving(memberId, true);
      this.note(m, 'leave', { code: 'member.leaving', role: baseKey(m.key), nickname: this.chat.crew.nicknameOf(m) });
      this.chat.emit('changed', { topic: 'members' });
    } else this.leave(memberId);
  }

  rehire(memberId: number) {
    const { store } = this.chat;
    store.transact(() => {
      store.writeLeaving(memberId, false);
      store.updateMember(memberId, { status: 'hired' });
    });
    this.chat.emit('changed', { topic: 'members' });
  }

  leave(memberId: number) {
    const { store } = this.chat;
    const m = store.readMemberById(memberId);
    store.transact(() => {
      store.writeLeaving(memberId, false);
      store.updateMember(memberId, { status: 'unhired' });
    });
    this.note(m, 'leave', { code: 'member.left', role: baseKey(m.key), nickname: this.chat.crew.nicknameOf(m) });
    this.chat.emit('changed', { topic: 'members' });
  }

  // A crew change is logged in the project's latest session, where the user is looking
  note(m: Member, kind: string, say: Say) {
    const [session] = this.chat.store.listSessions(m.projectId);
    if (session)
      this.chat.store.addEvent({ sessionId: session.id, taskId: null, memberId: m.id, kind, say, detail: null });
  }
}

function describeChange(before: Settings, after: Settings): Say {
  const diff = (what: string, a: string[], b: string[]) => [
    ...b.filter((x) => !a.includes(x)).map((name) => ({ what, sign: '+', name })),
    ...a.filter((x) => !b.includes(x)).map((name) => ({ what, sign: '-', name })),
  ];
  const mcp = (s: Settings) => s.mcp.map((m) => `${m.server}:${m.access}`);
  return {
    code: 'perm.change',
    parts: [
      ...diff('tool', before.tools, after.tools),
      ...diff('skill', before.skills, after.skills),
      ...diff('mcp', mcp(before), mcp(after)),
    ],
    write: before.write !== after.write ? [before.write, after.write] : null,
  };
}
