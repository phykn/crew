import { useState } from 'react';
import type { Message, Task } from '../../backend/domain/records';
import { ACTIVE } from '../../shared';
import { call } from '../api';
import { Button } from '../ui/Button';
import { t } from '../lang';

// The pill says where the task is, in the words of its current stage while it works
function pill(task: Task, asking: boolean): { text: string; tone: 'work' | 'wait' | 'stop' } {
  if (asking) return { text: t('task.needsAnswer'), tone: 'wait' };
  if (task.status === 'stopping') return { text: t('task.stopping'), tone: 'wait' };
  if (task.status === 'stopped') return { text: t('task.stopped'), tone: 'stop' };
  if (task.status === 'failed') return { text: t('mark.failed'), tone: 'stop' };
  if (task.status === 'queued') return { text: t('mark.waiting'), tone: 'work' };
  if (task.status === 'fixing') return { text: t('task.fixing'), tone: 'work' };
  return { text: task.stage ? t('camp.doing', { step: task.stage.split(', ')[0] }) : t('task.working'), tone: 'work' };
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

function TaskLink(props: Parameters<typeof Button>[0]) {
  return <Button variant="link" size="sm" className="task-link" {...props} />;
}

// One pinned row per task still open; a finished task's row goes and its report stays in the chat
export function TaskCards({
  tasks,
  messages,
  onLog,
  onAnswer,
}: {
  tasks: Task[];
  messages: Message[];
  onLog: (taskId: number) => void;
  onAnswer: (questionId: number) => void;
}) {
  const open = tasks.filter((task) => task.status !== 'done');
  // Stop asks once inline, since a click cuts off the work in progress
  const [stopping, setStopping] = useState<number | null>(null);
  if (!open.length) return null;
  return (
    <section className="task-cards" aria-label={t('task.open')}>
      {open.map((task) => {
        const asking = messages.find((m) => m.question?.taskId === task.id && m.question.answer === null)?.question;
        const p = pill(task, !!asking);
        const stoppable = ACTIVE.includes(task.status);
        return (
          <div
            className="task-card"
            key={task.id}
            data-status={task.status}
            aria-label={t('task.card', { title: task.title })}
          >
            <KindIcon kind={task.kind} />
            <span className="task-title">{task.title}</span>
            <span className="task-pill" data-tone={p.tone}>
              {p.text}
            </span>
            {asking && <TaskLink onClick={() => onAnswer(asking.id)}>{t('task.answer')}</TaskLink>}
            {stoppable && stopping !== task.id && (
              <TaskLink onClick={() => setStopping(task.id)}>{t('task.stop')}</TaskLink>
            )}
            {stoppable && stopping === task.id && (
              <span className="task-confirm" role="group" aria-label={t('task.stopConfirm')}>
                {t('task.stopAsk')}
                <TaskLink
                  tone="danger"
                  onClick={() => {
                    setStopping(null);
                    call('tasks.stop', { id: task.id });
                  }}
                >
                  {t('task.stop')}
                </TaskLink>
                <TaskLink onClick={() => setStopping(null)}>{t('action.cancel')}</TaskLink>
              </span>
            )}
            {['stopped', 'failed'].includes(task.status) && (
              <TaskLink onClick={() => call('tasks.resume', { id: task.id })}>{t('task.resume')}</TaskLink>
            )}
            <TaskLink onClick={() => onLog(task.id)}>{t('tab.log')}</TaskLink>
          </div>
        );
      })}
    </section>
  );
}
