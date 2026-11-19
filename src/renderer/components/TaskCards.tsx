import type { Message, Task } from '../../main/db';
import { call } from '../api';

const STATUS: Record<Task['status'], string> = {
  queued: '대기',
  running: '진행 중',
  reviewing: '검토 중',
  fixing: '수정 중',
  waiting: '답변 대기',
  stopping: '중단 중',
  stopped: '중단됨',
  failed: '실패',
  done: '완료',
};

// One pinned card per task still open; a finished task's card goes and its report stays in the chat
export function TaskCards({ tasks, messages, onLog }: { tasks: Task[]; messages: Message[]; onLog: (taskId: number) => void }) {
  const open = tasks.filter((t) => t.status !== 'done');
  if (!open.length) return null;
  return (
    <div className="task-cards" aria-label="진행 중 업무">
      {open.map((t) => {
        const asking = messages.some((m) => m.question?.taskId === t.id && m.question.answer === null);
        const stoppable = ['queued', 'running', 'reviewing', 'fixing', 'waiting'].includes(t.status);
        return (
          <div className="task-card" key={t.id} data-status={t.status} aria-label={`업무 ${t.title}`}>
            <div className="task-head">
              <span className="task-title">{t.title}</span>
              <span className="task-status">{STATUS[t.status]}</span>
            </div>
            <div className="task-stage">{t.stage || ' '}</div>
            <div className="task-actions">
              {asking && <span className="task-asking">답변 필요</span>}
              {stoppable && (
                <button onClick={() => call('tasks.stop', { id: t.id })}>중단</button>
              )}
              {['stopped', 'failed'].includes(t.status) && <button onClick={() => call('tasks.resume', { id: t.id })}>재개</button>}
              <button onClick={() => onLog(t.id)}>로그</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
