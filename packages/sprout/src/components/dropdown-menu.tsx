'use client';

import type { ComponentProps } from 'react';
import { Menu as MenuPrimitive } from '@base-ui/react/menu';
import { Check } from 'reicon-react/icons/Check';
import { ChevronRight } from 'reicon-react/icons/ChevronRight';
import { cn, stateClassName } from '../internal/classes.js';

export const dropdownMenuContentSizeNames = ['anchor', 'menu'] as const;
export const dropdownMenuItemVariantNames = ['default', 'destructive'] as const;

export type DropdownMenuContentSize = (typeof dropdownMenuContentSizeNames)[number];
export type DropdownMenuItemVariant = (typeof dropdownMenuItemVariantNames)[number];

export type DropdownMenuProps = MenuPrimitive.Root.Props;

export function DropdownMenu(props: DropdownMenuProps) {
  return <MenuPrimitive.Root {...props} />;
}

export type DropdownMenuPortalProps = MenuPrimitive.Portal.Props;

export function DropdownMenuPortal(props: DropdownMenuPortalProps) {
  return <MenuPrimitive.Portal data-slot="dropdown-menu-portal" {...props} />;
}

export type DropdownMenuTriggerProps = MenuPrimitive.Trigger.Props;

export function DropdownMenuTrigger(props: DropdownMenuTriggerProps) {
  return <MenuPrimitive.Trigger data-slot="dropdown-menu-trigger" {...props} />;
}

type PositionerProps = Pick<
  MenuPrimitive.Positioner.Props,
  | 'align'
  | 'alignOffset'
  | 'side'
  | 'sideOffset'
  | 'collisionPadding'
  | 'collisionAvoidance'
  | 'sticky'
  | 'positionMethod'
>;

export interface DropdownMenuContentProps extends MenuPrimitive.Popup.Props, PositionerProps {
  /**
   * `anchor` matches the trigger width (at least 8rem). `menu` is a fixed
   * 16rem panel for icon triggers and longer labels.
   */
  size?: DropdownMenuContentSize;
  /** Where the portal renders. Defaults to `document.body`. */
  container?: MenuPrimitive.Portal.Props['container'];
}

/**
 * The menu surface. It renders its own portal and positioner, so place it
 * directly inside `DropdownMenu` or `DropdownMenuSub`.
 */
export function DropdownMenuContent({
  align = 'start',
  alignOffset = 0,
  side = 'bottom',
  sideOffset = 4,
  collisionPadding = 8,
  collisionAvoidance,
  sticky,
  positionMethod,
  size = 'anchor',
  container,
  className,
  ...props
}: DropdownMenuContentProps) {
  return (
    <MenuPrimitive.Portal container={container}>
      <MenuPrimitive.Positioner
        className="sprout-dropdown-menu-positioner"
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
          data-slot="dropdown-menu-content"
          data-size={size}
          {...props}
          className={stateClassName<MenuPrimitive.Popup.State>(
            cn('sprout-dropdown-menu-content', `sprout-dropdown-menu-${size}`),
            className,
          )}
        />
      </MenuPrimitive.Positioner>
    </MenuPrimitive.Portal>
  );
}

export type DropdownMenuGroupProps = MenuPrimitive.Group.Props;

export function DropdownMenuGroup(props: DropdownMenuGroupProps) {
  return <MenuPrimitive.Group data-slot="dropdown-menu-group" {...props} />;
}

interface Inset {
  /** Indents the text to line up with items that have a leading icon. */
  inset?: boolean;
}

export interface DropdownMenuLabelProps extends MenuPrimitive.GroupLabel.Props, Inset {}

export function DropdownMenuLabel({ className, inset, ...props }: DropdownMenuLabelProps) {
  return (
    <MenuPrimitive.GroupLabel
      data-slot="dropdown-menu-label"
      data-inset={inset || undefined}
      {...props}
      className={stateClassName<MenuPrimitive.GroupLabel.State>('sprout-dropdown-menu-label', className)}
    />
  );
}

export interface DropdownMenuItemProps extends MenuPrimitive.Item.Props, Inset {
  variant?: DropdownMenuItemVariant;
}

export function DropdownMenuItem({ className, inset, variant = 'default', ...props }: DropdownMenuItemProps) {
  return (
    <MenuPrimitive.Item
      data-slot="dropdown-menu-item"
      data-inset={inset || undefined}
      data-variant={variant}
      {...props}
      className={stateClassName<MenuPrimitive.Item.State>('sprout-dropdown-menu-item', className)}
    />
  );
}

export type DropdownMenuSubProps = MenuPrimitive.SubmenuRoot.Props;

export function DropdownMenuSub(props: DropdownMenuSubProps) {
  return <MenuPrimitive.SubmenuRoot {...props} />;
}

export interface DropdownMenuSubTriggerProps extends MenuPrimitive.SubmenuTrigger.Props, Inset {}

export function DropdownMenuSubTrigger({ className, inset, children, ...props }: DropdownMenuSubTriggerProps) {
  return (
    <MenuPrimitive.SubmenuTrigger
      data-slot="dropdown-menu-sub-trigger"
      data-inset={inset || undefined}
      {...props}
      className={stateClassName<MenuPrimitive.SubmenuTrigger.State>(
        'sprout-dropdown-menu-item sprout-dropdown-menu-sub-trigger',
        className,
      )}
    >
      {children}
      <ChevronRight size={16} aria-hidden="true" className="sprout-dropdown-menu-sub-chevron" />
    </MenuPrimitive.SubmenuTrigger>
  );
}

export type DropdownMenuSubContentProps = DropdownMenuContentProps;

/** A nested menu surface. It opens to the side and sizes to its content. */
export function DropdownMenuSubContent({
  align = 'start',
  alignOffset = -5,
  side = 'right',
  sideOffset = 0,
  className,
  ...props
}: DropdownMenuSubContentProps) {
  return (
    <DropdownMenuContent
      data-slot="dropdown-menu-sub-content"
      align={align}
      alignOffset={alignOffset}
      side={side}
      sideOffset={sideOffset}
      {...props}
      className={stateClassName<MenuPrimitive.Popup.State>('sprout-dropdown-menu-sub-content', className)}
    />
  );
}

export interface DropdownMenuCheckboxItemProps extends MenuPrimitive.CheckboxItem.Props, Inset {}

export function DropdownMenuCheckboxItem({ className, inset, children, ...props }: DropdownMenuCheckboxItemProps) {
  return (
    <MenuPrimitive.CheckboxItem
      data-slot="dropdown-menu-checkbox-item"
      data-inset={inset || undefined}
      {...props}
      className={stateClassName<MenuPrimitive.CheckboxItem.State>(
        'sprout-dropdown-menu-item sprout-dropdown-menu-choice',
        className,
      )}
    >
      <span className="sprout-dropdown-menu-indicator" data-slot="dropdown-menu-checkbox-item-indicator">
        <MenuPrimitive.CheckboxItemIndicator>
          <Check size={16} aria-hidden="true" />
        </MenuPrimitive.CheckboxItemIndicator>
      </span>
      {children}
    </MenuPrimitive.CheckboxItem>
  );
}

export type DropdownMenuRadioGroupProps = MenuPrimitive.RadioGroup.Props;

export function DropdownMenuRadioGroup(props: DropdownMenuRadioGroupProps) {
  return <MenuPrimitive.RadioGroup data-slot="dropdown-menu-radio-group" {...props} />;
}

export interface DropdownMenuRadioItemProps extends MenuPrimitive.RadioItem.Props, Inset {}

export function DropdownMenuRadioItem({ className, inset, children, ...props }: DropdownMenuRadioItemProps) {
  return (
    <MenuPrimitive.RadioItem
      data-slot="dropdown-menu-radio-item"
      data-inset={inset || undefined}
      {...props}
      className={stateClassName<MenuPrimitive.RadioItem.State>(
        'sprout-dropdown-menu-item sprout-dropdown-menu-choice',
        className,
      )}
    >
      <span className="sprout-dropdown-menu-indicator" data-slot="dropdown-menu-radio-item-indicator">
        <MenuPrimitive.RadioItemIndicator>
          <Check size={16} aria-hidden="true" />
        </MenuPrimitive.RadioItemIndicator>
      </span>
      {children}
    </MenuPrimitive.RadioItem>
  );
}

export type DropdownMenuSeparatorProps = MenuPrimitive.Separator.Props;

export function DropdownMenuSeparator({ className, ...props }: DropdownMenuSeparatorProps) {
  return (
    <MenuPrimitive.Separator
      data-slot="dropdown-menu-separator"
      {...props}
      className={stateClassName<MenuPrimitive.Separator.State>('sprout-dropdown-menu-separator', className)}
    />
  );
}

export type DropdownMenuShortcutProps = ComponentProps<'span'>;

/** Right-aligned hint text, such as a keyboard shortcut. It does not bind keys. */
export function DropdownMenuShortcut({ className, ...props }: DropdownMenuShortcutProps) {
  return (
    <span data-slot="dropdown-menu-shortcut" {...props} className={cn('sprout-dropdown-menu-shortcut', className)} />
  );
}
