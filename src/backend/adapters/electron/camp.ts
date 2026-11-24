import type { Chat } from '../../app/chat';

// scene names what plays, for the window to word: a report, a failed task, a note or its answer, a failed step, a redo
type CampLine = {
  id: number;
  who: string;
  to?: string;
  scene: 'report' | 'failed' | 'note' | 'answer' | 'stepFailed' | 'rework';
  kind: 'work' | 'rework' | 'chat';
};

// What the camp shows for one session: who is at work on what, and the record lines that play as scenes
export function campState(chat: Chat, sessionId: number) {
  const { store } = chat;
  const members = store.listMembers(store.projectOf(sessionId).id);
  const keyOf = (id: unknown) => members.find((m) => m.id === id)?.key;
  const working: Record<string, string> = {};
  const tasks: Record<string, number> = {};
  for (const t of store.listTasks(sessionId)) {
    for (const r of store.listStepRuns(t.id)) {
      const key = keyOf(r.memberId);
      if (!key) continue;
      tasks[key] = t.id;
      if (r.status === 'running') working[key] = t.workflow.steps.find((s) => s.id === r.stepId)?.label ?? r.stepId;
    }
  }
  // The interpreter waits by the fire with a ? while a card waits for the user
  if (store.listMessages(sessionId).some((m) => m.question && m.question.answer === null)) working.interpreter ??= '?';
  // Scenes are read from what each line records, never from its wording: a status, a handback's verdict, a request's addressee
  const log: CampLine[] = [];
  for (const e of store.listEvents(sessionId)) {
    const who = keyOf(e.memberId);
    if (e.kind === 'status') {
      if (e.detail === 'done') log.push({ id: e.id, who: 'interpreter', scene: 'report', kind: 'work' });
      if (e.detail === 'failed') log.push({ id: e.id, who: 'interpreter', scene: 'failed', kind: 'rework' });
      continue;
    }
    if (!who || !e.detail) continue;
    const d = JSON.parse(e.detail);
    const to = keyOf(d.to);
    if (e.kind === 'request' && to) log.push({ id: e.id, who, to, scene: d.answer ? 'answer' : 'note', kind: 'chat' });
    else if (e.kind === 'step' && d.errors) log.push({ id: e.id, who, scene: 'stepFailed', kind: 'rework' });
    else if (e.kind === 'step' && d.verdict === 'rework') log.push({ id: e.id, who, scene: 'rework', kind: 'rework' });
  }
  return { working, tasks, log };
}
