import { useEffect, useState } from 'react';
import type { Event, Handback, Session, Task } from '../../backend/db';
import type { CrewMember } from '../../backend/crew/shipped';
import { call, onChanged } from '../api';
import { clock, duration } from '../time';
import { Choice } from './Choice';

const ALL = 'all';

// The session's record in time order: when, who, what, and the handback behind it when opened
export function Log({
  session,
  members,
  taskId,
  onTask,
}: {
  session: Session;
  members: CrewMember[];
  taskId: number | null;
  onTask: (id: number | null) => void;
}) {
  const [events, setEvents] = useState<Event[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [open, setOpen] = useState<number | null>(null);
  const [usage, setUsage] = useState<Awaited<ReturnType<typeof call<'usage.list'>>>>([]);
  const [showUsage, setShowUsage] = useState(false);

  useEffect(() => {
    const load = async () => {
      setEvents(await call('events.list', { sessionId: session.id }));
      setTasks(await call('tasks.list', { sessionId: session.id }));
      setUsage(await call('usage.list', { sessionId: session.id }));
    };
    load();
    // Crew changes are logged too, such as a hire or a member leaving
    return onChanged((topic) => ['tasks', 'messages', 'members'].includes(topic) && load());
  }, [session.id]);

  const shown = events.filter((e) => taskId === null || e.taskId === taskId);
  const who = (id: number | null) => members.find((m) => m.id === id);
  const runs = usage.reduce((n, u) => n + u.runs, 0);
  const cost = usage.reduce((n, u) => n + u.costUsd, 0);
  const seconds = usage.reduce((n, u) => n + u.seconds, 0);
  return (
    <div className="log">
      <div className="toolbar">
        <Choice
          label="업무 선택"
          value={taskId ? String(taskId) : ALL}
          options={[
            { value: ALL, label: '모든 업무' },
            ...tasks.map((t) => ({ value: String(t.id), label: `#${t.id} ${t.title}` })),
          ]}
          onChange={(v) => onTask(v === ALL ? null : Number(v))}
        />
        {runs > 0 && (
          <button
            className="toolbar-end usage-toggle"
            aria-expanded={showUsage}
            onClick={() => setShowUsage(!showUsage)}
          >
            {runs}회 · {duration(seconds)} · ${cost.toFixed(3)}
          </button>
        )}
      </div>
      {showUsage && (
        <table className="usage" aria-label="사용량">
          <thead>
            <tr>
              <th>역할</th>
              <th>모델</th>
              <th>횟수</th>
              <th>시간</th>
              <th>토큰</th>
              <th>비용</th>
            </tr>
          </thead>
          <tbody>
            {usage.map((u) => (
              <tr key={`${u.memberId}-${u.model}`}>
                <td>{who(u.memberId)?.role ?? '?'}</td>
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
      <ol className="log-list" aria-label="업무 로그">
        {shown.map((e, i) => {
          const m = who(e.memberId);
          const hb = e.kind === 'step' ? readHandback(e.detail) : null;
          const errors = e.kind === 'step' && !hb ? readErrors(e.detail) : null;
          const opens = !!(hb || errors);
          // A refusal, a failed task, or a step that failed every retry, read from the record rather than the wording
          const bad = e.kind === 'denied' || (e.kind === 'status' && e.detail === 'failed') || !!errors;
          // A minute already shown on the line above is not repeated
          const minute = clock(e.at);
          const same = i > 0 && shown[i - 1].at.slice(0, 16) === e.at.slice(0, 16);
          return (
            <li key={e.id} className="log-row" data-kind={e.kind} data-bad={bad || undefined}>
              <button
                className="log-line"
                disabled={!opens}
                aria-expanded={opens ? open === e.id : undefined}
                onClick={() => setOpen(open === e.id ? null : e.id)}
              >
                <time>{same ? '' : minute}</time>
                <span className="log-who">{m ? m.role : '앱'}</span>
                <span className="log-text">{m ? e.text.replace(new RegExp(`^${m.role}: `), '') : e.text}</span>
              </button>
              {hb && open === e.id && <HandbackView hb={hb} />}
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

function HandbackView({ hb }: { hb: Handback }) {
  return (
    <div className="log-detail">
      {hb.files.length > 0 && (
        <ul className="files">
          {hb.files.map((f) => (
            <li key={f}>
              <code>{f}</code>
            </li>
          ))}
        </ul>
      )}
      {hb.points.length > 0 && (
        <section>
          <h4>검토 의견</h4>
          <ul>
            {hb.points.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </section>
      )}
      {hb.checks.length > 0 && (
        <section>
          <h4>검사</h4>
          <pre>{hb.checks.join('\n')}</pre>
        </section>
      )}
      {hb.body && <p className="log-body">{hb.body}</p>}
    </div>
  );
}

// The same error repeated across retries shows once with its count
function group(errors: string[]): [string, number][] {
  const counts = new Map<string, number>();
  for (const e of errors) counts.set(e, (counts.get(e) ?? 0) + 1);
  return [...counts];
}

// Step events carry the handback; other kinds keep their own detail
function readHandback(detail: string | null): Handback | null {
  if (!detail) return null;
  const d = JSON.parse(detail);
  return d && Array.isArray(d.files) && Array.isArray(d.checks) ? d : null;
}

// A failed step keeps each attempt's error, shown when its line is opened
function readErrors(detail: string | null): string[] | null {
  const d = detail ? JSON.parse(detail) : null;
  return d && Array.isArray(d.errors) ? d.errors : null;
}
