import { useEffect, useState } from 'react';
import type { Event, Handback, Session, Task } from '../../backend/db';
import type { CrewMember } from '../../backend/crew/shipped';
import { call, follow } from '../api';
import { clock, duration } from '../time';
import { Button } from '../ui/Button';
import { Choice } from '../ui/Choice';
import { Toolbar, ToolbarEnd } from '../ui/Toolbar';
import { MarkIcon } from './Icons';
import type { ChangesTarget } from './Changes';

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
  const who = (id: number | null) => members.find((m) => m.id === id);
  const runs = usage.reduce((n, u) => n + u.runs, 0);
  const cost = usage.reduce((n, u) => n + u.costUsd, 0);
  const seconds = usage.reduce((n, u) => n + u.seconds, 0);
  return (
    <div className="log">
      <Toolbar>
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
          <ToolbarEnd>
            <Button
              variant="link"
              className="usage-toggle"
              aria-expanded={showUsage}
              title="사용량"
              onClick={() => setShowUsage(!showUsage)}
            >
              <span>{runs}회 실행</span>
              <span>{duration(seconds)}</span>
              <span>${cost.toFixed(3)}</span>
            </Button>
          </ToolbarEnd>
        )}
      </Toolbar>
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
        {shown.map((e) => {
          const m = who(e.memberId);
          const hb = e.kind === 'step' ? readHandback(e.detail) : null;
          const errors = e.kind === 'step' && !hb ? readErrors(e.detail) : null;
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
                <span className="log-who">{m ? m.role : '앱'}</span>
                <span className="log-text">{m ? e.text.replace(new RegExp(`^${m.role}: `), '') : e.text}</span>
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
          <h4>바뀐 파일</h4>
          <ul className="files">
            {hb.files.map((f) => (
              <li key={f}>
                {onFile ? (
                  <Button variant="link" className="file-link" title="변경 내용 보기" onClick={() => onFile(f)}>
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

// What became of a line, read from what it records rather than its wording
function markOf(e: Event, hb: Handback | null, errors: string[] | null) {
  const mark = (state: 'ok' | 'bad' | 'wait' | 'work' | 'info', label: string) => ({ state, label });
  if (e.kind === 'status') {
    if (e.detail === 'done') return mark('ok', '완료');
    if (e.detail === 'failed') return mark('bad', '실패');
    if (e.detail === 'stopping' || e.detail === 'stopped') return mark('wait', '중단');
    if (e.detail === 'waiting') return mark('wait', '대기');
    return mark('work', '진행');
  }
  if (errors) return mark('bad', '실패');
  if (hb) return hb.verdict === 'rework' ? mark('wait', '수정 요청') : mark('ok', '완료');
  if (e.kind === 'step') return e.detail ? mark('wait', '보완 요청') : mark('work', '시작');
  if (e.kind === 'denied') return mark('bad', '거부');
  if (e.kind === 'approved') return mark('ok', '승인');
  if (e.kind === 'refused') return mark('wait', '거절');
  if (e.kind === 'waiting' || e.kind === 'stale') return mark('wait', '대기');
  return mark('info', '기록');
}

// The same error repeated across retries shows once with its count
function group(errors: string[]): [string, number][] {
  const counts = new Map<string, number>();
  for (const e of errors) counts.set(e, (counts.get(e) ?? 0) + 1);
  return [...counts];
}

// Step events carry the handback; other kinds keep their own detail
function readHandback(detail: string | null): Logged | null {
  if (!detail) return null;
  const d = JSON.parse(detail);
  return d && Array.isArray(d.files) && Array.isArray(d.checks) ? d : null;
}

// A failed step keeps each attempt's error, shown when its line is opened
function readErrors(detail: string | null): string[] | null {
  const d = detail ? JSON.parse(detail) : null;
  return d && Array.isArray(d.errors) ? d.errors : null;
}
