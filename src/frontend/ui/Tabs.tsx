import * as RTabs from '@radix-ui/react-tabs';
import type { ComponentProps, ReactNode } from 'react';
import './Tabs.css';

export const Tabs = RTabs.Root;
export function TabPanel({ className, ...rest }: ComponentProps<typeof RTabs.Content>) {
  return <RTabs.Content className={['ui-tab-panel', className].filter(Boolean).join(' ')} {...rest} />;
}

// A tab picked from a text field would inherit its keyboard ring, so the list remembers whether the last pick was by pointer
export function TabList({ children }: { children: ReactNode }) {
  return (
    <RTabs.List
      className="ui-tab-list"
      onPointerDown={(e) => (e.currentTarget.dataset.pointer = '')}
      onKeyDown={(e) => delete e.currentTarget.dataset.pointer}
    >
      {children}
    </RTabs.List>
  );
}

// An icon with its name under it: small enough for five tabs, and readable without a hover; waiting marks a tab that needs the user
export function Tab({
  icon,
  name,
  waiting,
  ...rest
}: ComponentProps<typeof RTabs.Trigger> & { icon: ReactNode; name: string; waiting?: boolean }) {
  return (
    <RTabs.Trigger className="ui-tab" data-waiting={waiting || undefined} {...rest}>
      {icon}
      <span className="ui-tab-name">{name}</span>
    </RTabs.Trigger>
  );
}
