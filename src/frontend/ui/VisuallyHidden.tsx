import type { ReactNode } from 'react';
import './VisuallyHidden.css';

// Read by screen readers, not drawn
export function VisuallyHidden({ children }: { children: ReactNode }) {
  return <span className="ui-sr-only">{children}</span>;
}
