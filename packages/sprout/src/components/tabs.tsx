"use client";

import { Tabs as BaseTabs } from "@base-ui/react/tabs";
import { cn, stateClassName } from "../internal/classes.js";

export const tabsListVariantNames = ["default", "line", "steps"] as const;

export type TabsListVariant = (typeof tabsListVariantNames)[number];

export type TabsProps = BaseTabs.Root.Props;

/**
 * Groups a tab list with its panels. Pass `value` and `onValueChange` to
 * control the active tab, or `defaultValue` to let it manage itself.
 * `orientation="vertical"` stacks the list beside the panels.
 */
export function Tabs({
  className,
  orientation = "horizontal",
  ...props
}: TabsProps) {
  return (
    <BaseTabs.Root
      data-slot="tabs"
      orientation={orientation}
      {...props}
      className={stateClassName<BaseTabs.Root.State>("sprout-tabs", className)}
    />
  );
}

export interface TabsListVariantOptions {
  variant?: TabsListVariant | null;
  className?: string;
}

/** Returns the list classes, for a custom element that should look like a tab list. */
export function tabsListVariants({
  variant,
  className,
}: TabsListVariantOptions = {}) {
  return cn(
    "sprout-tabs-list",
    `sprout-tabs-list-${variant ?? "default"}`,
    className,
  );
}

export interface TabsListProps extends BaseTabs.List.Props {
  /**
   * `default` is a filled segmented control. `line` underlines the active
   * tab for page and panel sections. `steps` spreads the tabs across the
   * width for a numbered setup flow.
   */
  variant?: TabsListVariant;
}

export function TabsList({
  className,
  variant = "default",
  ...props
}: TabsListProps) {
  return (
    <BaseTabs.List
      data-slot="tabs-list"
      data-variant={variant}
      {...props}
      className={
        typeof className === "function"
          ? (state: BaseTabs.List.State) =>
              tabsListVariants({ variant, className: className(state) })
          : tabsListVariants({ variant, className })
      }
    />
  );
}

export type TabsTriggerProps = BaseTabs.Tab.Props;

/**
 * One tab. Its `value` matches a `TabsContent`. Mark leading or trailing
 * icons with `data-icon="inline-start"` or `"inline-end"` to tighten padding.
 */
export function TabsTrigger({ className, ...props }: TabsTriggerProps) {
  return (
    <BaseTabs.Tab
      data-slot="tabs-trigger"
      {...props}
      className={stateClassName<BaseTabs.Tab.State>(
        "sprout-tabs-trigger",
        className,
      )}
    />
  );
}

export type TabsContentProps = BaseTabs.Panel.Props;

/**
 * The panel for one tab. Add `keepMounted` to keep inactive panels in the
 * page, so form drafts and scroll positions survive tab changes.
 */
export function TabsContent({ className, ...props }: TabsContentProps) {
  return (
    <BaseTabs.Panel
      data-slot="tabs-content"
      {...props}
      className={stateClassName<BaseTabs.Panel.State>(
        "sprout-tabs-content",
        className,
      )}
    />
  );
}
