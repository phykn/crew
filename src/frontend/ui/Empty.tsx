import type { ReactNode } from 'react';
import './Empty.css';

// What a screen says when it has nothing to show yet
export function Empty({ children }: { children: ReactNode }) {
  return <p className="ui-empty">{children}</p>;
}
