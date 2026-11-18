import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';

// Each entry runs once, in order; PRAGMA user_version remembers how many have run
const MIGRATIONS = [
  `CREATE TABLE projects (
     id INTEGER PRIMARY KEY, path TEXT NOT NULL UNIQUE, name TEXT NOT NULL, added_at TEXT NOT NULL);
   CREATE TABLE sessions (
     id INTEGER PRIMARY KEY, project_id INTEGER NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
     number INTEGER NOT NULL, created_at TEXT NOT NULL, UNIQUE (project_id, number));
   CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);`,
];

export type Project = { id: number; path: string; name: string };
export type Session = { id: number; projectId: number; number: number; createdAt: string };

export function now() {
  return new Date().toISOString();
}

export class Store {
  db: DatabaseSync;

  constructor(file: string) {
    this.db = new DatabaseSync(file);
    // WAL lets the window read while an agent run writes its record
    this.db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
    this.migrate();
  }

  migrate() {
    const done = (this.db.prepare('PRAGMA user_version').get() as { user_version: number }).user_version;
    MIGRATIONS.slice(done).forEach((sql, i) => {
      this.transact(() => {
        this.db.exec(sql);
        this.db.exec(`PRAGMA user_version = ${done + i + 1}`);
      });
    });
  }

  transact<T>(fn: () => T): T {
    this.db.exec('BEGIN');
    try {
      const out = fn();
      this.db.exec('COMMIT');
      return out;
    } catch (err) {
      this.db.exec('ROLLBACK');
      throw err;
    }
  }

  addProject(dir: string): Project {
    const full = path.resolve(dir);
    this.db
      .prepare('INSERT OR IGNORE INTO projects (path, name, added_at) VALUES (?, ?, ?)')
      .run(full, path.basename(full), now());
    return this.db.prepare('SELECT id, path, name FROM projects WHERE path = ?').get(full) as Project;
  }

  listProjects(): Project[] {
    return this.db.prepare('SELECT id, path, name FROM projects ORDER BY added_at DESC, id DESC').all() as Project[];
  }

  readProject(id: number): Project {
    const row = this.db.prepare('SELECT id, path, name FROM projects WHERE id = ?').get(id) as Project | undefined;
    if (!row) throw new Error(`no project ${id}`);
    return row;
  }

  createSession(projectId: number): Session {
    const { next } = this.db
      .prepare('SELECT COALESCE(MAX(number), 0) + 1 AS next FROM sessions WHERE project_id = ?')
      .get(projectId) as { next: number };
    const { lastInsertRowid } = this.db
      .prepare('INSERT INTO sessions (project_id, number, created_at) VALUES (?, ?, ?)')
      .run(projectId, next, now());
    return this.readSession(Number(lastInsertRowid));
  }

  readSession(id: number): Session {
    const row = this.db
      .prepare('SELECT id, project_id AS projectId, number, created_at AS createdAt FROM sessions WHERE id = ?')
      .get(id) as Session | undefined;
    if (!row) throw new Error(`no session ${id}`);
    return row;
  }

  listSessions(projectId: number): Session[] {
    return this.db
      .prepare(
        'SELECT id, project_id AS projectId, number, created_at AS createdAt FROM sessions WHERE project_id = ? ORDER BY number DESC',
      )
      .all(projectId) as Session[];
  }

  readSetting(key: string): string | null {
    const row = this.db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined;
    return row?.value ?? null;
  }

  writeSetting(key: string, value: string) {
    this.db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value').run(key, value);
  }
}
