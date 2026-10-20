'use client';

import type { CSSProperties, ComponentProps } from 'react';
import { cn } from '../internal/classes.js';
import { useFieldControl } from './field.js';

export const textareaVariantNames = ['default', 'embedded'] as const;

export type TextareaVariant = (typeof textareaVariantNames)[number];

export interface TextareaProps extends ComponentProps<'textarea'> {
  /**
   * `default` draws its own border, fill, and focus ring. `embedded` drops
   * them so a surrounding group, such as a message composer, draws them.
   */
  variant?: TextareaVariant | null;
}

/**
 * A multi-line text field on a native `textarea`. It takes every textarea
 * prop, such as `value`, `rows`, `maxLength`, `readOnly`, and `ref`. It grows
 * with its content from a 96px floor, or from `rows` lines when that is
 * taller. Inside a Sprout `Field` it gets its id, description, and invalid,
 * required, and disabled states from `useFieldControl`.
 */
export function Textarea({ variant, rows, className, style, ...rest }: TextareaProps) {
  const props = useFieldControl(rest);
  const kind = variant ?? 'default';
  return (
    <textarea
      data-slot="textarea"
      data-variant={kind}
      rows={rows}
      {...props}
      style={rows ? ({ '--sprout-textarea-rows': rows, ...style } as CSSProperties) : style}
      className={cn('sprout-textarea', `sprout-textarea-variant-${kind}`, className)}
    />
  );
}
