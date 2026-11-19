import { diffLines } from 'diff';
import { now, type Store } from './db';

export type Doc = { id: number; projectId: number; title: string; body: string; workflowKind: string | null; workflowVersion: number | null; updatedAt: string };
export type Change = {
  id: number;
  docId: number;
  kind: 'create' | 'edit' | 'delete';
  title: string;
  author: string;
  taskId: number | null;
  files: string[];
  at: string;
};
export type Memory = { id: number; memberId: number; text: string; taskId: number | null; sessionId: number | null; at: string };
// Who wrote: a member (by id, so a renamed member keeps its record) or the user
export type Author = { memberId: number | null; name: string; taskId?: number | null; files?: string[] };

const DOC = 'SELECT id, project_id AS projectId, title, body, workflow_kind AS workflowKind, workflow_version AS workflowVersion, updated_at AS updatedAt FROM wiki_docs';
const CHANGE = 'SELECT id, doc_id AS docId, kind, title, author, task_id AS taskId, files, at FROM wiki_changes';

// The project wiki and each member's own memory, kept in the record and never in the project folder
export class Wiki {
  constructor(public store: Store) {}

  get db() {
    return this.store.db;
  }

  list(projectId: number): Doc[] {
    return this.db.prepare(`${DOC} WHERE project_id = ? AND deleted = 0 ORDER BY title`).all(projectId) as Doc[];
  }

  find(projectId: number, title: string): Doc | null {
    return (this.db.prepare(`${DOC} WHERE project_id = ? AND title = ? AND deleted = 0`).get(projectId, title) as Doc | undefined) ?? null;
  }

  read(id: number): Doc {
    const doc = this.db.prepare(`${DOC} WHERE id = ?`).get(id) as Doc | undefined;
    if (!doc) throw new Error(`no wiki document ${id}`);
    return doc;
  }

  // Creates the document or replaces its body; the change and its record land together
  write(projectId: number, title: string, body: string, by: Author, link?: { kind: string; version: number }) {
    return this.store.transact(() => {
      const old = this.find(projectId, title);
      let id: number;
      if (old) {
        this.db.prepare('UPDATE wiki_docs SET body = ?, updated_at = ? WHERE id = ?').run(body, now(), old.id);
        id = old.id;
      } else {
        // A deleted document of the same title comes back as a new one, with its own history
        this.db.prepare('DELETE FROM wiki_docs WHERE project_id = ? AND title = ? AND deleted = 1').run(projectId, title);
        id = Number(this.db.prepare('INSERT INTO wiki_docs (project_id, title, body, updated_at) VALUES (?, ?, ?, ?)').run(projectId, title, body, now()).lastInsertRowid);
      }
      if (link) this.db.prepare('UPDATE wiki_docs SET workflow_kind = ?, workflow_version = ? WHERE id = ?').run(link.kind, link.version, id);
      this.record(id, projectId, old ? 'edit' : 'create', title, old?.body ?? '', body, by);
      return this.read(id);
    });
  }

  remove(id: number, by: Author) {
    this.store.transact(() => {
      const doc = this.read(id);
      this.db.prepare('UPDATE wiki_docs SET deleted = 1, updated_at = ? WHERE id = ?').run(now(), id);
      this.record(id, doc.projectId, 'delete', doc.title, doc.body, '', by);
    });
  }

  record(docId: number, projectId: number, kind: Change['kind'], title: string, before: string, after: string, by: Author) {
    this.db
      .prepare(
        'INSERT INTO wiki_changes (doc_id, project_id, kind, title, author, member_id, task_id, files, before, after, at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      )
      .run(docId, projectId, kind, title, by.name, by.memberId, by.taskId ?? null, JSON.stringify(by.files ?? []), before, after, now());
  }

  timeline(projectId: number): Change[] {
    const rows = this.db.prepare(`${CHANGE} WHERE project_id = ? ORDER BY id DESC`).all(projectId) as (Omit<Change, 'files'> & { files: string })[];
    return rows.map((r) => ({ ...r, files: JSON.parse(r.files) }));
  }

  // The lines a change added and removed, for the timeline's detail
  change(id: number) {
    const row = this.db.prepare('SELECT before, after FROM wiki_changes WHERE id = ?').get(id) as { before: string; after: string };
    const parts = diffLines(row.before, row.after);
    const lines = (p: (typeof parts)[number]) => p.value.split('\n').filter(Boolean);
    return { added: parts.filter((p) => p.added).flatMap(lines), removed: parts.filter((p) => p.removed).flatMap(lines) };
  }

  remember(projectId: number, memberId: number, text: string, where: { taskId: number | null; sessionId: number | null }) {
    this.db
      .prepare('INSERT INTO memories (project_id, member_id, text, task_id, session_id, at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(projectId, memberId, text, where.taskId, where.sessionId, now());
  }

  memories(projectId: number, memberId?: number): Memory[] {
    const sql = 'SELECT id, member_id AS memberId, text, task_id AS taskId, session_id AS sessionId, at FROM memories WHERE project_id = ?';
    return (memberId ? this.db.prepare(`${sql} AND member_id = ? ORDER BY id`).all(projectId, memberId) : this.db.prepare(`${sql} ORDER BY id`).all(projectId)) as Memory[];
  }

  // What a run starts with: the member's own memory and the titles of this project's wiki; it reads what it needs
  context(projectId: number, memberId: number) {
    const own = this.memories(projectId, memberId).slice(-20);
    const docs = this.list(projectId);
    return [
      '# Your memory in this project',
      own.length ? own.map((m) => `- ${m.text}`).join('\n') : '(none yet)',
      '# Project wiki',
      docs.length ? docs.map((d) => `- ${d.title}`).join('\n') : '(no documents yet)',
      'Read a document with wiki_read when your work needs it. Write down what the next task should know with wiki_write, and what only you need with remember.',
    ].join('\n\n');
  }
}
