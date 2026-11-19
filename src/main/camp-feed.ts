import type { Chat } from './chat';

export type CampLine = { id: number; who: string; to?: string; text: string; kind: 'work' | 'rework' | 'chat' };

// What the camp shows for one session: who is at work on what, and the record lines that play as scenes
export function campState(chat: Chat, sessionId: number) {
  const { store, crew } = chat;
  const projectId = store.projectOf(sessionId).id;
  const members = store.listMembers(projectId);
  const keyOf = (id: number | null) => members.find((m) => m.id === id)?.key;
  const keyOfRole = (role: string) => members.find((m) => crew.defOf(m).role === role)?.key;
  const working: Record<string, string> = {};
  const tasks: Record<string, number> = {};
  for (const t of store.listTasks(sessionId)) {
    for (const r of store.listStepRuns(t.id)) {
      const key = keyOf(r.memberId);
      if (!key) continue;
      tasks[key] = t.id;
      if (r.status === 'running')
        working[key] = `${t.workflow.steps.find((s) => s.id === r.stepId)?.label ?? '작업'} 중`;
    }
  }
  // 비서 waits by the fire with a ? while a card waits for the user
  if (store.listMessages(sessionId).some((m) => m.question && m.question.answer === null)) working.orchestrator ??= '?';
  const log: CampLine[] = [];
  for (const e of store.listEvents(sessionId)) {
    const who = keyOf(e.memberId);
    if (e.kind === 'request' && who) {
      const [, from, to] = e.text.match(/^(\S+) → (\S+):/) ?? [];
      const peer = to && keyOfRole(to);
      if (peer)
        log.push({
          id: e.id,
          who,
          to: peer,
          text: from === crew.defOf(members.find((m) => m.key === who)!).role ? '요청 메모' : '답변',
          kind: 'chat',
        });
    } else if (e.kind === 'step' && who && /실패/.test(e.text))
      log.push({ id: e.id, who, text: '실패', kind: 'rework' });
    else if (e.kind === 'step' && who && /수정 요청/.test(e.text))
      log.push({ id: e.id, who, text: '수정 요청', kind: 'rework' });
    else if (e.kind === 'status' && e.text.endsWith(' 완료'))
      log.push({ id: e.id, who: 'orchestrator', text: '완료 보고', kind: 'work' });
    else if (e.kind === 'status' && / 실패:/.test(e.text))
      log.push({ id: e.id, who: 'orchestrator', text: '업무 실패', kind: 'rework' });
  }
  return { working, tasks, log };
}
