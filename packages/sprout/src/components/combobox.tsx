'use client';

import { useRef } from 'react';
import { Combobox as ComboboxPrimitive } from '@base-ui/react/combobox';
import { Check } from 'reicon-react/icons/Check';
import { ChevronDown } from 'reicon-react/icons/ChevronDown';
import { X } from 'reicon-react/icons/X';
import { cn, stateClassName } from '../internal/classes.js';
import { Button } from './button.js';
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from './input-group.js';

export type ComboboxProps<Value, Multiple extends boolean | undefined = false> = ComboboxPrimitive.Root.Props<
  Value,
  Multiple
>;

/**
 * Holds the value, the typed query, and the open state. It takes every Base
 * UI combobox root prop, including `items`, `multiple`, `value`,
 * `defaultValue`, `onValueChange`, `filter`, `disabled`, and `name`. Pass
 * `items` so the list can filter and `ComboboxEmpty` knows when nothing
 * matches.
 */
export const Combobox = ComboboxPrimitive.Root;

export type ComboboxValueProps = ComboboxPrimitive.Value.Props;

/**
 * Renders the chosen value. Pass a function as children to turn the value
 * into chips or a label, for example `(values) => values.map(...)`.
 */
export function ComboboxValue(props: ComboboxValueProps) {
  return <ComboboxPrimitive.Value data-slot="combobox-value" {...props} />;
}

export type ComboboxTriggerProps = ComboboxPrimitive.Trigger.Props;

/**
 * Opens the list. With no children it is an icon button named “Show
 * options”. With children, such as a `ComboboxValue`, it shows them before
 * the chevron; render it as a `Button` with `render` for a picker that keeps
 * its search field inside the list.
 */
export function ComboboxTrigger({ className, children, ...props }: ComboboxTriggerProps) {
  return (
    <ComboboxPrimitive.Trigger
      data-slot="combobox-trigger"
      aria-label={children == null ? 'Show options' : undefined}
      {...props}
      className={stateClassName<ComboboxPrimitive.Trigger.State>('sprout-combobox-trigger', className)}
    >
      {children}
      <ChevronDown aria-hidden="true" className="sprout-combobox-trigger-icon" />
    </ComboboxPrimitive.Trigger>
  );
}

function ComboboxClear({ className, ...props }: ComboboxPrimitive.Clear.Props) {
  return (
    <ComboboxPrimitive.Clear
      data-slot="combobox-clear"
      aria-label="Clear selection"
      render={<InputGroupButton variant="ghost" size="icon-xs" />}
      {...props}
      className={stateClassName<ComboboxPrimitive.Clear.State>('sprout-combobox-clear', className)}
    >
      <X aria-hidden="true" />
    </ComboboxPrimitive.Clear>
  );
}

export interface ComboboxInputProps extends Omit<ComboboxPrimitive.Input.Props, 'className'> {
  /** Classes for the surrounding `InputGroup`. */
  className?: string;
  /** Shows the chevron button that opens the list. On by default. */
  showTrigger?: boolean;
  /**
   * Shows a clear button once there is a value. It replaces the chevron
   * while it shows.
   */
  showClear?: boolean;
}

/**
 * A search field in a Sprout `InputGroup`. Typing filters the list; the
 * arrow keys, Enter, and Escape work as in a native list box. `className`
 * goes on the group; children are added after the addon, for example an
 * inline-start `InputGroupAddon` with an icon.
 */
export function ComboboxInput({
  className,
  children,
  disabled = false,
  showTrigger = true,
  showClear = false,
  ...props
}: ComboboxInputProps) {
  return (
    <InputGroup className={cn('sprout-combobox-input-group', className)}>
      <ComboboxPrimitive.Input render={<InputGroupInput />} disabled={disabled} {...props} />
      <InputGroupAddon align="inline-end">
        {showTrigger && (
          <InputGroupButton
            size="icon-xs"
            variant="ghost"
            render={<ComboboxTrigger />}
            data-slot="input-group-button"
            className="sprout-combobox-input-trigger"
            disabled={disabled}
          />
        )}
        {showClear && <ComboboxClear disabled={disabled} />}
      </InputGroupAddon>
      {children}
    </InputGroup>
  );
}

type PositionerProps = Pick<
  ComboboxPrimitive.Positioner.Props,
  'side' | 'align' | 'sideOffset' | 'alignOffset' | 'anchor'
>;

export interface ComboboxContentProps extends ComboboxPrimitive.Popup.Props, PositionerProps {}

/**
 * The list surface. It renders its own portal and positioner, opens below
 * the field lined up to its start, and is at least as wide as the field.
 * Pass `anchor` from `useComboboxAnchor` to line it up with a whole chips
 * field instead of the text input.
 */
export function ComboboxContent({
  className,
  side = 'bottom',
  sideOffset = 6,
  align = 'start',
  alignOffset = 0,
  anchor,
  ...props
}: ComboboxContentProps) {
  return (
    <ComboboxPrimitive.Portal>
      <ComboboxPrimitive.Positioner
        className="sprout-combobox-positioner"
        side={side}
        sideOffset={sideOffset}
        align={align}
        alignOffset={alignOffset}
        anchor={anchor}
        collisionPadding={8}
      >
        <ComboboxPrimitive.Popup
          data-slot="combobox-content"
          data-chips={!!anchor}
          {...props}
          className={stateClassName<ComboboxPrimitive.Popup.State>('sprout-combobox-content', className)}
        />
      </ComboboxPrimitive.Positioner>
    </ComboboxPrimitive.Portal>
  );
}

export type ComboboxListProps = ComboboxPrimitive.List.Props;

/** Holds the items. Pass a function as children to render each filtered item. */
export function ComboboxList({ className, ...props }: ComboboxListProps) {
  return (
    <ComboboxPrimitive.List
      data-slot="combobox-list"
      {...props}
      className={stateClassName<ComboboxPrimitive.List.State>('sprout-combobox-list', className)}
    />
  );
}

export type ComboboxItemProps = ComboboxPrimitive.Item.Props;

/** One choice. Long text wraps. A check mark shows when it is chosen. */
export function ComboboxItem({ className, children, ...props }: ComboboxItemProps) {
  return (
    <ComboboxPrimitive.Item
      data-slot="combobox-item"
      {...props}
      className={stateClassName<ComboboxPrimitive.Item.State>('sprout-combobox-item', className)}
    >
      {children}
      <ComboboxPrimitive.ItemIndicator className="sprout-combobox-item-indicator" render={<span />}>
        <Check aria-hidden="true" />
      </ComboboxPrimitive.ItemIndicator>
    </ComboboxPrimitive.Item>
  );
}

export type ComboboxGroupProps = ComboboxPrimitive.Group.Props;

/** Groups related items. Pass `items` and a `ComboboxCollection` to filter inside it. */
export function ComboboxGroup({ className, ...props }: ComboboxGroupProps) {
  return (
    <ComboboxPrimitive.Group
      data-slot="combobox-group"
      {...props}
      className={stateClassName<ComboboxPrimitive.Group.State>('sprout-combobox-group', className)}
    />
  );
}

export type ComboboxLabelProps = ComboboxPrimitive.GroupLabel.Props;

/** A small muted heading that names a `ComboboxGroup`. */
export function ComboboxLabel({ className, ...props }: ComboboxLabelProps) {
  return (
    <ComboboxPrimitive.GroupLabel
      data-slot="combobox-label"
      {...props}
      className={stateClassName<ComboboxPrimitive.GroupLabel.State>('sprout-combobox-label', className)}
    />
  );
}

export type ComboboxCollectionProps = ComboboxPrimitive.Collection.Props;

/** Renders the filtered items of the surrounding group with a function child. */
export function ComboboxCollection(props: ComboboxCollectionProps) {
  return <ComboboxPrimitive.Collection data-slot="combobox-collection" {...props} />;
}

export type ComboboxEmptyProps = ComboboxPrimitive.Empty.Props;

/**
 * Shows its children only when no item matches, and announces them to
 * screen readers. Keep it mounted; it takes no space while the list has
 * items.
 */
export function ComboboxEmpty({ className, ...props }: ComboboxEmptyProps) {
  return (
    <ComboboxPrimitive.Empty
      data-slot="combobox-empty"
      {...props}
      className={stateClassName<ComboboxPrimitive.Empty.State>('sprout-combobox-empty', className)}
    />
  );
}

export type ComboboxSeparatorProps = ComboboxPrimitive.Separator.Props;

export function ComboboxSeparator({ className, ...props }: ComboboxSeparatorProps) {
  return (
    <ComboboxPrimitive.Separator
      data-slot="combobox-separator"
      {...props}
      className={stateClassName<ComboboxPrimitive.Separator.State>('sprout-combobox-separator', className)}
    />
  );
}

export type ComboboxChipsProps = ComboboxPrimitive.Chips.Props;

/**
 * The bordered field for `multiple` comboboxes. Put a `ComboboxValue` that
 * renders `ComboboxChip`s and a `ComboboxChipsInput` inside it. Arrow left
 * and right move between chips; Backspace removes one.
 */
export function ComboboxChips({ className, ...props }: ComboboxChipsProps) {
  return (
    <ComboboxPrimitive.Chips
      data-slot="combobox-chips"
      {...props}
      className={stateClassName<ComboboxPrimitive.Chips.State>('sprout-combobox-chips', className)}
    />
  );
}

export interface ComboboxChipProps extends ComboboxPrimitive.Chip.Props {
  /** Shows the × button that removes the chip. On by default. */
  showRemove?: boolean;
}

/** One chosen value inside `ComboboxChips`. */
export function ComboboxChip({ className, children, showRemove = true, ...props }: ComboboxChipProps) {
  return (
    <ComboboxPrimitive.Chip
      data-slot="combobox-chip"
      {...props}
      className={stateClassName<ComboboxPrimitive.Chip.State>('sprout-combobox-chip', className)}
    >
      {children}
      {showRemove && (
        <ComboboxPrimitive.ChipRemove
          aria-label={typeof children === 'string' ? `Remove ${children}` : 'Remove item'}
          render={<Button variant="ghost" size="icon-xs" />}
          className="sprout-combobox-chip-remove"
          data-slot="combobox-chip-remove"
        >
          <X aria-hidden="true" />
        </ComboboxPrimitive.ChipRemove>
      )}
    </ComboboxPrimitive.Chip>
  );
}

export type ComboboxChipsInputProps = ComboboxPrimitive.Input.Props;

/** The text input that sits after the chips and fills the rest of the row. */
export function ComboboxChipsInput({ className, ...props }: ComboboxChipsInputProps) {
  return (
    <ComboboxPrimitive.Input
      data-slot="combobox-chip-input"
      {...props}
      className={stateClassName<ComboboxPrimitive.Input.State>('sprout-combobox-chips-input', className)}
    />
  );
}

/** A ref for `ComboboxChips` to pass as `ComboboxContent`’s `anchor`. */
export function useComboboxAnchor() {
  return useRef<HTMLDivElement | null>(null);
}
