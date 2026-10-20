import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import { cn } from '../internal/classes.js';

export const alertVariantNames = ['default', 'destructive'] as const;

export type AlertVariant = (typeof alertVariantNames)[number];

export interface AlertVariantOptions {
  variant?: AlertVariant | null;
  className?: string;
}

export function alertVariants({ variant, className }: AlertVariantOptions = {}) {
  return cn('sprout-alert', `sprout-alert-${variant ?? 'default'}`, className);
}

export interface AlertState extends Record<string, unknown> {
  slot: 'alert';
  variant: AlertVariant;
}

export interface AlertProps extends useRender.ComponentProps<'div', AlertState> {
  variant?: AlertVariant;
}

/**
 * A static message block. It announces itself with `role="alert"` by default;
 * pass `role="status"` or `role="note"` for messages that should not interrupt.
 */
export function Alert({ className, variant = 'default', render, ref, role = 'alert', ...props }: AlertProps) {
  return useRender({
    defaultTagName: 'div',
    ref,
    render,
    props: mergeProps<'div'>({ role, className: alertVariants({ variant, className }) }, props),
    state: { slot: 'alert', variant },
  });
}

type PartSlot = 'alert-title' | 'alert-description' | 'alert-action';

export interface AlertPartState extends Record<string, unknown> {
  slot: PartSlot;
}

export type AlertPartProps = useRender.ComponentProps<'div', AlertPartState>;

function part(slot: PartSlot, base: string) {
  return function AlertPart({ className, render, ref, ...props }: AlertPartProps) {
    return useRender({
      defaultTagName: 'div',
      ref,
      render,
      props: mergeProps<'div'>({ className: cn(base, className) }, props),
      state: { slot },
    });
  };
}

export const AlertTitle = part('alert-title', 'sprout-alert-title');
export const AlertDescription = part('alert-description', 'sprout-alert-description');
/** Pins a compact control, such as an Undo button, to the top-right corner. */
export const AlertAction = part('alert-action', 'sprout-alert-action');
