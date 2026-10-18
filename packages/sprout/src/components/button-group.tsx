"use client";

import type { ComponentProps } from "react";
import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { cn } from "../internal/classes.js";
import { Separator, type SeparatorLineProps } from "./separator.js";

export const buttonGroupOrientationNames = ["horizontal", "vertical"] as const;

export type ButtonGroupOrientation =
  (typeof buttonGroupOrientationNames)[number];

export interface ButtonGroupVariantOptions {
  orientation?: ButtonGroupOrientation | null;
  className?: string;
}

export function buttonGroupVariants({
  orientation,
  className,
}: ButtonGroupVariantOptions = {}) {
  return cn(
    "sprout-button-group",
    `sprout-button-group-${orientation ?? "horizontal"}`,
    className,
  );
}

export interface ButtonGroupProps extends ComponentProps<"div"> {
  /** `"vertical"` stacks the controls and joins them top to bottom. */
  orientation?: ButtonGroupOrientation | null;
}

/**
 * Joins buttons, text, and separators into one control. Give it an
 * `aria-label` that names what the buttons act on.
 */
export function ButtonGroup({
  className,
  orientation,
  ...props
}: ButtonGroupProps) {
  return (
    <div
      role="group"
      data-slot="button-group"
      data-orientation={orientation ?? "horizontal"}
      className={buttonGroupVariants({ orientation, className })}
      {...props}
    />
  );
}

export type ButtonGroupTextProps = useRender.ComponentProps<"div">;

/** A muted, non-interactive cell for a label or value inside a group. */
export function ButtonGroupText({
  className,
  render,
  ref,
  ...props
}: ButtonGroupTextProps) {
  return useRender({
    defaultTagName: "div",
    ref,
    render,
    props: mergeProps<"div">(
      {
        "data-slot": "button-group-text",
        className: cn("sprout-button-group-text", className),
      } as ComponentProps<"div">,
      props,
    ),
  });
}

export type ButtonGroupSeparatorProps = SeparatorLineProps;

/**
 * A line between grouped controls. It runs across the group, so it is
 * `"vertical"` (the default) in a row and `"horizontal"` in a column.
 */
export function ButtonGroupSeparator({
  className,
  orientation = "vertical",
  tone = "input",
  ...props
}: ButtonGroupSeparatorProps) {
  return (
    <Separator
      data-slot="button-group-separator"
      orientation={orientation}
      tone={tone}
      className={(state) =>
        cn(
          "sprout-button-group-separator",
          typeof className === "function" ? className(state) : className,
        )
      }
      {...props}
    />
  );
}
