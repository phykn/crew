import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from 'vitest';
import { snapshot } from '../../src/backend/tasks/changes';
import { openChat } from '../support';

test('overlapping writes go in turn and re-read what changed; others run at once', async () => {
  const { store, chat, p, s, project } = openChat({}, { files: { 'a.js': 'a', 'b.js': 'b', 'old.js': 'o' } });
  fs.mkdirSync(path.join(project, 'src'));
  const coder = store.readMember(p.id, 'coder');
  const open = () => {
    const t = store.createTask({
      sessionId: s.id,
      kind: 'code',
      title: 't',
      request: 'r',
      workflow: chat.workflows.shipped[0],
    });
    store.writeBaseline(t.id, snapshot(project));
    const policy = chat.runs.policy(coder, p, `task-${t.id}`);
    return (tool: string, input: Record<string, unknown>) => chat.runs.reserve(p, t.id, policy, tool, input);
  };
  const [a, b, c] = [open(), open(), open()];
  const settled = (x: Promise<unknown>) =>
    Promise.race([x.then(() => true), new Promise((r) => setTimeout(() => r(false), 30))]);

  // Same file: the second waits until the first run has ended, then must read the first change
  await expect(a('Write', { file_path: path.join(project, 'a.js') })).resolves.toBeNull();
  const waiting = b('Edit', { file_path: path.join(project, 'a.js') });
  await expect(c('Write', { file_path: path.join(project, 'b.js') })).resolves.toBeNull();
  expect(await settled(waiting)).toBe(false);
  fs.writeFileSync(path.join(project, 'a.js'), 'a2');
  chat.runs.locksOf(p).release(1);
  await expect(waiting).resolves.toContain('a.js changed');
  await expect(b('Edit', { file_path: path.join(project, 'a.js') })).resolves.toBeNull();
  // Its own edit is not someone else's change when a shell call then reserves the whole folder
  chat.runs.locksOf(p).release(3);
  fs.writeFileSync(path.join(project, 'a.js'), 'a3');
  await expect(b('Bash', { command: 'python -m unittest' })).resolves.toBeNull();

  // A folder and a file under it, and both ends of a move, overlap
  chat.runs.locksOf(p).release(2);
  await expect(a('Bash', { command: 'mkdir src/lib' })).resolves.toBeNull();
  const under = b('Write', { file_path: path.join(project, 'src', 'lib', 'x.js') });
  const moved = c('Bash', { command: 'mv src/lib/old.js old.js' });
  expect([await settled(under), await settled(moved)]).toEqual([false, false]);
  chat.runs.locksOf(p).release(1);
  await expect(under).resolves.toBeNull();
});
