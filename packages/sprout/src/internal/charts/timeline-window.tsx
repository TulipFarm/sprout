'use client';

import type { ReactNode } from 'react';
import { ChevronLeft } from 'reicon-react/icons/ChevronLeft';
import { ChevronRight } from 'reicon-react/icons/ChevronRight';
import { Button } from '../../components/button.js';
import { ToggleGroup, ToggleGroupItem } from '../../components/toggle-group.js';
import { cn } from '../classes.js';
import { shiftTimeline, timelineTitle, timelineZoomNames, type TimelineZoom } from './timeline-dates.js';

const zoomLabels: Record<TimelineZoom, string> = {
  week: 'Week',
  month: 'Month',
  quarter: 'Quarter',
};

export interface TimelineWindowBarProps {
  /** The window size. */
  zoom: TimelineZoom;
  /** Any day in the window, as `YYYY-MM-DD`. */
  from: string;
  /** Gets the next size and day after Previous, Today, Next, or a size change. */
  onChange: (next: { zoom: TimelineZoom; from: string }) => void;
  /** Today in the reader's time zone, as `YYYY-MM-DD`. */
  today: string;
  /** 1 starts weeks on Monday (default), 0 on Sunday. */
  weekStartsOn?: 0 | 1 | undefined;
  /** Locale for the window title. Defaults to the reader's. */
  locale?: string | undefined;
  /** Extra controls at the end, such as start and end field pickers. */
  actions?: ReactNode;
  /** Turns off every control, for example while the app saves. */
  disabled?: boolean | undefined;
  className?: string | undefined;
}

/**
 * Previous, Today, and Next buttons, the window title, and a Week, Month,
 * Quarter switch for a timeline. The app keeps `zoom` and `from`, for
 * example in the link, and passes `timelineRange(zoom, from)` to
 * `TimelineChart` as its `window`.
 */
export function TimelineWindowBar({
  zoom,
  from,
  onChange,
  today,
  weekStartsOn = 1,
  locale,
  actions,
  disabled,
  className,
}: TimelineWindowBarProps) {
  return (
    <div data-slot="timeline-window-bar" className={cn('sprout-timeline-window-bar', className)}>
      <div className="sprout-timeline-window-nav">
        <Button
          variant="outline"
          size="icon-sm"
          aria-label={`Previous ${zoom}`}
          disabled={disabled}
          onClick={() => onChange({ zoom, from: shiftTimeline(zoom, from, -1, weekStartsOn) })}
        >
          <ChevronLeft size={16} aria-hidden="true" />
        </Button>
        <Button variant="outline" size="sm" disabled={disabled} onClick={() => onChange({ zoom, from: today })}>
          Today
        </Button>
        <Button
          variant="outline"
          size="icon-sm"
          aria-label={`Next ${zoom}`}
          disabled={disabled}
          onClick={() => onChange({ zoom, from: shiftTimeline(zoom, from, 1, weekStartsOn) })}
        >
          <ChevronRight size={16} aria-hidden="true" />
        </Button>
      </div>
      <p className="sprout-timeline-window-title" aria-live="polite" aria-atomic="true">
        {timelineTitle(zoom, from, weekStartsOn, locale)}
      </p>
      {actions ? <div className="sprout-timeline-window-actions">{actions}</div> : null}
      <ToggleGroup<TimelineZoom>
        aria-label="Window size"
        variant="outline"
        size="sm"
        spacing={0}
        className="sprout-timeline-window-zoom"
        value={[zoom]}
        disabled={disabled}
        onValueChange={value => {
          const next = value[0];
          if (next && next !== zoom) onChange({ zoom: next, from });
        }}
      >
        {timelineZoomNames.map(name => (
          <ToggleGroupItem key={name} value={name}>
            {zoomLabels[name]}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );
}
