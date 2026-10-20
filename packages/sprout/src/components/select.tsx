'use client';

import { Select as SelectPrimitive } from '@base-ui/react/select';
import { Check } from 'reicon-react/icons/Check';
import { ChevronDown } from 'reicon-react/icons/ChevronDown';
import { ChevronUp } from 'reicon-react/icons/ChevronUp';
import { cn, stateClassName } from '../internal/classes.js';
import { useFieldControl } from './field.js';

export const selectTriggerSizeNames = ['default', 'sm', 'calendar'] as const;
export const selectTriggerWidthNames = ['fit', 'full'] as const;

export type SelectTriggerSize = (typeof selectTriggerSizeNames)[number];
export type SelectTriggerWidth = (typeof selectTriggerWidthNames)[number];

export type SelectProps<Value = unknown, Multiple extends boolean | undefined = false> = SelectPrimitive.Root.Props<
  Value,
  Multiple
>;

/**
 * Holds the value and open state. It takes every Base UI select root prop,
 * including `items`, `value`, `defaultValue`, `onValueChange`, `disabled`,
 * `required`, and `name`.
 */
export const Select = SelectPrimitive.Root;

export type SelectGroupProps = SelectPrimitive.Group.Props;

export function SelectGroup({ className, ...props }: SelectGroupProps) {
  return (
    <SelectPrimitive.Group
      data-slot="select-group"
      {...props}
      className={stateClassName<SelectPrimitive.Group.State>('sprout-select-group', className)}
    />
  );
}

export type SelectValueProps = SelectPrimitive.Value.Props;

/**
 * Shows the chosen item. Pass `placeholder` for the empty state, or children
 * to show a custom label such as a name looked up from the value.
 */
export function SelectValue({ className, ...props }: SelectValueProps) {
  return (
    <SelectPrimitive.Value
      data-slot="select-value"
      {...props}
      className={stateClassName<SelectPrimitive.Value.State>('sprout-select-value', className)}
    />
  );
}

export interface SelectTriggerProps extends SelectPrimitive.Trigger.Props {
  /**
   * `default` is 32px for forms. `sm` is 28px for toolbars, filters, table
   * rows, and inline sentences. `calendar` is a 32px control with small text
   * for calendar headers.
   */
  size?: SelectTriggerSize;
  /** `fit` sizes to the value. `full` fills the parent, as in form fields. */
  width?: SelectTriggerWidth;
}

export function SelectTrigger({ className, size = 'default', width = 'fit', children, ...rest }: SelectTriggerProps) {
  const props = useFieldControl(rest);
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      data-size={size}
      data-width={width}
      {...props}
      className={stateClassName<SelectPrimitive.Trigger.State>(
        cn('sprout-select-trigger', `sprout-select-trigger-${size}`, `sprout-select-trigger-${width}`),
        className,
      )}
    >
      {children}
      <SelectPrimitive.Icon className="sprout-select-icon">
        <ChevronDown aria-hidden="true" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}

type PositionerProps = Pick<
  SelectPrimitive.Positioner.Props,
  | 'align'
  | 'alignOffset'
  | 'side'
  | 'sideOffset'
  | 'alignItemWithTrigger'
  | 'collisionPadding'
  | 'collisionAvoidance'
  | 'sticky'
  | 'positionMethod'
>;

export interface SelectContentProps extends SelectPrimitive.Popup.Props, PositionerProps {
  /** Where the portal renders. Defaults to `document.body`. */
  container?: SelectPrimitive.Portal.Props['container'];
}

/**
 * The list surface. It renders its own portal, positioner, list, and scroll
 * arrows. By default the chosen item lines up over the trigger; pass
 * `alignItemWithTrigger={false}` to open below it instead.
 */
export function SelectContent({
  side = 'bottom',
  sideOffset = 4,
  align = 'center',
  alignOffset = 0,
  alignItemWithTrigger = true,
  collisionPadding = 8,
  collisionAvoidance,
  sticky,
  positionMethod,
  container,
  className,
  children,
  ...props
}: SelectContentProps) {
  return (
    <SelectPrimitive.Portal container={container}>
      <SelectPrimitive.Positioner
        className="sprout-select-positioner"
        side={side}
        sideOffset={sideOffset}
        align={align}
        alignOffset={alignOffset}
        alignItemWithTrigger={alignItemWithTrigger}
        collisionPadding={collisionPadding}
        collisionAvoidance={collisionAvoidance}
        sticky={sticky}
        positionMethod={positionMethod}
      >
        <SelectPrimitive.Popup
          data-slot="select-content"
          data-align-trigger={alignItemWithTrigger}
          {...props}
          className={stateClassName<SelectPrimitive.Popup.State>('sprout-select-content', className)}
        >
          <SelectScrollUpButton />
          <SelectPrimitive.List className="sprout-select-list">{children}</SelectPrimitive.List>
          <SelectScrollDownButton />
        </SelectPrimitive.Popup>
      </SelectPrimitive.Positioner>
    </SelectPrimitive.Portal>
  );
}

export type SelectLabelProps = SelectPrimitive.GroupLabel.Props;

export function SelectLabel({ className, ...props }: SelectLabelProps) {
  return (
    <SelectPrimitive.GroupLabel
      data-slot="select-label"
      {...props}
      className={stateClassName<SelectPrimitive.GroupLabel.State>('sprout-select-label', className)}
    />
  );
}

export type SelectItemProps = SelectPrimitive.Item.Props;

/**
 * One choice. Children may hold an icon, rich content, or plain text. Long
 * text wraps instead of being cut off.
 */
export function SelectItem({ className, children, ...props }: SelectItemProps) {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      {...props}
      className={stateClassName<SelectPrimitive.Item.State>('sprout-select-item', className)}
    >
      <SelectPrimitive.ItemText className="sprout-select-item-text">{children}</SelectPrimitive.ItemText>
      <SelectPrimitive.ItemIndicator className="sprout-select-item-indicator">
        <Check aria-hidden="true" />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  );
}

export type SelectSeparatorProps = SelectPrimitive.Separator.Props;

export function SelectSeparator({ className, ...props }: SelectSeparatorProps) {
  return (
    <SelectPrimitive.Separator
      data-slot="select-separator"
      {...props}
      className={stateClassName<SelectPrimitive.Separator.State>('sprout-select-separator', className)}
    />
  );
}

export type SelectScrollUpButtonProps = SelectPrimitive.ScrollUpArrow.Props;

export function SelectScrollUpButton({ className, ...props }: SelectScrollUpButtonProps) {
  return (
    <SelectPrimitive.ScrollUpArrow
      data-slot="select-scroll-up-button"
      {...props}
      className={stateClassName<SelectPrimitive.ScrollUpArrow.State>(
        'sprout-select-scroll-button sprout-select-scroll-up',
        className,
      )}
    >
      <ChevronUp aria-hidden="true" />
    </SelectPrimitive.ScrollUpArrow>
  );
}

export type SelectScrollDownButtonProps = SelectPrimitive.ScrollDownArrow.Props;

export function SelectScrollDownButton({ className, ...props }: SelectScrollDownButtonProps) {
  return (
    <SelectPrimitive.ScrollDownArrow
      data-slot="select-scroll-down-button"
      {...props}
      className={stateClassName<SelectPrimitive.ScrollDownArrow.State>(
        'sprout-select-scroll-button sprout-select-scroll-down',
        className,
      )}
    >
      <ChevronDown aria-hidden="true" />
    </SelectPrimitive.ScrollDownArrow>
  );
}
