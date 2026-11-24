import { useEffect, useState } from 'react';
import { call } from '../api';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Dialog, DialogClose, DialogHead, DialogTitle } from '../ui/Dialog';
import { Empty } from '../ui/Empty';
import { t } from '../lang';

export type ChangesTarget = { taskId: number; title: string; versionId: number; file: string };
type Change = Awaited<ReturnType<typeof call<'changes.file'>>>;

const STATUS = {
  added: { label: 'diff.added', tone: 'ok' },
  deleted: { label: 'diff.deleted', tone: 'bad' },
  changed: { label: 'diff.changed', tone: 'wait' },
} as const;

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
  // undefined while the diff is being read; null when git kept nothing for it
  const [change, setChange] = useState<Change | undefined>(undefined);

  useEffect(() => {
    setChange(undefined);
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
    <Dialog open={!!target} onClose={onClose} className="changes">
      <DialogHead>
        <div className="changes-name">
          <DialogTitle>
            <code>{target?.file}</code>
          </DialogTitle>
          {change && (
            <>
              <Badge tone={STATUS[change.diff.status].tone}>{t(STATUS[change.diff.status].label)}</Badge>
              <Badge>{change.label}</Badge>
              <span className="muted changes-task">{target?.title}</span>
            </>
          )}
        </div>
        {waiting && (
          <Button variant="primary" onClick={onChat}>
            {t('diff.answer')}
          </Button>
        )}
        <DialogClose />
      </DialogHead>
      <div className="diff" aria-label={t('diff.label')} tabIndex={0}>
        {change === undefined && <Empty>{t('diff.loading')}</Empty>}
        {change === null && <Empty>{t('diff.none')}</Empty>}
        {d?.binary && <Empty>{t('diff.binary')}</Empty>}
        {d?.lines.map((l, n) => (
          <div key={n} className="diff-line" data-kind={l.kind}>
            {l.kind === 'add' ? '+' : l.kind === 'del' ? '-' : l.kind === 'same' ? ' ' : ''}
            {l.text}
          </div>
        ))}
        {d?.cut && <Empty>{t('diff.cut')}</Empty>}
      </div>
    </Dialog>
  );
}
