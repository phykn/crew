import { useEffect, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { josa } from '../../korean';
import { call } from '../api';
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
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="overlay" />
        <Dialog.Content className="dialog tree-dialog" aria-describedby={undefined}>
          <Dialog.Title className="dialog-title">탐색기</Dialog.Title>
          <ul className="tree" aria-label="프로젝트 목록">
            {tree.map(({ project, sessions }) => (
              <li key={project.id}>
                <div className="tree-row">
                  <span className="tree-name" title={project.path}>
                    {project.name}
                  </span>
                  <button
                    className="tree-delete"
                    onClick={() => ask({ kind: 'project', id: project.id, name: project.name })}
                  >
                    목록에서 빼기
                  </button>
                </div>
                <ul>
                  {sessions.map(({ session, agents }) => (
                    <li key={session.id}>
                      <div className="tree-row">
                        <span className="tree-name">{sessionLabel(session)}</span>
                        <button
                          className="tree-delete"
                          onClick={() => ask({ kind: 'session', id: session.id, name: sessionLabel(session) })}
                          aria-label={`${sessionLabel(session)} 삭제`}
                        >
                          세션 삭제
                        </button>
                      </div>
                      <ul>
                        {agents.map((a) => (
                          <li key={a.id} className="tree-agent">
                            {a.role} <span className="muted">{a.nickname}</span>{' '}
                            <span className="badge">실행 {a.runs}회</span>
                          </li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
          {target && impact && (
            <div className="confirm" role="alertdialog" aria-label="삭제 확인">
              <p>
                {josa(target.name, '을')}
                {target.kind === 'project' ? ` 목록에서 뺍니다. 세션 ${impact.sessions}개, ` : ' 삭제합니다. '}
                업무 {impact.tasks}건, 로그 {impact.events}건, 메시지 {impact.messages}건이 지워집니다.
                {target.kind === 'project' && ' 폴더의 파일은 그대로 둡니다.'}
              </p>
              <div className="confirm-actions">
                <button onClick={() => setTarget(null)}>취소</button>
                <button className="danger" onClick={confirm}>
                  {target.kind === 'project' ? '목록에서 빼기' : '세션 삭제'}
                </button>
              </div>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
