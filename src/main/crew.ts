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

const KitItem = z.object({ icon: z.string(), label: z.string(), use: z.string() });
const Kit = z.object({ skills: z.record(z.string(), KitItem), mcp: z.record(z.string(), KitItem) });

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

  constructor(public dir: string) {
    const agents = path.join(dir, 'agents');
    this.defs = fs
      .readdirSync(agents)
      .filter((f) => f.endsWith('.md'))
      .map((f) => parseDefinition(f.slice(0, -3), fs.readFileSync(path.join(agents, f), 'utf-8')));
    this.rules = fs.readFileSync(path.join(dir, 'RULES.md'), 'utf-8');
    this.kit = Kit.parse(JSON.parse(fs.readFileSync(path.join(dir, 'kit.json'), 'utf-8')));
    for (const d of this.defs) {
      const unknown = [...d.skills.filter((s) => !this.kit.skills[s]), ...d.mcp.filter((s) => !this.kit.mcp[s])];
      if (unknown.length) throw new Error(`${d.key}.md names kit items missing from kit.json: ${unknown.join(', ')}`);
    }
  }

  find(key: string): Definition {
    const def = this.defs.find((d) => d.key === key);
    if (!def) throw new Error(`no definition ${key}`);
    return def;
  }

  system(def: Definition) {
    return `${this.rules}\n\n${def.instructions}`;
  }

  describe(members: Member[]): CrewMember[] {
    const rank = (key: string) => (ORDER.includes(key) ? ORDER.indexOf(key) : ORDER.length);
    return members
      .map((m) => {
        const def = this.find(m.key);
        return {
          ...m,
          role: def.role,
          color: def.color,
          kept: KEPT.includes(m.key),
          skills: [
            ...def.skills.map((name) => ({ name, ...this.kit.skills[name] })),
            ...def.mcp.map((name) => ({ name, ...this.kit.mcp[name] })),
          ],
          look: def.look,
          description: def.description,
        };
      })
      .sort((a, b) => rank(a.key) - rank(b.key) || a.id - b.id);
  }
}

export function toolsOf(def: Definition): string[] {
  return def.tools.flatMap((k) => TOOL_KINDS[k]);
}
