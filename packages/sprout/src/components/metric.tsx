import type { ComponentProps, ReactNode } from 'react';
import { cn } from '../internal/classes.js';

export const metricDirectionNames = ['up', 'down', 'flat'] as const;
export const metricToneNames = ['positive', 'negative', 'neutral'] as const;

export type MetricDirection = (typeof metricDirectionNames)[number];
export type MetricTone = (typeof metricToneNames)[number];

export interface MetricChange {
  /** The change as text, such as "+4.2%" or "0.4 GB". */
  value: string;
  /** Which way the number moved. Shown as an arrow and in words. */
  direction: MetricDirection;
  /** Whether the move is good or bad. Only tints the change; the words carry the meaning. */
  tone?: MetricTone;
  /** What the change compares with, such as "vs last week". */
  label?: string;
}

export interface MetricProps extends Omit<ComponentProps<'div'>, 'children'> {
  /** What is measured, such as "Memory used". */
  label: ReactNode;
  /** The formatted value, such as "11.2 GB". */
  value: ReactNode;
  change?: MetricChange;
  /** A line under the value, such as when a reading was taken. */
  caption?: ReactNode;
  /** A small trend chart, such as a `Sparkline`, under the value. */
  trend?: ReactNode;
}

const arrow: Record<MetricDirection, string> = { up: '↑', down: '↓', flat: '→' };
const words = { up: 'Up', down: 'Down', flat: 'No change' } as const;

/**
 * One number with its label, and an optional change, caption and trend. The
 * change always reads as words and a sign, so color is never the only signal.
 */
export function Metric({ label, value, change, caption, trend, className, ...props }: MetricProps) {
  return (
    <div data-slot="metric" {...props} className={cn('sprout-metric', className)}>
      <div className="sprout-metric-label">{label}</div>
      <div className="sprout-metric-value">{value}</div>
      {change ? (
        <div className="sprout-metric-change" data-direction={change.direction} data-tone={change.tone ?? 'neutral'}>
          <span aria-hidden="true">{arrow[change.direction]}</span>
          {change.direction === 'flat' ? (
            <span>{words.flat}</span>
          ) : (
            <>
              <span className="sprout-metric-sr-only">{words[change.direction]} </span>
              <span>{change.value}</span>
            </>
          )}
          {change.label ? <span className="sprout-metric-change-label">{change.label}</span> : null}
        </div>
      ) : null}
      {trend ? <div className="sprout-metric-trend">{trend}</div> : null}
      {caption ? <div className="sprout-metric-caption">{caption}</div> : null}
    </div>
  );
}
