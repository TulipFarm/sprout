'use client';

import { Slider as BaseSlider } from '@base-ui/react/slider';
import { stateClassName } from '../internal/classes.js';

export type SliderValue = number | readonly number[];

export interface SliderProps<Value extends SliderValue = SliderValue> extends BaseSlider.Root.Props<Value> {
  /**
   * Names each thumb. Defaults to the root `aria-label`, with "minimum" and
   * "maximum" added to the two thumbs of a range.
   */
  getAriaLabel?: ((index: number) => string) | undefined;
  /** Text a screen reader reads for each thumb's value. */
  getAriaValueText?: ((formattedValue: string, value: number, index: number) => string) | undefined;
}

function thumbLabel(label: string | undefined, count: number) {
  if (!label) return undefined;
  if (count === 1) return () => label;
  if (count === 2) return (index: number) => `${label} ${index === 0 ? 'minimum' : 'maximum'}`;
  return (index: number) => `${label} ${index + 1}`;
}

/**
 * A track with one thumb for a number, or one thumb per entry for a range.
 * Pass a number or an array to `value` or `defaultValue`. Name it with
 * `aria-label`, `aria-labelledby`, or `getAriaLabel`.
 */
export function Slider<Value extends SliderValue = SliderValue>({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  getAriaLabel,
  getAriaValueText,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  ...props
}: SliderProps<Value>) {
  const shape = value ?? defaultValue;
  const count = Array.isArray(shape) ? shape.length : 1;
  const label = getAriaLabel ?? (ariaLabelledBy ? undefined : thumbLabel(ariaLabel, count));

  return (
    <BaseSlider.Root<Value>
      data-slot="slider"
      defaultValue={defaultValue}
      value={value}
      min={min}
      max={max}
      thumbAlignment="edge"
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      {...props}
      className={stateClassName<BaseSlider.Root.State>('sprout-slider', className)}
    >
      <BaseSlider.Control data-slot="slider-control" className="sprout-slider-control">
        <BaseSlider.Track data-slot="slider-track" className="sprout-slider-track">
          <BaseSlider.Indicator data-slot="slider-range" className="sprout-slider-range" />
        </BaseSlider.Track>
        {Array.from({ length: count }, (_, index) => (
          <BaseSlider.Thumb
            key={index}
            index={index}
            data-slot="slider-thumb"
            className="sprout-slider-thumb"
            getAriaLabel={label}
            getAriaValueText={getAriaValueText}
          />
        ))}
      </BaseSlider.Control>
    </BaseSlider.Root>
  );
}
