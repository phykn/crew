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
  `CREATE TABLE questions (
     id INTEGER PRIMARY KEY, session_id INTEGER NOT NULL REFERENCES sessions (id) ON DELETE CASCADE, task_id INTEGER,
     kind TEXT NOT NULL CHECK (kind IN ('approval', 'choice')), prompt TEXT NOT NULL, options TEXT NOT NULL,
     payload TEXT NOT NULL DEFAULT '{}', answer TEXT, created_at TEXT NOT NULL, answered_at TEXT);
   ALTER TABLE messages ADD COLUMN question_id INTEGER REFERENCES questions (id);
   CREATE TABLE events (
     id INTEGER PRIMARY KEY, session_id INTEGER NOT NULL REFERENCES sessions (id) ON DELETE CASCADE, task_id INTEGER,
     member_id INTEGER REFERENCES members (id), kind TEXT NOT NULL, text TEXT NOT NULL, detail TEXT, at TEXT NOT NULL);`,
  `ALTER TABLE members ADD COLUMN config TEXT NOT NULL DEFAULT '{}';
   CREATE TABLE permission_changes (
     id INTEGER PRIMARY KEY, member_id INTEGER NOT NULL REFERENCES members (id) ON DELETE CASCADE,
     change TEXT NOT NULL, at TEXT NOT NULL);`,
];

export type Project = { id: number; path: string; name: string };
export type Session = { id: number; projectId: number; number: number; createdAt: string };
export type Member = {
  id: number;
  projectId: number;
  key: string;
  nickname: string;
  model: string;
  status: 'hired' | 'unhired';
  config: Record<string, unknown>;
};
type MemberRow = Omit<Member, 'config'> & { config: string };
const MEMBER = 'SELECT id, project_id AS projectId, key, nickname, model, status, config FROM members';
const toMember = (r: MemberRow): Member => ({ ...r, config: JSON.parse(r.config) });
export type AgentSession = { id: number; sessionId: number; memberId: number; claudeId: string | null };
export type Question = {
  id: number;
  sessionId: number;
  taskId: number | null;
  kind: 'approval' | 'choice';
  prompt: string;
  options: string[];
  payload: Record<string, unknown>;
  answer: string | null;
};
export type Message = {
  id: number;
  sessionId: number;
  author: 'user' | 'secretary';
  text: string;
  createdAt: string;
  question: Question | null;
};
export type Event = {
  id: number;
  sessionId: number;
  taskId: number | null;
  memberId: number | null;
  kind: string;
  text: string;
  detail: string | null;
  at: string;
};
type QuestionRow = Omit<Question, 'options' | 'payload'> & { options: string; payload: string };
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
    return (this.db.prepare(`${MEMBER} WHERE project_id = ? ORDER BY id`).all(projectId) as MemberRow[]).map(toMember);
  }

  readMember(projectId: number, key: string): Member {
    const row = this.db.prepare(`${MEMBER} WHERE project_id = ? AND key = ?`).get(projectId, key) as MemberRow | undefined;
    if (!row) throw new Error(`no member ${key} in project ${projectId}`);
    return toMember(row);
  }

  updateMember(id: number, change: { nickname?: string; model?: string; status?: Member['status'] }) {
    if (change.nickname !== undefined) this.db.prepare('UPDATE members SET nickname = ? WHERE id = ?').run(change.nickname, id);
    if (change.model !== undefined) this.db.prepare('UPDATE members SET model = ? WHERE id = ?').run(change.model, id);
    if (change.status !== undefined) this.db.prepare('UPDATE members SET status = ? WHERE id = ?').run(change.status, id);
  }

  readMemberById(id: number): Member {
    const row = this.db.prepare(`${MEMBER} WHERE id = ?`).get(id) as MemberRow | undefined;
    if (!row) throw new Error(`no member ${id}`);
    return toMember(row);
  }

  // The config and the record of what changed land together, so no change goes unrecorded
  writeConfig(id: number, config: Record<string, unknown>, change: string) {
    this.transact(() => {
      this.db.prepare('UPDATE members SET config = ? WHERE id = ?').run(JSON.stringify(config), id);
      this.db.prepare('INSERT INTO permission_changes (member_id, change, at) VALUES (?, ?, ?)').run(id, change, now());
    });
  }

  listPermissionChanges(memberId: number): { change: string; at: string }[] {
    return this.db.prepare('SELECT change, at FROM permission_changes WHERE member_id = ? ORDER BY id').all(memberId) as {
      change: string;
      at: string;
    }[];
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

  addMessage(sessionId: number, author: Message['author'], text: string, questionId: number | null = null) {
    this.db
      .prepare('INSERT INTO messages (session_id, author, text, created_at, question_id) VALUES (?, ?, ?, ?, ?)')
      .run(sessionId, author, text, now(), questionId);
  }

  listMessages(sessionId: number): Message[] {
    const rows = this.db
      .prepare(
        'SELECT id, session_id AS sessionId, author, text, created_at AS createdAt, question_id AS questionId FROM messages WHERE session_id = ? ORDER BY id',
      )
      .all(sessionId) as (Omit<Message, 'question'> & { questionId: number | null })[];
    return rows.map(({ questionId, ...m }) => ({ ...m, question: questionId ? this.readQuestion(questionId) : null }));
  }

  addQuestion(q: Omit<Question, 'id' | 'answer'>): number {
    const { lastInsertRowid } = this.db
      .prepare('INSERT INTO questions (session_id, task_id, kind, prompt, options, payload, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(q.sessionId, q.taskId, q.kind, q.prompt, JSON.stringify(q.options), JSON.stringify(q.payload), now());
    return Number(lastInsertRowid);
  }

  readQuestion(id: number): Question {
    const row = this.db
      .prepare(
        'SELECT id, session_id AS sessionId, task_id AS taskId, kind, prompt, options, payload, answer FROM questions WHERE id = ?',
      )
      .get(id) as QuestionRow | undefined;
    if (!row) throw new Error(`no question ${id}`);
    return { ...row, options: JSON.parse(row.options), payload: JSON.parse(row.payload) };
  }

  answerQuestion(id: number, answer: string) {
    this.db.prepare('UPDATE questions SET answer = ?, answered_at = ? WHERE id = ? AND answer IS NULL').run(answer, now(), id);
  }

  // An approval counts only inside the task (or, before tasks, the session) it was given in, and only until the member's permissions change
  isGranted(sessionId: number, taskId: number | null, memberId: number, tool: string) {
    const row = this.db
      .prepare(
        `SELECT 1 FROM questions q WHERE session_id = ? AND task_id IS ? AND kind = 'approval' AND answer = '허용'
         AND json_extract(payload, '$.memberId') = ? AND json_extract(payload, '$.tool') = ?
         AND answered_at > COALESCE((SELECT MAX(at) FROM permission_changes WHERE member_id = ?), '')`,
      )
      .get(sessionId, taskId, memberId, tool, memberId);
    return !!row;
  }

  addEvent(e: Omit<Event, 'id' | 'at'>) {
    this.db
      .prepare('INSERT INTO events (session_id, task_id, member_id, kind, text, detail, at) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(e.sessionId, e.taskId, e.memberId, e.kind, e.text, e.detail, now());
  }

  listEvents(sessionId: number): Event[] {
    return this.db
      .prepare(
        'SELECT id, session_id AS sessionId, task_id AS taskId, member_id AS memberId, kind, text, detail, at FROM events WHERE session_id = ? ORDER BY id',
      )
      .all(sessionId) as Event[];
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
