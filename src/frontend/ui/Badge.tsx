import type { ReactNode } from 'react';
import './Badge.css';

// A small label for a count or a state; colour only for ok, waiting, and bad
export function Badge({
  tone = 'neutral',
  children,
}: {
  tone?: 'neutral' | 'ok' | 'wait' | 'bad';
  children: ReactNode;
}) {
  return <span className={`ui-badge ui-badge--${tone}`}>{children}</span>;
}
