import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { ALLOW } from '../../domain/answers';
import { RESTARTED } from '../../domain/task';
import type { Workflow } from '../../domain/workflow';
import type { RunSpend } from '../../domain/usage';
import type { Records } from '../../app/ports';
import { MIGRATIONS } from './migrations';
import type { Image, Mode, Say } from '../../../shared';
import type {
  Project,
  ListedProject,
  Session,
  Member,
  AgentSession,
  Question,
  Message,
  Event,
  TaskStatus,
  Task,
  PeerLine,
  PeerRequest,
  Handback,
  Version,
  StepRun,
  RunResult,
} from '../../domain/records';

const PROJECT = 'SELECT id, path, name, mode FROM projects';
const SESSION = 'SELECT id, project_id AS projectId, number, created_at AS createdAt, title FROM sessions';
type MemberRow = Omit<Member, 'config' | 'temp' | 'leaving'> & { config: string; temp: number; leaving: number };
const MEMBER = 'SELECT id, project_id AS projectId, key, nickname, model, status, config, temp, leaving FROM members';
const toMember = (r: MemberRow): Member => ({
  ...r,
  config: JSON.parse(r.config),
  temp: r.temp === 1,
  leaving: r.leaving === 1,
});
type QuestionRow = Omit<Question, 'options' | 'payload' | 'say'> & {
  options: string;
  payload: string;
  say: string;
};
type TaskRow = Omit<Task, 'workflow'> & { workflow: string };
const TASK =
  'SELECT id, session_id AS sessionId, kind, title, request, workflow, status, stage, created_at AS createdAt, updated_at AS updatedAt FROM tasks';
const toTask = (r: TaskRow): Task => ({ ...r, workflow: JSON.parse(r.workflow) });
type StepRunRow = Omit<StepRun, 'handback'> & { handback: string | null };

function now() {
  return new Date().toISOString();
}

export class Store implements Records {
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
    return this.db.prepare(`${PROJECT} WHERE path = ?`).get(full) as Project;
  }

  // A folder deleted outside the app keeps its project and history until the user removes it
  listProjects(): ListedProject[] {
    return (this.db.prepare(`${PROJECT} ORDER BY added_at DESC, id DESC`).all() as Project[]).map((p) => ({
      ...p,
      missing: !fs.existsSync(p.path),
    }));
  }

  setMode(id: number, mode: Mode) {
    this.db.prepare('UPDATE projects SET mode = ? WHERE id = ?').run(mode, id);
  }

  readProject(id: number): Project {
    const row = this.db.prepare(`${PROJECT} WHERE id = ?`).get(id) as Project | undefined;
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

  hasSession(id: number) {
    return !!this.db.prepare('SELECT 1 FROM sessions WHERE id = ?').get(id);
  }

  readSession(id: number): Session {
    const row = this.db.prepare(`${SESSION} WHERE id = ?`).get(id) as Session | undefined;
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
  nameSession(id: number, title: string) {
    this.db.prepare('UPDATE sessions SET title = ? WHERE id = ? AND title IS NULL').run(title, id);
  }

  renameSession(id: number, title: string) {
    this.db.prepare('UPDATE sessions SET title = ? WHERE id = ?').run(title, id);
  }

  listSessions(projectId: number): Session[] {
    return this.db.prepare(`${SESSION} WHERE project_id = ? ORDER BY number DESC`).all(projectId) as Session[];
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

  addMember(projectId: number, m: { key: string; nickname: string; model: string; temp: boolean }): Member {
    const { lastInsertRowid } = this.db
      .prepare('INSERT INTO members (project_id, key, nickname, model, temp) VALUES (?, ?, ?, ?, ?)')
      .run(projectId, m.key, m.nickname, m.model, m.temp ? 1 : 0);
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
  writeConfig(id: number, config: Record<string, unknown>, change: Say) {
    this.transact(() => {
      this.db.prepare('UPDATE members SET config = ? WHERE id = ?').run(JSON.stringify(config), id);
      this.db
        .prepare('INSERT INTO permission_changes (member_id, change, at) VALUES (?, ?, ?)')
        .run(id, JSON.stringify(change), now());
    });
  }

  listPermissionChanges(memberId: number): { say: Say; at: string }[] {
    const rows = this.db
      .prepare('SELECT change, at FROM permission_changes WHERE member_id = ? ORDER BY id')
      .all(memberId) as { change: string; at: string }[];
    return rows.map((r) => ({ say: JSON.parse(r.change), at: r.at }));
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

  addMessage(
    sessionId: number,
    author: Message['author'],
    text: string,
    questionId: number | null = null,
    images: Image[] = [],
    taskId: number | null = null,
    say: Say | null = null,
  ) {
    this.transact(() => {
      const { lastInsertRowid } = this.db
        .prepare(
          'INSERT INTO messages (session_id, author, text, say, created_at, question_id, task_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
        )
        .run(sessionId, author, text, say && JSON.stringify(say), now(), questionId, taskId);
      const add = this.db.prepare('INSERT INTO message_images (message_id, n, media_type, data) VALUES (?, ?, ?, ?)');
      images.forEach((i, n) => add.run(lastInsertRowid, n, i.mediaType, i.data));
    });
  }

  // Pictures are only counted here; the window loads each one by its address when it shows it
  listMessages(sessionId: number): Message[] {
    const rows = this.db
      .prepare(
        'SELECT id, session_id AS sessionId, author, text, say, (SELECT COUNT(*) FROM message_images WHERE message_id = messages.id) AS imageCount, created_at AS createdAt, question_id AS questionId, task_id AS taskId FROM messages WHERE session_id = ? ORDER BY id',
      )
      .all(sessionId) as (Omit<Message, 'question' | 'say'> & { questionId: number | null; say: string | null })[];
    return rows.map(({ questionId, ...m }) => ({
      ...m,
      say: m.say ? JSON.parse(m.say) : null,
      question: questionId ? this.readQuestion(questionId) : null,
    }));
  }

  readImage(messageId: number, n: number): Image | null {
    const row = this.db
      .prepare('SELECT media_type AS mediaType, data FROM message_images WHERE message_id = ? AND n = ?')
      .get(messageId, n) as Image | undefined;
    return row ?? null;
  }

  addQuestion(q: Omit<Question, 'id' | 'answer'>): number {
    const { lastInsertRowid } = this.db
      .prepare(
        'INSERT INTO questions (session_id, task_id, kind, say, options, payload, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      )
      .run(
        q.sessionId,
        q.taskId,
        q.kind,
        JSON.stringify(q.say),
        JSON.stringify(q.options),
        JSON.stringify(q.payload),
        now(),
      );
    return Number(lastInsertRowid);
  }

  readQuestion(id: number): Question {
    const row = this.db
      .prepare(
        'SELECT id, session_id AS sessionId, task_id AS taskId, kind, say, options, payload, answer FROM questions WHERE id = ?',
      )
      .get(id) as QuestionRow | undefined;
    if (!row) throw new Error(`no question ${id}`);
    return {
      ...row,
      say: JSON.parse(row.say),
      options: JSON.parse(row.options),
      payload: JSON.parse(row.payload),
    };
  }

  // A task's open cards, or with no task those of the session's own conversation
  openQuestionIds(sessionId: number, taskId: number | null): number[] {
    return (
      this.db
        .prepare('SELECT id FROM questions WHERE session_id = ? AND task_id IS ? AND answer IS NULL')
        .all(sessionId, taskId) as { id: number }[]
    ).map((r) => r.id);
  }

  // Work cut off by a restart: its runs were lost with the process, so the task waits stopped for the user to resume it
  recoverInterrupted() {
    this.transact(() => {
      const cut = this.db
        .prepare("SELECT id FROM tasks WHERE status IN ('running', 'reviewing', 'fixing', 'waiting', 'stopping')")
        .all() as { id: number }[];
      this.db.prepare("UPDATE step_runs SET status = 'stopped', error = ? WHERE status = 'running'").run(RESTARTED);
      for (const { id } of cut) this.writeTaskStatus(id, 'stopped', '', { code: 'task.restarted' });
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
        `SELECT 1 FROM questions q WHERE session_id = ? AND task_id IS ? AND kind = 'approval' AND answer = ?
         AND json_extract(payload, '$.memberId') = ? AND json_extract(payload, '$.tool') = ?
         AND answered_at > COALESCE((SELECT MAX(at) FROM permission_changes WHERE member_id = ?), '')`,
      )
      .get(sessionId, taskId, ALLOW, memberId, tool, memberId);
    return !!row;
  }

  addEvent(e: Omit<Event, 'id' | 'at'>) {
    this.db
      .prepare(
        'INSERT INTO events (session_id, task_id, member_id, kind, say, detail, at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      )
      .run(e.sessionId, e.taskId, e.memberId, e.kind, JSON.stringify(e.say), e.detail, now());
  }

  listEvents(sessionId: number): Event[] {
    return (
      this.db
        .prepare(
          'SELECT id, session_id AS sessionId, task_id AS taskId, member_id AS memberId, kind, say, detail, at FROM events WHERE session_id = ? ORDER BY id',
        )
        .all(sessionId) as (Omit<Event, 'say'> & { say: string })[]
    ).map((e) => ({ ...e, say: JSON.parse(e.say) }));
  }

  startRun(agentSessionId: number, model: string, taskId: number | null = null, side = false): number {
    const { lastInsertRowid } = this.db
      .prepare(
        "INSERT INTO runs (agent_session_id, model, started_at, status, task_id, side) VALUES (?, ?, ?, 'running', ?, ?)",
      )
      .run(agentSessionId, model, now(), taskId, side ? 1 : 0);
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
  listRunSpend(sessionId: number): RunSpend[] {
    const rows = this.db
      .prepare(
        `SELECT a.member_id AS memberId, r.agent_session_id AS agentSessionId, r.model,
                COALESCE((julianday(r.ended_at) - julianday(r.started_at)) * 86400, 0) AS seconds,
                r.input_tokens AS inputTokens, r.output_tokens AS outputTokens, r.cost_usd AS costUsd, r.side
         FROM runs r JOIN agent_sessions a ON a.id = r.agent_session_id WHERE a.session_id = ? ORDER BY r.id`,
      )
      .all(sessionId) as (Omit<RunSpend, 'side'> & { side: number })[];
    return rows.map((r) => ({ ...r, side: r.side === 1 }));
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
  writeTaskStatus(id: number, status: TaskStatus, stage: string, say: Say) {
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
        say,
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

  listVersions(taskId: number): Version[] {
    return (
      this.db
        .prepare('SELECT id, task_id AS taskId, files FROM versions WHERE task_id = ? ORDER BY id')
        .all(taskId) as {
        id: number;
        taskId: number;
        files: string;
      }[]
    ).map((r) => ({ ...r, files: JSON.parse(r.files) }));
  }

  latestVersion(taskId: number): Version | null {
    return this.listVersions(taskId).at(-1) ?? null;
  }

  versionSnapshot(id: number): Record<string, string> {
    const row = this.db.prepare('SELECT snapshot FROM versions WHERE id = ?').get(id) as { snapshot: string };
    return JSON.parse(row.snapshot);
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
      .run(`More from the user: ${text}`, taskId);
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
    reason: string | null = null,
  ): number | null {
    return this.transact(() => {
      if ((this.latestWorkflow(projectId, kind)?.version ?? 0) !== base) return null;
      this.db
        .prepare(
          'INSERT INTO workflow_versions (project_id, kind, version, rules, layout, author, reason, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        )
        .run(
          projectId,
          kind,
          base + 1,
          JSON.stringify(rules),
          layout === undefined ? null : JSON.stringify(layout),
          author,
          reason,
          now(),
        );
      return base + 1;
    });
  }

  writeTaskWorkflow(taskId: number, w: Workflow) {
    this.db.prepare('UPDATE tasks SET workflow = ? WHERE id = ?').run(JSON.stringify(w), taskId);
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

  deleteSetting(key: string) {
    this.db.prepare('DELETE FROM settings WHERE key = ?').run(key);
  }
}
