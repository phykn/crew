import type { ComponentProps, ReactNode } from 'react';
import './Field.css';

type Size = { size?: 'sm' | 'md' };

const classes = (size: string, className?: string) =>
  ['ui-field', `ui-field--${size}`, className].filter(Boolean).join(' ');

// A one-line box people type in
export function Input({ size = 'sm', className, ...rest }: Omit<ComponentProps<'input'>, 'size'> & Size) {
  return <input className={classes(size, className)} {...rest} />;
}

// bare: the chat box, whose frame is the composer around it
export function TextArea({
  size = 'sm',
  bare,
  className,
  ...rest
}: ComponentProps<'textarea'> & Size & { bare?: boolean }) {
  return <textarea className={bare ? ['ui-field--bare', className].join(' ') : classes(size, className)} {...rest} />;
}

export function Checkbox({ children, ...rest }: Omit<ComponentProps<'input'>, 'type'> & { children: ReactNode }) {
  return (
    <label className="ui-check">
      <input type="checkbox" {...rest} />
      {children}
    </label>
  );
}

// Never drawn: a button elsewhere opens the system's file picker through it
export function FileInput(props: Omit<ComponentProps<'input'>, 'type' | 'hidden'>) {
  return <input type="file" hidden {...props} />;
}
