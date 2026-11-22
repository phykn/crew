import * as RSwitch from '@radix-ui/react-switch';
import './Switch.css';

export function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (on: boolean) => void;
  label: string;
}) {
  return (
    <RSwitch.Root className="ui-switch" checked={checked} aria-label={label} onCheckedChange={onChange}>
      <RSwitch.Thumb className="ui-switch-thumb" />
    </RSwitch.Root>
  );
}
