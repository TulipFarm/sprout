'use client';

import type { ComponentProps } from 'react';
import { ContextMenu as ContextMenuPrimitive } from '@base-ui/react/context-menu';
import { Check } from 'reicon-react/icons/Check';
import { ChevronRight } from 'reicon-react/icons/ChevronRight';
import { cn, stateClassName } from '../internal/classes.js';

export const contextMenuItemVariantNames = ['default', 'destructive'] as const;

export type ContextMenuItemVariant = (typeof contextMenuItemVariantNames)[number];

export type ContextMenuProps = ContextMenuPrimitive.Root.Props;

/** Opens a menu at the pointer on right-click, or after a long press on touch screens. */
export function ContextMenu(props: ContextMenuProps) {
  return <ContextMenuPrimitive.Root {...props} />;
}

export type ContextMenuPortalProps = ContextMenuPrimitive.Portal.Props;

export function ContextMenuPortal(props: ContextMenuPortalProps) {
  return <ContextMenuPrimitive.Portal data-slot="context-menu-portal" {...props} />;
}

export type ContextMenuTriggerProps = ContextMenuPrimitive.Trigger.Props;

/** The area that opens the menu. It renders a `div`; pass `render` to use another element. */
export function ContextMenuTrigger({ className, ...props }: ContextMenuTriggerProps) {
  return (
    <ContextMenuPrimitive.Trigger
      data-slot="context-menu-trigger"
      {...props}
      className={stateClassName<ContextMenuPrimitive.Trigger.State>('sprout-context-menu-trigger', className)}
    />
  );
}

type PositionerProps = Pick<
  ContextMenuPrimitive.Positioner.Props,
  | 'align'
  | 'alignOffset'
  | 'side'
  | 'sideOffset'
  | 'collisionPadding'
  | 'collisionAvoidance'
  | 'sticky'
  | 'positionMethod'
>;

export interface ContextMenuContentProps extends ContextMenuPrimitive.Popup.Props, PositionerProps {
  /** Where the portal renders. Defaults to `document.body`. */
  container?: ContextMenuPrimitive.Portal.Props['container'];
}

/**
 * The menu surface. It renders its own portal and positioner and opens beside
 * the pointer, so place it directly inside `ContextMenu` or `ContextMenuSub`.
 */
export function ContextMenuContent({
  align = 'start',
  alignOffset = 4,
  side = 'right',
  sideOffset = 0,
  collisionPadding = 8,
  collisionAvoidance,
  sticky,
  positionMethod,
  container,
  className,
  ...props
}: ContextMenuContentProps) {
  return (
    <ContextMenuPrimitive.Portal container={container}>
      <ContextMenuPrimitive.Positioner
        className="sprout-context-menu-positioner"
        align={align}
        alignOffset={alignOffset}
        side={side}
        sideOffset={sideOffset}
        collisionPadding={collisionPadding}
        collisionAvoidance={collisionAvoidance}
        sticky={sticky}
        positionMethod={positionMethod}
      >
        <ContextMenuPrimitive.Popup
          data-slot="context-menu-content"
          {...props}
          className={stateClassName<ContextMenuPrimitive.Popup.State>('sprout-context-menu-content', className)}
        />
      </ContextMenuPrimitive.Positioner>
    </ContextMenuPrimitive.Portal>
  );
}

export type ContextMenuGroupProps = ContextMenuPrimitive.Group.Props;

export function ContextMenuGroup(props: ContextMenuGroupProps) {
  return <ContextMenuPrimitive.Group data-slot="context-menu-group" {...props} />;
}

interface Inset {
  /** Indents the text to line up with items that have a leading icon. */
  inset?: boolean;
}

export interface ContextMenuLabelProps extends ContextMenuPrimitive.GroupLabel.Props, Inset {}

export function ContextMenuLabel({ className, inset, ...props }: ContextMenuLabelProps) {
  return (
    <ContextMenuPrimitive.GroupLabel
      data-slot="context-menu-label"
      data-inset={inset || undefined}
      {...props}
      className={stateClassName<ContextMenuPrimitive.GroupLabel.State>('sprout-context-menu-label', className)}
    />
  );
}

export interface ContextMenuItemProps extends ContextMenuPrimitive.Item.Props, Inset {
  variant?: ContextMenuItemVariant;
}

export function ContextMenuItem({ className, inset, variant = 'default', ...props }: ContextMenuItemProps) {
  return (
    <ContextMenuPrimitive.Item
      data-slot="context-menu-item"
      data-inset={inset || undefined}
      data-variant={variant}
      {...props}
      className={stateClassName<ContextMenuPrimitive.Item.State>('sprout-context-menu-item', className)}
    />
  );
}

export type ContextMenuSubProps = ContextMenuPrimitive.SubmenuRoot.Props;

export function ContextMenuSub(props: ContextMenuSubProps) {
  return <ContextMenuPrimitive.SubmenuRoot {...props} />;
}

export interface ContextMenuSubTriggerProps extends ContextMenuPrimitive.SubmenuTrigger.Props, Inset {}

export function ContextMenuSubTrigger({ className, inset, children, ...props }: ContextMenuSubTriggerProps) {
  return (
    <ContextMenuPrimitive.SubmenuTrigger
      data-slot="context-menu-sub-trigger"
      data-inset={inset || undefined}
      {...props}
      className={stateClassName<ContextMenuPrimitive.SubmenuTrigger.State>(
        'sprout-context-menu-item sprout-context-menu-sub-trigger',
        className,
      )}
    >
      {children}
      <ChevronRight size={16} aria-hidden="true" className="sprout-context-menu-sub-chevron" />
    </ContextMenuPrimitive.SubmenuTrigger>
  );
}

export type ContextMenuSubContentProps = ContextMenuContentProps;

/** A nested menu surface. It opens to the side of its sub trigger. */
export function ContextMenuSubContent({
  alignOffset = -5,
  side = 'right',
  className,
  ...props
}: ContextMenuSubContentProps) {
  return (
    <ContextMenuContent
      data-slot="context-menu-sub-content"
      alignOffset={alignOffset}
      side={side}
      {...props}
      className={stateClassName<ContextMenuPrimitive.Popup.State>('sprout-context-menu-sub-content', className)}
    />
  );
}

export interface ContextMenuCheckboxItemProps extends ContextMenuPrimitive.CheckboxItem.Props, Inset {}

export function ContextMenuCheckboxItem({ className, inset, children, ...props }: ContextMenuCheckboxItemProps) {
  return (
    <ContextMenuPrimitive.CheckboxItem
      data-slot="context-menu-checkbox-item"
      data-inset={inset || undefined}
      {...props}
      className={stateClassName<ContextMenuPrimitive.CheckboxItem.State>(
        'sprout-context-menu-item sprout-context-menu-choice',
        className,
      )}
    >
      <span className="sprout-context-menu-indicator" data-slot="context-menu-checkbox-item-indicator">
        <ContextMenuPrimitive.CheckboxItemIndicator>
          <Check size={16} aria-hidden="true" />
        </ContextMenuPrimitive.CheckboxItemIndicator>
      </span>
      {children}
    </ContextMenuPrimitive.CheckboxItem>
  );
}

export type ContextMenuRadioGroupProps = ContextMenuPrimitive.RadioGroup.Props;

export function ContextMenuRadioGroup(props: ContextMenuRadioGroupProps) {
  return <ContextMenuPrimitive.RadioGroup data-slot="context-menu-radio-group" {...props} />;
}

export interface ContextMenuRadioItemProps extends ContextMenuPrimitive.RadioItem.Props, Inset {}

export function ContextMenuRadioItem({ className, inset, children, ...props }: ContextMenuRadioItemProps) {
  return (
    <ContextMenuPrimitive.RadioItem
      data-slot="context-menu-radio-item"
      data-inset={inset || undefined}
      {...props}
      className={stateClassName<ContextMenuPrimitive.RadioItem.State>(
        'sprout-context-menu-item sprout-context-menu-choice',
        className,
      )}
    >
      <span className="sprout-context-menu-indicator" data-slot="context-menu-radio-item-indicator">
        <ContextMenuPrimitive.RadioItemIndicator>
          <Check size={16} aria-hidden="true" />
        </ContextMenuPrimitive.RadioItemIndicator>
      </span>
      {children}
    </ContextMenuPrimitive.RadioItem>
  );
}

export type ContextMenuSeparatorProps = ContextMenuPrimitive.Separator.Props;

export function ContextMenuSeparator({ className, ...props }: ContextMenuSeparatorProps) {
  return (
    <ContextMenuPrimitive.Separator
      data-slot="context-menu-separator"
      {...props}
      className={stateClassName<ContextMenuPrimitive.Separator.State>('sprout-context-menu-separator', className)}
    />
  );
}

export type ContextMenuShortcutProps = ComponentProps<'span'>;

/** Right-aligned hint text, such as a keyboard shortcut. It does not bind keys. */
export function ContextMenuShortcut({ className, ...props }: ContextMenuShortcutProps) {
  return (
    <span data-slot="context-menu-shortcut" {...props} className={cn('sprout-context-menu-shortcut', className)} />
  );
}
