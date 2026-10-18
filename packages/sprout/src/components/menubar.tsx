"use client";

import type { ComponentProps } from "react";
import { Menu as MenuPrimitive } from "@base-ui/react/menu";
import { Menubar as MenubarPrimitive } from "@base-ui/react/menubar";
import { Check } from "reicon-react/icons/Check";
import { ChevronRight } from "reicon-react/icons/ChevronRight";
import { cn, stateClassName } from "../internal/classes.js";

export const menubarItemVariantNames = ["default", "destructive"] as const;

export type MenubarItemVariant = (typeof menubarItemVariantNames)[number];

export type MenubarProps = MenubarPrimitive.Props;

/**
 * A row of menus, like an app's File and View menus. Left and Right move
 * between triggers, and Down opens the focused menu.
 */
export function Menubar({ className, ...props }: MenubarProps) {
  return (
    <MenubarPrimitive
      data-slot="menubar"
      {...props}
      className={stateClassName<MenubarPrimitive.State>(
        "sprout-menubar",
        className,
      )}
    />
  );
}

export type MenubarMenuProps = MenuPrimitive.Root.Props;

/** One menu in the bar. Place a `MenubarTrigger` and `MenubarContent` inside. */
export function MenubarMenu(props: MenubarMenuProps) {
  return <MenuPrimitive.Root {...props} />;
}

export type MenubarPortalProps = MenuPrimitive.Portal.Props;

export function MenubarPortal(props: MenubarPortalProps) {
  return <MenuPrimitive.Portal data-slot="menubar-portal" {...props} />;
}

export type MenubarTriggerProps = MenuPrimitive.Trigger.Props;

export function MenubarTrigger({ className, ...props }: MenubarTriggerProps) {
  return (
    <MenuPrimitive.Trigger
      data-slot="menubar-trigger"
      {...props}
      className={stateClassName<MenuPrimitive.Trigger.State>(
        "sprout-menubar-trigger",
        className,
      )}
    />
  );
}

type PositionerProps = Pick<
  MenuPrimitive.Positioner.Props,
  | "align"
  | "alignOffset"
  | "side"
  | "sideOffset"
  | "collisionPadding"
  | "collisionAvoidance"
  | "sticky"
  | "positionMethod"
>;

export interface MenubarContentProps
  extends MenuPrimitive.Popup.Props, PositionerProps {
  /** Where the portal renders. Defaults to `document.body`. */
  container?: MenuPrimitive.Portal.Props["container"];
}

/**
 * The menu surface. It renders its own portal and positioner, so place it
 * directly inside `MenubarMenu`. It lines up with the bar's inner edge.
 */
export function MenubarContent({
  align = "start",
  alignOffset = -4,
  side = "bottom",
  sideOffset = 8,
  collisionPadding = 8,
  collisionAvoidance,
  sticky,
  positionMethod,
  container,
  className,
  ...props
}: MenubarContentProps) {
  return (
    <MenuPrimitive.Portal container={container}>
      <MenuPrimitive.Positioner
        className="sprout-menubar-positioner"
        align={align}
        alignOffset={alignOffset}
        side={side}
        sideOffset={sideOffset}
        collisionPadding={collisionPadding}
        collisionAvoidance={collisionAvoidance}
        sticky={sticky}
        positionMethod={positionMethod}
      >
        <MenuPrimitive.Popup
          data-slot="menubar-content"
          {...props}
          className={stateClassName<MenuPrimitive.Popup.State>(
            "sprout-menubar-content",
            className,
          )}
        />
      </MenuPrimitive.Positioner>
    </MenuPrimitive.Portal>
  );
}

export type MenubarGroupProps = MenuPrimitive.Group.Props;

export function MenubarGroup(props: MenubarGroupProps) {
  return <MenuPrimitive.Group data-slot="menubar-group" {...props} />;
}

interface Inset {
  /** Indents the text to line up with checkbox, radio, and icon items. */
  inset?: boolean;
}

export interface MenubarLabelProps
  extends MenuPrimitive.GroupLabel.Props, Inset {}

export function MenubarLabel({
  className,
  inset,
  ...props
}: MenubarLabelProps) {
  return (
    <MenuPrimitive.GroupLabel
      data-slot="menubar-label"
      data-inset={inset || undefined}
      {...props}
      className={stateClassName<MenuPrimitive.GroupLabel.State>(
        "sprout-menubar-label",
        className,
      )}
    />
  );
}

export interface MenubarItemProps extends MenuPrimitive.Item.Props, Inset {
  variant?: MenubarItemVariant;
}

export function MenubarItem({
  className,
  inset,
  variant = "default",
  ...props
}: MenubarItemProps) {
  return (
    <MenuPrimitive.Item
      data-slot="menubar-item"
      data-inset={inset || undefined}
      data-variant={variant}
      {...props}
      className={stateClassName<MenuPrimitive.Item.State>(
        "sprout-menubar-item",
        className,
      )}
    />
  );
}

export interface MenubarCheckboxItemProps
  extends MenuPrimitive.CheckboxItem.Props, Inset {}

/** A toggle row. The check sits at the start, so the label lines up with `inset` rows. */
export function MenubarCheckboxItem({
  className,
  inset,
  children,
  ...props
}: MenubarCheckboxItemProps) {
  return (
    <MenuPrimitive.CheckboxItem
      data-slot="menubar-checkbox-item"
      data-inset={inset || undefined}
      {...props}
      className={stateClassName<MenuPrimitive.CheckboxItem.State>(
        "sprout-menubar-item sprout-menubar-choice",
        className,
      )}
    >
      <span
        className="sprout-menubar-indicator"
        data-slot="menubar-checkbox-item-indicator"
      >
        <MenuPrimitive.CheckboxItemIndicator>
          <Check size={16} aria-hidden="true" />
        </MenuPrimitive.CheckboxItemIndicator>
      </span>
      {children}
    </MenuPrimitive.CheckboxItem>
  );
}

export type MenubarRadioGroupProps = MenuPrimitive.RadioGroup.Props;

export function MenubarRadioGroup(props: MenubarRadioGroupProps) {
  return (
    <MenuPrimitive.RadioGroup data-slot="menubar-radio-group" {...props} />
  );
}

export interface MenubarRadioItemProps
  extends MenuPrimitive.RadioItem.Props, Inset {}

export function MenubarRadioItem({
  className,
  inset,
  children,
  ...props
}: MenubarRadioItemProps) {
  return (
    <MenuPrimitive.RadioItem
      data-slot="menubar-radio-item"
      data-inset={inset || undefined}
      {...props}
      className={stateClassName<MenuPrimitive.RadioItem.State>(
        "sprout-menubar-item sprout-menubar-choice",
        className,
      )}
    >
      <span
        className="sprout-menubar-indicator"
        data-slot="menubar-radio-item-indicator"
      >
        <MenuPrimitive.RadioItemIndicator>
          <Check size={16} aria-hidden="true" />
        </MenuPrimitive.RadioItemIndicator>
      </span>
      {children}
    </MenuPrimitive.RadioItem>
  );
}

export type MenubarSeparatorProps = MenuPrimitive.Separator.Props;

export function MenubarSeparator({
  className,
  ...props
}: MenubarSeparatorProps) {
  return (
    <MenuPrimitive.Separator
      data-slot="menubar-separator"
      {...props}
      className={stateClassName<MenuPrimitive.Separator.State>(
        "sprout-menubar-separator",
        className,
      )}
    />
  );
}

export type MenubarShortcutProps = ComponentProps<"span">;

/** Right-aligned hint text, such as a keyboard shortcut. It does not bind keys. */
export function MenubarShortcut({ className, ...props }: MenubarShortcutProps) {
  return (
    <span
      data-slot="menubar-shortcut"
      {...props}
      className={cn("sprout-menubar-shortcut", className)}
    />
  );
}

export type MenubarSubProps = MenuPrimitive.SubmenuRoot.Props;

export function MenubarSub(props: MenubarSubProps) {
  return <MenuPrimitive.SubmenuRoot {...props} />;
}

export interface MenubarSubTriggerProps
  extends MenuPrimitive.SubmenuTrigger.Props, Inset {}

export function MenubarSubTrigger({
  className,
  inset,
  children,
  ...props
}: MenubarSubTriggerProps) {
  return (
    <MenuPrimitive.SubmenuTrigger
      data-slot="menubar-sub-trigger"
      data-inset={inset || undefined}
      {...props}
      className={stateClassName<MenuPrimitive.SubmenuTrigger.State>(
        "sprout-menubar-item sprout-menubar-sub-trigger",
        className,
      )}
    >
      {children}
      <ChevronRight
        size={16}
        aria-hidden="true"
        className="sprout-menubar-sub-chevron"
      />
    </MenuPrimitive.SubmenuTrigger>
  );
}

export type MenubarSubContentProps = MenubarContentProps;

/** A nested menu surface. It opens to the side and sizes to its content. */
export function MenubarSubContent({
  align = "start",
  alignOffset = -5,
  side = "right",
  sideOffset = 0,
  className,
  ...props
}: MenubarSubContentProps) {
  return (
    <MenubarContent
      data-slot="menubar-sub-content"
      align={align}
      alignOffset={alignOffset}
      side={side}
      sideOffset={sideOffset}
      {...props}
      className={stateClassName<MenuPrimitive.Popup.State>(
        "sprout-menubar-sub-content",
        className,
      )}
    />
  );
}
