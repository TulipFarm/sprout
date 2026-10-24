'use client';

import { lazy, Suspense, useRef, useState, type ComponentProps, type PointerEvent, type ReactNode } from 'react';
import { cn } from '../internal/classes.js';

// Loaded on first hover or focus, so a page of marks doesn't pay for the tooltip until it is used.
const StatusTooltip = lazy(() => import('./status-tooltip.js'));

export const statusStateNames = [
  'pending',
  'running',
  'paused',
  'success',
  'warning',
  'error',
  'stopped',
  'skipped',
] as const;

export type StatusState = (typeof statusStateNames)[number];

export const statusSizeNames = ['sm', 'md', 'lg'] as const;

export type StatusSize = (typeof statusSizeNames)[number];

export interface StatusProps extends Omit<ComponentProps<'span'>, 'children' | 'color'> {
  /** What the task is doing. Defaults to `"pending"`. */
  state?: StatusState | undefined;
  /**
   * How much of a `"running"` task is done, from 0 to 100. Leave it out while
   * the amount is unknown and the ring spins instead. Other states ignore it.
   */
  value?: number | null | undefined;
  /** `"sm"` is 12px, `"md"` 16px, and `"lg"` 20px, the same as Spinner. */
  size?: StatusSize | undefined;
  /**
   * Shown on mouse hover, and on keyboard focus if you make the mark
   * focusable. Defaults to the state's name, such as “Succeeded” or
   * “Running, 40%”. Pass `false` to show no tooltip. The tooltip code loads
   * on first use.
   */
  tooltip?: ReactNode;
}

const stateLabels = {
  pending: 'Pending',
  running: 'Running',
  paused: 'Paused',
  success: 'Succeeded',
  warning: 'Warning',
  error: 'Failed',
  stopped: 'Stopped',
  skipped: 'Skipped',
} as const satisfies Record<StatusState, string>;

const statusSegments = 8;

const clampValue = (value: number | null | undefined) =>
  typeof value === 'number' && Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : null;

/**
 * A small round mark for the state of a task, run, or step: pending, running
 * (with or without a known amount), paused, success, warning, error, stopped,
 * or skipped. It animates in when it mounts and whenever the state changes.
 * It is an `img` named after the state, such as “Running, 40%”, and shows
 * that name in a tooltip unless `tooltip` says otherwise. Set
 * `aria-label` to name it, or `aria-hidden="true"` when visible text beside
 * it already says the state.
 */
export function Status({
  state = 'pending',
  value,
  size = 'md',
  className,
  role = 'img',
  'aria-label': label,
  'aria-hidden': hidden,
  tooltip,
  ref,
  onPointerEnter,
  onPointerLeave,
  onFocus,
  onBlur,
  ...rest
}: StatusProps) {
  const anchor = useRef<HTMLSpanElement | null>(null);
  const [tipOpen, setTipOpen] = useState(false);
  const [tipLoaded, setTipLoaded] = useState(false);
  const amount = state === 'running' ? clampValue(value) : null;
  const determinate = amount !== null;
  const decorative = hidden === true || hidden === 'true';
  const name = label ?? (determinate ? `${stateLabels.running}, ${Math.round(amount)}%` : stateLabels[state]);
  // A new key replays the entrance whenever the mark itself changes, but not when only the amount moves.
  const mark = determinate ? 'progress' : state;
  const tip = tooltip === undefined ? name : tooltip;
  const hasTip = tip != null && tip !== false && tip !== '';
  const showTip = (open: boolean) => {
    if (!hasTip) return;
    if (open) setTipLoaded(true);
    setTipOpen(open);
  };
  const glyph = (
    <span
      data-slot="status"
      data-state={state}
      data-size={size}
      {...(determinate ? { 'data-determinate': '' } : {})}
      {...(decorative ? { 'aria-hidden': 'true' as const } : { role, 'aria-label': name })}
      className={cn('sprout-status', `sprout-status-size-${size}`, className)}
      {...rest}
      ref={node => {
        anchor.current = node;
        if (typeof ref === 'function') return ref(node);
        if (ref) ref.current = node;
      }}
      onPointerEnter={event => {
        onPointerEnter?.(event);
        replayGlyph(event);
        if (event.pointerType === 'mouse') showTip(true);
      }}
      onPointerLeave={event => {
        onPointerLeave?.(event);
        showTip(false);
      }}
      onFocus={event => {
        onFocus?.(event);
        if (event.currentTarget.matches(':focus-visible')) showTip(true);
      }}
      onBlur={event => {
        onBlur?.(event);
        showTip(false);
      }}
    >
      <svg
        key={mark}
        className="sprout-status-mark"
        data-mark={mark}
        viewBox="0 0 20 20"
        fill="none"
        aria-hidden="true"
        focusable="false"
      >
        <StatusMark mark={mark} amount={amount ?? 0} />
      </svg>
    </span>
  );
  return (
    <>
      {glyph}
      {hasTip && tipLoaded && (
        <Suspense fallback={null}>
          <StatusTooltip anchor={anchor} open={tipOpen} onOpenChange={setTipOpen}>
            {tip}
          </StatusTooltip>
        </Suspense>
      )}
    </>
  );
}

const replayEasing = 'cubic-bezier(0.2, 0.8, 0.2, 1)';

// CSS would also replay on pointer leave, so the hover redraw runs once through Web Animations.
function replayGlyph(event: PointerEvent<HTMLSpanElement>) {
  if (event.pointerType !== 'mouse') return;
  const root = event.currentTarget;
  if (typeof root.animate !== 'function' || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  for (const glyph of root.querySelectorAll('.sprout-status-glyph'))
    glyph.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: 320, easing: replayEasing });
  for (const dot of root.querySelectorAll('.sprout-status-dot'))
    dot.animate(
      [
        { opacity: 0, transform: 'scale(0.4)' },
        { opacity: 1, transform: 'scale(1)' },
      ],
      {
        duration: 220,
        delay: 120,
        easing: replayEasing,
        fill: 'backwards',
      },
    );
}

function StatusMark({ mark, amount }: { mark: StatusState | 'progress'; amount: number }) {
  switch (mark) {
    case 'progress': {
      // Each segment is an eighth of the amount; the one being worked on fades in and out until it fills.
      const done = Math.floor(amount / (100 / statusSegments));
      return (
        <g className="sprout-status-segments">
          {Array.from({ length: statusSegments }, (_, index) => (
            <circle
              key={index}
              className="sprout-status-segment"
              data-segment={index < done ? 'done' : index === done ? 'active' : 'todo'}
              cx="10"
              cy="10"
              r="8"
              pathLength={40}
              strokeDasharray="2 38"
              strokeDashoffset={-(index * 5 + 1.5)}
            />
          ))}
        </g>
      );
    }
    case 'running':
      return (
        <>
          <circle className="sprout-status-track" cx="10" cy="10" r="8" />
          <g className="sprout-status-spin">
            <circle className="sprout-status-arc" cx="10" cy="10" r="8" pathLength={100} strokeDasharray="28 72" />
          </g>
        </>
      );
    case 'pending':
      return <circle className="sprout-status-ring" cx="10" cy="10" r="8" />;
    case 'paused':
      return (
        <>
          <circle className="sprout-status-ring" cx="10" cy="10" r="8" />
          <path className="sprout-status-glyph" d="M8.25 7.25v5.5M11.75 7.25v5.5" pathLength={1} />
        </>
      );
    case 'skipped':
      return (
        <>
          <circle className="sprout-status-ring" cx="10" cy="10" r="8" />
          <path className="sprout-status-glyph" d="M13 7 7 13" pathLength={1} />
        </>
      );
    case 'success':
      return (
        <>
          <circle className="sprout-status-fill" cx="10" cy="10" r="9" />
          <path className="sprout-status-glyph" d="m6.1 10.3 2.6 2.6 5.2-5.6" pathLength={1} />
        </>
      );
    case 'warning':
      return (
        <>
          <circle className="sprout-status-fill" cx="10" cy="10" r="9" />
          <path className="sprout-status-glyph" d="M10 5.9v4.6" pathLength={1} />
          <circle className="sprout-status-dot" cx="10" cy="13.7" r="1.15" />
        </>
      );
    case 'error':
      return (
        <>
          <circle className="sprout-status-fill" cx="10" cy="10" r="9" />
          <path className="sprout-status-glyph" d="m7.2 7.2 5.6 5.6m0-5.6-5.6 5.6" pathLength={1} />
        </>
      );
    case 'stopped':
      return (
        <>
          <circle className="sprout-status-fill" cx="10" cy="10" r="9" />
          <rect className="sprout-status-dot" x="7" y="7" width="6" height="6" rx="1.25" />
        </>
      );
  }
}
