'use client';

import { Progress as BaseProgress } from '@base-ui/react/progress';
import { stateClassName } from '../internal/classes.js';

export type ProgressProps = BaseProgress.Root.Props;

/**
 * A bar that shows how far a task has come. Pass a number to `value`, or
 * `null` while the amount is unknown. Children, such as `ProgressLabel` and
 * `ProgressValue`, sit on one row above the track. Name it with a
 * `ProgressLabel` or `aria-label`.
 */
export function Progress({ className, children, ...props }: ProgressProps) {
  return (
    <BaseProgress.Root
      data-slot="progress"
      {...props}
      className={stateClassName<BaseProgress.Root.State>('sprout-progress', className)}
    >
      {children}
      <ProgressTrack>
        <ProgressIndicator />
      </ProgressTrack>
    </BaseProgress.Root>
  );
}

export type ProgressTrackProps = BaseProgress.Track.Props;

/** The 4px rail behind the indicator. `Progress` renders one for you. */
export function ProgressTrack({ className, ...props }: ProgressTrackProps) {
  return (
    <BaseProgress.Track
      data-slot="progress-track"
      {...props}
      className={stateClassName<BaseProgress.Root.State>('sprout-progress-track', className)}
    />
  );
}

export type ProgressIndicatorProps = BaseProgress.Indicator.Props;

/**
 * The filled part of the track. Its width follows the value; with a `null`
 * value it slides across the track instead.
 */
export function ProgressIndicator({ className, ...props }: ProgressIndicatorProps) {
  return (
    <BaseProgress.Indicator
      data-slot="progress-indicator"
      {...props}
      className={stateClassName<BaseProgress.Root.State>('sprout-progress-indicator', className)}
    />
  );
}

export type ProgressLabelProps = BaseProgress.Label.Props;

/** A visible name for the bar. It labels the `progressbar` for you. */
export function ProgressLabel({ className, ...props }: ProgressLabelProps) {
  return (
    <BaseProgress.Label
      data-slot="progress-label"
      {...props}
      className={stateClassName<BaseProgress.Root.State>('sprout-progress-label', className)}
    />
  );
}

export type ProgressValueProps = BaseProgress.Value.Props;

/**
 * The formatted value, such as “40%”, at the end of the label row. It is
 * empty while the value is `null`. Pass a function child to show other text.
 */
export function ProgressValue({ className, ...props }: ProgressValueProps) {
  return (
    <BaseProgress.Value
      data-slot="progress-value"
      {...props}
      className={stateClassName<BaseProgress.Root.State>('sprout-progress-value', className)}
    />
  );
}
