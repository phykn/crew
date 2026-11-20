import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// Folders no task edits by hand; hashing them would only slow every snapshot down
const SKIP = new Set([
  '.git',
  'node_modules',
  '.venv',
  'venv',
  '__pycache__',
  'dist',
  'out',
  '.vite',
  '.next',
  'build',
]);
const MAX_BYTES = 2_000_000;

export type Snapshot = Record<string, string>;

// Every file's content hash, so changes made before the task and by it can be told apart with or without git
export function snapshot(root: string): Snapshot {
  const out: Snapshot = {};
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (SKIP.has(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile() && fs.statSync(full).size <= MAX_BYTES) {
        out[path.relative(root, full).split(path.sep).join('/')] = hashFile(full);
      }
    }
  };
  walk(root);
  return out;
}

export function hashFile(file: string) {
  return crypto.createHash('sha1').update(fs.readFileSync(file)).digest('hex');
}

// What the task changed since its baseline: added, changed, and removed files
export function changedFiles(base: Snapshot, now: Snapshot) {
  const paths = new Set([...Object.keys(base), ...Object.keys(now)]);
  return [...paths].filter((p) => base[p] !== now[p]).sort();
}

// A task's own commits live under its own refs, so the user's branch, HEAD, index, and hooks never see them
export const taskRef = (taskId: number, name: string) => `refs/crew/task-${taskId}/${name}`;
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
export async function mark(dir: string, ref: string) {
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
export async function taskRefs(dir: string, taskId: number) {
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

export type DiffLine = { kind: 'add' | 'del' | 'same' | 'hunk'; text: string };
export type FileDiff = {
  file: string;
  status: 'added' | 'deleted' | 'changed';
  binary: boolean;
  cut: boolean;
  lines: DiffLine[];
};
// Past this a file's diff is cut, so one huge generated file cannot freeze the window
const MAX_LINES = 3000;

// The changes between two commits in these files, relative to the project folder
export async function diff(dir: string, from: string, to: string, files: string[]): Promise<FileDiff[]> {
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

// Drops the commits kept for these tasks, once the tasks themselves are gone
export async function forget(dir: string, taskIds: number[]) {
  for (const id of taskIds)
    for (const name of await taskRefs(dir, id)) await git(dir, ['update-ref', '-d', taskRef(id, name)]).catch(() => '');
}
