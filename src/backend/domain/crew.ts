import { z } from 'zod';
import type { Member } from './records';
import { Workflow } from './workflow';
import { MEMBERS, type Names, baseKey } from '../../shared';

// The crew cannot run without these: the interpreter takes every request and the conductor plans every task
export const KEPT = ['interpreter', 'conductor'];

// Each kind of tool a definition can ask for, and the Claude Code tools it opens
const TOOL_KINDS = {
  read: ['Read'],
  search: ['Glob', 'Grep'],
  write: ['Write'],
  edit: ['Edit'],
  // Claude Code offers PowerShell on Windows; the guard checks both the same way
  shell: ['Bash', 'PowerShell'],
  web: ['WebFetch', 'WebSearch'],
} as const;
type ToolKind = keyof typeof TOOL_KINDS;
const ToolKinds = z.enum(Object.keys(TOOL_KINDS) as [ToolKind]);
// Where a member's writes may land: the project folder, its own output folder, or nowhere
const Write = z.enum(['project', 'output', 'none']);
const Access = z.enum(['all', 'read']);

// agents.json: what each agent is for, and the tools, write scope, skills, and MCP servers it starts with
const Agent = z.object({
  description: z.string().min(1),
  tools: z.array(ToolKinds),
  write: Write,
  skills: z.array(z.string()),
  mcp: z.array(z.string()),
});

// mcp.json: each server's command, and the tools of each that only look, for members given read access to it
const McpFile = z.object({
  mcpServers: z.record(z.string(), z.record(z.string(), z.unknown())),
  readTools: z.record(z.string(), z.array(z.string())).default({}),
});

// What the user changed for one member in one project; anything left out follows the definition
export const Config = z.object({
  tools: z.array(ToolKinds).optional(),
  write: Write.optional(),
  skills: z.array(z.string()).optional(),
  mcp: z.array(z.object({ server: z.string(), access: Access })).optional(),
});
export type Config = z.infer<typeof Config>;
export type Settings = Required<Config>;

export type Definition = z.infer<typeof Agent> & { key: string; role: string; instructions: string };
// base: the shipped member a copy came from
export type CrewMember = Member & { role: string; base: string; kept: boolean };

// What the crew folder holds, as the files say it; the Crew checks and reads it
type CrewData = {
  agents: unknown;
  instructions: Record<string, string>;
  rules: string;
  mcp: unknown;
  skills: Record<string, string>;
  workflows: unknown[];
};

// The crew's shipped rules, definitions, skills, MCP servers, and workflows
export class Crew {
  defs: Definition[];
  rules: string;
  servers: Record<string, Record<string, unknown>>;
  readTools: Record<string, string[]>;
  // The app's own server runs inside the app, so it has no command in mcp.json
  serverNames: string[];
  skillTexts: Record<string, string>;
  shipped: Workflow[];
  // Until the window hands over its names, members and steps go by their keys
  names: Names = { roles: {}, nicknames: {}, workflows: {}, modes: {} };

  constructor(data: CrewData) {
    this.defs = Object.entries(z.record(z.string(), Agent).parse(data.agents)).map(([key, agent]) => {
      if (!data.instructions[key]) throw new Error(`agents/${key}.md is missing`);
      if (!MEMBERS[key]) throw new Error(`${key} has no starting model`);
      return { ...agent, key, role: key, instructions: data.instructions[key].trim() };
    });
    const stray = Object.keys(data.instructions).filter((key) => !this.defs.some((d) => d.key === key));
    if (stray.length) throw new Error(`agents.json has no entry for: ${stray.join(', ')}`);
    this.rules = data.rules;
    const mcp = McpFile.parse(data.mcp);
    this.servers = mcp.mcpServers;
    this.readTools = mcp.readTools;
    this.serverNames = [...Object.keys(this.servers), 'app'];
    this.skillTexts = Object.fromEntries(Object.entries(data.skills).map(([name, text]) => [name, text.trim()]));
    this.shipped = data.workflows.map((w) => Workflow.parse(w));
    const missing = Object.keys(MEMBERS).filter((key) => !this.defs.some((d) => d.key === key));
    if (missing.length) throw new Error(`the crew folder has no agent for: ${missing.join(', ')}`);
    for (const d of this.defs) {
      const unknown = [
        ...d.skills.filter((s) => !this.skillTexts[s]),
        ...d.mcp.filter((s) => !this.serverNames.includes(s)),
      ];
      if (unknown.length)
        throw new Error(`agents.json gives ${d.key} skills or servers the crew does not have: ${unknown.join(', ')}`);
    }
  }

  useNames(names: Names) {
    this.names = names;
  }

  // A member's definition, with its name on screen: a copy has its original's
  defOf(member: Member): Definition {
    const base = baseKey(member.key);
    const def = this.defs.find((d) => d.key === base);
    if (!def) throw new Error(`no definition ${member.key}`);
    return { ...def, role: this.names.roles[base] ?? base };
  }

  // The nickname the user gave, or the one the window starts a member with
  nicknameOf(member: Member) {
    return member.nickname || this.names.nicknames[baseKey(member.key)] || member.key;
  }

  // The one step of a task given to a member alone, as the window names it
  soloStep(member: Member) {
    const role = this.defOf(member).role;
    const work = this.names.workflows.solo?.steps.work;
    return work ? `${role} ${work}` : role;
  }

  // The shipped workflows, with the window's names on steps nobody named
  get workflows(): Workflow[] {
    return this.shipped.map((w) => {
      const names = this.names.workflows[w.kind];
      const steps = w.steps.map((s) => ({ ...s, label: s.label || names?.steps[s.id] || s.id }));
      return { ...w, label: w.label || names?.label || w.kind, steps };
    });
  }

  settings(def: Definition, config: Config): Settings {
    return {
      tools: config.tools ?? def.tools,
      write: config.write ?? def.write,
      skills: config.skills ?? def.skills,
      mcp: config.mcp ?? def.mcp.map((server) => ({ server, access: 'all' as const })),
    };
  }

  system(def: Definition, settings: Settings) {
    const skills = settings.skills.map((name) => `## Skill: ${name}\n\n${this.skillTexts[name]}`);
    return [this.rules, def.instructions, ...skills].join('\n\n');
  }

  // Only the servers this member holds are started for its run
  mcpServers(settings: Settings) {
    // A server with no command, such as the app's own, is started in process by the caller
    return Object.fromEntries(
      settings.mcp.filter(({ server }) => this.servers[server]).map(({ server }) => [server, this.servers[server]]),
    ) as Record<string, never>;
  }

  checkConfig(config: Config) {
    const unknown = [
      ...(config.skills ?? []).filter((s) => !this.skillTexts[s]),
      ...(config.mcp ?? []).filter((m) => !this.serverNames.includes(m.server)).map((m) => m.server),
    ];
    if (unknown.length) throw new Error(`not in the crew: ${unknown.join(', ')}`);
  }

  describe(members: Member[]): CrewMember[] {
    const order = Object.keys(MEMBERS);
    const rank = (key: string) => (order.includes(key) ? order.indexOf(key) : order.length);
    return (
      members
        // A temp is on the legend only while hired
        .filter((m) => !(m.temp && m.status !== 'hired'))
        .map((m) => ({
          ...m,
          nickname: this.nicknameOf(m),
          role: this.defOf(m).role,
          base: baseKey(m.key),
          kept: KEPT.includes(m.key),
        }))
        .sort((a, b) => rank(a.key) - rank(b.key) || a.id - b.id)
    );
  }
}

export function toolsOf(settings: Settings): string[] {
  return settings.tools.flatMap((k) => TOOL_KINDS[k]);
}
