import type { ComponentProps } from 'react';
import './Button.css';

export type ButtonProps = Omit<ComponentProps<'button'>, 'aria-pressed'> & {
  // secondary: a bordered control; primary: the one green action; quiet: muted until pointed at;
  // row: a whole line that opens or picks something; link: words that act
  variant?: 'secondary' | 'primary' | 'quiet' | 'row' | 'link';
  tone?: 'danger';
  size?: 'sm' | 'md' | 'lg';
  iconOnly?: boolean;
  pressed?: boolean;
  // Unsaved changes wait behind this button
  dirty?: boolean;
};

const SIZED = ['secondary', 'primary', 'quiet'];

export function Button({
  variant = 'secondary',
  tone,
  size,
  iconOnly,
  pressed,
  dirty,
  className,
  type = 'button',
  ...rest
}: ButtonProps) {
  const sized = SIZED.includes(variant) ? (size ?? (variant === 'quiet' ? 'sm' : 'md')) : null;
  const classes = [
    'ui-button',
    `ui-button--${variant}`,
    sized && `ui-button--${sized}`,
    iconOnly && 'ui-button--icon',
    tone && `ui-button--${tone}`,
    className,
  ];
  return (
    <button
      type={type}
      className={classes.filter(Boolean).join(' ')}
      aria-pressed={pressed}
      data-dirty={dirty || undefined}
      {...rest}
    />
  );
}
