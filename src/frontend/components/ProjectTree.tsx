import { useEffect, useState } from 'react';
import { josa } from '../korean';
import { call } from '../api';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Confirm } from '../ui/Confirm';
import { Dialog, DialogClose, DialogHead, DialogTitle } from '../ui/Dialog';
import { Empty } from '../ui/Empty';
import { FolderIcon, TrashIcon } from './Icons';
import { sessionLabel } from './ProjectBar';

type Tree = Awaited<ReturnType<typeof call<'tree.list'>>>;
type Target = { kind: 'session'; id: number; name: string } | { kind: 'project'; id: number; name: string };
type Impact = { sessions: number; tasks: number; events: number; messages: number };

// 프로젝트 → 세션 → 에이전트 세션, with removal that says what it takes before it happens
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
        <DialogTitle>탐색기</DialogTitle>
        <DialogClose />
      </DialogHead>
      {tree.length === 0 && <Empty>열어 둔 프로젝트가 없습니다.</Empty>}
      <ul className="tree" aria-label="프로젝트 목록">
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
              {project.missing && <Badge tone="bad">폴더 없음</Badge>}
              <Button
                variant="quiet"
                tone="danger"
                iconOnly
                onClick={() => ask({ kind: 'project', id: project.id, name: project.name })}
                aria-label={`${project.name} 삭제`}
                title="삭제"
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
                        aria-label={`${sessionLabel(session)} 삭제`}
                        title="삭제"
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
                            <Badge>실행 {a.runs}회</Badge>
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
          label="삭제 확인"
          text={
            <>
              {josa(target.name, '을')} 삭제합니다. {target.kind === 'project' && `세션 ${impact.sessions}개, `}
              업무 {impact.tasks}건, 로그 {impact.events}건, 메시지 {impact.messages}건이 지워집니다.
              {target.kind === 'project' && ' 폴더의 파일은 그대로 둡니다.'}
            </>
          }
          actions={[{ label: '삭제', danger: true, run: confirm }]}
          onCancel={() => setTarget(null)}
        />
      )}
    </Dialog>
  );
}
