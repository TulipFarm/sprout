'use client';

import { Switch as BaseSwitch } from '@base-ui/react/switch';
import { cn, stateClassName } from '../internal/classes.js';
import { useFieldsetDisabled } from '../internal/fieldset.js';

export const switchSizeNames = ['md', 'sm'] as const;

export type SwitchSize = (typeof switchSizeNames)[number];

export interface SwitchProps extends BaseSwitch.Root.Props {
  /** `md` is a 32 × 18px track. `sm` is a 24 × 14px track. */
  size?: SwitchSize | undefined;
}

/**
 * An on/off switch for a setting that applies right away. Name it with a
 * wrapping `Label`, a `Label htmlFor` pointing at its `id`, or `aria-label`.
 */
export function Switch({ size = 'md', className, disabled, ref, ...props }: SwitchProps) {
  const [fieldsetDisabled, fieldsetRef] = useFieldsetDisabled(ref);
  return (
    <BaseSwitch.Root
      data-slot="switch"
      data-size={size}
      {...props}
      ref={fieldsetRef}
      disabled={disabled || fieldsetDisabled}
      className={stateClassName<BaseSwitch.Root.State>(cn('sprout-switch', `sprout-switch-size-${size}`), className)}
    >
      <BaseSwitch.Thumb data-slot="switch-thumb" className="sprout-switch-thumb" />
    </BaseSwitch.Root>
  );
}
