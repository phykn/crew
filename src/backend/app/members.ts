import type { Chat } from './chat';
import type { Member } from '../domain/records';
import { Config, KEPT, type Settings } from '../domain/crew';
import { particle } from '../../korean';
import { MEMBERS, baseKey } from '../../shared';

// A project's crew as hired: who is in it, what each may use, and who comes and goes
export class Members {
  constructor(public chat: Chat) {}

  seed(projectId: number) {
    const { crew } = this.chat;
    this.chat.store.seedMembers(
      projectId,
      crew.defs.map((d) => ({ key: d.key, nickname: MEMBERS[d.key].nickname, model: MEMBERS[d.key].model })),
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
    this.writePermissions(memberId, config);
    this.chat.emit('changed', { topic: 'members' });
  }

  writePermissions(memberId: number, config: Config) {
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
  }

  // The one way the window and 통역 change a member's nickname, model, or hiring
  update(memberId: number, change: { nickname?: string; model?: string; status?: Member['status'] }) {
    const { store, crew } = this.chat;
    const m = store.readMemberById(memberId);
    // The crew stops working without 통역 or 지휘
    if (change.status === 'unhired' && KEPT.includes(m.key)) {
      const role = crew.defOf(m).role;
      throw new Error(`${role}(${m.nickname})${particle(role, '은')} 내보낼 수 없습니다.`);
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
      const shipped = MEMBERS[baseKey(m.key)];
      store.updateMember(memberId, { nickname: m.temp ? m.nickname : shipped.nickname, model: shipped.model });
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
      this.note(m, 'leave', `${this.chat.crew.defOf(m).role}(${m.nickname}) 퇴장 예정: 맡은 단계를 마치고 나갑니다`);
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
    this.note(m, 'leave', `${this.chat.crew.defOf(m).role}(${m.nickname}) 퇴장`);
    this.chat.emit('changed', { topic: 'members' });
  }

  // A crew change is logged in the project's latest session, where the user is looking
  note(m: Member, kind: string, text: string) {
    const [session] = this.chat.store.listSessions(m.projectId);
    if (session)
      this.chat.store.addEvent({ sessionId: session.id, taskId: null, memberId: m.id, kind, text, detail: null });
  }
}

function describeChange(before: Settings, after: Settings) {
  const diff = (label: string, a: string[], b: string[]) => [
    ...b.filter((x) => !a.includes(x)).map((x) => `${label} +${x}`),
    ...a.filter((x) => !b.includes(x)).map((x) => `${label} -${x}`),
  ];
  const mcp = (s: Settings) => s.mcp.map((m) => `${m.server}(${m.access === 'all' ? '전체' : '읽기만'})`);
  const parts = [
    ...diff('도구', before.tools, after.tools),
    ...diff('스킬', before.skills, after.skills),
    ...diff('MCP', mcp(before), mcp(after)),
    ...(before.write !== after.write ? [`쓰기 ${before.write} → ${after.write}`] : []),
  ];
  return parts.join(', ') || '변경 없음';
}
