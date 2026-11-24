import { useEffect, useState } from 'react';
import type { CrewMember } from '../../backend/domain/crew';
import type { Change, Doc, Memory as Note } from '../../backend/domain/wiki';
import { stamp } from '../time';
import { roleName } from '../locale';
import { call, follow } from '../api';
import { Button } from '../ui/Button';
import { Choice } from '../ui/Choice';
import { Empty } from '../ui/Empty';
import { Segmented } from '../ui/Segmented';
import { Toolbar, ToolbarEnd } from '../ui/Toolbar';
import { type Graph, WikiGraph } from './WikiGraph';

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
  const [graph, setGraph] = useState(false);
  useEffect(() => {
    if (memberId) setView('agents');
  }, [memberId]);
  return (
    <div className="memory">
      <Toolbar>
        <Segmented
          label="메모리 종류"
          value={view}
          options={[
            { value: 'wiki', label: '위키' },
            { value: 'agents', label: '기억' },
          ]}
          onChange={setView}
        />
        <ToolbarEnd>
          {view === 'wiki' ? (
            <Button pressed={graph} onClick={() => setGraph(!graph)}>
              그래프
            </Button>
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
        </ToolbarEnd>
      </Toolbar>
      {view === 'wiki' ? (
        <WikiView projectId={projectId} graph={graph} onList={() => setGraph(false)} />
      ) : (
        <Notes projectId={projectId} members={members} memberId={memberId} />
      )}
    </div>
  );
}

function WikiView({ projectId, graph, onList }: { projectId: number; graph: boolean; onList: () => void }) {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [changes, setChanges] = useState<Change[]>([]);
  const [links, setLinks] = useState<Graph>({ nodes: [], edges: [] });
  const [picked, setPicked] = useState<string | null>(null);

  useEffect(() => {
    return follow(
      () =>
        Promise.all([
          call('wiki.list', { projectId }),
          call('wiki.timeline', { projectId }),
          call('wiki.graph', { projectId }),
        ]),
      ([d, c, l]) => {
        setDocs(d);
        setChanges(c);
        setLinks(l);
      },
      (t) => t === 'wiki',
    );
  }, [projectId]);
  // A pick belongs to the project it was made in
  useEffect(() => setPicked(null), [projectId]);

  // With nothing picked, the first document shows, so the reader never lands on an empty pane
  const doc = docs.find((d) => d.title === picked) ?? docs[0] ?? null;
  // A linked title opens its document; one still to be written has nothing to open
  function openTitle(title: string) {
    if (!docs.some((d) => d.title === title)) return;
    setPicked(title);
    onList();
  }

  if (graph) return <WikiGraph graph={links} onOpen={openTitle} />;
  return (
    <div className="wiki">
      <div className="wiki-top" data-single={!docs.length || undefined}>
        {docs.length > 0 && (
          <ul className="wiki-toc" aria-label="위키 목차">
            {docs.map((d) => (
              <li key={d.title}>
                <Button
                  variant="row"
                  className="wiki-toc-item"
                  aria-current={d.title === doc?.title || undefined}
                  onClick={() => setPicked(d.title)}
                >
                  {d.title}
                </Button>
              </li>
            ))}
          </ul>
        )}
        <div className="wiki-doc" aria-label="위키 본문">
          {doc ? (
            <>
              <header className="wiki-doc-head">
                <h3>{doc.title}</h3>
              </header>
              <pre className="wiki-body">
                {doc.body.split(/(\[\[[^\]\n]+\]\])/).map((part, i) => {
                  const title = part.match(/^\[\[(.+)\]\]$/)?.[1].trim();
                  return title ? (
                    <Button
                      key={i}
                      variant="link"
                      className="wiki-link"
                      data-missing={!docs.some((d) => d.title === title) || undefined}
                      onClick={() => openTitle(title)}
                    >
                      {title}
                    </Button>
                  ) : (
                    part
                  );
                })}
              </pre>
              {/* The graph's lines into this document, followed from the list */}
              {links.edges.some((e) => e.to === doc.title) && (
                <p className="wiki-backlinks" aria-label="이 문서를 가리키는 문서">
                  <span className="muted">가리키는 문서</span>
                  {links.edges
                    .filter((e) => e.to === doc.title)
                    .map((e) => (
                      <Button key={e.from} variant="link" className="wiki-link" onClick={() => openTitle(e.from)}>
                        {e.from}
                      </Button>
                    ))}
                </p>
              )}
            </>
          ) : (
            <Empty>아직 문서가 없습니다</Empty>
          )}
        </div>
      </div>
      {changes.length > 0 && (
        <ol className="wiki-timeline" aria-label="변경 타임라인">
          {changes.map((c, i) => (
            <li key={i} className="log-line">
              <time>{stamp(c.at)}</time>
              <span className="wiki-kind" data-kind={c.kind}>
                {KIND[c.kind]}
              </span>
              <span className="log-text">
                {c.title} <span className="muted">{c.author === 'user' ? '사용자' : roleName(c.author)}</span>
                {c.taskId && <span className="muted"> 업무 #{c.taskId}</span>}
              </span>
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
    return follow(
      () => call('memories.list', { projectId, memberId: memberId ?? undefined }),
      setNotes,
      (t) => t === 'wiki',
    );
  }, [projectId, memberId]);
  if (!notes.length) return <Empty>아직 기억이 없습니다</Empty>;
  return (
    <ul className="notes" aria-label="에이전트 기억">
      {notes.flatMap((n) =>
        n.text.split('\n').map((line, i) => (
          <li key={`${n.key}-${i}`} className="note">
            <span className="log-who">{members.find((m) => m.key === n.key)?.role ?? roleName(n.key)}</span>{' '}
            {line.replace(/^[-*]\s*/, '')}
          </li>
        )),
      )}
    </ul>
  );
}
