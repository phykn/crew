import * as Dialog from '@radix-ui/react-dialog';
import { useEffect, useState } from 'react';
import { call } from '../api';

export type ChangesTarget = { taskId: number; title: string; versionId: number; file: string };
type Change = Awaited<ReturnType<typeof call<'changes.file'>>>;

const STATUS = { added: '추가', deleted: '삭제', changed: '수정' } as const;

// One file's diff in a popup over the window; the crew keeps working while it is open
export function Changes({
  target,
  waiting,
  onClose,
  onChat,
}: {
  target: ChangesTarget | null;
  waiting: boolean;
  onClose: () => void;
  onChat: () => void;
}) {
  const [change, setChange] = useState<Change>(null);

  useEffect(() => {
    setChange(null);
    if (!target) return;
    // A diff read for the file opened before this one is dropped
    let live = true;
    void call('changes.file', target).then((c) => live && setChange(c));
    return () => {
      live = false;
    };
  }, [target]);

  const d = change?.diff;
  return (
    <Dialog.Root open={!!target} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="overlay" />
        <Dialog.Content className="dialog changes" aria-describedby={undefined}>
          <header className="changes-head">
            <div className="changes-name">
              <Dialog.Title className="dialog-title">
                <code>{target?.file}</code>
              </Dialog.Title>
              {change && (
                <>
                  <span className="badge" data-status={change.diff.status}>
                    {STATUS[change.diff.status]}
                  </span>
                  <span className="badge">{change.label}</span>
                  <span className="muted changes-task">{target?.title}</span>
                </>
              )}
            </div>
            {waiting && (
              <button className="badge changes-waiting" onClick={onChat}>
                대화로 가서 답하기
              </button>
            )}
            <Dialog.Close className="button">닫기</Dialog.Close>
          </header>
          <div className="diff" aria-label="변경 내용" tabIndex={0}>
            {d?.binary && <p className="empty">바이너리 파일이라 내용을 보여 줄 수 없습니다.</p>}
            {d?.lines.map((l, n) => (
              <div key={n} className="diff-line" data-kind={l.kind}>
                {l.kind === 'add' ? '+' : l.kind === 'del' ? '-' : l.kind === 'same' ? ' ' : ''}
                {l.text}
              </div>
            ))}
            {d?.cut && <p className="empty">너무 길어 앞부분만 보여 줍니다.</p>}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
