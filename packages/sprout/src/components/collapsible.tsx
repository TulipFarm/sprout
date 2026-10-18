"use client";

import { Collapsible as BaseCollapsible } from "@base-ui/react/collapsible";
import { stateClassName } from "../internal/classes.js";

export const collapsibleContentVariantNames = [
  "default",
  "sidebar",
  "card",
] as const;

export type CollapsibleContentVariant =
  (typeof collapsibleContentVariantNames)[number];

export type CollapsibleProps = BaseCollapsible.Root.Props;

/**
 * Shows and hides one region. Pass `open` and `onOpenChange` to control it,
 * or `defaultOpen` to let it manage itself.
 */
export function Collapsible({ className, ...props }: CollapsibleProps) {
  return (
    <BaseCollapsible.Root
      data-slot="collapsible"
      {...props}
      className={stateClassName<BaseCollapsible.Root.State>(
        "sprout-collapsible",
        className,
      )}
    />
  );
}

export type CollapsibleTriggerProps = BaseCollapsible.Trigger.Props;

/**
 * The button that opens and closes the content. Use `render` to make a
 * Sprout `Button` or another control the trigger. Mark a chevron with
 * `data-slot="collapsible-indicator"` and it turns while the content is open.
 */
export function CollapsibleTrigger({
  className,
  ...props
}: CollapsibleTriggerProps) {
  return (
    <BaseCollapsible.Trigger
      data-slot="collapsible-trigger"
      {...props}
      className={stateClassName<BaseCollapsible.Trigger.State>(
        "sprout-collapsible-trigger",
        className,
      )}
    />
  );
}

export interface CollapsibleContentProps extends BaseCollapsible.Panel.Props {
  /**
   * `default` shows and hides at once. `sidebar` grows and fades for
   * navigation lists. `card` grows inside bordered cards.
   */
  variant?: CollapsibleContentVariant;
}

export function CollapsibleContent({
  variant = "default",
  className,
  ...props
}: CollapsibleContentProps) {
  return (
    <BaseCollapsible.Panel
      data-slot="collapsible-content"
      data-variant={variant}
      {...props}
      className={stateClassName<BaseCollapsible.Panel.State>(
        `sprout-collapsible-content sprout-collapsible-content-${variant}`,
        className,
      )}
    />
  );
}
