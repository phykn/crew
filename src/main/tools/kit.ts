import { diffLines } from 'diff';
import { z } from 'zod';
import { type Sdk, text } from '../agents/run';
import type { Chat } from '../chat';

// The tools member's view of this project's kit, and its changes to it: each one a proposal the user approves on a card
export function kitTools(sdk: Sdk, chat: Chat, sessionId: number) {
  const { store, crew } = chat;
  const projectId = store.projectOf(sessionId).id;
  const hired = () => store.listMembers(projectId).filter((m) => m.status === 'hired');
  // Outside manual mode a kit change applies without a card, like any other call
  const approve = async (prompt: string) =>
    store.readProject(projectId).mode !== 'manual' ||
    (await chat.questions.choose(sessionId, prompt, ['취소', '적용'])) === '적용';
  const cancelled = text('The user cancelled this change; do not propose it again.');
  return sdk.createSdkMcpServer({
    name: 'crew',
    tools: [
      sdk.tool(
        'read_kit',
        "Read every skill and MCP server in this project's kit, and which hired member holds which.",
        {},
        async () => {
          const kit = chat.members.kit(projectId);
          const lines = [
            ...Object.entries(kit.skills).map(([name, k]) => `- skill ${name} (${k.label}): ${k.use}`),
            ...Object.entries(kit.mcp).map(([name, k]) => `- mcp ${name}: ${k.use}`),
          ];
          const holders = hired().map((m) => {
            const s = chat.members.settings(m);
            return `- ${m.key} (${crew.defOf(m).role}${m.temp ? ', temp' : ''}): skills ${s.skills.join(', ') || 'none'}; mcp ${s.mcp.map((x) => `${x.server}(${x.access})`).join(', ') || 'none'}`;
          });
          return text(['# Kit', ...lines, '# Members', ...holders].join('\n'));
        },
      ),
      sdk.tool(
        'read_skill',
        "Read one skill's whole text, as it is added to a run.",
        { name: z.string() },
        async (a) => {
          const body = chat.members.kit(projectId).texts[a.name];
          return text(body ?? `${a.name} is not a skill in this project's kit.`);
        },
      ),
      sdk.tool(
        'write_skill',
        "Make a new skill, or replace one's label, use line, and text, in this project's kit. The user approves or cancels it on a card.",
        {
          name: z
            .string()
            .regex(/^[a-z][a-z0-9-]*$/)
            .describe('The skill name in lowercase English, such as changelog'),
          label: z.string().min(1).max(12).describe('A short Korean label for the legend'),
          use: z.string().min(1).describe('One English line on what it is for'),
          body: z.string().min(1).describe('The whole procedure in English, as it will be added to a run'),
          reason: z.string().min(1).describe('Why, in Korean, for the card'),
        },
        async (a) => {
          const old = chat.members.kit(projectId).skills[a.name];
          // A skill goes into every run of the members who hold it, so the user sees exactly what it will say
          const shown = old
            ? `스킬 변경: ${old.label}(${a.name})\n${a.reason}\n\n${changedLines(`${old.use}\n\n${chat.members.kit(projectId).texts[a.name]}`, `${a.use}\n\n${a.body}`)}`
            : `새 스킬: ${a.label}(${a.name})\n${a.reason}\n\n${a.use}\n\n${a.body}`;
          if (!(await approve(shown))) return cancelled;
          chat.members.writeSkill(projectId, a);
          return text(`Saved the skill ${a.name}.`);
        },
      ),
      sdk.tool(
        'delete_skill',
        "Delete a skill from this project's kit; every member who holds it loses it. The user approves or cancels it on a card.",
        { name: z.string(), reason: z.string().min(1).describe('Why, in Korean, for the card') },
        async (a) => {
          const skill = chat.members.kit(projectId).skills[a.name];
          if (!skill) return text(`${a.name} is not a skill in this project's kit.`);
          const holders = store.listMembers(projectId).filter((m) => chat.members.settings(m).skills.includes(a.name));
          const who = holders.map((m) => crew.defOf(m).role).join(', ') || '없음';
          if (
            !(await approve(`스킬 삭제: ${skill.label}(${a.name}). 가진 멤버(${who})에게서도 빠집니다.\n${a.reason}`))
          )
            return cancelled;
          chat.members.deleteSkill(projectId, a.name);
          return text(`Deleted the skill ${a.name}.`);
        },
      ),
      sdk.tool(
        'reset_skills',
        "Put one skill, or the whole kit when no name is given, back as shipped: the project's own versions and the skills it made are dropped, and members hold their shipped skills again. The user approves or cancels it on a card.",
        {
          name: z.string().optional().describe('One skill; leave out to reset every skill and who holds them'),
          reason: z.string().min(1).describe('Why, in Korean, for the card'),
        },
        async (a) => {
          const rows = store.listSkills(projectId).filter((r) => !a.name || r.name === a.name);
          if (a.name && !rows.length && !crew.kit.skills[a.name])
            return text(`${a.name} is not a skill in this project's kit.`);
          const what = a.name ? `스킬 ${a.name}` : '스킬 전체와 멤버별 스킬 배정';
          const changed = rows.map(
            (r) => `- ${r.name}: ${crew.kit.skills[r.name] ? (r.deleted ? '다시 생김' : '기본 내용으로') : '사라짐'}`,
          );
          const list = changed.length ? `\n\n${changed.join('\n')}` : '';
          if (!(await approve(`기본값으로 되돌리기: ${what}\n${a.reason}${list}`))) return cancelled;
          chat.members.resetSkills(projectId, a.name);
          return text(
            a.name ? `Reset the skill ${a.name} to the shipped one.` : 'Reset the whole kit to the shipped one.',
          );
        },
      ),
      sdk.tool(
        'assign',
        "Propose one member's new full list of skills and/or MCP servers. The user approves or cancels it on a card; the answer says which.",
        {
          member: z.string().describe('The member: its key or Korean role'),
          skills: z.array(z.string()).optional().describe('Its full new list of skills'),
          mcp: z
            .array(z.object({ server: z.string(), access: z.enum(['all', 'read']) }))
            .optional()
            .describe('Its full new list of MCP servers'),
          reason: z.string().min(1).describe('Why, in Korean, for the card'),
        },
        async (a) => {
          const m = chat.members.find(projectId, a.member);
          if (m?.status !== 'hired') return text(`${a.member} is not a hired member.`);
          if (m.temp && a.mcp?.length) return text('A temp gets no MCP server.');
          const config = { ...(a.skills ? { skills: a.skills } : {}), ...(a.mcp ? { mcp: a.mcp } : {}) };
          const kit = chat.members.kit(projectId);
          try {
            crew.checkConfig(config, kit);
          } catch (err) {
            return text(String(err));
          }
          const shown = [
            ...(a.skills ? [`스킬: ${a.skills.map((s) => kit.skills[s].label).join(', ') || '없음'}`] : []),
            ...(a.mcp
              ? [
                  `MCP: ${a.mcp.map((x) => `${kit.mcp[x.server].label}(${x.access === 'all' ? '전체' : '읽기'})`).join(', ') || '없음'}`,
                ]
              : []),
          ];
          if (
            !(await approve(
              `도구가 ${crew.defOf(m).role}(${m.nickname})의 권한을 바꾸려 합니다.\n${shown.join('\n')}\n${a.reason}`,
            ))
          )
            return cancelled;
          chat.members.setPermissions(m.id, config);
          chat.emit('changed', 'members');
          return text(`Applied to ${m.key}.`);
        },
      ),
    ],
  });
}

// The lines a skill change removes and adds, for the card
function changedLines(before: string, after: string) {
  return diffLines(before, after)
    .filter((p) => p.added || p.removed)
    .flatMap((p) =>
      p.value
        .split('\n')
        .filter(Boolean)
        .map((l) => `${p.added ? '+' : '−'} ${l}`),
    )
    .join('\n');
}
