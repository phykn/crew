import { useEffect, useState } from 'react';
import type { CrewMember } from '../../main/crew';
import type { Change, Doc, Memory as Note } from '../../main/wiki';
import { call, onChanged } from '../api';
import { Choice } from './Choice';

const KIND: Record<Change['kind'], string> = { create: '생성', edit: '수정', delete: '삭제' };
const ALL = 'all';

// The memory tab: the project wiki everyone shares, and each member's own notes
export function Memory({
  projectId,
  members,
  memberId,
  onMember,
}: {
  projectId: number;
  members: CrewMember[];
  memberId: number | null;
  onMember: (id: number | null) => void;
}) {
  const [view, setView] = useState<'wiki' | 'agents'>(memberId ? 'agents' : 'wiki');
  const [writing, setWriting] = useState(0);
  useEffect(() => {
    if (memberId) setView('agents');
  }, [memberId]);
  return (
    <div className="memory">
      <div className="toolbar">
        <div className="seg" role="group" aria-label="메모리 종류">
          <button aria-pressed={view === 'wiki'} onClick={() => setView('wiki')}>
            위키
          </button>
          <button aria-pressed={view === 'agents'} onClick={() => setView('agents')}>
            기억
          </button>
        </div>
        <span className="toolbar-end">
          {view === 'wiki' ? (
            <button className="button" onClick={() => setWriting((n) => n + 1)}>
              + 새 문서
            </button>
          ) : (
            <Choice
              label="담당자"
              value={memberId ? String(memberId) : ALL}
              options={[
                { value: ALL, label: '모든 담당자' },
                ...members.map((m) => ({ value: String(m.id), label: `${m.role} ${m.nickname}` })),
              ]}
              onChange={(v) => onMember(v === ALL ? null : Number(v))}
            />
          )}
        </span>
      </div>
      {view === 'wiki' ? (
        <WikiView projectId={projectId} writing={writing} />
      ) : (
        <Notes projectId={projectId} members={members} memberId={memberId} />
      )}
    </div>
  );
}

function WikiView({ projectId, writing }: { projectId: number; writing: number }) {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [changes, setChanges] = useState<Change[]>([]);
  const [picked, setPicked] = useState<number | null>(null);
  const [draft, setDraft] = useState<{ title: string; body: string } | null>(null);
  const [asking, setAsking] = useState(false);
  const [refusal, setRefusal] = useState<string | null>(null);
  const [detail, setDetail] = useState<{ id: number; added: string[]; removed: string[] } | null>(null);

  useEffect(() => {
    const load = async () => {
      setDocs(await call('wiki.list', { projectId }));
      setChanges(await call('wiki.timeline', { projectId }));
    };
    load();
    return onChanged((t) => t === 'wiki' && load());
  }, [projectId]);
  // The toolbar's + 새 문서 opens an empty draft here
  useEffect(() => {
    if (!writing) return;
    setPicked(null);
    setDraft({ title: '', body: '' });
  }, [writing]);

  // With nothing picked, the first document shows, so the reader never lands on an empty pane
  const doc = docs.find((d) => d.id === picked) ?? (draft ? null : (docs[0] ?? null));
  async function save() {
    if (!draft?.title.trim()) return;
    await call('wiki.write', { projectId, ...draft });
    setDraft(null);
  }
  async function remove(releaseRule: boolean) {
    const r = await call('wiki.remove', { id: doc!.id, releaseRule });
    if (!r.ok) return setRefusal(r.problems.join(' '));
    setAsking(false);
    setPicked(null);
  }
  async function open(c: Change) {
    setDetail(detail?.id === c.id ? null : { id: c.id, ...(await call('wiki.change', { id: c.id })) });
  }

  return (
    <div className="wiki">
      <div className="wiki-top" data-single={!docs.length || undefined}>
        {docs.length > 0 && (
          <ul className="wiki-toc" aria-label="위키 목차">
            {docs.map((d) => (
              <li key={d.id}>
                <button
                  aria-current={d.id === doc?.id || undefined}
                  onClick={() => {
                    setPicked(d.id);
                    setDraft(null);
                    setAsking(false);
                  }}
                >
                  {d.title}
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="wiki-doc" aria-label="위키 본문">
          {draft ? (
            <>
              <input
                aria-label="문서 제목"
                placeholder="제목"
                value={draft.title}
                disabled={!!doc}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              />
              <textarea
                aria-label="문서 본문"
                value={draft.body}
                onChange={(e) => setDraft({ ...draft, body: e.target.value })}
              />
              <div className="wiki-actions">
                <button className="button" onClick={() => setDraft(null)}>
                  취소
                </button>
                <button className="button primary" onClick={save}>
                  저장
                </button>
              </div>
            </>
          ) : doc ? (
            <>
              <h3>{doc.title}</h3>
              <pre className="wiki-body">{doc.body}</pre>
              <div className="wiki-actions">
                <button className="button" onClick={() => setDraft({ title: doc.title, body: doc.body })}>
                  편집
                </button>
                <button
                  className="button danger"
                  onClick={() => (doc.workflowKind ? (setRefusal(null), setAsking(true)) : remove(false))}
                >
                  삭제
                </button>
              </div>
              {asking && (
                <div className="confirm" role="alertdialog" aria-label="삭제 방법">
                  <p>{refusal ?? '워크플로우 규칙과 연결된 문서입니다.'}</p>
                  <div className="confirm-actions">
                    <button onClick={() => remove(false)}>문서만</button>
                    <button className="danger" onClick={() => remove(true)}>
                      규칙도 해제
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="empty">아직 문서가 없습니다</p>
          )}
        </div>
      </div>
      {changes.length > 0 && (
        <ol className="wiki-timeline" aria-label="변경 타임라인">
          {changes.map((c) => (
            <li key={c.id}>
              <button className="log-line" aria-expanded={detail?.id === c.id} onClick={() => open(c)}>
                <time>{c.at.slice(5, 16).replace('T', ' ')}</time>
                <span className="wiki-kind" data-kind={c.kind}>
                  {KIND[c.kind]}
                </span>
                <span className="log-text">
                  {c.title} <span className="muted">{c.author}</span>
                </span>
              </button>
              {detail?.id === c.id && (
                <div className="log-detail">
                  {detail.added.length > 0 && (
                    <pre className="added">{detail.added.map((l) => `+ ${l}`).join('\n')}</pre>
                  )}
                  {detail.removed.length > 0 && (
                    <pre className="removed">{detail.removed.map((l) => `- ${l}`).join('\n')}</pre>
                  )}
                  {(c.taskId || c.files.length > 0) && (
                    <p className="muted">
                      {c.taskId && `업무 #${c.taskId}`}{' '}
                      {c.files.map((f) => (
                        <code key={f}>{f}</code>
                      ))}
                    </p>
                  )}
                </div>
              )}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function Notes({
  projectId,
  members,
  memberId,
}: {
  projectId: number;
  members: CrewMember[];
  memberId: number | null;
}) {
  const [notes, setNotes] = useState<Note[]>([]);
  useEffect(() => {
    const load = async () => setNotes(await call('memories.list', { projectId, memberId: memberId ?? undefined }));
    load();
    return onChanged((t) => t === 'wiki' && load());
  }, [projectId, memberId]);
  const who = (id: number) => members.find((m) => m.id === id);
  if (!notes.length) return <p className="empty">아직 기억이 없습니다</p>;
  return (
    <ul className="notes" aria-label="에이전트 기억">
      {notes.map((n) => (
        <li key={n.id} className="note">
          <span className="log-who">{who(n.memberId)?.role ?? '?'}</span> {n.text}
          <span className="muted">
            {' '}
            {n.at.slice(5, 16).replace('T', ' ')}
            {n.taskId ? ` · 업무 #${n.taskId}` : ''}
          </span>
        </li>
      ))}
    </ul>
  );
}
