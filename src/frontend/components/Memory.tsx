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
import { type Key, t } from '../lang';

const KIND: Record<Change['kind'], Key> = { create: 'diff.created', edit: 'diff.changed', delete: 'diff.deleted' };
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
          label={t('memory.kind')}
          value={view}
          options={[
            { value: 'wiki', label: t('memory.wiki') },
            { value: 'agents', label: t('memory.agents') },
          ]}
          onChange={setView}
        />
        <ToolbarEnd>
          {view === 'wiki' ? (
            <Button pressed={graph} onClick={() => setGraph(!graph)}>
              {t('memory.graph')}
            </Button>
          ) : (
            <Choice
              label={t('memory.member')}
              value={memberId ? String(memberId) : ALL}
              options={[
                { value: ALL, label: t('memory.allMembers') },
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
          <ul className="wiki-toc" aria-label={t('memory.toc')}>
            {docs.map((d) => (
              <li key={d.title}>
                <Button
                  variant="row"
                  aria-current={d.title === doc?.title || undefined}
                  onClick={() => setPicked(d.title)}
                >
                  {d.title}
                </Button>
              </li>
            ))}
          </ul>
        )}
        <div className="wiki-doc" aria-label={t('memory.doc')}>
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
                      tone={docs.some((d) => d.title === title) ? undefined : 'muted'}
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
                <p className="wiki-backlinks" aria-label={t('memory.backlinks')}>
                  <span className="muted">{t('memory.linkedFrom')}</span>
                  {links.edges
                    .filter((e) => e.to === doc.title)
                    .map((e) => (
                      <Button key={e.from} variant="link" onClick={() => openTitle(e.from)}>
                        {e.from}
                      </Button>
                    ))}
                </p>
              )}
            </>
          ) : (
            <Empty>{t('memory.noDocs')}</Empty>
          )}
        </div>
      </div>
      {changes.length > 0 && (
        <ol className="wiki-timeline" aria-label={t('memory.timeline')}>
          {changes.map((c, i) => (
            <li key={i} className="wiki-change">
              <time>{stamp(c.at)}</time>
              <span className="wiki-kind" data-kind={c.kind}>
                {t(KIND[c.kind])}
              </span>
              <span className="log-text">
                {c.title} <span className="muted">{c.author === 'user' ? t('memory.user') : roleName(c.author)}</span>
                {c.taskId && <span className="muted"> {t('memory.task', { id: c.taskId })}</span>}
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
  if (!notes.length) return <Empty>{t('memory.noNotes')}</Empty>;
  return (
    <ul className="notes" aria-label={t('memory.notes')}>
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
