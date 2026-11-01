import type { ComponentPropsWithoutRef } from 'react';

type Props = ComponentPropsWithoutRef<'select'>;

/** Shared native select: one consistent chevron supplied by global CSS. */
export default function UiSelect({ className = '', children, ...props }: Props) {
  return (
    <select {...props} className={`ui-select ${className}`}>
      {children}
    </select>
  );
}
