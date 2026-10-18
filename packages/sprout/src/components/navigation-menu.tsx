"use client";

import { NavigationMenu as NavigationMenuPrimitive } from "@base-ui/react/navigation-menu";
import { ChevronDown } from "reicon-react/icons/ChevronDown";
import { cn, stateClassName } from "../internal/classes.js";

type Align = NonNullable<NavigationMenuPrimitive.Positioner.Props["align"]>;

export interface NavigationMenuProps
  extends NavigationMenuPrimitive.Root.Props {
  /** Where the shared panel lines up with the open trigger. Defaults to `"start"`. */
  align?: Align;
}

/**
 * A row of site links where some items open a panel of more links. It
 * renders the shared panel itself, so put `NavigationMenuList` directly inside.
 */
export function NavigationMenu({
  align = "start",
  className,
  children,
  ...props
}: NavigationMenuProps) {
  return (
    <NavigationMenuPrimitive.Root
      data-slot="navigation-menu"
      {...props}
      className={stateClassName<NavigationMenuPrimitive.Root.State>(
        "sprout-navigation-menu",
        className,
      )}
    >
      {children}
      <NavigationMenuPositioner align={align} />
    </NavigationMenuPrimitive.Root>
  );
}

export type NavigationMenuListProps = NavigationMenuPrimitive.List.Props;

export function NavigationMenuList({
  className,
  ...props
}: NavigationMenuListProps) {
  return (
    <NavigationMenuPrimitive.List
      data-slot="navigation-menu-list"
      {...props}
      className={stateClassName<NavigationMenuPrimitive.List.State>(
        "sprout-navigation-menu-list",
        className,
      )}
    />
  );
}

export type NavigationMenuItemProps = NavigationMenuPrimitive.Item.Props;

export function NavigationMenuItem({
  className,
  ...props
}: NavigationMenuItemProps) {
  return (
    <NavigationMenuPrimitive.Item
      data-slot="navigation-menu-item"
      {...props}
      className={stateClassName<NavigationMenuPrimitive.Item.State>(
        "sprout-navigation-menu-item",
        className,
      )}
    />
  );
}

/**
 * Returns the trigger class string. Add it to a top-level `NavigationMenuLink`
 * (or any link) so it matches the triggers beside it.
 */
export function navigationMenuTriggerStyle(className?: string) {
  return cn("sprout-navigation-menu-trigger", className);
}

export type NavigationMenuTriggerProps = NavigationMenuPrimitive.Trigger.Props;

/** Opens its item's `NavigationMenuContent`. A chevron turns while open. */
export function NavigationMenuTrigger({
  className,
  children,
  ...props
}: NavigationMenuTriggerProps) {
  return (
    <NavigationMenuPrimitive.Trigger
      data-slot="navigation-menu-trigger"
      {...props}
      className={stateClassName<NavigationMenuPrimitive.Trigger.State>(
        "sprout-navigation-menu-trigger",
        className,
      )}
    >
      {children}
      <NavigationMenuPrimitive.Icon
        data-slot="navigation-menu-chevron"
        className="sprout-navigation-menu-chevron"
      >
        <ChevronDown />
      </NavigationMenuPrimitive.Icon>
    </NavigationMenuPrimitive.Trigger>
  );
}

export type NavigationMenuContentProps = NavigationMenuPrimitive.Content.Props;

/** The panel for one item. It is moved into the shared popup while open. */
export function NavigationMenuContent({
  className,
  ...props
}: NavigationMenuContentProps) {
  return (
    <NavigationMenuPrimitive.Content
      data-slot="navigation-menu-content"
      {...props}
      className={stateClassName<NavigationMenuPrimitive.Content.State>(
        "sprout-navigation-menu-content",
        className,
      )}
    />
  );
}

export type NavigationMenuPositionerProps =
  NavigationMenuPrimitive.Positioner.Props;

/**
 * The portal, positioner, popup, and viewport that show the open panel.
 * `NavigationMenu` already renders one; use this only to build a root by hand.
 */
export function NavigationMenuPositioner({
  className,
  side = "bottom",
  sideOffset = 8,
  align = "start",
  alignOffset = 0,
  collisionPadding = 8,
  ...props
}: NavigationMenuPositionerProps) {
  return (
    <NavigationMenuPrimitive.Portal data-slot="navigation-menu-portal">
      <NavigationMenuPrimitive.Positioner
        data-slot="navigation-menu-positioner"
        side={side}
        sideOffset={sideOffset}
        align={align}
        alignOffset={alignOffset}
        collisionPadding={collisionPadding}
        {...props}
        className={stateClassName<NavigationMenuPrimitive.Positioner.State>(
          "sprout-navigation-menu-positioner",
          className,
        )}
      >
        <NavigationMenuPrimitive.Popup
          data-slot="navigation-menu-popup"
          className="sprout-navigation-menu-popup"
        >
          <NavigationMenuPrimitive.Viewport
            data-slot="navigation-menu-viewport"
            className="sprout-navigation-menu-viewport"
          />
        </NavigationMenuPrimitive.Popup>
      </NavigationMenuPrimitive.Positioner>
    </NavigationMenuPrimitive.Portal>
  );
}

export type NavigationMenuLinkProps = NavigationMenuPrimitive.Link.Props;

/**
 * A link in the list or inside a panel. Pass `active` for the current page
 * (sets `aria-current="page"`) and your router link through `render`.
 */
export function NavigationMenuLink({
  className,
  ...props
}: NavigationMenuLinkProps) {
  return (
    <NavigationMenuPrimitive.Link
      data-slot="navigation-menu-link"
      {...props}
      className={stateClassName<NavigationMenuPrimitive.Link.State>(
        "sprout-navigation-menu-link",
        className,
      )}
    />
  );
}

export type NavigationMenuIndicatorProps = NavigationMenuPrimitive.Icon.Props;

/**
 * A small pointer under an item's trigger that shows while its panel is open.
 * Place it inside `NavigationMenuItem`, after the trigger.
 */
export function NavigationMenuIndicator({
  className,
  children,
  ...props
}: NavigationMenuIndicatorProps) {
  return (
    <NavigationMenuPrimitive.Icon
      data-slot="navigation-menu-indicator"
      {...props}
      className={stateClassName<NavigationMenuPrimitive.Icon.State>(
        "sprout-navigation-menu-indicator",
        className,
      )}
    >
      {children ?? <span className="sprout-navigation-menu-indicator-arrow" />}
    </NavigationMenuPrimitive.Icon>
  );
}
