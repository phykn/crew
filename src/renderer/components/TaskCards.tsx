import type { Message, Task } from '../../main/db';
import { call } from '../api';

// The pill says where the task is, in the words of its current stage while it works
function pill(t: Task, asking: boolean): { text: string; tone: 'work' | 'wait' | 'stop' } {
  if (asking) return { text: '내 답변 대기', tone: 'wait' };
  if (t.status === 'stopping') return { text: '중단 중', tone: 'wait' };
  if (t.status === 'stopped') return { text: '중단됨', tone: 'stop' };
  if (t.status === 'failed') return { text: '실패', tone: 'stop' };
  if (t.status === 'queued') return { text: '대기', tone: 'work' };
  if (t.status === 'fixing') return { text: '수정 중', tone: 'work' };
  return { text: t.stage ? `${t.stage.split('·')[0]} 중` : '진행 중', tone: 'work' };
}

// Research tasks look things up; the rest change the project, which shows on a screen
function KindIcon({ kind }: { kind: string }) {
  return kind === 'research' ? (
    <svg viewBox="0 0 24 24" className="task-icon" aria-hidden="true">
      <circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M15.5 15.5L21 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" className="task-icon" aria-hidden="true">
      <rect x="3" y="4" width="18" height="12.5" rx="1.5" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M9 20.5h6M12 16.5v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

// One pinned row per task still open; a finished task's row goes and its report stays in the chat
export function TaskCards({ tasks, messages, onLog }: { tasks: Task[]; messages: Message[]; onLog: (taskId: number) => void }) {
  const open = tasks.filter((t) => t.status !== 'done');
  if (!open.length) return null;
  return (
    <section className="task-cards" aria-label="진행 중 업무">
      <h3 className="task-cards-head">
        <svg viewBox="0 0 24 24" className="pin" aria-hidden="true">
          <path d="M14.5 2.5l7 7-2.2.6-4.3 4.3.4 4.6-2.1 2.1-4.1-4.1-5.6 5.6-1.1-1.1 5.6-5.6-4.1-4.1 2.1-2.1 4.6.4 4.3-4.3z" fill="currentColor" />
        </svg>
        진행 중
      </h3>
      {open.map((t) => {
        const asking = messages.some((m) => m.question?.taskId === t.id && m.question.answer === null);
        const p = pill(t, asking);
        const stoppable = ['queued', 'running', 'reviewing', 'fixing', 'waiting'].includes(t.status);
        return (
          <div className="task-card" key={t.id} data-status={t.status} aria-label={`업무 ${t.title}`}>
            <KindIcon kind={t.kind} />
            <span className="task-title">{t.title}</span>
            <span className="task-pill" data-tone={p.tone}>
              {p.text}
            </span>
            {stoppable && (
              <button className="task-link quiet" onClick={() => call('tasks.stop', { id: t.id })}>
                중단
              </button>
            )}
            {['stopped', 'failed'].includes(t.status) && (
              <button className="task-link quiet" onClick={() => call('tasks.resume', { id: t.id })}>
                재개
              </button>
            )}
            <button className="task-link" onClick={() => onLog(t.id)}>
              로그
            </button>
          </div>
        );
      })}
    </section>
  );
}
