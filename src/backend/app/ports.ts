import type { Image, Mode, Say } from '../../shared';
import type {
  AgentSession,
  Event,
  FileDiff,
  Handback,
  ListedProject,
  Member,
  Message,
  PeerLine,
  PeerRequest,
  Project,
  Question,
  RunOutput,
  RunResult,
  Session,
  Snapshot,
  StepRun,
  Task,
  TaskStatus,
  Version,
} from '../domain/records';
import type { RunSpend } from '../domain/usage';
import type { Crew } from '../domain/crew';
import type { Account } from '../domain/providers';
import type { Step, Workflow } from '../domain/workflow';
import type { Chat } from './chat';

// What the app needs from the record, one port per kind of record; the SQLite store implements them all

interface Transactions {
  // Everything inside lands together or not at all
  transact<T>(fn: () => T): T;
}

interface ProjectRecords {
  addProject(dir: string): Project;
  listProjects(): ListedProject[];
  setMode(id: number, mode: Mode): void;
  readProject(id: number): Project;
  createSession(projectId: number): Session;
  projectOf(sessionId: number): Project;
  hasSession(id: number): boolean;
  readSession(id: number): Session;
  impact(where: { sessionId: number } | { projectId: number }): {
    sessions: number;
    tasks: number;
    events: number;
    messages: number;
  };
  deleteSession(sessionId: number): void;
  removeProject(projectId: number): void;
  listAgentTree(sessionId: number): { id: number; memberId: number; runs: number }[];
  nameSession(id: number, title: string): void;
  renameSession(id: number, title: string): void;
  listSessions(projectId: number): Session[];
}

interface MemberRecords {
  seedMembers(projectId: number, defs: { key: string; nickname: string; model: string }[]): void;
  listMembers(projectId: number): Member[];
  readMember(projectId: number, key: string): Member;
  readMemberById(id: number): Member;
  addMember(projectId: number, m: { key: string; nickname: string; model: string; temp: boolean }): Member;
  writeLeaving(id: number, leaving: boolean): void;
  updateMember(id: number, change: { nickname?: string; model?: string; status?: Member['status'] }): void;
  writeConfig(id: number, config: Record<string, unknown>, change: Say): void;
  listPermissionChanges(memberId: number): { say: Say; at: string }[];
}

export interface ConversationRecords {
  addMessage(
    sessionId: number,
    author: Message['author'],
    text: string,
    questionId?: number | null,
    images?: Image[],
    taskId?: number | null,
    say?: Say | null,
  ): void;
  listMessages(sessionId: number): Message[];
  readImage(messageId: number, n: number): Image | null;
  addQuestion(q: Omit<Question, 'id' | 'answer'>): number;
  readQuestion(id: number): Question;
  openQuestionIds(sessionId: number, taskId: number | null): number[];
  answerQuestion(id: number, answer: string): void;
  isGranted(sessionId: number, taskId: number | null, memberId: number, tool: string): boolean;
  addEvent(e: Omit<Event, 'id' | 'at'>): void;
  listEvents(sessionId: number): Event[];
}

interface RunRecords {
  openAgentSession(sessionId: number, memberId: number): AgentSession;
  writeClaudeId(agentSessionId: number, claudeId: string, model: string): void;
  startRun(agentSessionId: number, model: string, taskId?: number | null, side?: boolean): number;
  finishRun(id: number, out: RunResult): void;
  listRunSpend(sessionId: number): RunSpend[];
}

interface TaskRecords {
  createTask(t: { sessionId: number; kind: string; title: string; request: string; workflow: Workflow }): Task;
  readTask(id: number): Task;
  listTasks(sessionId: number): Task[];
  writeTaskStatus(id: number, status: TaskStatus, stage: string, say: Say): void;
  writeTaskWorkflow(taskId: number, w: Workflow): void;
  appendRequest(taskId: number, text: string): void;
  assign(taskId: number, stepId: string, memberId: number): void;
  assignee(taskId: number, stepId: string): number | null;
  startStepRun(taskId: number, stepId: string, memberId: number, versionId?: number | null): number;
  finishStepRun(id: number, status: StepRun['status'], handback: Handback | null, error?: string | null): void;
  listStepRuns(taskId: number): StepRun[];
  addUserRework(taskId: number, memberId: number, target: string, text: string): void;
  writeBaseline(taskId: number, snap: Snapshot): void;
  readBaseline(taskId: number): Snapshot;
  addVersion(taskId: number, files: string[], snap: Snapshot): number;
  listVersions(taskId: number): Version[];
  latestVersion(taskId: number): Version | null;
  versionSnapshot(id: number): Snapshot;
  createRequest(r: Omit<PeerRequest, 'id' | 'thread'>): number;
  readRequest(id: number): PeerRequest;
  writeThread(id: number, thread: PeerLine[]): void;
}

interface WorkflowRecords {
  latestWorkflow(projectId: number, kind: string): { version: number; rules: Workflow; layout: unknown } | null;
  // null when another version was saved after base
  addWorkflowVersion(
    projectId: number,
    kind: string,
    base: number,
    rules: Workflow,
    layout: unknown,
    author: string,
    reason?: string | null,
  ): number | null;
}

export interface SettingRecords {
  readSetting(key: string): string | null;
  writeSetting(key: string, value: string): void;
  deleteSetting(key: string): void;
}

export type Records = Transactions &
  ProjectRecords &
  MemberRecords &
  ConversationRecords &
  RunRecords &
  TaskRecords &
  WorkflowRecords &
  SettingRecords;

// What a member may run: allowed with its input, or refused with a reason the member reads
export type ToolGate = (
  tool: string,
  input: Record<string, unknown>,
) => Promise<{ behavior: 'allow'; updatedInput: Record<string, unknown> } | { behavior: 'deny'; message: string }>;
// A tool server for a run: a command from the crew's mcp.json, or one served inside the app
export type ToolServer = object;

export type AgentInput = {
  cwd: string;
  model: string;
  system: string;
  resume?: string | null;
  // Continue a copy of the resumed session, leaving the original as it was
  fork?: boolean;
  canUseTool: ToolGate;
  mcpServers?: Record<string, ToolServer>;
  // A JSON schema the run's final answer must match; the match comes back as structured
  schema?: Record<string, unknown>;
  onText?: (delta: string) => void;
  // Called once per answered turn, so a message said mid-run gets its own reply; more says another is still to be answered
  onReply?: (text: string, more: boolean) => void;
};

// One agent's turn, from the first prompt to its result; more can be said to it while it works
export interface AgentRun {
  // The session this run is on, known from the start when resumed and once it begins otherwise
  readonly claudeId: string | null;
  readonly model: string;
  run(prompt: string, images?: Image[]): Promise<RunOutput>;
  say(text: string, images?: Image[]): boolean;
  stop(): Promise<void>;
}

export interface Agent {
  start(input: AgentInput): AgentRun;
  // Who the service answers as with this key, or with the computer's own login when there is none
  check(key: string | null): Promise<Account>;
}

// Saved credentials, unreadable to anyone who copies the record file
export interface Secrets {
  read(name: string): string | null;
  write(name: string, value: string): void;
  remove(name: string): void;
}

// The project folder and the crew's output folders on disk
export interface Files {
  // Every file's content hash under a folder
  snapshot(dir: string): Snapshot;
  // The hashes of these files and folders, keyed relative to root; a path that does not exist is left out
  hashes(root: string, paths: string[]): Snapshot;
  // The path as the disk resolves it, so a link or a different spelling still names the same file
  realPath(p: string): string;
  ensureDir(dir: string): string;
  // A text file's contents, or '' when it does not exist
  readText(file: string): string;
  // Writes the whole file, making its folder first
  writeText(file: string, text: string): void;
  // The names of the files directly in a folder, or none when it does not exist
  listFiles(dir: string): string[];
  remove(file: string): void;
}

// A task's starting point and each version kept as commits, where the folder is a git repository
export interface Versions {
  // false when the folder is not in a git repository
  mark(dir: string, taskId: number, name: string): Promise<boolean>;
  // The names kept for one task (base, version-N); none outside a repository
  kept(dir: string, taskId: number): Promise<string[]>;
  diff(dir: string, taskId: number, from: string, to: string, files: string[]): Promise<FileDiff[]>;
  forget(dir: string, taskIds: number[]): Promise<void>;
  // The commit HEAD points to; null outside a repository
  head(dir: string): Promise<string | null>;
}

// The tool servers that reach back into the app: the interpreter's, a member's inside a task, and the app's own
export interface ToolServers {
  secretary(sessionId: number): Promise<ToolServer>;
  member(task: Task, step: Step, member: Member): Promise<ToolServer>;
  app(sessionId: number): Promise<ToolServer>;
  librarian(sessionId: number): Promise<ToolServer>;
}

// What the window and the system hear about: a changed record, streamed words, a screen to show, a notice, being busy
export type Feed = (channel: 'changed' | 'stream' | 'navigate' | 'notify' | 'busy', payload: unknown) => void;
// Where members' own files go, and the files no member may touch
export type Paths = { output: string; protected: string[] };

export type Ports = {
  records: Records;
  agent: Agent;
  secrets: Secrets;
  files: Files;
  versions: Versions;
  crew: Crew;
  emit: Feed;
  paths: Paths;
  // Built once the hub exists, since the servers call back into it
  tools: (chat: Chat) => ToolServers;
};
