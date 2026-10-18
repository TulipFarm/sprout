import type { ComponentProps } from "react";
import { cn } from "../internal/classes.js";

export type LabelProps = ComponentProps<"label">;

/**
 * Names one form control. Point `htmlFor` at a control's `id`, or wrap a
 * checkbox, switch, or radio with its text. A label wrapping a text control,
 * such as a textarea, stacks the text above it.
 */
export function Label({ className, ...props }: LabelProps) {
  return (
    <label
      data-slot="label"
      className={cn("sprout-label", className)}
      {...props}
    />
  );
}
