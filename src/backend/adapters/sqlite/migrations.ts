// Each entry runs once, in order; PRAGMA user_version remembers how many have run
export const MIGRATIONS = [
  `CREATE TABLE projects (
     id INTEGER PRIMARY KEY, path TEXT NOT NULL UNIQUE, name TEXT NOT NULL, mode TEXT NOT NULL DEFAULT 'manual',
     added_at TEXT NOT NULL);
   CREATE TABLE sessions (
     id INTEGER PRIMARY KEY, project_id INTEGER NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
     number INTEGER NOT NULL, title TEXT, created_at TEXT NOT NULL, UNIQUE (project_id, number));
   CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
   CREATE TABLE members (
     id INTEGER PRIMARY KEY, project_id INTEGER NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
     key TEXT NOT NULL, nickname TEXT NOT NULL, model TEXT NOT NULL,
     status TEXT NOT NULL DEFAULT 'hired' CHECK (status IN ('hired', 'unhired')), config TEXT NOT NULL DEFAULT '{}',
     temp INTEGER NOT NULL DEFAULT 0, leaving INTEGER NOT NULL DEFAULT 0, UNIQUE (project_id, key));
   CREATE TABLE permission_changes (
     id INTEGER PRIMARY KEY, member_id INTEGER NOT NULL REFERENCES members (id) ON DELETE CASCADE,
     change TEXT NOT NULL, at TEXT NOT NULL);
   CREATE TABLE agent_sessions (
     id INTEGER PRIMARY KEY, session_id INTEGER NOT NULL REFERENCES sessions (id) ON DELETE CASCADE,
     member_id INTEGER NOT NULL REFERENCES members (id) ON DELETE CASCADE, claude_id TEXT, model TEXT,
     created_at TEXT NOT NULL, UNIQUE (session_id, member_id));
   CREATE TABLE tasks (
     id INTEGER PRIMARY KEY, session_id INTEGER NOT NULL REFERENCES sessions (id) ON DELETE CASCADE,
     kind TEXT NOT NULL, title TEXT NOT NULL, request TEXT NOT NULL, workflow TEXT NOT NULL,
     status TEXT NOT NULL, stage TEXT NOT NULL DEFAULT '', baseline TEXT NOT NULL DEFAULT '{}',
     created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
   CREATE TABLE questions (
     id INTEGER PRIMARY KEY, session_id INTEGER NOT NULL REFERENCES sessions (id) ON DELETE CASCADE, task_id INTEGER,
     kind TEXT NOT NULL CHECK (kind IN ('approval', 'choice')), say TEXT NOT NULL, options TEXT NOT NULL,
     payload TEXT NOT NULL DEFAULT '{}', answer TEXT, created_at TEXT NOT NULL, answered_at TEXT);
   CREATE TABLE messages (
     id INTEGER PRIMARY KEY, session_id INTEGER NOT NULL REFERENCES sessions (id) ON DELETE CASCADE,
     author TEXT NOT NULL CHECK (author IN ('user', 'secretary')), text TEXT NOT NULL, say TEXT,
     question_id INTEGER REFERENCES questions (id), task_id INTEGER, created_at TEXT NOT NULL);
   CREATE TABLE message_images (
     message_id INTEGER NOT NULL REFERENCES messages (id) ON DELETE CASCADE, n INTEGER NOT NULL,
     media_type TEXT NOT NULL, data TEXT NOT NULL, PRIMARY KEY (message_id, n));
   CREATE TABLE events (
     id INTEGER PRIMARY KEY, session_id INTEGER NOT NULL REFERENCES sessions (id) ON DELETE CASCADE, task_id INTEGER,
     member_id INTEGER REFERENCES members (id), kind TEXT NOT NULL, say TEXT NOT NULL, detail TEXT, at TEXT NOT NULL);
   CREATE TABLE runs (
     id INTEGER PRIMARY KEY, agent_session_id INTEGER NOT NULL REFERENCES agent_sessions (id) ON DELETE CASCADE,
     task_id INTEGER REFERENCES tasks (id) ON DELETE SET NULL, side INTEGER NOT NULL DEFAULT 0,
     model TEXT NOT NULL, started_at TEXT NOT NULL, ended_at TEXT,
     status TEXT NOT NULL CHECK (status IN ('running', 'done', 'failed', 'stopped', 'limit')),
     turns INTEGER NOT NULL DEFAULT 0, input_tokens INTEGER NOT NULL DEFAULT 0, output_tokens INTEGER NOT NULL DEFAULT 0,
     cost_usd REAL NOT NULL DEFAULT 0, error TEXT);
   CREATE TABLE versions (
     id INTEGER PRIMARY KEY, task_id INTEGER NOT NULL REFERENCES tasks (id) ON DELETE CASCADE,
     files TEXT NOT NULL, snapshot TEXT NOT NULL, created_at TEXT NOT NULL);
   CREATE TABLE step_runs (
     id INTEGER PRIMARY KEY, task_id INTEGER NOT NULL REFERENCES tasks (id) ON DELETE CASCADE, step_id TEXT NOT NULL,
     member_id INTEGER NOT NULL REFERENCES members (id), status TEXT NOT NULL CHECK (status IN ('running', 'done', 'failed', 'stopped')),
     verdict TEXT CHECK (verdict IN ('pass', 'rework')), handback TEXT, error TEXT,
     version_id INTEGER REFERENCES versions (id), started_at TEXT NOT NULL, ended_at TEXT);
   CREATE TABLE requests (
     id INTEGER PRIMARY KEY, task_id INTEGER NOT NULL REFERENCES tasks (id) ON DELETE CASCADE, step_id TEXT NOT NULL,
     from_member INTEGER NOT NULL REFERENCES members (id), to_role TEXT NOT NULL, expected TEXT NOT NULL,
     thread TEXT NOT NULL DEFAULT '[]', created_at TEXT NOT NULL);
   CREATE TABLE assignees (
     task_id INTEGER NOT NULL REFERENCES tasks (id) ON DELETE CASCADE, step_id TEXT NOT NULL,
     member_id INTEGER NOT NULL REFERENCES members (id), PRIMARY KEY (task_id, step_id));
   CREATE TABLE workflow_versions (
     id INTEGER PRIMARY KEY, project_id INTEGER NOT NULL REFERENCES projects (id) ON DELETE CASCADE, kind TEXT NOT NULL,
     version INTEGER NOT NULL, rules TEXT NOT NULL, layout TEXT, author TEXT NOT NULL, created_at TEXT NOT NULL,
     UNIQUE (project_id, kind, version));
   CREATE TABLE wiki_docs (
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
];
