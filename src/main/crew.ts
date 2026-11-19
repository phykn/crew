import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import type { Member } from './db';

export const MODELS = ['haiku', 'sonnet', 'opus'] as const;

// The legend lists the starting crew in this order; anyone hired later follows in the order they joined
const ORDER = ['orchestrator', 'hr', 'tools', 'advisor', 'coder', 'reviewer', 'tester', 'stylist', 'researcher', 'images'];
// The crew cannot run without these: 비서 takes every request, and only 인사 and 도구 bring in people and tools
export const KEPT = ['orchestrator', 'hr', 'tools'];

// Each kind of tool a definition can ask for, and the Claude Code tools it opens
const TOOL_KINDS = {
  read: ['Read'],
  search: ['Glob', 'Grep'],
  write: ['Write'],
  edit: ['Edit'],
  shell: ['Bash'],
  web: ['WebFetch', 'WebSearch'],
} as const;

const list = z
  .string()
  .default('')
  .transform((s) => s.split(',').map((x) => x.trim()).filter(Boolean));

const Front = z.object({
  role: z.string().min(1),
  nickname: z.string().min(1),
  color: z.string().regex(/^#[0-9a-f]{6}$/i),
  model: z.enum(MODELS),
  tools: list.pipe(z.array(z.enum(Object.keys(TOOL_KINDS) as [keyof typeof TOOL_KINDS]))),
  // Where its writes may land: the project folder, its own output folder, or nowhere
  write: z.enum(['project', 'output', 'none']),
  skills: list,
  mcp: list,
  look: list,
  description: z.string().min(1),
});

// readTools lists an MCP server's tools that only look, for members given read access to it
const KitItem = z.object({ icon: z.string(), label: z.string(), use: z.string(), readTools: z.array(z.string()).optional() });
const Kit = z.object({ skills: z.record(z.string(), KitItem), mcp: z.record(z.string(), KitItem) });
const McpFile = z.object({ mcpServers: z.record(z.string(), z.record(z.string(), z.unknown())) });

type ToolKind = keyof typeof TOOL_KINDS;
export const TOOL_KIND_NAMES = Object.keys(TOOL_KINDS) as ToolKind[];
export type Access = 'all' | 'read';
// What the user changed for one member in one project; anything left out follows the definition
export const Config = z.object({
  tools: z.array(z.enum(TOOL_KIND_NAMES as [ToolKind])).optional(),
  write: z.enum(['project', 'output', 'none']).optional(),
  skills: z.array(z.string()).optional(),
  mcp: z.array(z.object({ server: z.string(), access: z.enum(['all', 'read']) })).optional(),
});
export type Config = z.infer<typeof Config>;
export type Settings = {
  tools: ToolKind[];
  write: 'project' | 'output' | 'none';
  skills: string[];
  mcp: { server: string; access: Access }[];
};

export type Definition = z.infer<typeof Front> & { key: string; instructions: string };
export type Skill = { name: string; icon: string; label: string; use: string };
export type CrewMember = Member & {
  role: string;
  color: string;
  kept: boolean;
  skills: Skill[];
  look: string[];
  description: string;
};

export function parseDefinition(key: string, text: string): Definition {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!m) throw new Error(`${key}.md has no front matter`);
  const fields = Object.fromEntries(
    m[1].split(/\r?\n/).filter(Boolean).map((line) => {
      const at = line.indexOf(':');
      return [line.slice(0, at).trim(), line.slice(at + 1).trim()];
    }),
  );
  return { ...Front.parse(fields), key, instructions: m[2].trim() };
}

// The crew's shipped rules, definitions, and kit, read once at startup
export class Crew {
  defs: Definition[];
  rules: string;
  kit: z.infer<typeof Kit>;
  servers: Record<string, Record<string, unknown>>;
  skillTexts: Record<string, string>;

  constructor(public dir: string) {
    const agents = path.join(dir, 'agents');
    this.defs = fs
      .readdirSync(agents)
      .filter((f) => f.endsWith('.md'))
      .map((f) => parseDefinition(f.slice(0, -3), fs.readFileSync(path.join(agents, f), 'utf-8')));
    this.rules = fs.readFileSync(path.join(dir, 'RULES.md'), 'utf-8');
    this.kit = Kit.parse(JSON.parse(fs.readFileSync(path.join(dir, 'kit.json'), 'utf-8')));
    this.servers = McpFile.parse(JSON.parse(fs.readFileSync(path.join(dir, 'mcp.json'), 'utf-8'))).mcpServers;
    // A skill with a SKILL.md gives its whole procedure; one without gives its one-line use
    this.skillTexts = Object.fromEntries(
      Object.entries(this.kit.skills).map(([name, item]) => {
        const file = path.join(dir, 'skills', name, 'SKILL.md');
        const body = fs.existsSync(file) ? fs.readFileSync(file, 'utf-8').replace(/^---[\s\S]*?---\s*/, '') : item.use;
        return [name, body.trim()];
      }),
    );
    const unserved = Object.keys(this.kit.mcp).filter((name) => !this.servers[name]);
    if (unserved.length) throw new Error(`kit.json names MCP servers missing from mcp.json: ${unserved.join(', ')}`);
    for (const d of this.defs) {
      const unknown = [...d.skills.filter((s) => !this.kit.skills[s]), ...d.mcp.filter((s) => !this.kit.mcp[s])];
      if (unknown.length) throw new Error(`${d.key}.md names kit items missing from kit.json: ${unknown.join(', ')}`);
    }
  }

  // A member's definition: its own when 인사 wrote it, the shipped one otherwise
  defOf(member: Member): Definition {
    if (!member.definition) return this.find(member.key);
    const def = parseDefinition(member.key, member.definition);
    // A temp may only read, search, and write into its output folder, with no MCP server
    return member.temp ? { ...def, tools: def.tools.filter((t) => ['read', 'search', 'write'].includes(t)), write: 'output', mcp: [] } : def;
  }

  find(key: string): Definition {
    const def = this.defs.find((d) => d.key === key);
    if (!def) throw new Error(`no definition ${key}`);
    return def;
  }

  settings(def: Definition, config: Config): Settings {
    return {
      tools: config.tools ?? def.tools,
      write: config.write ?? def.write,
      skills: config.skills ?? def.skills,
      mcp: config.mcp ?? def.mcp.map((server) => ({ server, access: 'all' as Access })),
    };
  }

  system(def: Definition, settings: Settings) {
    const skills = settings.skills.map((name) => `## Skill: ${name}\n\n${this.skillTexts[name]}`);
    return [this.rules, def.instructions, ...skills].join('\n\n');
  }

  // Only the servers this member holds are started for its run
  mcpServers(settings: Settings) {
    return Object.fromEntries(settings.mcp.map(({ server }) => [server, this.servers[server]])) as Record<string, never>;
  }

  checkConfig(config: Config) {
    const unknown = [
      ...(config.skills ?? []).filter((s) => !this.kit.skills[s]),
      ...(config.mcp ?? []).filter((m) => !this.kit.mcp[m.server]).map((m) => m.server),
    ];
    if (unknown.length) throw new Error(`not in the kit: ${unknown.join(', ')}`);
  }

  describe(members: Member[]): CrewMember[] {
    const rank = (key: string) => (ORDER.includes(key) ? ORDER.indexOf(key) : ORDER.length);
    return members
      // A temp is on the legend only while hired
      .filter((m) => !(m.temp && m.status !== 'hired'))
      .map((m) => {
        const def = this.defOf(m);
        const settings = this.settings(def, m.config);
        return {
          ...m,
          role: def.role,
          color: def.color,
          kept: KEPT.includes(m.key),
          skills: [
            ...settings.skills.map((name) => ({ name, ...this.kit.skills[name] })),
            ...settings.mcp.map(({ server }) => ({ name: server, ...this.kit.mcp[server] })),
          ],
          look: def.look,
          description: def.description,
        };
      })
      .sort((a, b) => rank(a.key) - rank(b.key) || a.id - b.id);
  }
}

export function toolsOf(settings: Settings): string[] {
  return settings.tools.flatMap((k) => TOOL_KINDS[k]);
}
