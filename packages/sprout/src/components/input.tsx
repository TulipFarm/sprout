'use client';

import { Input as BaseInput } from '@base-ui/react/input';
import { cn, stateClassName } from '../internal/classes.js';
import { useFieldControl } from './field.js';

export const inputScaleNames = ['md', 'sm', 'lg'] as const;

export type InputScale = (typeof inputScaleNames)[number];
export type InputState = BaseInput.State;

export interface InputProps extends BaseInput.Props {
  /** `sm` is 28px, `md` is 32px (`--sprout-control-height`), and `lg` is 36px. */
  scale?: InputScale | null;
}

/**
 * A single-line text field on Base UI `Input`. It takes every native input
 * prop, such as `type`, `value`, `required`, and `ref`. Inside a Base UI
 * `Field.Root` it gets its id, label, description, and invalid and disabled
 * states from the field. Inside a Sprout `Field` it reads the same from
 * `useFieldControl`.
 */
export function Input({ scale, className, ...rest }: InputProps) {
  const props = useFieldControl(rest);
  const size = scale ?? 'md';
  return (
    <BaseInput
      data-slot="input"
      data-scale={size}
      {...props}
      className={stateClassName<InputState>(cn('sprout-input', `sprout-input-scale-${size}`), className)}
    />
  );
}
