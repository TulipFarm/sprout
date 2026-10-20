import { lazy, Suspense, type ComponentProps } from 'react';
import { Loader } from 'reicon-react/icons/Loader';
import type { OrbState } from 'thinking-orbs';
import { cn } from '../internal/classes.js';

export const spinnerSizeNames = ['sm', 'default', 'lg'] as const;

export type SpinnerSize = (typeof spinnerSizeNames)[number];

export const thinkingSpinnerSizeNames = ['lg', 'xl'] as const;

export type ThinkingSpinnerSize = (typeof thinkingSpinnerSizeNames)[number];

export const spinnerActivityNames = [
  'working',
  'searching',
  'solving',
  'listening',
  'connecting',
  'weaving',
  'composing',
  'breathing',
  'shaping',
] as const satisfies readonly OrbState[];

export type SpinnerActivity = (typeof spinnerActivityNames)[number];

export interface LoaderSpinnerProps extends Omit<ComponentProps<'svg'>, 'children' | 'color'> {
  variant?: 'default' | undefined;
  /**
   * `"sm"` is 12px, `"default"` 16px, and `"lg"` 20px. The size holds inside
   * buttons; badges shrink it to their 12px icon size.
   */
  size?: SpinnerSize | undefined;
  activity?: never;
}

export interface ThinkingSpinnerProps extends Omit<ComponentProps<'span'>, 'children' | 'color'> {
  /** A dotted thought orb for AI and agent work, in place of the spinning loader. */
  variant: 'thinking';
  /**
   * `"lg"` is 20px, for inline text. `"xl"` is 64px, for avatar-scale status.
   * Each is a separately tuned design, so no other sizes exist.
   */
  size?: ThinkingSpinnerSize | undefined;
  /** What the agent is doing. Each activity is a distinct animation. */
  activity?: SpinnerActivity | undefined;
}

export type SpinnerProps = LoaderSpinnerProps | ThinkingSpinnerProps;

const orbPixels = { lg: 20, xl: 64 } as const satisfies Record<ThinkingSpinnerSize, number>;

// Loaded on first thinking render, so apps showing only the loader never download the orb.
const ThinkingOrb = lazy(() => import('thinking-orbs').then(({ ThinkingOrb }) => ({ default: ThinkingOrb })));

/**
 * A loading indicator. By default it is a spinning loader that takes the
 * current text color; `variant="thinking"` shows a monochrome thought orb
 * that follows the light or dark theme. It is a `status` named “Loading”,
 * or “Thinking” for the orb. Set `aria-label` to name it, or
 * `aria-hidden="true"` when visible text beside it already says what is
 * happening.
 */
export function Spinner(props: SpinnerProps) {
  if (props.variant === 'thinking') return <ThinkingSpinner {...props} />;
  const {
    variant: _variant,
    size = 'default',
    className,
    role = 'status',
    'aria-label': label = 'Loading',
    'aria-hidden': hidden,
    ...rest
  } = props;
  const decorative = hidden === true || hidden === 'true';
  return (
    <Loader
      data-slot="spinner"
      data-variant="default"
      data-size={size}
      {...(decorative ? { 'aria-hidden': 'true' as const } : { role, 'aria-label': label })}
      focusable="false"
      className={cn('sprout-spinner', `sprout-spinner-size-${size}`, className)}
      {...rest}
    />
  );
}

function ThinkingSpinner({
  variant,
  size = 'lg',
  activity = 'working',
  className,
  role = 'status',
  'aria-label': label = 'Thinking',
  'aria-hidden': hidden,
  ...rest
}: ThinkingSpinnerProps) {
  const decorative = hidden === true || hidden === 'true';
  return (
    <span
      data-slot="spinner"
      data-variant={variant}
      data-size={size}
      data-activity={activity}
      {...(decorative ? { 'aria-hidden': 'true' as const } : { role, 'aria-label': label })}
      className={cn('sprout-spinner', `sprout-spinner-size-${size}`, className)}
      {...rest}
    >
      <Suspense fallback={null}>
        <ThinkingOrb state={activity} size={orbPixels[size]} theme="auto" role="presentation" aria-hidden="true" />
      </Suspense>
    </span>
  );
}
