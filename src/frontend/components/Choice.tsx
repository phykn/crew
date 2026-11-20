import * as Select from "@radix-ui/react-select";
import { Chevron } from "./Icons";

// A hint shows only in the open menu, so the closed control stays one word
type Option = { value: string; label: string; hint?: string };

// Every pick-one control looks the same, instead of the system's own dropdown in some places
export function Choice({
  value,
  options,
  onChange,
  label,
  className = "",
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
                {o.hint && <span className="menu-hint">{o.hint}</span>}
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}
