"use client";

import { Radio as BaseRadio } from "@base-ui/react/radio";
import { RadioGroup as BaseRadioGroup } from "@base-ui/react/radio-group";
import { stateClassName } from "../internal/classes.js";

export type RadioGroupProps<Value = string> = BaseRadioGroup.Props<Value>;

export type RadioGroupItemProps<Value = string> = BaseRadio.Root.Props<Value>;

/**
 * A set of radios where one value is chosen. Arrow keys move between items
 * and select them. Name the group with `aria-label` or `aria-labelledby`.
 * Children may include a legend, helper, or error next to the items.
 */
export function RadioGroup<Value = string>({
  className,
  ...props
}: RadioGroupProps<Value>) {
  return (
    <BaseRadioGroup<Value>
      data-slot="radio-group"
      {...props}
      className={stateClassName<BaseRadioGroup.State>(
        "sprout-radio-group",
        className,
      )}
    />
  );
}

/**
 * A 16px radio with a larger hit area. Name it with a wrapping `Label`, a
 * `Label htmlFor` pointing at its `id`, or `aria-label`. Set `aria-invalid`
 * to draw a danger ring.
 */
export function RadioGroupItem<Value = string>({
  className,
  ...props
}: RadioGroupItemProps<Value>) {
  return (
    <BaseRadio.Root<Value>
      data-slot="radio-group-item"
      {...props}
      className={stateClassName<BaseRadio.Root.State>(
        "sprout-radio-group-item",
        className,
      )}
    >
      <BaseRadio.Indicator
        data-slot="radio-group-indicator"
        className="sprout-radio-group-indicator"
      />
    </BaseRadio.Root>
  );
}
