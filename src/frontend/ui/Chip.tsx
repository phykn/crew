import type { ReactNode } from 'react';
import './Chip.css';
import './VisuallyHidden.css';

// A labelled item that holds a control of its own
export function Chip({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <span className="ui-chip" title={title}>
      {children}
    </span>
  );
}

// Switched on, it is filled; the box inside is for keyboards and screen readers
export function ToggleChip({
  checked,
  onChange,
  title,
  children,
}: {
  checked: boolean;
  onChange: () => void;
  title?: string;
  children: ReactNode;
}) {
  return (
    <label className="ui-chip ui-chip--toggle" title={title}>
      <input className="ui-sr-only" type="checkbox" checked={checked} onChange={onChange} />
      {children}
    </label>
  );
}

// Shows more items in the row; dashed, since it is not one of them
export function ChipButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" className="ui-chip ui-chip--more" onClick={onClick}>
      {children}
    </button>
  );
}
