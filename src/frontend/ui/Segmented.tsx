import { Button } from './Button';
import './Segmented.css';

// Views of one screen side by side, or a two-way switch; the one shown is pressed
export function Segmented<T extends string>({
  label,
  value,
  options,
  size = 'md',
  even,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  size?: 'sm' | 'md';
  // Every option as wide as the widest, for a switch whose sides should weigh the same
  even?: boolean;
  onChange: (v: T) => void;
}) {
  return (
    <div className={even ? 'ui-seg ui-seg--even' : 'ui-seg'} role="group" aria-label={label}>
      {options.map((o) => (
        <Button key={o.value} size={size} pressed={o.value === value} onClick={() => onChange(o.value)}>
          {o.label}
        </Button>
      ))}
    </div>
  );
}
