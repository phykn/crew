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
  `CREATE TABLE members (
     id INTEGER PRIMARY KEY, project_id INTEGER NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
     key TEXT NOT NULL, nickname TEXT NOT NULL, model TEXT NOT NULL, UNIQUE (project_id, key));
   CREATE TABLE agent_sessions (
     id INTEGER PRIMARY KEY, session_id INTEGER NOT NULL REFERENCES sessions (id) ON DELETE CASCADE,
     member_id INTEGER NOT NULL REFERENCES members (id) ON DELETE CASCADE, claude_id TEXT, created_at TEXT NOT NULL,
     UNIQUE (session_id, member_id));
   CREATE TABLE messages (
     id INTEGER PRIMARY KEY, session_id INTEGER NOT NULL REFERENCES sessions (id) ON DELETE CASCADE,
     author TEXT NOT NULL CHECK (author IN ('user', 'secretary')), text TEXT NOT NULL, created_at TEXT NOT NULL);
   CREATE TABLE runs (
     id INTEGER PRIMARY KEY, agent_session_id INTEGER NOT NULL REFERENCES agent_sessions (id) ON DELETE CASCADE,
     model TEXT NOT NULL, started_at TEXT NOT NULL, ended_at TEXT,
     status TEXT NOT NULL CHECK (status IN ('running', 'done', 'failed', 'stopped', 'limit')),
     turns INTEGER NOT NULL DEFAULT 0, input_tokens INTEGER NOT NULL DEFAULT 0, output_tokens INTEGER NOT NULL DEFAULT 0,
     cost_usd REAL NOT NULL DEFAULT 0, error TEXT);`,
  `ALTER TABLE members ADD COLUMN status TEXT NOT NULL DEFAULT 'hired' CHECK (status IN ('hired', 'unhired'));`,
];

export type Project = { id: number; path: string; name: string };
export type Session = { id: number; projectId: number; number: number; createdAt: string };
export type Member = { id: number; projectId: number; key: string; nickname: string; model: string; status: 'hired' | 'unhired' };
export type AgentSession = { id: number; sessionId: number; memberId: number; claudeId: string | null };
export type Message = { id: number; sessionId: number; author: 'user' | 'secretary'; text: string; createdAt: string };
export type Run = {
  id: number;
  agentSessionId: number;
  model: string;
  status: string;
  turns: number;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  error: string | null;
};
type RunResult = { status: string; usage: { turns: number; inputTokens: number; outputTokens: number; costUsd: number }; error?: string };

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

  seedMembers(projectId: number, defs: { key: string; nickname: string; model: string }[]) {
    const insert = this.db.prepare('INSERT OR IGNORE INTO members (project_id, key, nickname, model) VALUES (?, ?, ?, ?)');
    for (const d of defs) insert.run(projectId, d.key, d.nickname, d.model);
  }

  listMembers(projectId: number): Member[] {
    return this.db
      .prepare('SELECT id, project_id AS projectId, key, nickname, model, status FROM members WHERE project_id = ? ORDER BY id')
      .all(projectId) as Member[];
  }

  readMember(projectId: number, key: string): Member {
    const row = this.db
      .prepare('SELECT id, project_id AS projectId, key, nickname, model, status FROM members WHERE project_id = ? AND key = ?')
      .get(projectId, key) as Member | undefined;
    if (!row) throw new Error(`no member ${key} in project ${projectId}`);
    return row;
  }

  updateMember(id: number, change: { nickname?: string; model?: string; status?: Member['status'] }) {
    if (change.nickname !== undefined) this.db.prepare('UPDATE members SET nickname = ? WHERE id = ?').run(change.nickname, id);
    if (change.model !== undefined) this.db.prepare('UPDATE members SET model = ? WHERE id = ?').run(change.model, id);
    if (change.status !== undefined) this.db.prepare('UPDATE members SET status = ? WHERE id = ?').run(change.status, id);
  }

  readMemberById(id: number): Member {
    const row = this.db
      .prepare('SELECT id, project_id AS projectId, key, nickname, model, status FROM members WHERE id = ?')
      .get(id) as Member | undefined;
    if (!row) throw new Error(`no member ${id}`);
    return row;
  }

  openAgentSession(sessionId: number, memberId: number): AgentSession {
    this.db
      .prepare('INSERT OR IGNORE INTO agent_sessions (session_id, member_id, created_at) VALUES (?, ?, ?)')
      .run(sessionId, memberId, now());
    return this.db
      .prepare(
        'SELECT id, session_id AS sessionId, member_id AS memberId, claude_id AS claudeId FROM agent_sessions WHERE session_id = ? AND member_id = ?',
      )
      .get(sessionId, memberId) as AgentSession;
  }

  writeClaudeId(agentSessionId: number, claudeId: string) {
    this.db.prepare('UPDATE agent_sessions SET claude_id = ? WHERE id = ?').run(claudeId, agentSessionId);
  }

  addMessage(sessionId: number, author: Message['author'], text: string): Message {
    const { lastInsertRowid } = this.db
      .prepare('INSERT INTO messages (session_id, author, text, created_at) VALUES (?, ?, ?, ?)')
      .run(sessionId, author, text, now());
    return { id: Number(lastInsertRowid), sessionId, author, text, createdAt: now() };
  }

  listMessages(sessionId: number): Message[] {
    return this.db
      .prepare('SELECT id, session_id AS sessionId, author, text, created_at AS createdAt FROM messages WHERE session_id = ? ORDER BY id')
      .all(sessionId) as Message[];
  }

  startRun(agentSessionId: number, model: string): number {
    const { lastInsertRowid } = this.db
      .prepare("INSERT INTO runs (agent_session_id, model, started_at, status) VALUES (?, ?, ?, 'running')")
      .run(agentSessionId, model, now());
    return Number(lastInsertRowid);
  }

  finishRun(id: number, out: RunResult) {
    const u = out.usage;
    this.db
      .prepare(
        'UPDATE runs SET ended_at = ?, status = ?, turns = ?, input_tokens = ?, output_tokens = ?, cost_usd = ?, error = ? WHERE id = ?',
      )
      .run(now(), out.status, u.turns, u.inputTokens, u.outputTokens, u.costUsd, out.error ?? null, id);
  }

  listRuns(sessionId: number): Run[] {
    return this.db
      .prepare(
        `SELECT r.id, r.agent_session_id AS agentSessionId, r.model, r.status, r.turns, r.input_tokens AS inputTokens,
                r.output_tokens AS outputTokens, r.cost_usd AS costUsd, r.error
         FROM runs r JOIN agent_sessions a ON a.id = r.agent_session_id WHERE a.session_id = ? ORDER BY r.id`,
      )
      .all(sessionId) as Run[];
  }

  readSetting(key: string): string | null {
    const row = this.db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined;
    return row?.value ?? null;
  }

  writeSetting(key: string, value: string) {
    this.db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value').run(key, value);
  }
}
