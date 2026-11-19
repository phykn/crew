import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

// Folders no task edits by hand; hashing them would only slow every snapshot down
const SKIP = new Set(['.git', 'node_modules', '.venv', 'venv', '__pycache__', 'dist', 'out', '.vite', '.next', 'build']);
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
        out[path.relative(root, full).split(path.sep).join('/')] = crypto.createHash('sha1').update(fs.readFileSync(full)).digest('hex');
      }
    }
  };
  walk(root);
  return out;
}

// What the task changed since its baseline: added, changed, and removed files
export function changedFiles(base: Snapshot, now: Snapshot) {
  const paths = new Set([...Object.keys(base), ...Object.keys(now)]);
  return [...paths].filter((p) => base[p] !== now[p]).sort();
}
