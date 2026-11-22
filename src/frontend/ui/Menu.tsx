import * as Select from '@radix-ui/react-select';
import type { ReactNode } from 'react';
import './Menu.css';

// The list a pick-one control opens
export function SelectMenu({ align, children }: { align?: 'start' | 'end'; children: ReactNode }) {
  return (
    <Select.Portal>
      <Select.Content className="ui-menu" position="popper" sideOffset={4} align={align}>
        <Select.Viewport>{children}</Select.Viewport>
      </Select.Content>
    </Select.Portal>
  );
}

// action: a command at the end of the list rather than one of its values; aside sits after the label
export function SelectItem({
  value,
  hint,
  aside,
  action,
  disabled,
  title,
  children,
}: {
  value: string;
  hint?: string;
  aside?: ReactNode;
  action?: boolean;
  disabled?: boolean;
  title?: string;
  children: ReactNode;
}) {
  return (
    <Select.Item
      value={value}
      className={action ? 'ui-menu-item ui-menu-item--action' : 'ui-menu-item'}
      disabled={disabled}
      title={title}
    >
      <Select.ItemText>{children}</Select.ItemText>
      {aside}
      {hint && <span className="ui-menu-hint">{hint}</span>}
    </Select.Item>
  );
}

export function SelectSeparator() {
  return <Select.Separator className="ui-menu-separator" />;
}

// The same look for a list the page drives itself, such as the slash commands under the chat box
export function ListMenu({ label, className, children }: { label: string; className?: string; children: ReactNode }) {
  return (
    <ul className={['ui-menu', className].filter(Boolean).join(' ')} role="listbox" aria-label={label}>
      {children}
    </ul>
  );
}

export function ListOption({
  selected,
  onPick,
  children,
}: {
  selected: boolean;
  onPick: () => void;
  children: ReactNode;
}) {
  return (
    <li
      role="option"
      aria-selected={selected}
      className="ui-menu-item"
      data-highlighted={selected || undefined}
      // The box keeps focus, so typing goes on while the pointer picks
      onMouseDown={(e) => {
        e.preventDefault();
        onPick();
      }}
    >
      {children}
    </li>
  );
}
