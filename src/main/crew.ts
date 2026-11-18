import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';

export const MODELS = ['haiku', 'sonnet', 'opus'] as const;

// Each kind of tool an agent definition can ask for, and the Claude Code tools it opens
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
  look: list,
  description: z.string().min(1),
});

export type Definition = z.infer<typeof Front> & { key: string; instructions: string };

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

export function readDefinitions(dir: string): Definition[] {
  return fs
    .readdirSync(path.join(dir, 'agents'))
    .filter((f) => f.endsWith('.md'))
    .map((f) => parseDefinition(f.slice(0, -3), fs.readFileSync(path.join(dir, 'agents', f), 'utf-8')));
}

export function readRules(dir: string) {
  return fs.readFileSync(path.join(dir, 'RULES.md'), 'utf-8');
}

export function toolsOf(def: Definition): string[] {
  return def.tools.flatMap((k) => TOOL_KINDS[k]);
}
