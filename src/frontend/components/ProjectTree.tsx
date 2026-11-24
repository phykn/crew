import { useEffect, useState } from 'react';
import { call } from '../api';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Confirm } from '../ui/Confirm';
import { Dialog, DialogClose, DialogHead, DialogTitle } from '../ui/Dialog';
import { Empty } from '../ui/Empty';
import { FolderIcon, TrashIcon } from './Icons';
import { sessionLabel } from './ProjectBar';
import { t } from '../lang';

type Tree = Awaited<ReturnType<typeof call<'tree.list'>>>;
type Target = { kind: 'session'; id: number; name: string } | { kind: 'project'; id: number; name: string };
type Impact = { sessions: number; tasks: number; events: number; messages: number };

// Project → session → agent session, with removal that says what it takes before it happens
export function ProjectTree({
  open,
  onClose,
  onDeleted,
}: {
  open: boolean;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [tree, setTree] = useState<Tree>([]);
  const [target, setTarget] = useState<Target | null>(null);
  const [impact, setImpact] = useState<Impact | null>(null);

  const load = async () => setTree(await call('tree.list'));
  useEffect(() => {
    if (open) load();
  }, [open]);

  async function ask(t: Target) {
    setTarget(t);
    setImpact(
      t.kind === 'session'
        ? await call('sessions.impact', { sessionId: t.id })
        : await call('projects.impact', { projectId: t.id }),
    );
  }

  async function confirm() {
    if (!target) return;
    if (target.kind === 'session') await call('sessions.delete', { sessionId: target.id });
    else await call('projects.remove', { projectId: target.id });
    setTarget(null);
    await load();
    onDeleted();
  }

  return (
    <Dialog open={open} onClose={onClose} className="tree-dialog">
      <DialogHead>
        <DialogTitle>{t('tree.title')}</DialogTitle>
        <DialogClose />
      </DialogHead>
      {tree.length === 0 && <Empty>{t('tree.empty')}</Empty>}
      <ul className="tree" aria-label={t('tree.list')}>
        {tree.map(({ project, sessions }) => (
          <li key={project.id} className="tree-project" data-missing={project.missing || undefined}>
            <div className="tree-project-head">
              <FolderIcon />
              <div className="tree-title">
                <span className="tree-name">{project.name}</span>
                <span className="tree-path" title={project.path}>
                  {project.path}
                </span>
              </div>
              {project.missing && <Badge tone="bad">{t('project.missing')}</Badge>}
              <Button
                variant="quiet"
                tone="danger"
                iconOnly
                onClick={() => ask({ kind: 'project', id: project.id, name: project.name })}
                aria-label={t('tree.delete', { name: project.name })}
                title={t('action.delete')}
              >
                <TrashIcon />
              </Button>
            </div>
            {sessions.length > 0 && (
              <ul className="tree-sessions">
                {sessions.map(({ session, agents }) => (
                  <li key={session.id} className="tree-session">
                    <div className="tree-session-head">
                      <span className="tree-session-name">{sessionLabel(session)}</span>
                      <Button
                        variant="quiet"
                        tone="danger"
                        iconOnly
                        onClick={() => ask({ kind: 'session', id: session.id, name: sessionLabel(session) })}
                        aria-label={t('tree.delete', { name: sessionLabel(session) })}
                        title={t('action.delete')}
                      >
                        <TrashIcon />
                      </Button>
                    </div>
                    {agents.length > 0 && (
                      <ul className="tree-agents">
                        {agents.map((a) => (
                          <li key={a.id} className="tree-agent">
                            <b>{a.role}</b>
                            <span className="muted">{a.nickname}</span>
                            <Badge>{t('tree.runs', { n: a.runs })}</Badge>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
      {target && impact && (
        <Confirm
          label={t('tree.confirm')}
          text={
            <>
              {t('tree.deletes', { name: target.name })}{' '}
              {target.kind === 'project' && t('tree.sessions', { n: impact.sessions })}
              {t('tree.records', impact)}
              {target.kind === 'project' && t('tree.filesStay')}
            </>
          }
          actions={[{ label: t('action.delete'), danger: true, run: confirm }]}
          onCancel={() => setTarget(null)}
        />
      )}
    </Dialog>
  );
}
