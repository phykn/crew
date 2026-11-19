import * as Select from '@radix-ui/react-select';
import { Chevron } from './Icons';

type Option = { value: string; label: string };

// Every pick-one control looks the same, instead of the system's own dropdown in some places
export function Choice({
  value,
  options,
  onChange,
  label,
  className = '',
}: {
  value: string;
  options: Option[];
  onChange: (v: string) => void;
  label: string;
  className?: string;
}) {
  return (
    <Select.Root value={value} onValueChange={onChange}>
      <Select.Trigger className={`choice ${className}`} aria-label={label}>
        <span className="choice-value">
          <Select.Value />
        </span>
        <Chevron />
      </Select.Trigger>
      <Select.Portal>
        <Select.Content className="menu" position="popper" sideOffset={4}>
          <Select.Viewport>
            {options.map((o) => (
              <Select.Item key={o.value} value={o.value} className="menu-item">
                <Select.ItemText>{o.label}</Select.ItemText>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}
