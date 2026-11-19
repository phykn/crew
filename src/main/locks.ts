import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { snapshot, type Snapshot } from './changes';

type Waiter = { taskId: number; paths: string[]; resolve: () => void };

// Write reservations by real path, one holder per task: overlapping writes go in turn, the rest run side by side
export class Locks {
  held = new Map<number, Set<string>>();
  waiting: Waiter[] = [];
  // What each task last saw of the files it reserves, to catch a change made by someone else while it waited
  seen = new Map<number, Snapshot>();

  constructor(private root: string) {}

  blockers(taskId: number, paths: string[]) {
    return [...this.held].filter(([id, mine]) => id !== taskId && paths.some((p) => [...mine].some((q) => overlaps(p, q)))).map(([id]) => id);
  }

  // Resolves once the task holds every path; 'deadlock' when the holder it would wait for is waiting on this task
  async reserve(taskId: number, paths: string[], onWait: (holders: number[]) => void): Promise<'ok' | 'deadlock'> {
    const blockers = this.blockers(taskId, paths);
    if (blockers.length) {
      const mine = this.held.get(taskId);
      const stuck = mine && this.waiting.some((w) => blockers.includes(w.taskId) && w.paths.some((p) => [...mine].some((q) => overlaps(p, q))));
      if (stuck) return 'deadlock';
      onWait(blockers);
      await new Promise<void>((resolve) => this.waiting.push({ taskId, paths, resolve }));
    }
    const set = this.held.get(taskId) ?? new Set();
    for (const p of paths) set.add(p);
    this.held.set(taskId, set);
    return 'ok';
  }

  // Files under these paths that changed since the task last saw them
  stale(taskId: number, base: Snapshot, paths: string[]) {
    const seen = { ...base, ...this.seen.get(taskId) };
    const now = this.hashes(paths);
    const keys = new Set([...Object.keys(now), ...Object.keys(seen).filter((k) => paths.some((p) => overlaps(path.join(this.root, k), p)))]);
    this.seen.set(taskId, { ...this.seen.get(taskId), ...now });
    return [...keys].filter((k) => seen[k] !== now[k]);
  }

  // Called once the run that wrote has really ended; what it left becomes what the task has seen
  release(taskId: number) {
    const mine = this.held.get(taskId);
    if (!mine) return;
    this.seen.set(taskId, { ...this.seen.get(taskId), ...this.hashes([...mine]) });
    this.held.delete(taskId);
    const still = this.waiting;
    this.waiting = [];
    for (const w of still) {
      if (this.blockers(w.taskId, w.paths).length) this.waiting.push(w);
      else {
        const set = this.held.get(w.taskId) ?? new Set();
        for (const p of w.paths) set.add(p);
        this.held.set(w.taskId, set);
        w.resolve();
      }
    }
  }

  hashes(paths: string[]): Snapshot {
    const out: Snapshot = {};
    for (const p of paths) {
      const rel = path.relative(this.root, p).split(path.sep).join('/');
      if (!fs.existsSync(p)) continue;
      if (fs.statSync(p).isDirectory()) {
        for (const [k, v] of Object.entries(snapshot(p))) out[rel ? `${rel}/${k}` : k] = v;
      } else out[rel] = crypto.createHash('sha1').update(fs.readFileSync(p)).digest('hex');
    }
    return out;
  }
}

function overlaps(a: string, b: string) {
  const inside = (x: string, y: string) => {
    const rel = path.relative(y, x);
    return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
  };
  return inside(a, b) || inside(b, a);
}

// The path as the disk resolves it, so a link or a different spelling still meets the same reservation
export function realPath(p: string) {
  let dir = path.resolve(p);
  const rest: string[] = [];
  while (!fs.existsSync(dir) && path.dirname(dir) !== dir) {
    rest.unshift(path.basename(dir));
    dir = path.dirname(dir);
  }
  return path.join(fs.realpathSync.native(dir), ...rest);
}
