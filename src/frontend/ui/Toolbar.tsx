import type { ReactNode } from 'react';
import './Toolbar.css';

// One toolbar shape for every tab: views on the left, actions on the right
export function Toolbar({ children }: { children: ReactNode }) {
  return <div className="ui-toolbar">{children}</div>;
}

export function ToolbarEnd({ children }: { children: ReactNode }) {
  return <span className="ui-toolbar-end">{children}</span>;
}
