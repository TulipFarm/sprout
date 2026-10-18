"use client";

import { PreviewCard as PreviewCardPrimitive } from "@base-ui/react/preview-card";
import { stateClassName } from "../internal/classes.js";

export type HoverCardProps = PreviewCardPrimitive.Root.Props;

/**
 * A card that previews what a link points to. It opens when the link is
 * hovered or keyboard-focused and closes on Escape, blur, or pointer leave.
 */
export function HoverCard(props: HoverCardProps) {
  return <PreviewCardPrimitive.Root data-slot="hover-card" {...props} />;
}

export type HoverCardTriggerProps = PreviewCardPrimitive.Trigger.Props;

/**
 * The link that opens the card. It renders an `a` by default; pass your own
 * link or router link through `render`. Takes `delay` (600ms) and
 * `closeDelay` (300ms).
 */
export function HoverCardTrigger({
  className,
  ...props
}: HoverCardTriggerProps) {
  return (
    <PreviewCardPrimitive.Trigger
      data-slot="hover-card-trigger"
      {...props}
      className={stateClassName<PreviewCardPrimitive.Trigger.State>(
        "sprout-hover-card-trigger",
        className,
      )}
    />
  );
}

type PositionerProps = Pick<
  PreviewCardPrimitive.Positioner.Props,
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

export interface HoverCardContentProps
  extends PreviewCardPrimitive.Popup.Props, PositionerProps {
  /** Keep the card in the DOM while closed. */
  keepMounted?: PreviewCardPrimitive.Portal.Props["keepMounted"];
  /** Where the portal renders. Defaults to `document.body`. */
  container?: PreviewCardPrimitive.Portal.Props["container"];
}

/**
 * The 16rem floating card. It renders its own portal and positioner, so place
 * it directly inside `HoverCard`.
 */
export function HoverCardContent({
  side = "bottom",
  sideOffset = 4,
  align = "center",
  alignOffset = 4,
  collisionPadding = 8,
  collisionAvoidance,
  sticky,
  positionMethod,
  anchor,
  keepMounted = false,
  container,
  className,
  ...props
}: HoverCardContentProps) {
  return (
    <PreviewCardPrimitive.Portal
      data-slot="hover-card-portal"
      keepMounted={keepMounted}
      container={container}
    >
      <PreviewCardPrimitive.Positioner
        className="sprout-hover-card-positioner"
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
        <PreviewCardPrimitive.Popup
          data-slot="hover-card-content"
          {...props}
          className={stateClassName<PreviewCardPrimitive.Popup.State>(
            "sprout-hover-card-content",
            className,
          )}
        />
      </PreviewCardPrimitive.Positioner>
    </PreviewCardPrimitive.Portal>
  );
}
