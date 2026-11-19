import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from 'vitest';
import { Chat } from '../src/main/chat';
import { snapshot } from '../src/main/changes';
import { CREW, fakeCrew, openScratch } from './support';

test('overlapping writes go in turn and re-read what changed; others run at once', async () => {
  const { store, project, paths } = openScratch({ 'a.js': 'a', 'b.js': 'b', 'old.js': 'o' });
  fs.mkdirSync(path.join(project, 'src'));
  const chat = new Chat(store, async () => fakeCrew({}).sdk, CREW, () => {}, paths);
  const p = store.addProject(project);
  chat.seed(p.id);
  const s = store.createSession(p.id);
  const coder = store.readMember(p.id, 'coder');
  const open = () => {
    const t = store.createTask({ sessionId: s.id, kind: 'code', title: 't', request: 'r', workflow: chat.workflows[0] });
    store.writeBaseline(t.id, snapshot(project));
    const policy = chat.policy(coder, p, `task-${t.id}`);
    return (tool: string, input: Record<string, unknown>) => chat.reserve(p, t.id, policy, tool, input);
  };
  const [a, b, c] = [open(), open(), open()];
  const settled = (x: Promise<unknown>) => Promise.race([x.then(() => true), new Promise((r) => setTimeout(() => r(false), 30))]);

  // Same file: the second waits until the first run has ended, then must read the first change
  await expect(a('Write', { file_path: path.join(project, 'a.js') })).resolves.toBeNull();
  const waiting = b('Edit', { file_path: path.join(project, 'a.js') });
  await expect(c('Write', { file_path: path.join(project, 'b.js') })).resolves.toBeNull();
  expect(await settled(waiting)).toBe(false);
  fs.writeFileSync(path.join(project, 'a.js'), 'a2');
  chat.locksOf(p).release(1);
  await expect(waiting).resolves.toContain('a.js changed');
  await expect(b('Edit', { file_path: path.join(project, 'a.js') })).resolves.toBeNull();

  // A folder and a file under it, and both ends of a move, overlap
  chat.locksOf(p).release(2);
  chat.locksOf(p).release(3);
  await expect(a('Bash', { command: 'mkdir src/lib' })).resolves.toBeNull();
  const under = b('Write', { file_path: path.join(project, 'src', 'lib', 'x.js') });
  const moved = c('Bash', { command: 'mv src/lib/old.js old.js' });
  expect([await settled(under), await settled(moved)]).toEqual([false, false]);
  chat.locksOf(p).release(1);
  await expect(under).resolves.toBeNull();
});
