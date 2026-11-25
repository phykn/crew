import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
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
type Logged = Handback & { version?: number };

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
  const [usage, setUsage] = useState<Awaited<ReturnType<typeof call<'usage.list'>>>>([]);
  const [showUsage, setShowUsage] = useState(false);
  useEffect(() => {
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
      <LogList
        sessionId={session.id}
        events={events}
        tasks={tasks}
        members={members}
        taskId={taskId}
        showUsage={showUsage}
        onChanges={onChanges}
      />
    </div>
  );
}

function LogList({
  sessionId,
  events,
  tasks,
  members,
  taskId,
  showUsage,
  onChanges,
}: {
  sessionId: number;
  events: Event[];
  tasks: Task[];
  members: CrewMember[];
  taskId: number | null;
  showUsage: boolean;
  onChanges: (target: ChangesTarget) => void;
}) {
  const [open, setOpen] = useState<number | null>(null);
  const scroll = useRef<HTMLOListElement>(null);
  const expanded = useRef<HTMLElement>(null);
  const stick = useRef(true);
  const size = useRef({ height: 0, content: 0 });
  const observer = useRef<ResizeObserver | null>(null);
  const rows = useRef(new Set<HTMLLIElement>());
  const observeRow = useCallback((row: HTMLLIElement | null) => {
    if (!row) return;
    rows.current.add(row);
    observer.current?.observe(row);
    return () => {
      observer.current?.unobserve(row);
      rows.current.delete(row);
    };
  }, []);
  const followBottom = useCallback(() => {
    const el = scroll.current;
    if (!el) return;
    if (stick.current) el.scrollTop = el.scrollHeight;
    size.current = { height: el.clientHeight, content: el.scrollHeight };
  }, []);

  useLayoutEffect(() => {
    const el = scroll.current;
    if (!el) return;
    const watcher = new ResizeObserver(followBottom);
    observer.current = watcher;
    watcher.observe(el);
    for (const row of rows.current) watcher.observe(row);
    return () => {
      watcher.disconnect();
      observer.current = null;
    };
  }, [followBottom]);

  const entries = useMemo(
    () =>
      events.map((event) => {
        const detail = event.kind === 'step' && event.detail ? JSON.parse(event.detail) : null;
        const handback = readHandback(detail);
        return { event, handback, errors: handback ? null : readErrors(detail) };
      }),
    [events],
  );
  const shown = entries.filter(({ event }) => taskId === null || event.taskId === taskId);
  const latest = shown.at(-1)?.event.id;
  useLayoutEffect(() => {
    stick.current = true;
  }, [sessionId, taskId]);

  useLayoutEffect(() => {
    if (open === null) return;
    const el = scroll.current;
    const row = expanded.current;
    if (!el || !row) return;
    const viewport = el.getBoundingClientRect();
    const bounds = row.getBoundingClientRect();
    const top = viewport.top + el.clientTop;
    if (bounds.top < top) {
      el.scrollTop += bounds.top - top;
    } else if (bounds.bottom > top + el.clientHeight) {
      el.scrollTop += Math.min(bounds.bottom - top - el.clientHeight, bounds.top - top);
    }
  }, [open]);

  useLayoutEffect(followBottom, [followBottom, sessionId, taskId, latest, open, showUsage]);

  const who = (id: number | null) => members.find((m) => m.id === id);
  return (
    <ol
      ref={scroll}
      className="log-list"
      aria-label={t('log.list')}
      onScroll={({ currentTarget: el }) => {
        if (size.current.height !== el.clientHeight || size.current.content !== el.scrollHeight) return;
        stick.current =
          el.scrollHeight - el.scrollTop - el.clientHeight <= 2 * parseFloat(getComputedStyle(el).lineHeight);
      }}
    >
      {shown.map(({ event: e, handback: hb, errors }) => {
        const role = who(e.memberId)?.role ?? (e.memberId && e.say.role ? roleName(e.say.role) : null);
        const opens = !!(hb || errors);
        const mark = markOf(e, hb, errors);
        return (
          <li
            key={e.id}
            ref={observeRow}
            className="log-row"
            data-kind={e.kind}
            data-bad={mark.state === 'bad' || undefined}
          >
            <Button
              variant="row"
              className="log-line"
              disabled={!opens}
              aria-expanded={opens ? open === e.id : undefined}
              onClick={({ currentTarget }) => {
                expanded.current = currentTarget.parentElement;
                if (open !== e.id) stick.current = false;
                setOpen(open === e.id ? null : e.id);
              }}
            >
              <time>{clock(e.at, true)}</time>
              <span className="log-mark" data-state={mark.state} role="img" aria-label={mark.label} title={mark.label}>
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
  );
}

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

function group(errors: string[]): [string, number][] {
  const counts = new Map<string, number>();
  for (const e of errors) counts.set(e, (counts.get(e) ?? 0) + 1);
  return [...counts];
}

function readHandback(d: Record<string, unknown> | null): Logged | null {
  return d && Array.isArray(d.files) && Array.isArray(d.checks) ? (d as Logged) : null;
}

function readErrors(d: Record<string, unknown> | null): string[] | null {
  return d && Array.isArray(d.errors) ? d.errors : null;
}
