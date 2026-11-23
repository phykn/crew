import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { Files } from '../../app/ports';
import type { Snapshot } from '../../domain/records';

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

const hashFile = (file: string) => crypto.createHash('sha1').update(fs.readFileSync(file)).digest('hex');

// The project folder and the crew's output folders, read and written on the local disk
export class DiskFiles implements Files {
  snapshot(root: string): Snapshot {
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

  hashes(root: string, paths: string[]): Snapshot {
    const out: Snapshot = {};
    for (const p of paths) {
      const rel = path.relative(root, p).split(path.sep).join('/');
      if (!fs.existsSync(p)) continue;
      if (fs.statSync(p).isDirectory()) {
        for (const [k, v] of Object.entries(this.snapshot(p))) out[rel ? `${rel}/${k}` : k] = v;
      } else out[rel] = hashFile(p);
    }
    return out;
  }

  realPath(p: string) {
    let dir = path.resolve(p);
    const rest: string[] = [];
    while (!fs.existsSync(dir) && path.dirname(dir) !== dir) {
      rest.unshift(path.basename(dir));
      dir = path.dirname(dir);
    }
    return path.join(fs.realpathSync.native(dir), ...rest);
  }

  ensureDir(dir: string) {
    fs.mkdirSync(dir, { recursive: true });
    return dir;
  }

  moveAll(from: string, to: string) {
    const moved = (fs.readdirSync(from, { recursive: true, withFileTypes: true }) as fs.Dirent[])
      .filter((f) => f.isFile())
      .map((f) => path.relative(from, path.join(f.parentPath, f.name)));
    const replaced = moved.filter((f) => fs.existsSync(path.join(to, f)));
    for (const f of moved) {
      fs.mkdirSync(path.dirname(path.join(to, f)), { recursive: true });
      // Copied, then removed: a rename fails when the two folders are on different drives
      fs.copyFileSync(path.join(from, f), path.join(to, f));
      fs.rmSync(path.join(from, f));
    }
    return { moved, replaced };
  }
}
