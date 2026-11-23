import fs from 'node:fs';
import path from 'node:path';
import { Crew } from '../../domain/crew';

const read = (...p: string[]) => fs.readFileSync(path.join(...p), 'utf-8');
const json = (...p: string[]) => JSON.parse(read(...p));
const markdown = (dir: string) => fs.readdirSync(dir).filter((f) => f.endsWith('.md'));

// The crew folder shipped with the app, read once at startup; the help is read again each time it is asked for
export function loadCrew(dir: string) {
  return new Crew({
    agents: markdown(path.join(dir, 'agents')).map((f) => ({ key: f.slice(0, -3), text: read(dir, 'agents', f) })),
    rules: read(dir, 'RULES.md'),
    nicknames: json(dir, 'nicknames.json'),
    kit: json(dir, 'kit.json'),
    mcp: json(dir, 'mcp.json'),
    skill: (name) => read(dir, 'skills', name, 'SKILL.md'),
    workflows: fs
      .readdirSync(path.join(dir, 'workflows'))
      .filter((f) => f.endsWith('.json'))
      .map((f) => json(dir, 'workflows', f)),
    help: () =>
      markdown(path.join(dir, 'help'))
        .map((f) => read(dir, 'help', f))
        .join('\n\n'),
  });
}
