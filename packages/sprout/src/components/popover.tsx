"use client";

import type { ComponentProps } from "react";
import { Popover as PopoverPrimitive } from "@base-ui/react/popover";
import { cn, stateClassName } from "../internal/classes.js";

export const popoverContentSizeNames = [
  "default",
  "menu",
  "picker",
  "panel",
  "work-list",
  "app-actions",
  "bud",
] as const;

export type PopoverContentSize = (typeof popoverContentSizeNames)[number];

export type PopoverProps = PopoverPrimitive.Root.Props;

export function Popover(props: PopoverProps) {
  return <PopoverPrimitive.Root data-slot="popover" {...props} />;
}

export type PopoverTriggerProps = PopoverPrimitive.Trigger.Props;

export function PopoverTrigger(props: PopoverTriggerProps) {
  return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />;
}

type PositionerProps = Pick<
  PopoverPrimitive.Positioner.Props,
  | "align"
  | "alignOffset"
  | "side"
  | "sideOffset"
  | "anchor"
  | "collisionPadding"
  | "collisionAvoidance"
  | "sticky"
  | "positionMethod"
>;

export interface PopoverContentProps
  extends PopoverPrimitive.Popup.Props, PositionerProps {
  /**
   * `default` is an 18rem padded panel for text. `menu`, `picker`, and `panel`
   * are unpadded hosts for search lists and forms. `work-list` caps the height
   * for a header, a scrolling list, and a footer. `app-actions` is a padded
   * 20rem panel that scrolls. `bud` is a fixed-height quick chat window.
   */
  size?: PopoverContentSize;
  /** Keep the content in the DOM while closed, for example to preserve chat state. */
  keepMounted?: PopoverPrimitive.Portal.Props["keepMounted"];
  /** Where the portal renders. Defaults to `document.body`. */
  container?: PopoverPrimitive.Portal.Props["container"];
}

/**
 * The floating panel. It renders its own portal and positioner, so place it
 * directly inside `Popover`.
 */
export function PopoverContent({
  align = "center",
  alignOffset = 0,
  side = "bottom",
  sideOffset = 4,
  collisionPadding = 8,
  collisionAvoidance,
  sticky,
  positionMethod,
  anchor,
  size = "default",
  keepMounted = false,
  container,
  className,
  ...props
}: PopoverContentProps) {
  return (
    <PopoverPrimitive.Portal keepMounted={keepMounted} container={container}>
      <PopoverPrimitive.Positioner
        className="sprout-popover-positioner"
        anchor={anchor}
        align={align}
        alignOffset={alignOffset}
        side={side}
        sideOffset={sideOffset}
        collisionPadding={collisionPadding}
        collisionAvoidance={collisionAvoidance}
        sticky={sticky}
        positionMethod={positionMethod}
      >
        <PopoverPrimitive.Popup
          data-slot="popover-content"
          data-size={size}
          {...props}
          className={stateClassName<PopoverPrimitive.Popup.State>(
            cn("sprout-popover-content", `sprout-popover-${size}`),
            className,
          )}
        />
      </PopoverPrimitive.Positioner>
    </PopoverPrimitive.Portal>
  );
}

export type PopoverHeaderProps = ComponentProps<"div">;

export function PopoverHeader({ className, ...props }: PopoverHeaderProps) {
  return (
    <div
      data-slot="popover-header"
      {...props}
      className={cn("sprout-popover-header", className)}
    />
  );
}

export type PopoverTitleProps = PopoverPrimitive.Title.Props;

export function PopoverTitle({ className, ...props }: PopoverTitleProps) {
  return (
    <PopoverPrimitive.Title
      data-slot="popover-title"
      {...props}
      className={stateClassName<PopoverPrimitive.Title.State>(
        "sprout-popover-title",
        className,
      )}
    />
  );
}

export type PopoverDescriptionProps = PopoverPrimitive.Description.Props;

export function PopoverDescription({
  className,
  ...props
}: PopoverDescriptionProps) {
  return (
    <PopoverPrimitive.Description
      data-slot="popover-description"
      {...props}
      className={stateClassName<PopoverPrimitive.Description.State>(
        "sprout-popover-description",
        className,
      )}
    />
  );
}
