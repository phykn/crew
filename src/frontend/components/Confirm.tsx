import * as Dialog from '@radix-ui/react-dialog';
import type { ReactNode } from 'react';

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
    <Dialog.Root open onOpenChange={(o) => !o && onCancel()}>
      <Dialog.Portal>
        <Dialog.Overlay className="overlay" />
        <Dialog.Content className="dialog confirm" role="alertdialog" aria-label={label} aria-describedby={undefined}>
          {/* The window itself says it asks; its name is for screen readers only */}
          <Dialog.Title className="sr-only">{label}</Dialog.Title>
          <p>{text}</p>
          <div className="confirm-actions">
            <Dialog.Close className="button">취소</Dialog.Close>
            {actions.map((a) => (
              <button key={a.label} className={`button${a.danger ? ' fill-danger' : ''}`} onClick={a.run}>
                {a.label}
              </button>
            ))}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
