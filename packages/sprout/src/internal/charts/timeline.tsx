'use client';

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from 'react';
import { Bar, BarChart, CartesianGrid, Rectangle, ReferenceArea, ReferenceLine, XAxis, YAxis } from 'recharts';
import type { BarShapeProps } from 'recharts';
import { Badge } from '../../components/badge.js';
import { Button } from '../../components/button.js';
import { Skeleton } from '../../components/skeleton.js';
import { StatePanel } from '../state-panel.js';
import { cn } from '../classes.js';
import {
  ChartContainer,
  ChartLegend,
  ChartTooltip,
  ChartTooltipContent,
  chartColor,
  configLegend,
  dayLabel,
  quietAxis,
  seriesConfig,
  tooltipCursor,
  type ChartRow,
  type ChartSeries,
  type ReadyChartProps,
} from '../chart-kit.js';
import { DAY, dayTime, isCalendarDate, plainSpaces, wallClock, type TimelineRange } from './timeline-dates.js';

/** Rows the app read but could not draw, because their start is empty. */
export interface TimelineUndated {
  /** How many rows have no start. A string passes through, such as "1,204". */
  count: number | string;
  /** The start field's name, as in "3 rows without Due date". */
  field: string;
  /** A link or button, such as one that opens Table filtered to those rows. */
  action?: ReactNode;
}

export type TimelineStatus = 'ready' | 'loading' | 'error';

export interface TimelineChartProps<T extends ChartRow = ChartRow> extends ReadyChartProps {
  /** One row per task or record. Rows with no start are not drawn. */
  rows: T[];
  /** The row key whose value names each row. */
  category: string;
  /** The row key holding the start, as `YYYY-MM-DD` or a time in ms. */
  start: string;
  /**
   * The row key holding the end, in the same form as `start`. Without it,
   * or when a row's end is empty, the row is a point. An end before the
   * start is a point marked "End before start".
   */
  end?: string | undefined;
  /** The row key naming each row's series, for color and legend. */
  seriesKey?: string | undefined;
  /** Colors and legend labels, matched by `seriesKey`. */
  series?: ChartSeries[] | undefined;
  /** Locale for dates. Defaults to the reader's. */
  locale?: string | undefined;
  /**
   * The days to show, both inclusive, from `timelineRange`. Bars are cut at
   * its edges and the cut ends are marked. Rows outside it are left out.
   * Without it the axis fits the rows.
   */
  window?: TimelineRange | undefined;
  /** Today as `YYYY-MM-DD`. Draws a line labeled "Today". */
  today?: string | undefined;
  /** Time zone for times in ms. Defaults to the reader's when a list or window is shown. */
  timeZone?: string | undefined;
  /** The row key holding a stable id. Defaults to the row's position. */
  rowKey?: string | undefined;
  /** Title content in the list beside the chart. Defaults to the `category` value. */
  renderLabel?: ((row: T) => ReactNode) | undefined;
  /** Actions at the end of each list row, such as an edit button and a menu. */
  renderActions?: ((row: T) => ReactNode) | undefined;
  /** Click or Enter on a row. Open your own Sheet or Dialog here. */
  onRowOpen?: ((row: T) => void) | undefined;
  /** Counts rows with no start, under the chart. */
  undated?: TimelineUndated | undefined;
  /** A line above the chart, such as "Showing the first 100 of 340 rows". */
  notice?: ReactNode;
  /** `loading` keeps drawn rows under `aria-busy`, or shows placeholders. */
  status?: TimelineStatus | undefined;
  /** What went wrong, under "Couldn't load the timeline". */
  error?: ReactNode;
  /** Shows "Try again" on the error. */
  onRetry?: (() => void) | undefined;
  /** Replaces the empty message when the window has no rows. */
  empty?: ReactNode;
}

type MarkKind = 'range' | 'point' | 'reversed';
type Clip = 'start' | 'end' | 'both';
type When = { time: number; date: boolean };

interface Mark<T> {
  row: T;
  /** Row id, the hidden category axis key. */
  id: string;
  name: string;
  /** Series key, for the tooltip's config lookup. */
  key: string;
  fill: string;
  kind: MarkKind;
  range: [number, number];
  clip: Clip | undefined;
  startsAt: number;
  from: When;
  to: When | null;
}

const AXIS = 40;

const read = (value: unknown): When | null => {
  if (typeof value === 'number') return Number.isFinite(value) ? { time: value, date: false } : null;
  if (typeof value !== 'string' || !value) return null;
  if (isCalendarDate(value)) return { time: dayTime(value), date: true };
  const time = Date.parse(value);
  return Number.isNaN(time) ? null : { time, date: false };
};

const clipText: Record<Clip, string> = {
  start: 'Starts before window',
  end: 'Ends after window',
  both: 'Runs past window',
};

const dateFormat = (locale: string | undefined) =>
  new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

const timeFormat = (locale: string | undefined, timeZone: string | undefined) =>
  new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone,
  });

/** A mark's dates in words, like "1–9 Oct 2026". */
function datesText<T>(mark: Mark<T>, hasEnd: boolean, locale: string | undefined, timeZone: string | undefined) {
  return plainSpaces(rawDatesText(mark, hasEnd, locale, timeZone));
}

function rawDatesText<T>(mark: Mark<T>, hasEnd: boolean, locale: string | undefined, timeZone: string | undefined) {
  const format = mark.from.date ? dateFormat(locale) : timeFormat(locale, timeZone);
  const start = format.format(mark.from.time);
  if (mark.kind === 'reversed' && mark.to) return `Starts ${start}, ends ${format.format(mark.to.time)}`;
  if (!mark.to) return hasEnd ? `${start}, no end` : start;
  if (mark.to.time === mark.from.time) return start;
  return format.formatRange(mark.from.time, mark.to.time);
}

/** Saturdays and Sundays in a window of a month or less, as [from, to] times. */
function weekends(from: number, to: number) {
  if (to - from > 31 * DAY) return [];
  const bands: [number, number][] = [];
  for (let day = from; day < to; day += DAY) {
    const weekday = new Date(day).getUTCDay();
    if (weekday === 6 || (weekday === 0 && day === from))
      bands.push([day, Math.min(to, day + (weekday === 6 ? 2 : 1) * DAY)]);
  }
  return bands;
}

const weekLength = (from: number, to: number) => to - from <= 7 * DAY;

/** Tick times for a window: the middle of each day in a week, weekly in a month, twice a month in a quarter. */
function windowTicks(from: number, to: number) {
  if (weekLength(from, to))
    return Array.from({ length: Math.round((to - from) / DAY) }, (_, i) => from + (i + 0.5) * DAY);
  const days = Math.round((to - from) / DAY);
  const ticks: number[] = [];
  for (let day = from; day <= to; day += DAY) {
    const date = new Date(day).getUTCDate();
    if (days <= 31 ? (date - 1) % 7 === 0 : date === 1 || date === 15) ticks.push(day);
  }
  return ticks;
}

/** A week tick, like "Mon 12": weekday first in every locale so the days scan down one edge. */
function weekdayTick(value: number, locale: string | undefined) {
  const parts = new Intl.DateTimeFormat(locale, { weekday: 'short', day: 'numeric', timeZone: 'UTC' }).formatToParts(
    value,
  );
  const part = (type: string) => parts.find(item => item.type === type)?.value ?? '';
  return `${part('weekday')} ${part('day')}`;
}

const diamond = (cx: number, cy: number) => `M${cx} ${cy - 6}L${cx + 6} ${cy}L${cx} ${cy + 6}L${cx - 6} ${cy}Z`;

/** Bars for ranges, cut ends squared with a chevron; diamonds for points. */
function markShape(props: BarShapeProps) {
  const mark = props.payload as Mark<ChartRow>;
  const { x = 0, y = 0, width = 0, height = 0 } = props;
  const cy = y + height / 2;
  if (mark.kind !== 'range')
    return (
      <path
        className="sprout-timeline-point"
        data-kind={mark.kind}
        d={diamond(x, cy)}
        fill={mark.kind === 'reversed' ? 'var(--sprout-surface)' : mark.fill}
        stroke={mark.kind === 'reversed' ? 'var(--sprout-warning)' : 'var(--sprout-surface)'}
        strokeWidth={mark.kind === 'reversed' ? 2 : 1}
      />
    );
  if (!mark.clip) return <Rectangle {...props} fill={mark.fill} />;
  const left = mark.clip !== 'end';
  const right = mark.clip !== 'start';
  const radius: [number, number, number, number] = [left ? 0 : 3, right ? 0 : 3, right ? 0 : 3, left ? 0 : 3];
  const room = width >= 16;
  return (
    <g className="sprout-timeline-clipped" data-clip={mark.clip}>
      <Rectangle {...props} radius={radius} fill={mark.fill} />
      {room && left ? (
        <path className="sprout-timeline-chevron" d={`M${x + 8} ${cy - 4}L${x + 4} ${cy}L${x + 8} ${cy + 4}`} />
      ) : null}
      {room && right ? (
        <path
          className="sprout-timeline-chevron"
          d={`M${x + width - 8} ${cy - 4}L${x + width - 4} ${cy}L${x + width - 8} ${cy + 4}`}
        />
      ) : null}
    </g>
  );
}

function TodayLabel({ viewBox }: { viewBox?: { x?: number; y?: number } }) {
  const x = viewBox?.x ?? 0;
  const y = viewBox?.y ?? 0;
  return (
    <g className="sprout-timeline-today">
      <rect x={x - 21} y={y - AXIS + 2} width={42} height={16} rx={8} />
      <text x={x} y={y - AXIS + 10} textAnchor="middle" dominantBaseline="central">
        Today
      </text>
    </g>
  );
}

const plural = (count: number | string) => (Number(String(count).replaceAll(',', '')) === 1 ? 'row' : 'rows');

const focusable = 'a[href], button, input, textarea, [tabindex]';

/**
 * Gives only the active row's actions a place in the tab order, so the list
 * is one tab stop and Tab from a row reaches its own actions.
 */
function syncActions(list: HTMLElement, active: number) {
  list.querySelectorAll<HTMLElement>('[data-slot="timeline-row"]').forEach((row, index) => {
    for (const element of row.querySelectorAll<HTMLElement>(`[data-slot="timeline-row-actions"] :is(${focusable})`)) {
      const saved = element.dataset.sproutTabindex;
      if (index === active) {
        if (saved === undefined) continue;
        if (saved) element.setAttribute('tabindex', saved);
        else element.removeAttribute('tabindex');
        delete element.dataset.sproutTabindex;
      } else if (saved === undefined) {
        element.dataset.sproutTabindex = element.getAttribute('tabindex') ?? '';
        element.tabIndex = -1;
      }
    }
  });
}

/**
 * Rows as bars on a time axis, like a project plan. A row with only a start
 * is a diamond. Give it a `window`, `renderLabel`, `renderActions`, or
 * `onRowOpen` and it becomes a record timeline: a list of titles and dates
 * in words beside the chart, in start order, with one tab stop and arrow
 * keys. Without them it is a plain chart with names on the axis, one 32px
 * row per task, colored by `seriesKey`.
 */
export function TimelineChart<T extends ChartRow = ChartRow>({
  rows,
  category,
  start,
  end,
  seriesKey,
  series = [],
  locale,
  window,
  today,
  timeZone,
  rowKey,
  renderLabel,
  renderActions,
  onRowOpen,
  undated,
  notice,
  status = 'ready',
  error,
  onRetry,
  empty,
  title = 'Timeline',
  className,
}: TimelineChartProps<T>) {
  const record = Boolean(window || renderLabel || renderActions || onRowOpen);
  const zoned = record || timeZone !== undefined;
  const config = useMemo(() => seriesConfig(series), [series]);
  const domain = useMemo(
    () => (window ? ([dayTime(window.start), dayTime(window.end) + DAY] as [number, number]) : undefined),
    [window],
  );
  const marks = useMemo(() => {
    const at = (when: When) => (when.date || !zoned ? when.time : wallClock(when.time, timeZone));
    const list: Mark<T>[] = [];
    rows.forEach((row, index) => {
      const from = read(row[start]);
      if (!from) return;
      const to = end ? read(row[end]) : null;
      const key = seriesKey ? String(row[seriesKey] ?? '') : '';
      const a = at(from);
      const kind: MarkKind = !to ? 'point' : at(to) < a ? 'reversed' : 'range';
      let range: [number, number];
      if (kind === 'range') range = [a, at(to!) + (record && to!.date ? DAY : 0)];
      else {
        const point = a + (record && from.date ? DAY / 2 : 0);
        range = [point, point];
      }
      let clip: Clip | undefined;
      if (domain) {
        const [low, high] = domain;
        if (kind === 'range' ? range[1] <= low || range[0] >= high : range[0] < low || range[0] >= high) return;
        const cutStart = range[0] < low;
        const cutEnd = range[1] > high;
        clip = cutStart && cutEnd ? 'both' : cutStart ? 'start' : cutEnd ? 'end' : undefined;
        range = [Math.max(range[0], low), Math.min(range[1], high)];
      }
      list.push({
        row,
        id: rowKey ? String(row[rowKey] ?? index) : String(index),
        name: String(row[category] ?? ''),
        key,
        fill: series.some(item => item.key === key) ? chartColor(key) : 'var(--sprout-chart-1)',
        kind,
        range,
        clip,
        startsAt: a,
        from,
        to,
      });
    });
    if (record) list.sort((x, y) => x.startsAt - y.startsAt);
    return list;
  }, [rows, category, start, end, seriesKey, series, rowKey, domain, record, zoned, timeZone]);

  const date = (value: unknown) => dayLabel(value, locale);
  const todayAt = today && isCalendarDate(today) ? dayTime(today) + DAY / 2 : undefined;

  if (!record)
    return (
      <ChartContainer
        data-variant="timeline"
        className={cn('sprout-chart-timeline', className)}
        style={{ height: `${marks.length * 2 + (series.length ? 5 : 3)}rem` }}
        config={config}
      >
        <BarChart data={marks} accessibilityLayer title={title} layout="vertical" barCategoryGap="28%">
          <CartesianGrid horizontal={false} />
          <XAxis
            type="number"
            scale="time"
            domain={domain ?? ['dataMin', 'dataMax']}
            tickFormatter={date}
            {...quietAxis}
            minTickGap={24}
          />
          <YAxis type="category" dataKey="name" width="auto" {...quietAxis} interval={0} />
          <ChartTooltip
            cursor={tooltipCursor}
            content={props => (
              <ChartTooltipContent
                active={props.active}
                label={props.label}
                nameKey="key"
                payload={props.payload?.map(item => {
                  const [from, to] = (item.payload as Mark<T>).range;
                  return {
                    ...item,
                    name: (item.payload as Mark<T>).key,
                    value: from === to ? date(from) : `${date(from)} – ${date(to)}`,
                  };
                })}
              />
            )}
          />
          {series.length ? <ChartLegend content={configLegend(config)} /> : null}
          {todayAt === undefined ? null : (
            <ReferenceLine x={todayAt} stroke="var(--sprout-chart-1)" strokeDasharray="3 3" />
          )}
          <Bar dataKey="range" radius={3} shape={markShape} isAnimationActive={false} />
        </BarChart>
      </ChartContainer>
    );

  return (
    <RecordTimeline
      marks={marks}
      config={config}
      series={series}
      hasEnd={Boolean(end)}
      domain={domain}
      window={window}
      todayAt={todayAt}
      locale={locale}
      timeZone={timeZone}
      renderLabel={renderLabel}
      renderActions={renderActions}
      onRowOpen={onRowOpen}
      undated={undated}
      notice={notice}
      status={status}
      error={error}
      onRetry={onRetry}
      empty={empty}
      title={title}
      className={className}
    />
  );
}

interface RecordTimelineProps<T extends ChartRow> {
  marks: Mark<T>[];
  config: ReturnType<typeof seriesConfig>;
  series: ChartSeries[];
  hasEnd: boolean;
  domain: [number, number] | undefined;
  window: TimelineRange | undefined;
  todayAt: number | undefined;
  locale: string | undefined;
  timeZone: string | undefined;
  renderLabel: ((row: T) => ReactNode) | undefined;
  renderActions: ((row: T) => ReactNode) | undefined;
  onRowOpen: ((row: T) => void) | undefined;
  undated: TimelineUndated | undefined;
  notice: ReactNode;
  status: TimelineStatus;
  error: ReactNode;
  onRetry: (() => void) | undefined;
  empty: ReactNode;
  title: string;
  className: string | undefined;
}

function RecordTimeline<T extends ChartRow>({
  marks,
  config,
  series,
  hasEnd,
  domain,
  window,
  todayAt,
  locale,
  timeZone,
  renderLabel,
  renderActions,
  onRowOpen,
  undated,
  notice,
  status,
  error,
  onRetry,
  empty,
  title,
  className,
}: RecordTimelineProps<T>) {
  const id = useId();
  const listRef = useRef<HTMLOListElement>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [hot, setHot] = useState<number | null>(null);
  const found = marks.findIndex(mark => mark.id === activeId);
  const active = found === -1 ? 0 : found;

  useEffect(() => {
    if (listRef.current) syncActions(listRef.current, active);
  });

  const date = (value: unknown) => dayLabel(value, locale);
  const dates = marks.map(mark => datesText(mark, hasEnd, locale, timeZone));
  const loading = status === 'loading';
  const style = { '--sprout-timeline-count': Math.max(marks.length, 1) } as CSSProperties;

  const focusRow = (index: number) => {
    const next = marks[index];
    if (!next) return;
    setActiveId(next.id);
    listRef.current?.querySelectorAll<HTMLElement>('[data-slot="timeline-row"]')[index]?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLLIElement>, index: number) => {
    if (event.target !== event.currentTarget) return;
    const moves: Record<string, number> = {
      ArrowDown: index + 1,
      ArrowUp: index - 1,
      Home: 0,
      End: marks.length - 1,
    };
    const next = moves[event.key];
    if (next !== undefined) {
      event.preventDefault();
      focusRow(Math.min(Math.max(next, 0), marks.length - 1));
    } else if (event.key === 'Enter' && onRowOpen) {
      event.preventDefault();
      onRowOpen(marks[index]!.row);
    }
  };

  const onRowClick = (event: MouseEvent<HTMLLIElement>, index: number) => {
    if ((event.target as Element).closest('[data-slot="timeline-row-actions"]')) return;
    onRowOpen?.(marks[index]!.row);
  };

  const windowText = () => {
    if (!window) return 'No rows to show.';
    const format = dateFormat(locale);
    return `Nothing between ${format.format(dayTime(window.start))} and ${format.format(dayTime(window.end))}.`;
  };

  let body: ReactNode;
  if (status === 'error')
    body = (
      <StatePanel
        kind="error"
        heading="h3"
        title="Couldn't load the timeline"
        description={error ?? 'Something went wrong while reading these rows.'}
        className="sprout-timeline-state"
      >
        {onRetry ? (
          <Button variant="outline" size="sm" onClick={onRetry}>
            Try again
          </Button>
        ) : null}
      </StatePanel>
    );
  else if (!marks.length && loading)
    body = (
      <div role="status" aria-label="Loading timeline" className="sprout-timeline-grid" data-skeleton="">
        <div className="sprout-timeline-labels" aria-hidden="true">
          {[0, 1, 2, 3, 4].map(index => (
            <div key={index} className="sprout-timeline-row">
              <div className="sprout-timeline-label">
                <Skeleton style={{ width: `${70 - index * 7}%` }} />
                <Skeleton style={{ width: '45%', height: 10 }} />
              </div>
            </div>
          ))}
        </div>
        <div className="sprout-timeline-plot" aria-hidden="true">
          {[0, 1, 2, 3, 4].map(index => (
            <div key={index} className="sprout-timeline-skeleton-band">
              <Skeleton style={{ marginLeft: `${(index * 17) % 60}%`, width: `${20 + ((index * 23) % 30)}%` }} />
            </div>
          ))}
        </div>
      </div>
    );
  else if (!marks.length)
    body = empty ?? (
      <StatePanel
        kind="empty"
        heading="h3"
        title="Nothing in this window"
        description={windowText()}
        className="sprout-timeline-state"
      />
    );
  else
    body = (
      <div className="sprout-timeline-grid" onMouseLeave={() => setHot(null)}>
        <ol
          ref={listRef}
          aria-label={title}
          className="sprout-timeline-labels"
          onBlur={event => {
            if (!event.currentTarget.contains(event.relatedTarget)) setHot(null);
          }}
        >
          {marks.map((mark, index) => (
            <li
              key={mark.id}
              data-slot="timeline-row"
              data-active={index === active || undefined}
              data-hot={index === hot || undefined}
              data-openable={onRowOpen ? '' : undefined}
              tabIndex={index === active ? 0 : -1}
              aria-labelledby={`${id}-${index}`}
              className="sprout-timeline-row"
              onKeyDown={event => onKeyDown(event, index)}
              onClick={event => onRowClick(event, index)}
              onFocus={() => {
                setActiveId(mark.id);
                setHot(index);
              }}
              onMouseEnter={() => setHot(index)}
            >
              <div className="sprout-timeline-label" id={`${id}-${index}`}>
                <span className="sprout-timeline-label-head">
                  <span className="sprout-timeline-label-title">{renderLabel ? renderLabel(mark.row) : mark.name}</span>
                  {mark.kind === 'reversed' ? (
                    <Badge variant="warning" size="chip" className="sprout-timeline-label-marker">
                      End before start
                    </Badge>
                  ) : null}
                </span>
                <span className="sprout-timeline-label-dates">
                  {mark.kind === 'reversed' ? (
                    <span className="sprout-timeline-label-warning">End before start</span>
                  ) : null}
                  <span className="sprout-timeline-label-text">{dates[index]}</span>
                  {mark.clip ? <span className="sprout-timeline-label-clip">{clipText[mark.clip]}</span> : null}
                </span>
              </div>
              {renderActions ? (
                <div data-slot="timeline-row-actions" className="sprout-timeline-row-actions">
                  {renderActions(mark.row)}
                </div>
              ) : null}
            </li>
          ))}
        </ol>
        <div className="sprout-timeline-plot" aria-hidden="true">
          {hot === null ? null : (
            <div className="sprout-timeline-band" style={{ '--sprout-timeline-index': hot } as CSSProperties} />
          )}
          <ChartContainer
            data-variant="timeline"
            className="sprout-chart-timeline sprout-timeline-chart"
            config={config}
            initialDimension={{ width: 640, height: AXIS + marks.length * 44 }}
          >
            <BarChart
              data={marks}
              layout="vertical"
              margin={{ top: 0, right: 16, bottom: 0, left: 16 }}
              barSize={16}
              accessibilityLayer={false}
              onMouseMove={state => {
                const index = Number(state.activeTooltipIndex);
                setHot(Number.isInteger(index) && state.activeTooltipIndex != null ? index : null);
              }}
            >
              <CartesianGrid horizontal={false} vertical={!(domain && weekLength(...domain))} />
              {domain
                ? weekends(...domain).map(([x1, x2]) => (
                    <ReferenceArea
                      key={x1}
                      x1={x1}
                      x2={x2}
                      ifOverflow="hidden"
                      className="sprout-timeline-weekend"
                      fill="var(--sprout-hover)"
                      fillOpacity={0.4}
                      stroke="none"
                    />
                  ))
                : null}
              <XAxis
                type="number"
                scale="time"
                orientation="top"
                height={AXIS}
                domain={domain ?? ['dataMin', 'dataMax']}
                allowDataOverflow
                ticks={domain ? windowTicks(...domain) : undefined}
                tickFormatter={domain && weekLength(...domain) ? (value: number) => weekdayTick(value, locale) : date}
                interval="equidistantPreserveStart"
                {...quietAxis}
                tickMargin={6}
                minTickGap={32}
              />
              <YAxis type="category" dataKey="id" hide />
              <ChartTooltip
                cursor={false}
                content={props => (
                  <ChartTooltipContent
                    active={props.active}
                    label={(props.payload?.[0]?.payload as Mark<T> | undefined)?.name}
                    nameKey="key"
                    hideIndicator={!series.length}
                    payload={props.payload?.map(item => {
                      const mark = item.payload as Mark<T>;
                      return {
                        ...item,
                        name: mark.key,
                        value: dates[marks.indexOf(mark)] ?? '',
                      };
                    })}
                  />
                )}
              />
              {todayAt === undefined ? null : (
                <ReferenceLine
                  x={todayAt}
                  stroke="var(--sprout-chart-1)"
                  strokeWidth={1.5}
                  ifOverflow="discard"
                  label={<TodayLabel />}
                />
              )}
              <Bar
                dataKey="range"
                radius={3}
                shape={markShape}
                isAnimationActive={false}
                onClick={(_, index) => {
                  const mark = marks[index];
                  if (mark) onRowOpen?.(mark.row);
                }}
              />
            </BarChart>
          </ChartContainer>
        </div>
      </div>
    );

  return (
    <div
      data-slot="timeline"
      data-status={status}
      aria-busy={loading || undefined}
      className={cn('sprout-timeline', className)}
      style={style}
    >
      {notice ? <div className="sprout-timeline-notice">{notice}</div> : null}
      {body}
      {series.length && marks.length && status !== 'error' ? (
        <div data-slot="chart-legend" className="sprout-chart-legend sprout-timeline-legend">
          {series.map(item => (
            <div key={item.key} className="sprout-chart-legend-item">
              <span aria-hidden="true" className="sprout-chart-legend-swatch" style={{ backgroundColor: item.color }} />
              {item.label}
            </div>
          ))}
        </div>
      ) : null}
      {undated && status !== 'error' ? (
        <div data-slot="timeline-undated" className="sprout-timeline-undated">
          <span>{`${undated.count} ${plural(undated.count)} without ${undated.field}`}</span>
          {undated.action}
        </div>
      ) : null}
    </div>
  );
}
