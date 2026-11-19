import { useEffect, useState } from 'react';
import type { Event, Handback, Session, Task } from '../../main/db';
import type { CrewMember } from '../../main/crew';
import { call, onChanged } from '../api';

// The session's record in time order: when, who, what, and the handback behind it when opened
export function Log({ session, members, taskId, onTask }: { session: Session; members: CrewMember[]; taskId: number | null; onTask: (id: number | null) => void }) {
  const [events, setEvents] = useState<Event[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [open, setOpen] = useState<number | null>(null);
  const [usage, setUsage] = useState<Awaited<ReturnType<typeof call<'usage.list'>>>>([]);

  useEffect(() => {
    const load = async () => {
      setEvents(await call('events.list', { sessionId: session.id }));
      setTasks(await call('tasks.list', { sessionId: session.id }));
      setUsage(await call('usage.list', { sessionId: session.id }));
    };
    load();
    return onChanged((topic) => ['tasks', 'messages'].includes(topic) && load());
  }, [session.id]);

  const shown = events.filter((e) => taskId === null || e.taskId === taskId);
  const who = (id: number | null) => members.find((m) => m.id === id);
  return (
    <div className="log">
      <select className="log-filter" aria-label="업무 선택" value={taskId ?? ''} onChange={(e) => onTask(e.target.value ? Number(e.target.value) : null)}>
        <option value="">모든 업무</option>
        {tasks.map((t) => (
          <option key={t.id} value={t.id}>
            #{t.id} {t.title}
          </option>
        ))}
      </select>
      {usage.length > 0 && (
        <table className="usage" aria-label="사용량">
          <thead>
            <tr>
              <th>역할</th>
              <th>모델</th>
              <th>횟수</th>
              <th>시간</th>
              <th>토큰 (입력/출력)</th>
              <th>비용</th>
            </tr>
          </thead>
          <tbody>
            {usage.map((u) => (
              <tr key={`${u.memberId}-${u.model}`}>
                <td style={{ color: who(u.memberId)?.color }}>{who(u.memberId)?.role ?? '?'}</td>
                <td>{u.model}</td>
                <td>{u.runs}</td>
                <td>{Math.round(u.seconds)}초</td>
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
        {shown.map((e) => {
          const m = who(e.memberId);
          const hb = e.kind === 'step' ? readHandback(e.detail) : null;
          return (
            <li key={e.id} className="log-row" data-kind={e.kind}>
              <button className="log-line" disabled={!hb} aria-expanded={hb ? open === e.id : undefined} onClick={() => setOpen(open === e.id ? null : e.id)}>
                <time>{e.at.slice(11, 19)}</time>
                <span className="log-who" style={m ? { color: m.color } : undefined}>
                  {m ? m.role : '앱'}
                </span>
                <span className="log-text">{e.text}</span>
              </button>
              {hb && open === e.id && <HandbackView hb={hb} />}
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
        <section>
          <h4>변경 파일</h4>
          <ul>{hb.files.map((f) => <li key={f}><code>{f}</code></li>)}</ul>
        </section>
      )}
      {hb.points.length > 0 && (
        <section>
          <h4>검토 의견</h4>
          <ul>{hb.points.map((p) => <li key={p}>{p}</li>)}</ul>
        </section>
      )}
      {hb.checks.length > 0 && (
        <section>
          <h4>테스트 명령과 출력</h4>
          <pre>{hb.checks.join('\n')}</pre>
        </section>
      )}
      {hb.body && <p className="log-body">{hb.body}</p>}
    </div>
  );
}

// Step events carry the handback; other kinds keep their own detail
function readHandback(detail: string | null): Handback | null {
  if (!detail) return null;
  const d = JSON.parse(detail);
  return d && Array.isArray(d.files) && Array.isArray(d.checks) ? d : null;
}
