import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { Event, Handback, Session, Task } from '../../backend/domain/records';
import type { CrewMember } from '../../backend/domain/crew';
import { call, follow } from '../api';
import { clock, duration } from '../time';
import { Button } from '../ui/Button';
import { Choice } from '../ui/Choice';
import { Toolbar, ToolbarEnd } from '../ui/Toolbar';
import { MarkIcon } from './Icons';
import type { ChangesTarget } from './Changes';
import { roleName, say } from '../locale';
import { t } from '../lang';

const ALL = 'all';
// A making step's log line also names its version when git kept it
type Logged = Handback & { version?: number };

// The session's record in time order: when, who, what, and the handback behind it when opened
export function Log({
  session,
  members,
  taskId,
  onTask,
  onChanges,
}: {
  session: Session;
  members: CrewMember[];
  taskId: number | null;
  onTask: (id: number | null) => void;
  onChanges: (target: ChangesTarget) => void;
}) {
  const [events, setEvents] = useState<Event[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [open, setOpen] = useState<number | null>(null);
  const [usage, setUsage] = useState<Awaited<ReturnType<typeof call<'usage.list'>>>>([]);
  const [showUsage, setShowUsage] = useState(false);
  const scroll = useRef<HTMLOListElement>(null);

  useEffect(() => {
    // Crew changes are logged too, such as a hire or a member leaving
    return follow(
      () =>
        Promise.all([
          call('events.list', { sessionId: session.id }),
          call('tasks.list', { sessionId: session.id }),
          call('usage.list', { sessionId: session.id }),
        ]),
      ([e, t, u]) => {
        setEvents(e);
        setTasks(t);
        setUsage(u);
      },
      (topic) => ['tasks', 'messages', 'members'].includes(topic),
      session.id,
    );
  }, [session.id]);

  const shown = events.filter((e) => taskId === null || e.taskId === taskId);
  const latest = shown.at(-1)?.id;
  useLayoutEffect(() => {
    const el = scroll.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [session.id, taskId, latest]);

  const who = (id: number | null) => members.find((m) => m.id === id);
  const runs = usage.reduce((n, u) => n + u.runs, 0);
  const cost = usage.reduce((n, u) => n + u.costUsd, 0);
  const seconds = usage.reduce((n, u) => n + u.seconds, 0);
  return (
    <div className="log">
      <Toolbar>
        <Choice
          label={t('log.task')}
          value={taskId ? String(taskId) : ALL}
          options={[
            { value: ALL, label: t('log.allTasks') },
            ...tasks.map((t) => ({ value: String(t.id), label: `#${t.id} ${t.title}` })),
          ]}
          onChange={(v) => onTask(v === ALL ? null : Number(v))}
        />
        {runs > 0 && (
          <ToolbarEnd>
            <Button
              variant="link"
              tone="muted"
              size="sm"
              className="usage-toggle"
              aria-expanded={showUsage}
              title={t('log.usage')}
              onClick={() => setShowUsage(!showUsage)}
            >
              <span>{t('log.runs', { n: runs })}</span>
              <span>{duration(seconds)}</span>
              <span>${cost.toFixed(3)}</span>
            </Button>
          </ToolbarEnd>
        )}
      </Toolbar>
      {showUsage && (
        <table className="usage" aria-label={t('log.usage')}>
          <thead>
            <tr>
              <th>{t('log.role')}</th>
              <th>{t('log.model')}</th>
              <th>{t('log.count')}</th>
              <th>{t('log.time')}</th>
              <th>{t('log.tokens')}</th>
              <th>{t('log.cost')}</th>
            </tr>
          </thead>
          <tbody>
            {usage.map((u) => (
              <tr key={`${u.memberId}-${u.model}`}>
                {/* A copy that left the crew is still named by its role */}
                <td>{who(u.memberId)?.role ?? u.role}</td>
                <td>{u.model}</td>
                <td>{u.runs}</td>
                <td>{duration(u.seconds)}</td>
                <td>
                  {u.inputTokens.toLocaleString()} / {u.outputTokens.toLocaleString()}
                </td>
                <td>${u.costUsd.toFixed(3)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <ol ref={scroll} className="log-list" aria-label={t('log.list')}>
        {shown.map((e) => {
          // A copy that left is gone from the list, so its line falls back to the role it says
          const role = who(e.memberId)?.role ?? (e.memberId && e.say.role ? roleName(e.say.role) : null);
          const detail = e.kind === 'step' && e.detail ? JSON.parse(e.detail) : null;
          const hb = e.kind === 'step' ? readHandback(detail) : null;
          const errors = e.kind === 'step' && !hb ? readErrors(detail) : null;
          const opens = !!(hb || errors);
          const mark = markOf(e, hb, errors);
          return (
            <li key={e.id} className="log-row" data-kind={e.kind} data-bad={mark.state === 'bad' || undefined}>
              <Button
                variant="row"
                className="log-line"
                disabled={!opens}
                aria-expanded={opens ? open === e.id : undefined}
                onClick={() => setOpen(open === e.id ? null : e.id)}
              >
                <time>{clock(e.at, true)}</time>
                <span
                  className="log-mark"
                  data-state={mark.state}
                  role="img"
                  aria-label={mark.label}
                  title={mark.label}
                >
                  <MarkIcon state={mark.state} />
                </span>
                <span className="log-who">{role ?? t('log.app')}</span>
                <span className="log-text">{role ? say(e.say).replace(`${role}: `, '') : say(e.say)}</span>
              </Button>
              {hb && open === e.id && (
                <HandbackView
                  hb={hb}
                  onFile={
                    hb.version && e.taskId
                      ? (file) =>
                          onChanges({
                            taskId: e.taskId!,
                            title: tasks.find((t) => t.id === e.taskId)?.title ?? `#${e.taskId}`,
                            versionId: hb.version!,
                            file,
                          })
                      : null
                  }
                />
              )}
              {errors && open === e.id && (
                <div className="log-detail">
                  <ul>
                    {group(errors).map(([text, n]) => (
                      <li key={text}>
                        <code>{text}</code>
                        {n > 1 && <span className="muted"> ×{n}</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

// A file of a version git kept opens its diff; otherwise the name is just shown
function HandbackView({ hb, onFile }: { hb: Logged; onFile: ((file: string) => void) | null }) {
  return (
    <div className="log-detail">
      {hb.files.length > 0 && (
        <section>
          <h4>{t('diff.files')}</h4>
          <ul className="files">
            {hb.files.map((f) => (
              <li key={f}>
                {onFile ? (
                  <Button variant="link" title={t('diff.show')} onClick={() => onFile(f)}>
                    <code>{f}</code>
                  </Button>
                ) : (
                  <code>{f}</code>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
      {hb.points.length > 0 && (
        <section>
          <h4>{t('log.notes')}</h4>
          <ul>
            {hb.points.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </section>
      )}
      {hb.notes?.length > 0 && (
        <section>
          <h4>{t('log.remarks')}</h4>
          <ul>
            {hb.notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </section>
      )}
      {hb.checks.length > 0 && (
        <section>
          <h4>{t('log.checks')}</h4>
          <pre>{hb.checks.join('\n')}</pre>
        </section>
      )}
      {hb.body && <p className="log-body">{hb.body}</p>}
    </div>
  );
}

// What became of a line, read from what it records rather than its wording
function markOf(e: Event, hb: Handback | null, errors: string[] | null) {
  const mark = (state: 'ok' | 'bad' | 'wait' | 'work' | 'info', label: string) => ({ state, label });
  if (e.kind === 'status') {
    if (e.detail === 'done') return mark('ok', t('mark.done'));
    if (e.detail === 'failed') return mark('bad', t('mark.failed'));
    if (e.detail === 'stopping' || e.detail === 'stopped') return mark('wait', t('mark.stopped'));
    if (e.detail === 'waiting') return mark('wait', t('mark.waiting'));
    return mark('work', t('mark.working'));
  }
  if (errors) return mark('bad', t('mark.failed'));
  if (hb) return hb.verdict === 'rework' ? mark('wait', t('mark.rework')) : mark('ok', t('mark.done'));
  if (e.kind === 'step') return e.detail ? mark('wait', t('mark.incomplete')) : mark('work', t('mark.started'));
  if (e.kind === 'denied') return mark('bad', t('mark.denied'));
  if (e.kind === 'approved') return mark('ok', t('mark.approved'));
  if (e.kind === 'refused') return mark('wait', t('mark.refused'));
  if (e.kind === 'waiting' || e.kind === 'stale') return mark('wait', t('mark.waiting'));
  return mark('info', t('mark.note'));
}

// The same error repeated across retries shows once with its count
function group(errors: string[]): [string, number][] {
  const counts = new Map<string, number>();
  for (const e of errors) counts.set(e, (counts.get(e) ?? 0) + 1);
  return [...counts];
}

// Step events carry the handback; other kinds keep their own detail
function readHandback(d: Record<string, unknown> | null): Logged | null {
  return d && Array.isArray(d.files) && Array.isArray(d.checks) ? (d as Logged) : null;
}

// A failed step keeps each attempt's error, shown when its line is opened
function readErrors(d: Record<string, unknown> | null): string[] | null {
  return d && Array.isArray(d.errors) ? d.errors : null;
}
