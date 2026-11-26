import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { Versions } from '../../app/ports';
import type { FileDiff } from '../../domain/records';

// A task's own commits live under its own refs, so the user's branch, HEAD, index, and hooks never see them
const taskRef = (taskId: number, name: string) => `refs/crew/task-${taskId}/${name}`;
const IDENTITY = {
  GIT_AUTHOR_NAME: 'crew',
  GIT_AUTHOR_EMAIL: 'crew@localhost',
  GIT_COMMITTER_NAME: 'crew',
  GIT_COMMITTER_EMAIL: 'crew@localhost',
};

const run = promisify(execFile);

// Never blocks the main process: each call is a process, which takes a noticeable moment on Windows
async function git(dir: string, args: string[], env: Record<string, string> = {}) {
  const { stdout } = await run('git', args, {
    cwd: dir,
    env: { ...process.env, ...env },
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    windowsHide: true,
  });
  return stdout;
}

// Commits the project folder as it is now, uncommitted work included, under ref; false when the folder is not in a git repository
async function mark(dir: string, ref: string) {
  try {
    const [inside, indexPath] = (await git(dir, ['rev-parse', '--is-inside-work-tree', '--git-path', 'index']))
      .trim()
      .split(/\r?\n/);
    if (inside !== 'true') return false;
    // A copy of the user's index keeps their staged files untouched and lets git skip rehashing unchanged files
    const index = path.join(os.tmpdir(), `crew-index-${process.pid}-${crypto.randomUUID()}`);
    const real = path.resolve(dir, indexPath);
    if (fs.existsSync(real)) fs.copyFileSync(real, index);
    try {
      const env = { ...IDENTITY, GIT_INDEX_FILE: index };
      await git(dir, ['add', '-A', '--', '.'], env);
      const tree = (await git(dir, ['write-tree'], env)).trim();
      const commit = (await git(dir, ['commit-tree', tree, '-m', ref], env)).trim();
      await git(dir, ['update-ref', ref, commit]);
    } finally {
      fs.rmSync(index, { force: true });
    }
    return true;
  } catch {
    return false;
  }
}

// The refs kept for one task, by their last part (base, version-N); none outside a repository
async function taskRefs(dir: string, taskId: number) {
  try {
    const out = await git(dir, ['for-each-ref', '--format=%(refname)', `refs/crew/task-${taskId}/`]);
    return out
      .split(/\r?\n/)
      .filter(Boolean)
      .map((r) => r.split('/').at(-1)!);
  } catch {
    return [];
  }
}

// Past this a file's diff is cut, so one huge generated file cannot freeze the window
const MAX_LINES = 3000;

// The changes between two commits in these files, relative to the project folder
async function diff(dir: string, from: string, to: string, files: string[]): Promise<FileDiff[]> {
  if (!files.length) return [];
  const text = await git(dir, [
    '-c',
    'core.quotePath=false',
    'diff',
    '--no-color',
    '--no-ext-diff',
    '--no-renames',
    '--relative',
    '-U3',
    from,
    to,
    '--',
    ...files,
  ]);
  const out: FileDiff[] = [];
  let cur: FileDiff | null = null;
  for (const line of text.split('\n')) {
    if (line.startsWith('diff --git ')) {
      cur = {
        file: line.replace(/^diff --git a\/(.*) b\/.*$/, '$1'),
        status: 'changed',
        binary: false,
        cut: false,
        lines: [],
      };
      out.push(cur);
    } else if (!cur) continue;
    else if (line.startsWith('new file mode')) cur.status = 'added';
    else if (line.startsWith('deleted file mode')) cur.status = 'deleted';
    else if (line.startsWith('Binary files')) cur.binary = true;
    else if (line.startsWith('+++ ') || line.startsWith('--- ') || line.startsWith('index ')) continue;
    else if (cur.lines.length >= MAX_LINES) cur.cut = true;
    else if (line.startsWith('@@')) cur.lines.push({ kind: 'hunk', text: line });
    else if (line.startsWith('+')) cur.lines.push({ kind: 'add', text: line.slice(1) });
    else if (line.startsWith('-')) cur.lines.push({ kind: 'del', text: line.slice(1) });
    else if (line.startsWith(' ')) cur.lines.push({ kind: 'same', text: line.slice(1) });
  }
  return out;
}

// Each task's versions as commits in the project's own repository, kept under refs the user's branch never sees
export class GitVersions implements Versions {
  mark(dir: string, taskId: number, name: string) {
    return mark(dir, taskRef(taskId, name));
  }

  kept(dir: string, taskId: number) {
    return taskRefs(dir, taskId);
  }

  diff(dir: string, taskId: number, from: string, to: string, files: string[]) {
    return diff(dir, taskRef(taskId, from), taskRef(taskId, to), files);
  }

  // The commit the project's branch stands on; null outside a repository or before its first commit
  async head(dir: string) {
    try {
      return (await git(dir, ['rev-parse', 'HEAD'])).trim() || null;
    } catch {
      return null;
    }
  }

  // Drops the commits kept for these tasks, once the tasks themselves are gone
  async forget(dir: string, taskIds: number[]) {
    for (const id of taskIds)
      for (const name of await taskRefs(dir, id))
        await git(dir, ['update-ref', '-d', taskRef(id, name)]).catch(() => '');
  }
}
