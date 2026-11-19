import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import type { Workflow } from './workflow';

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
  `CREATE TABLE tasks (
     id INTEGER PRIMARY KEY, session_id INTEGER NOT NULL REFERENCES sessions (id) ON DELETE CASCADE,
     kind TEXT NOT NULL, title TEXT NOT NULL, request TEXT NOT NULL, workflow TEXT NOT NULL,
     status TEXT NOT NULL, stage TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
   CREATE TABLE step_runs (
     id INTEGER PRIMARY KEY, task_id INTEGER NOT NULL REFERENCES tasks (id) ON DELETE CASCADE, step_id TEXT NOT NULL,
     member_id INTEGER NOT NULL REFERENCES members (id), status TEXT NOT NULL CHECK (status IN ('running', 'done', 'failed', 'stopped')),
     verdict TEXT CHECK (verdict IN ('pass', 'rework')), handback TEXT, error TEXT, started_at TEXT NOT NULL, ended_at TEXT);
   ALTER TABLE runs ADD COLUMN task_id INTEGER REFERENCES tasks (id) ON DELETE SET NULL;`,
  `CREATE TABLE requests (
     id INTEGER PRIMARY KEY, task_id INTEGER NOT NULL REFERENCES tasks (id) ON DELETE CASCADE, step_id TEXT NOT NULL,
     from_member INTEGER NOT NULL REFERENCES members (id), to_role TEXT NOT NULL, expected TEXT NOT NULL,
     thread TEXT NOT NULL DEFAULT '[]', created_at TEXT NOT NULL);`,
  `ALTER TABLE tasks ADD COLUMN baseline TEXT NOT NULL DEFAULT '{}';
   CREATE TABLE versions (
     id INTEGER PRIMARY KEY, task_id INTEGER NOT NULL REFERENCES tasks (id) ON DELETE CASCADE,
     files TEXT NOT NULL, snapshot TEXT NOT NULL, created_at TEXT NOT NULL);
   ALTER TABLE step_runs ADD COLUMN version_id INTEGER REFERENCES versions (id);`,
  `ALTER TABLE agent_sessions ADD COLUMN model TEXT;`,
  `ALTER TABLE members ADD COLUMN definition TEXT;
   ALTER TABLE members ADD COLUMN temp INTEGER NOT NULL DEFAULT 0;
   ALTER TABLE members ADD COLUMN leaving INTEGER NOT NULL DEFAULT 0;
   CREATE TABLE assignees (
     task_id INTEGER NOT NULL REFERENCES tasks (id) ON DELETE CASCADE, step_id TEXT NOT NULL,
     member_id INTEGER NOT NULL REFERENCES members (id), PRIMARY KEY (task_id, step_id));`,
  `CREATE TABLE workflow_versions (
     id INTEGER PRIMARY KEY, project_id INTEGER NOT NULL REFERENCES projects (id) ON DELETE CASCADE, kind TEXT NOT NULL,
     version INTEGER NOT NULL, rules TEXT NOT NULL, layout TEXT, author TEXT NOT NULL, created_at TEXT NOT NULL,
     UNIQUE (project_id, kind, version));`,
  `CREATE TABLE wiki_docs (
     id INTEGER PRIMARY KEY, project_id INTEGER NOT NULL REFERENCES projects (id) ON DELETE CASCADE, title TEXT NOT NULL,
     body TEXT NOT NULL, workflow_kind TEXT, workflow_version INTEGER, deleted INTEGER NOT NULL DEFAULT 0, updated_at TEXT NOT NULL);
   CREATE TABLE wiki_changes (
     id INTEGER PRIMARY KEY, doc_id INTEGER NOT NULL REFERENCES wiki_docs (id) ON DELETE CASCADE,
     project_id INTEGER NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
     kind TEXT NOT NULL CHECK (kind IN ('create', 'edit', 'delete')), title TEXT NOT NULL, author TEXT NOT NULL,
     member_id INTEGER REFERENCES members (id) ON DELETE SET NULL, task_id INTEGER REFERENCES tasks (id) ON DELETE SET NULL,
     files TEXT NOT NULL, before TEXT NOT NULL, after TEXT NOT NULL, at TEXT NOT NULL);
   CREATE TABLE memories (
     id INTEGER PRIMARY KEY, project_id INTEGER NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
     member_id INTEGER NOT NULL REFERENCES members (id) ON DELETE CASCADE, text TEXT NOT NULL,
     task_id INTEGER REFERENCES tasks (id) ON DELETE SET NULL, session_id INTEGER REFERENCES sessions (id) ON DELETE SET NULL, at TEXT NOT NULL);`,
  `ALTER TABLE sessions ADD COLUMN title TEXT;`,
  `UPDATE members SET config = json_set(config, '$.skills',
     json((SELECT json_group_array(CASE value WHEN 'tools' THEN 'check' ELSE value END) FROM json_each(members.config, '$.skills'))))
   WHERE json_type(config, '$.skills') = 'array';`,
];

export type Project = { id: number; path: string; name: string };
// A session is named after what the user first asked in it, so sessions can be told apart
export type Session = { id: number; projectId: number; number: number; createdAt: string; title: string | null };
export type Member = {
  id: number;
  projectId: number;
  key: string;
  nickname: string;
  model: string;
  status: 'hired' | 'unhired';
  config: Record<string, unknown>;
  // A member 인사 designed is defined here instead of in crew/agents
  definition: string | null;
  // A temp (알바) is gone once let go, instead of staying as 미고용
  temp: boolean;
  // Let go while at work: it finishes or hands back its step, then leaves
  leaving: boolean;
};
type MemberRow = Omit<Member, 'config' | 'temp' | 'leaving'> & { config: string; temp: number; leaving: number };
const MEMBER =
  'SELECT id, project_id AS projectId, key, nickname, model, status, config, definition, temp, leaving FROM members';
const toMember = (r: MemberRow): Member => ({
  ...r,
  config: JSON.parse(r.config),
  temp: r.temp === 1,
  leaving: r.leaving === 1,
});
export type AgentSession = {
  id: number;
  sessionId: number;
  memberId: number;
  claudeId: string | null;
  model: string | null;
};
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
export type TaskStatus =
  | 'queued'
  | 'running'
  | 'reviewing'
  | 'fixing'
  | 'waiting'
  | 'done'
  | 'failed'
  | 'stopping'
  | 'stopped';
export type Task = {
  id: number;
  sessionId: number;
  kind: string;
  title: string;
  request: string;
  workflow: Workflow;
  status: TaskStatus;
  stage: string;
  createdAt: string;
  updatedAt: string;
};
type TaskRow = Omit<Task, 'workflow'> & { workflow: string };
const TASK =
  'SELECT id, session_id AS sessionId, kind, title, request, workflow, status, stage, created_at AS createdAt, updated_at AS updatedAt FROM tasks';
const toTask = (r: TaskRow): Task => ({ ...r, workflow: JSON.parse(r.workflow) });
// A peer request and its back-and-forth, oldest line first
export type PeerLine = { from: string; text: string };
export type PeerRequest = {
  id: number;
  taskId: number;
  stepId: string;
  fromMember: number;
  toRole: string;
  expected: string;
  thread: PeerLine[];
};
export type Handback = {
  summary: string;
  body: string;
  verdict?: 'pass' | 'rework';
  points: string[];
  files: string[];
  checks: string[];
  // Set on a rework the user asked for: the step it sends back to
  target?: string;
};
export type Version = { id: number; taskId: number; files: string[] };
export type StepRun = {
  id: number;
  taskId: number;
  stepId: string;
  memberId: number;
  status: 'running' | 'done' | 'failed' | 'stopped';
  verdict: 'pass' | 'rework' | null;
  handback: Handback | null;
  error: string | null;
  versionId: number | null;
};
type StepRunRow = Omit<StepRun, 'handback'> & { handback: string | null };
export type Run = {
  id: number;
  agentSessionId: number;
  taskId: number | null;
  model: string;
  status: string;
  turns: number;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  error: string | null;
};
type RunResult = {
  status: string;
  usage: { turns: number; inputTokens: number; outputTokens: number; costUsd: number };
  error?: string;
};

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
    // Inside another transaction this one is simply part of it
    if (this.db.isTransaction) return fn();
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

  projectOf(sessionId: number): Project {
    return this.readProject(this.readSession(sessionId).projectId);
  }

  readSession(id: number): Session {
    const row = this.db
      .prepare('SELECT id, project_id AS projectId, number, created_at AS createdAt, title FROM sessions WHERE id = ?')
      .get(id) as Session | undefined;
    if (!row) throw new Error(`no session ${id}`);
    return row;
  }

  // What deleting would take with it, shown before the user confirms
  impact(where: { sessionId: number } | { projectId: number }) {
    const scope =
      'sessionId' in where ? 'session_id = ?' : 'session_id IN (SELECT id FROM sessions WHERE project_id = ?)';
    const arg = 'sessionId' in where ? where.sessionId : where.projectId;
    const count = (table: string) =>
      (this.db.prepare(`SELECT COUNT(*) AS n FROM ${table} WHERE ${scope}`).get(arg) as { n: number }).n;
    const sessions =
      'sessionId' in where
        ? 1
        : (this.db.prepare('SELECT COUNT(*) AS n FROM sessions WHERE project_id = ?').get(arg) as { n: number }).n;
    return { sessions, tasks: count('tasks'), events: count('events'), messages: count('messages') };
  }

  // Only the record goes; the project folder on disk is never touched
  deleteSession(sessionId: number) {
    this.transact(() => {
      // Rows that point at each other inside the session go together; checked once the whole delete is done
      this.db.exec('PRAGMA defer_foreign_keys = ON');
      this.db.prepare('DELETE FROM sessions WHERE id = ?').run(sessionId);
    });
  }

  removeProject(projectId: number) {
    this.transact(() => {
      this.db.exec('PRAGMA defer_foreign_keys = ON');
      this.db.prepare('DELETE FROM sessions WHERE project_id = ?').run(projectId);
      this.db.prepare('DELETE FROM projects WHERE id = ?').run(projectId);
    });
  }

  // Each session's agent sessions, for the project tree
  listAgentTree(sessionId: number) {
    return this.db
      .prepare(
        `SELECT a.id, a.member_id AS memberId, (SELECT COUNT(*) FROM runs r WHERE r.agent_session_id = a.id) AS runs
         FROM agent_sessions a WHERE a.session_id = ? ORDER BY a.id`,
      )
      .all(sessionId) as { id: number; memberId: number; runs: number }[];
  }

  // Only an unnamed session takes a name, so a name the user gave is kept
  nameSession(id: number, title: string, keep = true) {
    this.db.prepare(`UPDATE sessions SET title = ? WHERE id = ?${keep ? ' AND title IS NULL' : ''}`).run(title, id);
  }

  listSessions(projectId: number): Session[] {
    return this.db
      .prepare(
        'SELECT id, project_id AS projectId, number, created_at AS createdAt, title FROM sessions WHERE project_id = ? ORDER BY number DESC',
      )
      .all(projectId) as Session[];
  }

  seedMembers(projectId: number, defs: { key: string; nickname: string; model: string }[]) {
    const insert = this.db.prepare(
      'INSERT OR IGNORE INTO members (project_id, key, nickname, model) VALUES (?, ?, ?, ?)',
    );
    for (const d of defs) insert.run(projectId, d.key, d.nickname, d.model);
  }

  listMembers(projectId: number): Member[] {
    return (this.db.prepare(`${MEMBER} WHERE project_id = ? ORDER BY id`).all(projectId) as MemberRow[]).map(toMember);
  }

  readMember(projectId: number, key: string): Member {
    const row = this.db.prepare(`${MEMBER} WHERE project_id = ? AND key = ?`).get(projectId, key) as
      | MemberRow
      | undefined;
    if (!row) throw new Error(`no member ${key} in project ${projectId}`);
    return toMember(row);
  }

  addMember(
    projectId: number,
    m: { key: string; nickname: string; model: string; definition: string; temp: boolean },
  ): Member {
    const { lastInsertRowid } = this.db
      .prepare('INSERT INTO members (project_id, key, nickname, model, definition, temp) VALUES (?, ?, ?, ?, ?, ?)')
      .run(projectId, m.key, m.nickname, m.model, m.definition, m.temp ? 1 : 0);
    return this.readMemberById(Number(lastInsertRowid));
  }

  writeLeaving(id: number, leaving: boolean) {
    this.db.prepare('UPDATE members SET leaving = ? WHERE id = ?').run(leaving ? 1 : 0, id);
  }

  assign(taskId: number, stepId: string, memberId: number) {
    this.db
      .prepare('INSERT OR REPLACE INTO assignees (task_id, step_id, member_id) VALUES (?, ?, ?)')
      .run(taskId, stepId, memberId);
  }

  assignee(taskId: number, stepId: string): number | null {
    const row = this.db
      .prepare('SELECT member_id AS id FROM assignees WHERE task_id = ? AND step_id = ?')
      .get(taskId, stepId) as { id: number } | undefined;
    return row?.id ?? null;
  }

  updateMember(id: number, change: { nickname?: string; model?: string; status?: Member['status'] }) {
    if (change.nickname !== undefined)
      this.db.prepare('UPDATE members SET nickname = ? WHERE id = ?').run(change.nickname, id);
    if (change.model !== undefined) this.db.prepare('UPDATE members SET model = ? WHERE id = ?').run(change.model, id);
    if (change.status !== undefined)
      this.db.prepare('UPDATE members SET status = ? WHERE id = ?').run(change.status, id);
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
    return this.db
      .prepare('SELECT change, at FROM permission_changes WHERE member_id = ? ORDER BY id')
      .all(memberId) as {
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
        'SELECT id, session_id AS sessionId, member_id AS memberId, claude_id AS claudeId, model FROM agent_sessions WHERE session_id = ? AND member_id = ?',
      )
      .get(sessionId, memberId) as AgentSession;
  }

  writeClaudeId(agentSessionId: number, claudeId: string, model: string) {
    this.db
      .prepare('UPDATE agent_sessions SET claude_id = ?, model = ? WHERE id = ?')
      .run(claudeId, model, agentSessionId);
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
      .prepare(
        'INSERT INTO questions (session_id, task_id, kind, prompt, options, payload, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      )
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

  openQuestionIds(taskId: number): number[] {
    return (
      this.db.prepare('SELECT id FROM questions WHERE task_id = ? AND answer IS NULL').all(taskId) as { id: number }[]
    ).map((r) => r.id);
  }

  // Work cut off by a restart: its runs were lost with the process, so the task waits stopped for the user to resume it
  recoverInterrupted(): number[] {
    return this.transact(() => {
      const cut = this.db
        .prepare("SELECT id FROM tasks WHERE status IN ('running', 'reviewing', 'fixing', 'waiting', 'stopping')")
        .all() as { id: number }[];
      this.db
        .prepare("UPDATE step_runs SET status = 'stopped', error = 'app restarted' WHERE status = 'running'")
        .run();
      for (const { id } of cut) this.writeTaskStatus(id, 'stopped', '', '앱이 다시 시작되어 업무가 멈췄습니다');
      return cut.map((r) => r.id);
    });
  }

  answerQuestion(id: number, answer: string) {
    this.db
      .prepare('UPDATE questions SET answer = ?, answered_at = ? WHERE id = ? AND answer IS NULL')
      .run(answer, now(), id);
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
      .prepare(
        'INSERT INTO events (session_id, task_id, member_id, kind, text, detail, at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      )
      .run(e.sessionId, e.taskId, e.memberId, e.kind, e.text, e.detail, now());
  }

  listEvents(sessionId: number): Event[] {
    return this.db
      .prepare(
        'SELECT id, session_id AS sessionId, task_id AS taskId, member_id AS memberId, kind, text, detail, at FROM events WHERE session_id = ? ORDER BY id',
      )
      .all(sessionId) as Event[];
  }

  startRun(agentSessionId: number, model: string, taskId: number | null = null): number {
    const { lastInsertRowid } = this.db
      .prepare("INSERT INTO runs (agent_session_id, model, started_at, status, task_id) VALUES (?, ?, ?, 'running', ?)")
      .run(agentSessionId, model, now(), taskId);
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

  // Runs per member and model in a session: how many, how long, how many tokens, what it cost
  usage(sessionId: number) {
    return this.db
      .prepare(
        `SELECT a.member_id AS memberId, r.model, COUNT(*) AS runs,
                COALESCE(SUM((julianday(r.ended_at) - julianday(r.started_at)) * 86400), 0) AS seconds,
                SUM(r.input_tokens) AS inputTokens, SUM(r.output_tokens) AS outputTokens, SUM(r.cost_usd) AS costUsd
         FROM runs r JOIN agent_sessions a ON a.id = r.agent_session_id WHERE a.session_id = ?
         GROUP BY a.member_id, r.model ORDER BY costUsd DESC`,
      )
      .all(sessionId) as {
      memberId: number;
      model: string;
      runs: number;
      seconds: number;
      inputTokens: number;
      outputTokens: number;
      costUsd: number;
    }[];
  }

  listRuns(sessionId: number): Run[] {
    return this.db
      .prepare(
        `SELECT r.id, r.agent_session_id AS agentSessionId, r.task_id AS taskId, r.model, r.status, r.turns, r.input_tokens AS inputTokens,
                r.output_tokens AS outputTokens, r.cost_usd AS costUsd, r.error
         FROM runs r JOIN agent_sessions a ON a.id = r.agent_session_id WHERE a.session_id = ? ORDER BY r.id`,
      )
      .all(sessionId) as Run[];
  }

  createTask(t: { sessionId: number; kind: string; title: string; request: string; workflow: Workflow }): Task {
    const { lastInsertRowid } = this.db
      .prepare(
        "INSERT INTO tasks (session_id, kind, title, request, workflow, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 'queued', ?, ?)",
      )
      .run(t.sessionId, t.kind, t.title, t.request, JSON.stringify(t.workflow), now(), now());
    return this.readTask(Number(lastInsertRowid));
  }

  readTask(id: number): Task {
    const row = this.db.prepare(`${TASK} WHERE id = ?`).get(id) as TaskRow | undefined;
    if (!row) throw new Error(`no task ${id}`);
    return toTask(row);
  }

  listTasks(sessionId: number): Task[] {
    return (this.db.prepare(`${TASK} WHERE session_id = ? ORDER BY id`).all(sessionId) as TaskRow[]).map(toTask);
  }

  // A status change and its log line are written together, so the log never disagrees with the card
  writeTaskStatus(id: number, status: TaskStatus, stage: string, log: string) {
    this.transact(() => {
      this.db
        .prepare('UPDATE tasks SET status = ?, stage = ?, updated_at = ? WHERE id = ?')
        .run(status, stage, now(), id);
      const task = this.readTask(id);
      this.addEvent({
        sessionId: task.sessionId,
        taskId: id,
        memberId: null,
        kind: 'status',
        text: log,
        detail: status,
      });
    });
  }

  startStepRun(taskId: number, stepId: string, memberId: number, versionId: number | null = null): number {
    const { lastInsertRowid } = this.db
      .prepare(
        "INSERT INTO step_runs (task_id, step_id, member_id, status, started_at, version_id) VALUES (?, ?, ?, 'running', ?, ?)",
      )
      .run(taskId, stepId, memberId, now(), versionId);
    return Number(lastInsertRowid);
  }

  finishStepRun(id: number, status: StepRun['status'], handback: Handback | null, error: string | null = null) {
    this.db
      .prepare('UPDATE step_runs SET status = ?, verdict = ?, handback = ?, error = ?, ended_at = ? WHERE id = ?')
      .run(status, handback?.verdict ?? null, handback ? JSON.stringify(handback) : null, error, now(), id);
  }

  listStepRuns(taskId: number): StepRun[] {
    const rows = this.db
      .prepare(
        'SELECT id, task_id AS taskId, step_id AS stepId, member_id AS memberId, status, verdict, handback, error, version_id AS versionId FROM step_runs WHERE task_id = ? ORDER BY id',
      )
      .all(taskId) as StepRunRow[];
    return rows.map((r) => ({ ...r, handback: r.handback ? JSON.parse(r.handback) : null }));
  }

  writeBaseline(taskId: number, snap: Record<string, string>) {
    this.db.prepare('UPDATE tasks SET baseline = ? WHERE id = ?').run(JSON.stringify(snap), taskId);
  }

  readBaseline(taskId: number): Record<string, string> {
    return JSON.parse(
      (this.db.prepare('SELECT baseline FROM tasks WHERE id = ?').get(taskId) as { baseline: string }).baseline,
    );
  }

  addVersion(taskId: number, files: string[], snap: Record<string, string>): number {
    const { lastInsertRowid } = this.db
      .prepare('INSERT INTO versions (task_id, files, snapshot, created_at) VALUES (?, ?, ?, ?)')
      .run(taskId, JSON.stringify(files), JSON.stringify(snap), now());
    return Number(lastInsertRowid);
  }

  latestVersion(taskId: number): Version | null {
    const row = this.db
      .prepare('SELECT id, task_id AS taskId, files FROM versions WHERE task_id = ? ORDER BY id DESC LIMIT 1')
      .get(taskId) as { id: number; taskId: number; files: string } | undefined;
    return row ? { ...row, files: JSON.parse(row.files) } : null;
  }

  // A rework the user asked for after the report: recorded like a reviewer's, so the engine reruns from there
  addUserRework(taskId: number, memberId: number, target: string, text: string) {
    const id = this.startStepRun(taskId, '_user', memberId);
    this.finishStepRun(id, 'done', {
      summary: text,
      body: text,
      verdict: 'rework',
      points: [text],
      files: [],
      checks: [],
      target,
    });
  }

  appendRequest(taskId: number, text: string) {
    this.db
      .prepare('UPDATE tasks SET request = request || char(10) || char(10) || ? WHERE id = ?')
      .run(`추가 요청: ${text}`, taskId);
  }

  latestWorkflow(projectId: number, kind: string): { version: number; rules: Workflow; layout: unknown } | null {
    const row = this.db
      .prepare(
        'SELECT version, rules, layout FROM workflow_versions WHERE project_id = ? AND kind = ? ORDER BY version DESC LIMIT 1',
      )
      .get(projectId, kind) as { version: number; rules: string; layout: string | null } | undefined;
    return row
      ? { version: row.version, rules: JSON.parse(row.rules), layout: row.layout ? JSON.parse(row.layout) : null }
      : null;
  }

  // The base check and the insert are one transaction, so two saves from the same base cannot both land
  addWorkflowVersion(
    projectId: number,
    kind: string,
    base: number,
    rules: Workflow,
    layout: unknown,
    author: string,
  ): number | null {
    return this.transact(() => {
      if ((this.latestWorkflow(projectId, kind)?.version ?? 0) !== base) return null;
      this.db
        .prepare(
          'INSERT INTO workflow_versions (project_id, kind, version, rules, layout, author, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        )
        .run(
          projectId,
          kind,
          base + 1,
          JSON.stringify(rules),
          layout === undefined ? null : JSON.stringify(layout),
          author,
          now(),
        );
      return base + 1;
    });
  }

  readWorkflowVersion(projectId: number, kind: string, version: number): Workflow | null {
    const row = this.db
      .prepare('SELECT rules FROM workflow_versions WHERE project_id = ? AND kind = ? AND version = ?')
      .get(projectId, kind, version) as { rules: string } | undefined;
    return row ? JSON.parse(row.rules) : null;
  }

  writeTaskWorkflow(taskId: number, w: Workflow) {
    this.db.prepare('UPDATE tasks SET workflow = ? WHERE id = ?').run(JSON.stringify(w), taskId);
  }

  listAgentSessions(sessionId: number): (AgentSession & { key: string })[] {
    return this.db
      .prepare(
        `SELECT a.id, a.session_id AS sessionId, a.member_id AS memberId, a.claude_id AS claudeId, m.key
         FROM agent_sessions a JOIN members m ON m.id = a.member_id WHERE a.session_id = ? ORDER BY a.id`,
      )
      .all(sessionId) as (AgentSession & { key: string })[];
  }

  createRequest(r: Omit<PeerRequest, 'id' | 'thread'>): number {
    const { lastInsertRowid } = this.db
      .prepare(
        'INSERT INTO requests (task_id, step_id, from_member, to_role, expected, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      )
      .run(r.taskId, r.stepId, r.fromMember, r.toRole, r.expected, now());
    return Number(lastInsertRowid);
  }

  readRequest(id: number): PeerRequest {
    const row = this.db
      .prepare(
        'SELECT id, task_id AS taskId, step_id AS stepId, from_member AS fromMember, to_role AS toRole, expected, thread FROM requests WHERE id = ?',
      )
      .get(id) as (Omit<PeerRequest, 'thread'> & { thread: string }) | undefined;
    if (!row) throw new Error(`no request ${id}`);
    return { ...row, thread: JSON.parse(row.thread) };
  }

  writeThread(id: number, thread: PeerLine[]) {
    this.db.prepare('UPDATE requests SET thread = ? WHERE id = ?').run(JSON.stringify(thread), id);
  }

  readSetting(key: string): string | null {
    const row = this.db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined;
    return row?.value ?? null;
  }

  writeSetting(key: string, value: string) {
    this.db
      .prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value')
      .run(key, value);
  }
}
