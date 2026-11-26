import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { expect, test } from 'vitest';
import { loadCrew } from '../../src/backend/adapters/files/crew';
import { CREW_DIR } from '../support';

test('a skill the crew lacks is blamed on agents.json, which names the skills, not on the agent file', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'crew-copy-'));
  fs.cpSync(CREW_DIR, dir, { recursive: true });
  const file = path.join(dir, 'agents.json');
  const agents = JSON.parse(fs.readFileSync(file, 'utf-8'));
  agents.coder.skills.push('juggling');
  fs.writeFileSync(file, JSON.stringify(agents));
  expect(() => loadCrew(dir)).toThrow('agents.json gives coder skills or servers the crew does not have: juggling');
});
