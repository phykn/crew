import { type ReactNode, useState } from 'react';
import './Fold.css';

// A heading that shows or hides what is under it; lg heads a board, sm a section inside a dialog
export function Fold({
  label,
  open: shown,
  onOpenChange,
  size = 'sm',
  className,
  children,
}: {
  label: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  size?: 'sm' | 'lg';
  className?: string;
  children: ReactNode;
}) {
  // Left to itself unless the screen holds the state
  const [own, setOwn] = useState(false);
  const open = shown ?? own;
  return (
    <div className={['ui-fold', `ui-fold--${size}`, className].filter(Boolean).join(' ')} data-open={open || undefined}>
      <button
        type="button"
        className="ui-fold-head"
        aria-expanded={open}
        onClick={() => (onOpenChange ? onOpenChange(!open) : setOwn(!open))}
      >
        {label}
        <svg viewBox="0 0 20 20" className="ui-fold-chevron" aria-hidden="true">
          <path d="M5 8l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="2.2" />
        </svg>
      </button>
      {open && children}
    </div>
  );
}
