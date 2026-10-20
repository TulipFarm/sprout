'use client';

import { Toggle as BaseToggle } from '@base-ui/react/toggle';
import { cn, stateClassName } from '../internal/classes.js';

export const toggleVariantNames = ['default', 'outline'] as const;
export const toggleSizeNames = ['default', 'sm', 'lg'] as const;

export type ToggleVariant = (typeof toggleVariantNames)[number];
export type ToggleSize = (typeof toggleSizeNames)[number];

export interface ToggleVariantOptions {
  variant?: ToggleVariant | null;
  size?: ToggleSize | null;
  className?: string;
}

/**
 * Class names for a toggle look. Use it to give another pressable element,
 * such as a Base UI `Toggle` inside your own group, the same style.
 */
export function toggleVariants({ variant, size, className }: ToggleVariantOptions = {}) {
  return cn(
    'sprout-toggle',
    `sprout-toggle-variant-${variant ?? 'default'}`,
    `sprout-toggle-size-${size ?? 'default'}`,
    className,
  );
}

export interface ToggleProps<Value extends string = string> extends BaseToggle.Props<Value> {
  /** `default` is borderless. `outline` draws a control border. */
  variant?: ToggleVariant | null;
  /** `sm` is 28px, `default` 32px, and `lg` 36px tall. */
  size?: ToggleSize | null;
}

/**
 * A two-state button. It sets `aria-pressed` and `data-pressed` while on.
 * Use `pressed` and `onPressedChange` to control it, or `defaultPressed`.
 * An icon-only toggle needs an `aria-label`.
 */
export function Toggle<Value extends string = string>({ variant, size, className, ...props }: ToggleProps<Value>) {
  return (
    <BaseToggle<Value>
      data-slot="toggle"
      data-variant={variant ?? 'default'}
      data-size={size ?? 'default'}
      {...props}
      className={stateClassName<BaseToggle.State>(toggleVariants({ variant, size }), className)}
    />
  );
}
