import * as RDialog from '@radix-ui/react-dialog';
import type { ReactNode } from 'react';
import { Button } from './Button';
import './Dialog.css';
import './VisuallyHidden.css';
import { t } from '../lang';

// A parchment sheet in a wood frame over a veiled window; sm is a question, md everything else
export function Dialog({
  open,
  onClose,
  size = 'md',
  role,
  label,
  className,
  keepFocus,
  children,
}: {
  open: boolean;
  onClose: () => void;
  size?: 'sm' | 'md';
  role?: 'alertdialog';
  label?: string;
  className?: string;
  // No field takes focus on open, so a stray key cannot overwrite one
  keepFocus?: boolean;
  children: ReactNode;
}) {
  return (
    <RDialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <RDialog.Portal>
        <RDialog.Overlay className="ui-overlay" />
        <RDialog.Content
          className={['ui-dialog', `ui-dialog--${size}`, className].filter(Boolean).join(' ')}
          role={role ?? 'dialog'}
          aria-label={label}
          aria-describedby={undefined}
          onOpenAutoFocus={keepFocus ? (e) => e.preventDefault() : undefined}
        >
          {children}
        </RDialog.Content>
      </RDialog.Portal>
    </RDialog.Root>
  );
}

// The title row; what sits beside the title (badges, a close button) follows it
export function DialogHead({ children }: { children: ReactNode }) {
  return <header className="ui-dialog-head">{children}</header>;
}

// hidden: the window itself says what it asks, so its name is for screen readers only
export function DialogTitle({ hidden, children }: { hidden?: boolean; children: ReactNode }) {
  return <RDialog.Title className={hidden ? 'ui-sr-only' : 'ui-dialog-title'}>{children}</RDialog.Title>;
}

export function DialogActions({ children }: { children: ReactNode }) {
  return <div className="ui-dialog-actions">{children}</div>;
}

export function DialogClose({ children = t('action.close') }: { children?: ReactNode }) {
  return (
    <RDialog.Close asChild>
      <Button>{children}</Button>
    </RDialog.Close>
  );
}
