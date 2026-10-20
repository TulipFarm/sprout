'use client';

import { createContext, useContext, type CSSProperties } from 'react';
import { Toggle as BaseToggle } from '@base-ui/react/toggle';
import { ToggleGroup as BaseToggleGroup } from '@base-ui/react/toggle-group';
import { cn } from '../internal/classes.js';

export const toggleGroupVariantNames = ['default', 'outline'] as const;
export const toggleGroupSizeNames = ['default', 'sm', 'lg'] as const;

export type ToggleGroupVariant = (typeof toggleGroupVariantNames)[number];
export type ToggleGroupSize = (typeof toggleGroupSizeNames)[number];

interface ToggleGroupContextValue {
  variant: ToggleGroupVariant;
  size: ToggleGroupSize;
  spacing: number;
  orientation: 'horizontal' | 'vertical';
}

const ToggleGroupContext = createContext<ToggleGroupContextValue>({
  variant: 'default',
  size: 'default',
  spacing: 2,
  orientation: 'horizontal',
});

export interface ToggleGroupProps<Value extends string = string> extends BaseToggleGroup.Props<Value> {
  /** `default` is borderless. `outline` draws a control border on each item. */
  variant?: ToggleGroupVariant;
  /** `sm` is 28px, `default` 32px, and `lg` 36px tall. */
  size?: ToggleGroupSize;
  /**
   * Gap between items in 4px steps. `0` joins the items into one
   * segmented control with shared borders and outer corners only.
   */
  spacing?: number;
}

/**
 * A row or column of toggle buttons that share one value array. Pass
 * `multiple` to let several items stay pressed. Arrow keys move focus
 * between items; Space and Enter press the focused one.
 */
export function ToggleGroup<Value extends string = string>({
  className,
  style,
  variant = 'default',
  size = 'default',
  spacing = 2,
  orientation = 'horizontal',
  children,
  ...props
}: ToggleGroupProps<Value>) {
  const gap = { '--sprout-toggle-group-spacing': spacing } as CSSProperties;
  return (
    <BaseToggleGroup<Value>
      data-slot="toggle-group"
      data-variant={variant}
      data-size={size}
      data-spacing={spacing}
      orientation={orientation}
      {...props}
      style={
        typeof style === 'function'
          ? (state: BaseToggleGroup.State) => ({ ...gap, ...style(state) })
          : { ...gap, ...style }
      }
      className={
        typeof className === 'function'
          ? (state: BaseToggleGroup.State) => cn('sprout-toggle-group', className(state))
          : cn('sprout-toggle-group', className)
      }
    >
      <ToggleGroupContext.Provider value={{ variant, size, spacing, orientation }}>
        {children}
      </ToggleGroupContext.Provider>
    </BaseToggleGroup>
  );
}

export type ToggleGroupItemProps<Value extends string = string> = BaseToggle.Props<Value>;

/**
 * One toggle button in a `ToggleGroup`. Its `value` is added to the group
 * value while pressed. It takes the group's variant, size, and spacing.
 * An icon-only item needs an `aria-label`.
 */
export function ToggleGroupItem<Value extends string = string>({ className, ...props }: ToggleGroupItemProps<Value>) {
  const { variant, size, spacing, orientation } = useContext(ToggleGroupContext);
  const base = cn(
    'sprout-toggle-group-item',
    `sprout-toggle-group-item-${variant}`,
    `sprout-toggle-group-item-size-${size}`,
  );
  return (
    <BaseToggle<Value>
      data-slot="toggle-group-item"
      data-variant={variant}
      data-size={size}
      data-spacing={spacing}
      data-orientation={orientation}
      {...props}
      className={
        typeof className === 'function' ? (state: BaseToggle.State) => cn(base, className(state)) : cn(base, className)
      }
    />
  );
}
