import fs from 'node:fs';
import path from 'node:path';
import { hashFile, snapshot, type Snapshot } from '../tasks/changes';

type Waiter = { taskId: number; paths: string[]; resolve: (got: 'ok' | 'cancelled') => void };

// Write reservations by real path, one holder per task: overlapping writes go in turn, the rest run side by side
export class Locks {
  held = new Map<number, Set<string>>();
  waiting: Waiter[] = [];
  // What each task last saw of the files it reserves, to catch a change made by someone else while it waited
  seen = new Map<number, Snapshot>();
  // Every path a task has reserved, kept after release: its writes, told apart from changes by anyone else
  touched = new Map<number, Set<string>>();

  constructor(private root: string) {}

  blockers(taskId: number, paths: string[]) {
    return [...this.held]
      .filter(([id, mine]) => id !== taskId && paths.some((p) => [...mine].some((q) => overlaps(p, q))))
      .map(([id]) => id);
  }

  // Resolves once the task holds every path; 'deadlock' when the holder it would wait for is waiting on this task, 'cancelled' when the task stopped while waiting
  async reserve(
    taskId: number,
    paths: string[],
    onWait: (holders: number[]) => void,
  ): Promise<'ok' | 'deadlock' | 'cancelled'> {
    const blockers = this.blockers(taskId, paths);
    if (blockers.length) {
      const mine = this.held.get(taskId);
      const stuck =
        mine &&
        this.waiting.some(
          (w) => blockers.includes(w.taskId) && w.paths.some((p) => [...mine].some((q) => overlaps(p, q))),
        );
      if (stuck) return 'deadlock';
      onWait(blockers);
      // Whoever resolves the wait has already taken the paths for it, or dropped it
      return new Promise((resolve) => this.waiting.push({ taskId, paths, resolve }));
    }
    this.take(taskId, paths);
    return 'ok';
  }

  // A stopped task's waits end unanswered, so a path freed later is never handed to a run that is gone
  cancel(taskId: number) {
    for (const w of this.waiting.filter((w) => w.taskId === taskId)) w.resolve('cancelled');
    this.waiting = this.waiting.filter((w) => w.taskId !== taskId);
  }

  take(taskId: number, paths: string[]) {
    for (const map of [this.held, this.touched]) map.set(taskId, new Set([...(map.get(taskId) ?? []), ...paths]));
  }

  // Whether a project file, relative to the root, lies under a path the task reserved
  wrote(taskId: number, file: string) {
    return [...(this.touched.get(taskId) ?? [])].some((p) => inside(path.join(this.root, file), p));
  }

  // Files under these paths that changed since the task last saw them; files under what it already holds are its own changes
  stale(taskId: number, base: Snapshot, paths: string[], own: string[]) {
    const seen = { ...base, ...this.seen.get(taskId) };
    const now = this.hashes(paths);
    const keys = new Set([
      ...Object.keys(now),
      ...Object.keys(seen).filter((k) => paths.some((p) => overlaps(path.join(this.root, k), p))),
    ]);
    this.seen.set(taskId, { ...this.seen.get(taskId), ...now });
    return [...keys].filter((k) => seen[k] !== now[k] && !own.some((o) => overlaps(path.join(this.root, k), o)));
  }

  // Called once the task's last run has really ended; what it left becomes what the task has seen
  release(taskId: number) {
    this.cancel(taskId);
    const mine = this.held.get(taskId);
    if (!mine) return;
    this.seen.set(taskId, { ...this.seen.get(taskId), ...this.hashes([...mine]) });
    this.held.delete(taskId);
    const still = this.waiting;
    this.waiting = [];
    for (const w of still) {
      if (this.blockers(w.taskId, w.paths).length) this.waiting.push(w);
      else {
        this.take(w.taskId, w.paths);
        w.resolve('ok');
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
      } else out[rel] = hashFile(p);
    }
    return out;
  }
}

function overlaps(a: string, b: string) {
  return inside(a, b) || inside(b, a);
}

export function inside(file: string, dir: string) {
  const rel = path.relative(path.resolve(dir), path.resolve(file));
  // A name that merely starts with dots, such as ..env, is still inside
  return rel === '' || (rel !== '..' && !rel.startsWith(`..${path.sep}`) && !path.isAbsolute(rel));
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
