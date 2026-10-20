'use client';

import { Checkbox as BaseCheckbox } from '@base-ui/react/checkbox';
import { Check } from 'reicon-react/icons/Check';
import { Minus } from 'reicon-react/icons/Minus';
import { cn, stateClassName } from '../internal/classes.js';
import { useFieldsetDisabled } from '../internal/fieldset.js';

export const checkboxVariantNames = ['default', 'neutral'] as const;

export type CheckboxVariant = (typeof checkboxVariantNames)[number];

export interface CheckboxProps extends BaseCheckbox.Root.Props {
  /**
   * `default` fills with the primary color. `neutral` fills with the text
   * color, for filter lists that should not look branded.
   */
  variant?: CheckboxVariant | undefined;
}

/**
 * A 16px checkbox with a larger hit area. Name it with a wrapping `Label`,
 * a `Label htmlFor` pointing at its `id`, or `aria-label`. Pass
 * `indeterminate` to show a mixed state, such as a "select all" box.
 */
export function Checkbox({
  variant = 'default',
  indeterminate = false,
  className,
  disabled,
  ref,
  ...props
}: CheckboxProps) {
  const [fieldsetDisabled, fieldsetRef] = useFieldsetDisabled(ref);
  return (
    <BaseCheckbox.Root
      data-slot="checkbox"
      data-variant={variant}
      indeterminate={indeterminate}
      {...props}
      ref={fieldsetRef}
      disabled={disabled || fieldsetDisabled}
      className={stateClassName<BaseCheckbox.Root.State>(
        cn('sprout-checkbox', `sprout-checkbox-variant-${variant}`),
        className,
      )}
    >
      <BaseCheckbox.Indicator data-slot="checkbox-indicator" className="sprout-checkbox-indicator">
        {indeterminate ? <Minus aria-hidden="true" /> : <Check aria-hidden="true" />}
      </BaseCheckbox.Indicator>
    </BaseCheckbox.Root>
  );
}
