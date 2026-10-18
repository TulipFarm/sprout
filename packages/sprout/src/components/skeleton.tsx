import type { ComponentProps } from "react";
import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { cn } from "../internal/classes.js";

export const skeletonShapeNames = [
  "line",
  "title",
  "avatar",
  "panel",
  "checkbox",
  "action",
] as const;

export type SkeletonShape = (typeof skeletonShapeNames)[number];

export interface SkeletonProps extends ComponentProps<"div"> {
  /**
   * The placeholder footprint. `"line"` is a 16px text row, `"title"` a 24px
   * heading at two thirds width, `"avatar"` a 32px circle, `"panel"` a 128px
   * block, `"checkbox"` a 16px box, and `"action"` a 28px icon button.
   */
  shape?: SkeletonShape;
}

/** A pulsing placeholder that holds the space of content still loading. */
export function Skeleton({
  shape = "line",
  className,
  ...props
}: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      data-slot="skeleton"
      data-shape={shape}
      className={cn("sprout-skeleton", className)}
      {...props}
    />
  );
}

export const skeletonGroupGapNames = ["sm", "md", "lg"] as const;

export type SkeletonGroupGap = (typeof skeletonGroupGapNames)[number];

export interface SkeletonGroupState extends Record<string, unknown> {
  slot: "skeleton-group";
  gap: SkeletonGroupGap;
}

export interface SkeletonGroupProps extends useRender.ComponentProps<
  "div",
  SkeletonGroupState
> {
  /**
   * Names the loading region, such as `"Loading projects"`. It becomes the
   * accessible name and is also read as visually hidden text.
   */
  label?: string;
  /** Space between placeholders: `"sm"` 8px, `"md"` 12px, `"lg"` 16px. */
  gap?: SkeletonGroupGap;
}

/** A `status` region that stacks skeletons and names what is loading. */
export function SkeletonGroup({
  label,
  gap = "md",
  className,
  children,
  render,
  ref,
  ...props
}: SkeletonGroupProps) {
  return useRender({
    defaultTagName: "div",
    ref,
    render,
    props: mergeProps<"div">(
      {
        role: "status",
        "aria-label": label,
        className: cn("sprout-skeleton-group", className),
        children: (
          <>
            {children}
            {label ? (
              <span className="sprout-skeleton-group-label">{`${label}…`}</span>
            ) : null}
          </>
        ),
      },
      props,
    ),
    state: { slot: "skeleton-group", gap },
  });
}
