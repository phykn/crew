import { z } from 'zod';
import type { Member } from './records';
import { Workflow } from './workflow';
import { MEMBERS, WORKFLOW_LABELS, baseKey } from '../../shared';

// The crew cannot run without these: 통역 takes every request and 지휘 plans every task
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
export type CrewData = {
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
  workflows: Workflow[];

  constructor(data: CrewData) {
    this.defs = Object.entries(z.record(z.string(), Agent).parse(data.agents)).map(([key, agent]) => {
      if (!data.instructions[key]) throw new Error(`agents/${key}.md is missing`);
      if (!MEMBERS[key]) throw new Error(`${key} has no name on screen`);
      return { ...agent, key, role: MEMBERS[key].role, instructions: data.instructions[key].trim() };
    });
    const stray = Object.keys(data.instructions).filter((key) => !this.defs.some((d) => d.key === key));
    if (stray.length) throw new Error(`agents.json has no entry for: ${stray.join(', ')}`);
    this.rules = data.rules;
    const mcp = McpFile.parse(data.mcp);
    this.servers = mcp.mcpServers;
    this.readTools = mcp.readTools;
    this.serverNames = [...Object.keys(this.servers), 'app'];
    this.skillTexts = Object.fromEntries(Object.entries(data.skills).map(([name, text]) => [name, text.trim()]));
    this.workflows = data.workflows.map((w) => Workflow.parse(labeled(w as Record<string, unknown>)));
    const missing = Object.keys(MEMBERS).filter((key) => !this.defs.some((d) => d.key === key));
    if (missing.length) throw new Error(`the crew folder has no agent for: ${missing.join(', ')}`);
    for (const d of this.defs) {
      const unknown = [
        ...d.skills.filter((s) => !this.skillTexts[s]),
        ...d.mcp.filter((s) => !this.serverNames.includes(s)),
      ];
      if (unknown.length)
        throw new Error(`${d.key}.md names skills or servers the crew does not have: ${unknown.join(', ')}`);
    }
  }

  // A member's definition: a copy has its original's
  defOf(member: Member): Definition {
    const def = this.defs.find((d) => d.key === baseKey(member.key));
    if (!def) throw new Error(`no definition ${member.key}`);
    return def;
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
        .map((m) => ({ ...m, role: this.defOf(m).role, base: baseKey(m.key), kept: KEPT.includes(m.key) }))
        .sort((a, b) => rank(a.key) - rank(b.key) || a.id - b.id)
    );
  }
}

export function toolsOf(settings: Settings): string[] {
  return settings.tools.flatMap((k) => TOOL_KINDS[k]);
}

// A shipped workflow with its names on screen; a saved one already carries its own
function labeled(w: Record<string, unknown>) {
  const names = WORKFLOW_LABELS[String(w.kind)];
  if (!names || w.label) return w;
  const steps = (w.steps as Record<string, unknown>[]).map((st) => ({ ...st, label: names.steps[String(st.id)] }));
  return { ...w, label: names.label, steps };
}
