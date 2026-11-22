import type { ReactNode } from 'react';
import { Button } from './Button';
import { Dialog, DialogActions, DialogClose, DialogTitle } from './Dialog';

type Action = { label: string; danger?: boolean; run: () => void };

// A question asked before something is removed or lost: its own small modal over whatever is open, so it is seen where the user looks
export function Confirm({
  label,
  text,
  actions,
  onCancel,
}: {
  label: string;
  text: ReactNode;
  actions: Action[];
  onCancel: () => void;
}) {
  return (
    <Dialog open onClose={onCancel} size="sm" role="alertdialog" label={label}>
      <DialogTitle hidden>{label}</DialogTitle>
      <p>{text}</p>
      <DialogActions>
        <DialogClose>취소</DialogClose>
        {actions.map((a) => (
          <Button
            key={a.label}
            variant={a.danger ? 'primary' : 'secondary'}
            tone={a.danger ? 'danger' : undefined}
            onClick={a.run}
          >
            {a.label}
          </Button>
        ))}
      </DialogActions>
    </Dialog>
  );
}
