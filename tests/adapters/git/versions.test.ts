import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { expect, test, vi } from 'vitest';
import { handback, openChat, reply, type Turn } from '../../support';

const git = (dir: string, ...args: string[]) =>
  execFileSync('git', args, {
    cwd: dir,
    encoding: 'utf8',
    env: {
      ...process.env,
      GIT_AUTHOR_NAME: 'u',
      GIT_AUTHOR_EMAIL: 'u@x',
      GIT_COMMITTER_NAME: 'u',
      GIT_COMMITTER_EMAIL: 'u@x',
    },
  }).trim();

// 코드 작성 writes search.js through the guard; the user edits notes.md in the meantime
const crew = (project: () => string) => {
  const edit: Turn = async (prompt, options) => {
    const file = path.join(project(), 'search.js');
    await options.canUseTool!('Write', { file_path: file, content: '' }, {
      signal: new AbortController().signal,
    } as never);
    fs.writeFileSync(file, 'line 1\nline 2 fixed\n');
    fs.writeFileSync(path.join(project(), 'notes.md'), 'the user, meanwhile\n');
    return handback('c', { summary: '수정' })(prompt, options);
  };
  const pass = handback('x', { summary: '통과', verdict: 'pass', checks: ['ok'] });
  return { 통역: [reply('보고')], '코드 작성': [edit], '코드 검토': [pass], 시험: [pass] };
};

test(
  "in a git repository each version's diff shows the task's own files, and the user's branch, index, and folder are left alone",
  { timeout: 20_000 },
  async () => {
    let folder = '';
    const { store, chat, s, project } = openChat(
      crew(() => folder),
      {
        files: { 'search.js': 'line 1\nline 2\n', 'notes.md': 'n\n', 'staged.txt': 'a\n' },
      },
    );
    folder = project;
    git(project, 'init', '-q', '-b', 'main');
    git(project, 'add', '-A');
    git(project, 'commit', '-q', '-m', 'start');
    // Uncommitted work and a staged file of the user's, from before the task
    fs.writeFileSync(path.join(project, 'search.js'), 'line 1\nline 2\n');
    fs.writeFileSync(path.join(project, 'staged.txt'), 'b\n');
    git(project, 'add', 'staged.txt');
    // HEAD, the branch, and what is staged, read from one call; the folder itself is meant to change
    const state = () =>
      git(project, 'status', '--porcelain=v2', '--branch', '--untracked-files=no')
        .split('\n')
        .filter((l) => /^# branch\.(oid|head)/.test(l) || /^1 [^.]/.test(l))
        .map((l) => (l.startsWith('1 ') ? `staged ${l.split(' ').at(-1)}` : l));
    const before = state();

    const task = chat.tasks.start(s.id, 'code', '검색', '검색 고쳐줘', undefined, true);
    await vi.waitFor(() => expect(store.readTask(task.id).status).toBe('done'), { timeout: 10_000 });

    const versions = await chat.tasks.versions(task.id);
    expect(versions.map((v) => [v.label, v.files])).toEqual([['v1', ['search.js']]]);
    const change = (await chat.tasks.change(task.id, versions[0].id, 'search.js'))!;
    expect([change.label, change.diff.file, change.diff.status]).toEqual(['v1', 'search.js', 'changed']);
    expect(change.diff.lines.filter((l) => l.kind !== 'same' && l.kind !== 'hunk')).toEqual([
      { kind: 'del', text: 'line 2' },
      { kind: 'add', text: 'line 2 fixed' },
    ]);
    // The user's own edit is not the task's, so it has no diff to offer
    expect(await chat.tasks.change(task.id, versions[0].id, 'notes.md')).toBeNull();
    // The log line of the step that made it names the version, which is how the window offers the diff
    const made = store.listEvents(s.id).find((e) => e.text.startsWith('코드 작성: 코드 작성 완료'))!;
    expect(JSON.parse(made.detail!).version).toBe(versions[0].id);

    expect(state()).toEqual(before);

    // Deleting the session lets go of the commits kept for its tasks
    chat.deleteSession(s.id);
    await vi.waitFor(() => expect(git(project, 'for-each-ref', 'refs/crew/')).toBe(''), { timeout: 5000 });
  },
);

test('outside a git repository the task runs as before and offers no diff', async () => {
  let folder = '';
  const { store, chat, s, project } = openChat(
    crew(() => folder),
    { files: { 'search.js': 'line 1\nline 2\n' } },
  );
  folder = project;
  const task = chat.tasks.start(s.id, 'code', '검색', '검색 고쳐줘', undefined, true);
  await vi.waitFor(() => expect(store.readTask(task.id).status).toBe('done'), { timeout: 10_000 });
  expect(store.latestVersion(task.id)!.files).toEqual(['search.js']);
  expect(await chat.tasks.versions(task.id)).toEqual([]);
  const made = store.listEvents(s.id).find((e) => e.text.startsWith('코드 작성: 코드 작성 완료'))!;
  expect(JSON.parse(made.detail!).version).toBeUndefined();
});
