import type { Mode, Say } from '../../shared';
import type { Workflow } from './workflow';

export type Project = { id: number; path: string; name: string; mode: Mode };
export type ListedProject = Project & { missing: boolean };
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
  // A copy made for one task is gone once let go, instead of staying as unhired
  temp: boolean;
  // Let go while at work: it finishes or hands back its step, then leaves
  leaving: boolean;
};
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
  // What the card asks; a card from before codes keeps its words in prompt instead
  say: Say | null;
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
  // A message the app writes itself, such as a failed answer, is a code the window words
  say: Say | null;
  imageCount: number;
  createdAt: string;
  question: Question | null;
  // The task a report is about
  taskId: number | null;
};
export type Event = {
  id: number;
  sessionId: number;
  taskId: number | null;
  memberId: number | null;
  kind: string;
  // What happened; a line from before codes keeps its words in text instead
  say: Say | null;
  text: string;
  detail: string | null;
  at: string;
};
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
  // What the step kept in the wiki, or why nothing; empty on handbacks from before it was asked
  wiki?: string;
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
export type RunResult = {
  status: string;
  usage: { turns: number; inputTokens: number; outputTokens: number; costUsd: number };
  error?: string;
};

// Every file's content hash, so changes made before a task and by it can be told apart with or without git
export type Snapshot = Record<string, string>;

// What a task changed since its baseline: added, changed, and removed files
export function changedFiles(base: Snapshot, now: Snapshot) {
  const paths = new Set([...Object.keys(base), ...Object.keys(now)]);
  return [...paths].filter((p) => base[p] !== now[p]).sort();
}

// One file's changes between two kept versions, as the diff popup shows them
type DiffLine = { kind: 'add' | 'del' | 'same' | 'hunk'; text: string };
export type FileDiff = {
  file: string;
  status: 'added' | 'deleted' | 'changed';
  binary: boolean;
  cut: boolean;
  lines: DiffLine[];
};

// How one agent run ended, and what it spent
export type RunOutput = {
  claudeId: string | null;
  text: string;
  status: 'done' | 'failed' | 'stopped' | 'limit';
  usage: { turns: number; inputTokens: number; outputTokens: number; costUsd: number };
  structured?: unknown;
  error?: string;
};

// The error of a run refused because its member was let go while it waited
export const NOT_HIRED = 'not hired';

// The result of a run that never started
export function skipped(status: RunOutput['status'], error?: string): RunOutput {
  return { claudeId: null, text: '', status, usage: { turns: 0, inputTokens: 0, outputTokens: 0, costUsd: 0 }, error };
}
