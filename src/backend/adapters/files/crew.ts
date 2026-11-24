import fs from 'node:fs';
import path from 'node:path';
import { Crew } from '../../domain/crew';

const read = (...p: string[]) => fs.readFileSync(path.join(...p), 'utf-8');
const json = (...p: string[]) => JSON.parse(read(...p));

// The crew folder shipped with the app, read once at startup
export function loadCrew(dir: string) {
  return new Crew({
    agents: json(dir, 'agents.json'),
    instructions: Object.fromEntries(
      fs
        .readdirSync(path.join(dir, 'agents'))
        .filter((f) => f.endsWith('.md'))
        .map((f) => [f.slice(0, -3), read(dir, 'agents', f)]),
    ),
    rules: read(dir, 'RULES.md'),
    mcp: json(dir, 'mcp.json'),
    skills: Object.fromEntries(
      fs.readdirSync(path.join(dir, 'skills')).map((name) => [name, read(dir, 'skills', name, 'SKILL.md')]),
    ),
    workflows: fs
      .readdirSync(path.join(dir, 'workflows'))
      .filter((f) => f.endsWith('.json'))
      .map((f) => json(dir, 'workflows', f)),
  });
}
