import { useEffect, useState } from 'react';
import type { CrewMember } from '../../main/crew';
import type { Change, Doc, Memory as Note } from '../../main/wiki';
import { call, onChanged } from '../api';

const KIND: Record<Change['kind'], string> = { create: '생성', edit: '수정', delete: '삭제' };

// The memory tab: the project wiki everyone shares, and each member's own notes
export function Memory({ projectId, members, memberId, onMember }: { projectId: number; members: CrewMember[]; memberId: number | null; onMember: (id: number | null) => void }) {
  const [view, setView] = useState<'wiki' | 'agents'>(memberId ? 'agents' : 'wiki');
  useEffect(() => {
    if (memberId) setView('agents');
  }, [memberId]);
  return (
    <div className="memory">
      <div className="memory-switch" role="group" aria-label="메모리 종류">
        <button aria-pressed={view === 'wiki'} onClick={() => setView('wiki')}>프로젝트 위키</button>
        <button aria-pressed={view === 'agents'} onClick={() => setView('agents')}>에이전트 기억</button>
      </div>
      {view === 'wiki' ? <WikiView projectId={projectId} /> : <Notes projectId={projectId} members={members} memberId={memberId} onMember={onMember} />}
    </div>
  );
}

function WikiView({ projectId }: { projectId: number }) {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [changes, setChanges] = useState<Change[]>([]);
  const [picked, setPicked] = useState<number | null>(null);
  const [draft, setDraft] = useState<{ title: string; body: string } | null>(null);
  const [asking, setAsking] = useState(false);
  const [detail, setDetail] = useState<{ id: number; added: string[]; removed: string[] } | null>(null);

  useEffect(() => {
    const load = async () => {
      setDocs(await call('wiki.list', { projectId }));
      setChanges(await call('wiki.timeline', { projectId }));
    };
    load();
    return onChanged((t) => t === 'wiki' && load());
  }, [projectId]);

  const doc = docs.find((d) => d.id === picked) ?? null;
  async function save() {
    if (!draft?.title.trim()) return;
    await call('wiki.write', { projectId, ...draft });
    setDraft(null);
  }
  async function remove(releaseRule: boolean) {
    await call('wiki.remove', { id: doc!.id, releaseRule });
    setAsking(false);
    setPicked(null);
  }
  async function open(c: Change) {
    setDetail(detail?.id === c.id ? null : { id: c.id, ...(await call('wiki.change', { id: c.id })) });
  }

  return (
    <div className="wiki">
      <div className="wiki-top">
        <ul className="wiki-toc" aria-label="위키 목차">
          {docs.map((d) => (
            <li key={d.id}>
              <button aria-current={d.id === picked || undefined} onClick={() => { setPicked(d.id); setDraft(null); setAsking(false); }}>
                {d.title}
              </button>
            </li>
          ))}
          <li>
            <button className="wiki-new" onClick={() => { setPicked(null); setDraft({ title: '', body: '' }); }}>+ 새 문서</button>
          </li>
        </ul>
        <div className="wiki-doc" aria-label="위키 본문">
          {draft ? (
            <>
              <input aria-label="문서 제목" value={draft.title} disabled={!!doc} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
              <textarea aria-label="문서 본문" value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} />
              <div className="wiki-actions">
                <button onClick={() => setDraft(null)}>취소</button>
                <button onClick={save}>저장</button>
              </div>
            </>
          ) : doc ? (
            <>
              <h3>{doc.title}</h3>
              <pre className="wiki-body">{doc.body}</pre>
              <div className="wiki-actions">
                <button onClick={() => setDraft({ title: doc.title, body: doc.body })}>편집</button>
                <button onClick={() => (doc.workflowKind ? setAsking(true) : remove(false))}>삭제</button>
              </div>
              {asking && (
                <div className="confirm" role="alertdialog" aria-label="삭제 방법">
                  <p>이 문서는 적용 중인 워크플로우 규칙과 연결되어 있습니다.</p>
                  <div className="confirm-actions">
                    <button onClick={() => remove(false)}>문서만</button>
                    <button className="danger" onClick={() => remove(true)}>규칙도 해제</button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="muted">문서를 고르세요.</p>
          )}
        </div>
      </div>
      <h4 className="wiki-head">변경 타임라인</h4>
      <ol className="wiki-timeline" aria-label="변경 타임라인">
        {changes.map((c) => (
          <li key={c.id}>
            <button className="log-line" aria-expanded={detail?.id === c.id} onClick={() => open(c)}>
              <time>{c.at.slice(5, 16).replace('T', ' ')}</time>
              <span className="wiki-kind" data-kind={c.kind}>{KIND[c.kind]}</span>
              <span className="log-text">
                {c.title} <span className="muted">· {c.author}</span>
              </span>
            </button>
            {detail?.id === c.id && (
              <div className="log-detail">
                {detail.added.length > 0 && <pre className="added">{detail.added.map((l) => `+ ${l}`).join('\n')}</pre>}
                {detail.removed.length > 0 && <pre className="removed">{detail.removed.map((l) => `- ${l}`).join('\n')}</pre>}
                {c.taskId && <p className="muted">출처: 업무 #{c.taskId}</p>}
                {c.files.length > 0 && <p className="muted">파일: {c.files.join(', ')}</p>}
              </div>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}

function Notes({ projectId, members, memberId, onMember }: { projectId: number; members: CrewMember[]; memberId: number | null; onMember: (id: number | null) => void }) {
  const [notes, setNotes] = useState<Note[]>([]);
  useEffect(() => {
    const load = async () => setNotes(await call('memories.list', { projectId, memberId: memberId ?? undefined }));
    load();
    return onChanged((t) => t === 'wiki' && load());
  }, [projectId, memberId]);
  const who = (id: number) => members.find((m) => m.id === id);
  return (
    <div className="notes">
      <select className="log-filter" aria-label="담당자" value={memberId ?? ''} onChange={(e) => onMember(e.target.value ? Number(e.target.value) : null)}>
        <option value="">모든 담당자</option>
        {members.map((m) => (
          <option key={m.id} value={m.id}>
            {m.role} {m.nickname}
          </option>
        ))}
      </select>
      <ul className="log-list" aria-label="에이전트 기억">
        {notes.map((n) => (
          <li key={n.id} className="note">
            <span className="log-who">{who(n.memberId)?.role ?? '?'}</span> {n.text}
            <span className="muted"> · {n.at.slice(5, 16).replace('T', ' ')}{n.taskId ? ` · 업무 #${n.taskId}` : ''}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
