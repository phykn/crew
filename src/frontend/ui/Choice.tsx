import * as Select from '@radix-ui/react-select';
import type { ReactNode } from 'react';
import { Chevron } from '../components/Icons';
import { SelectItem, SelectMenu } from './Menu';
import './Choice.css';

// A hint shows only in the open menu, so the closed control stays one word
type Option = { value: string; label: string; hint?: string };
type Size = 'sm' | 'md' | 'lg';

// The closed control; a screen with its own menu (projects, sessions) puts it in its own Select.Root.
// wide: fills the width it is given, as in a form column
export function ChoiceTrigger({
  label,
  size = 'md',
  wide,
  className,
  children,
}: {
  label: string;
  size?: Size;
  wide?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const classes = ['ui-choice', `ui-choice--${size}`, wide && 'ui-choice--wide', className];
  return (
    <Select.Trigger className={classes.filter(Boolean).join(' ')} aria-label={label}>
      {children}
      <Chevron />
    </Select.Trigger>
  );
}

export function ChoiceValue({ children }: { children?: ReactNode }) {
  return <span className="ui-choice-value">{children ?? <Select.Value />}</span>;
}

// Every pick-one control looks the same, instead of the system's own dropdown in some places
export function Choice({
  value,
  options,
  onChange,
  label,
  size,
  wide,
}: {
  value: string;
  options: Option[];
  onChange: (v: string) => void;
  label: string;
  size?: Size;
  wide?: boolean;
}) {
  return (
    <Select.Root value={value} onValueChange={onChange}>
      <ChoiceTrigger label={label} size={size} wide={wide}>
        <ChoiceValue />
      </ChoiceTrigger>
      <SelectMenu>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value} hint={o.hint}>
            {o.label}
          </SelectItem>
        ))}
      </SelectMenu>
    </Select.Root>
  );
}
