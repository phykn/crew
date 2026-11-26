import type { ComponentProps } from 'react';
import './Button.css';

type ButtonProps = Omit<ComponentProps<'button'>, 'aria-pressed'> & {
  // secondary: a bordered control; primary: the one green action; quiet: muted until pointed at;
  // row: a whole line that opens or picks something; link: words that act
  variant?: 'secondary' | 'primary' | 'quiet' | 'row' | 'link';
  // danger: a removal or a stop; muted: a minor row or link that should not draw the eye
  tone?: 'danger' | 'muted';
  size?: 'sm' | 'md' | 'lg';
  iconOnly?: boolean;
  pressed?: boolean;
  // Unsaved changes wait behind this button
  dirty?: boolean;
  // Words of any length: they wrap and the button grows down from its size
  wrap?: boolean;
};

const SIZED = ['secondary', 'primary', 'quiet'];
const TEXT = ['row', 'link'];

export function Button({
  variant = 'secondary',
  tone,
  size,
  iconOnly,
  pressed,
  dirty,
  wrap,
  className,
  type = 'button',
  ...rest
}: ButtonProps) {
  const sized = SIZED.includes(variant) ? (size ?? (variant === 'quiet' ? 'sm' : 'md')) : null;
  // A link takes its context's type size unless told otherwise
  const text = TEXT.includes(variant) ? (size ?? (variant === 'row' ? 'sm' : null)) : null;
  const classes = [
    'ui-button',
    `ui-button--${variant}`,
    sized && `ui-button--${sized}`,
    text && `ui-button--text-${text}`,
    iconOnly && 'ui-button--icon',
    tone && `ui-button--${tone}`,
    wrap && 'ui-button--wrap',
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
