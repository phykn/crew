import { z } from 'zod';
import type { Chat } from '../chat';
import type { Member } from '../db';
import { Config, KEPT, parseDefinition, type Settings } from './shipped';
import { particle } from '../../korean';

const Draft = z.object({
  fits: z
    .object({ key: z.string(), reason: z.string() })
    .optional()
    .describe('An existing member who already fits the work, instead of a new one: its key and why, in Korean'),
  key: z
    .string()
    .regex(/^[a-z][a-z0-9_]*$/)
    .optional()
    .describe('The role in lowercase English, such as translator'),
  nickname: z.string().min(1).max(12).optional().describe('A Korean nickname unlike the ones in use'),
  definition: z.string().optional().describe('The whole definition: front matter and instructions'),
});
const HIRE_SCHEMA = z.toJSONSchema(Draft, { target: 'draft-7', io: 'input' }) as Record<string, unknown>;

// A project's crew as hired: who is in it, what each may use, and who comes and goes
export class Members {
  constructor(public chat: Chat) {}

  seed(projectId: number) {
    const { crew } = this.chat;
    this.chat.store.seedMembers(
      projectId,
      crew.defs.map((d) => ({ ...d, nickname: crew.nicknames[d.key] })),
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

  kit(projectId: number) {
    return this.chat.crew.kitFor(this.chat.store.listSkills(projectId));
  }

  settings(member: Member) {
    return this.chat.crew.settings(this.chat.crew.defOf(member), Config.parse(member.config));
  }

  setPermissions(memberId: number, config: Config) {
    const { store, crew } = this.chat;
    const member = store.readMemberById(memberId);
    crew.checkConfig(config, this.kit(member.projectId));
    const merged = { ...member.config, ...config };
    // Only names of what changed are recorded: server settings may hold credentials
    store.writeConfig(
      memberId,
      merged,
      describeChange(this.settings(member), this.settings({ ...member, config: merged })),
    );
  }

  writeSkill(projectId: number, skill: { name: string; label: string; use: string; body: string }) {
    this.chat.store.writeSkill(projectId, skill);
    this.chat.emit('changed', 'members');
  }

  // A deleted skill leaves every member who held it, so no run asks for a skill that is gone
  deleteSkill(projectId: number, name: string) {
    const { store } = this.chat;
    store.transact(() => {
      store.removeSkill(projectId, name);
      for (const m of store.listMembers(projectId)) {
        const skills = this.settings(m).skills;
        if (skills.includes(name)) this.setPermissions(m.id, { skills: skills.filter((s) => s !== name) });
      }
    });
    this.chat.emit('changed', 'members');
  }

  // Back to the shipped kit for one skill or all: what the project made goes, and members hold the shipped skills again
  resetSkills(projectId: number, name?: string) {
    const { store, crew } = this.chat;
    store.transact(() => {
      const made = store
        .listSkills(projectId)
        .filter((r) => (!name || r.name === name) && !crew.kit.skills[r.name])
        .map((r) => r.name);
      store.clearSkills(projectId, name);
      for (const m of store.listMembers(projectId)) {
        const shipped = crew.defOf(m).skills;
        const held = this.settings(m).skills;
        const next = name
          ? [
              ...held.filter((s) => !made.includes(s)),
              ...(shipped.includes(name) && !held.includes(name) ? [name] : []),
            ]
          : shipped;
        if (next.join() !== held.join()) this.setPermissions(m.id, { skills: next });
      }
    });
    this.chat.emit('changed', 'members');
  }

  // 인사 designs the missing member; the app checks the definition and adds it as a regular or a temp
  async hire(sessionId: number, need: string, temp: boolean) {
    const { store, crew } = this.chat;
    const project = store.projectOf(sessionId);
    const members = store.listMembers(project.id);
    const kit = this.kit(project.id);
    const prompt = [
      `[Hire] The crew needs: ${need}`,
      `As a ${temp ? 'temp (알바)' : 'regular'}.`,
      `# Existing members\n${members.map((m) => `- ${crew.defOf(m).role} (${m.key})${m.status === 'hired' ? '' : ' [let go]'}: ${crew.defOf(m).description}`).join('\n')}`,
      `# Nicknames in use\n${members.map((m) => m.nickname).join(', ')}`,
      `# Kit\nSkills: ${Object.keys(kit.skills).join(', ')}. MCP servers: ${Object.keys(kit.mcp).join(', ')}.`,
    ].join('\n\n');
    const out = await this.chat.runs.run(store.readMember(project.id, 'hr'), sessionId, null, prompt, {
      schema: HIRE_SCHEMA,
    });
    const draft = Draft.safeParse(out.structured);
    if (!draft.success) return `인사가 정의를 만들지 못했습니다: ${out.error ?? '형식이 맞지 않습니다'}`;
    const { fits, key, nickname } = draft.data;
    const fit = fits && this.find(project.id, fits.key);
    if (fit && (fit.status !== 'hired' || fit.leaving)) {
      // One let go who fits comes back with its settings; designing a twin would leave the old one unhired
      this.rehire(fit.id);
      return `${crew.defOf(fit).role}(${fit.nickname})${particle(crew.defOf(fit).role, '을')} 다시 고용했습니다.`;
    }
    if (fit)
      return `새로 뽑지 않았습니다. ${crew.defOf(fit).role}(${fit.key})${particle(crew.defOf(fit).role, '이')} 이미 맞습니다: ${fits.reason}`;
    if (!key || !nickname || !draft.data.definition)
      return '인사가 정의를 만들지 못했습니다: 키, 별명, 정의가 모두 있어야 합니다';
    let definition = draft.data.definition;
    let def;
    try {
      def = parseDefinition(key, definition);
      crew.checkConfig({ skills: def.skills, mcp: def.mcp.map((server) => ({ server, access: 'all' as const })) }, kit);
    } catch (err) {
      return `인사의 정의가 맞지 않습니다: ${String(err)}`;
    }
    const same = members.find((m) => m.key === key || crew.defOf(m).role === def.role);
    if (same && same.status !== 'hired' && !same.temp) {
      this.rehire(same.id);
      return `${crew.defOf(same).role}(${same.nickname})${particle(crew.defOf(same).role, '을')} 다시 고용했습니다.`;
    }
    if (same) return `${def.role}(${key})${particle(def.role, '은')} 이미 있습니다.`;
    // The role line is how a run knows who it is; a draft that left it out still gets it
    if (!def.instructions.includes(`**${def.role}**`))
      definition = definition.replace(/\n---\r?\n/, `\n---\n\nYou are the crew's **${def.role}** (${key}).\n\n`);
    const member = store.addMember(project.id, { key, nickname, model: def.model, definition, temp });
    this.note(member, 'hire', `${def.role}(${nickname}) ${temp ? '알바로' : '정규로'} 고용`);
    this.chat.emit('changed', 'members');
    return `${def.role}(${nickname})${particle(def.role, '을')} ${temp ? '알바로' : '정규로'} 고용했습니다. key: ${key}`;
  }

  // The one way the window and 비서 change a member's nickname, model, or hiring
  update(memberId: number, change: { nickname?: string; model?: string; status?: Member['status'] }) {
    const { store, crew } = this.chat;
    const m = store.readMemberById(memberId);
    // The crew stops working without 비서, 인사, or 도구
    if (change.status === 'unhired' && KEPT.includes(m.key)) {
      const role = crew.defOf(m).role;
      throw new Error(`${role}(${m.nickname})${particle(role, '은')} 내보낼 수 없습니다.`);
    }
    if (change.status === 'unhired') this.fire(memberId);
    if (change.status === 'hired') this.rehire(memberId);
    store.updateMember(memberId, { nickname: change.nickname, model: change.model });
  }

  // Letting go is idempotent: a second press while leaving or gone changes nothing
  fire(memberId: number) {
    const m = this.chat.store.readMemberById(memberId);
    if (m.status !== 'hired' || m.leaving) return;
    if (this.chat.runs.busy(memberId)) {
      this.chat.store.writeLeaving(memberId, true);
      this.note(m, 'leave', `${this.chat.crew.defOf(m).role}(${m.nickname}) 퇴장 예정: 맡은 단계를 마치고 나갑니다`);
    } else this.leave(memberId);
  }

  rehire(memberId: number) {
    const { store } = this.chat;
    store.transact(() => {
      store.writeLeaving(memberId, false);
      store.updateMember(memberId, { status: 'hired' });
    });
    this.chat.emit('changed', 'members');
  }

  leave(memberId: number) {
    const { store } = this.chat;
    const m = store.readMemberById(memberId);
    store.transact(() => {
      store.writeLeaving(memberId, false);
      store.updateMember(memberId, { status: 'unhired' });
    });
    this.note(m, 'leave', `${this.chat.crew.defOf(m).role}(${m.nickname}) 퇴장`);
    this.chat.emit('changed', 'members');
  }

  // A crew change is logged in the project's latest session, where the user is looking
  note(m: Member, kind: string, text: string) {
    const session = this.chat.store.listSessions(m.projectId).at(-1);
    if (session)
      this.chat.store.addEvent({ sessionId: session.id, taskId: null, memberId: m.id, kind, text, detail: null });
  }
}

function describeChange(before: Settings, after: Settings) {
  const diff = (label: string, a: string[], b: string[]) => [
    ...b.filter((x) => !a.includes(x)).map((x) => `${label} +${x}`),
    ...a.filter((x) => !b.includes(x)).map((x) => `${label} -${x}`),
  ];
  const mcp = (s: Settings) => s.mcp.map((m) => `${m.server}(${m.access === 'all' ? '전체' : '읽기'})`);
  const parts = [
    ...diff('도구', before.tools, after.tools),
    ...diff('스킬', before.skills, after.skills),
    ...diff('MCP', mcp(before), mcp(after)),
    ...(before.write !== after.write ? [`쓰기 ${before.write} → ${after.write}`] : []),
  ];
  return parts.join(', ') || '변경 없음';
}
