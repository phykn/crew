import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import type { Member, SkillRow } from '../db';

export const MODELS = ['haiku', 'sonnet', 'opus'] as const;

// The legend lists the starting crew in this order; anyone hired later follows in the order they joined
const ORDER = [
  'orchestrator',
  'hr',
  'tools',
  'advisor',
  'coder',
  'reviewer',
  'tester',
  'stylist',
  'researcher',
  'images',
];
// The crew cannot run without these: 비서 takes every request, and only 인사 and 도구 bring in people and tools
export const KEPT = ['orchestrator', 'hr', 'tools'];

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

// The sprite parts src/frontend/camp/paint/sprites.js draws, as head, upper, lower
const LOOKS = {
  head: ['hood', 'hair', 'helm', 'hat', 'braids'],
  upper: ['tunic', 'robe', 'armor', 'vest'],
  lower: ['boots', 'gown', 'greaves', 'wraps'],
} as const;

// A definition 인사 writes may say none for an empty list, as models often do
const list = z
  .string()
  .default('')
  .transform((s) =>
    s
      .split(',')
      .map((x) => x.trim())
      .filter((x) => x && !/^(none|-)$/i.test(x)),
  );

const Front = z.object({
  role: z.string().min(1),
  color: z.string().regex(/^#[0-9a-f]{6}$/i),
  model: z.enum(MODELS),
  tools: list.pipe(z.array(ToolKinds)),
  write: Write,
  skills: list,
  mcp: list,
  look: list.pipe(z.tuple([z.enum(LOOKS.head), z.enum(LOOKS.upper), z.enum(LOOKS.lower)])),
  description: z.string().min(1),
});

// readTools lists an MCP server's tools that only look, for members given read access to it
const KitItem = z.object({
  icon: z.string(),
  label: z.string(),
  use: z.string(),
  readTools: z.array(z.string()).optional(),
});
const Kit = z.object({ skills: z.record(z.string(), KitItem), mcp: z.record(z.string(), KitItem) });
// A project's kit, with the text each skill adds to a run
type ProjectKit = z.infer<typeof Kit> & { texts: Record<string, string> };
const McpFile = z.object({ mcpServers: z.record(z.string(), z.record(z.string(), z.unknown())) });

// What the user changed for one member in one project; anything left out follows the definition
export const Config = z.object({
  tools: z.array(ToolKinds).optional(),
  write: Write.optional(),
  skills: z.array(z.string()).optional(),
  mcp: z.array(z.object({ server: z.string(), access: Access })).optional(),
});
export type Config = z.infer<typeof Config>;
export type Settings = Required<Config>;

export type Definition = z.infer<typeof Front> & { key: string; instructions: string };
type Skill = { name: string; icon: string; label: string; use: string };
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
    m[1]
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => {
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
  // The starting crew's nicknames; the user may rename anyone, so they live apart from the definitions
  nicknames: Record<string, string>;

  constructor(public dir: string) {
    const agents = path.join(dir, 'agents');
    this.defs = fs
      .readdirSync(agents)
      .filter((f) => f.endsWith('.md'))
      .map((f) => parseDefinition(f.slice(0, -3), fs.readFileSync(path.join(agents, f), 'utf-8')));
    this.rules = fs.readFileSync(path.join(dir, 'RULES.md'), 'utf-8');
    this.nicknames = z
      .record(z.string(), z.string().min(1))
      .parse(JSON.parse(fs.readFileSync(path.join(dir, 'nicknames.json'), 'utf-8')));
    const unnamed = this.defs.filter((d) => !this.nicknames[d.key]).map((d) => d.key);
    if (unnamed.length) throw new Error(`nicknames.json has no nickname for: ${unnamed.join(', ')}`);
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
    // The app's own server runs inside the app, so it has no command in mcp.json
    const unserved = Object.keys(this.kit.mcp).filter((name) => !this.servers[name] && name !== 'app');
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
    return member.temp
      ? { ...def, tools: def.tools.filter((t) => ['read', 'search', 'write'].includes(t)), write: 'output', mcp: [] }
      : def;
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
      mcp: config.mcp ?? def.mcp.map((server) => ({ server, access: 'all' as const })),
    };
  }

  // A project's kit: the shipped skills, with the ones its tools member wrote over, made, or deleted
  kitFor(rows: SkillRow[]): ProjectKit {
    const skills = { ...this.kit.skills };
    const texts = { ...this.skillTexts };
    for (const r of rows) {
      if (r.deleted) {
        delete skills[r.name];
        delete texts[r.name];
      } else {
        skills[r.name] = { icon: skills[r.name]?.icon ?? 'puzzle', label: r.label, use: r.use };
        texts[r.name] = r.body;
      }
    }
    return { skills, mcp: this.kit.mcp, texts };
  }

  // The app's help, read fresh so an edit to crew/help shows without a restart
  help() {
    const dir = path.join(this.dir, 'help');
    return fs
      .readdirSync(dir)
      .filter((f) => f.endsWith('.md'))
      .map((f) => fs.readFileSync(path.join(dir, f), 'utf-8'))
      .join('\n\n');
  }

  system(def: Definition, settings: Settings, kit: ProjectKit) {
    const skills = settings.skills.map((name) => `## Skill: ${name}\n\n${kit.texts[name]}`);
    return [this.rules, def.instructions, ...skills].join('\n\n');
  }

  // Only the servers this member holds are started for its run
  mcpServers(settings: Settings) {
    // A server with no command, such as the app's own, is started in process by the caller
    return Object.fromEntries(
      settings.mcp.filter(({ server }) => this.servers[server]).map(({ server }) => [server, this.servers[server]]),
    ) as Record<string, never>;
  }

  checkConfig(config: Config, kit: ProjectKit) {
    const unknown = [
      ...(config.skills ?? []).filter((s) => !kit.skills[s]),
      ...(config.mcp ?? []).filter((m) => !kit.mcp[m.server]).map((m) => m.server),
    ];
    if (unknown.length) throw new Error(`not in the kit: ${unknown.join(', ')}`);
  }

  describe(members: Member[], kit: ProjectKit): CrewMember[] {
    const rank = (key: string) => (ORDER.includes(key) ? ORDER.indexOf(key) : ORDER.length);
    return (
      members
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
              ...settings.skills.map((name) => ({ name, ...kit.skills[name] })),
              ...settings.mcp.map(({ server }) => ({ name: server, ...kit.mcp[server] })),
            ],
            look: def.look,
            description: def.description,
          };
        })
        .sort((a, b) => rank(a.key) - rank(b.key) || a.id - b.id)
    );
  }
}

export function toolsOf(settings: Settings): string[] {
  return settings.tools.flatMap((k) => TOOL_KINDS[k]);
}
