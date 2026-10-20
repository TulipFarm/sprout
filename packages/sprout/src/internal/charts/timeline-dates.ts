export const timelineZoomNames = ['week', 'month', 'quarter'] as const;

/** How much time one timeline window shows. */
export type TimelineZoom = (typeof timelineZoomNames)[number];

/** A window's first and last day, both `YYYY-MM-DD` and inclusive. */
export interface TimelineRange {
  start: string;
  end: string;
}

export const DAY = 86_400_000;
const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

const utc = (year: number, month: number, day: number) => {
  const date = new Date(0);
  date.setUTCFullYear(year, month, day);
  return date.getTime();
};

const parts = (date: string) => {
  const match = DATE.exec(date);
  const [year, month, day] = match ? [Number(match[1]), Number(match[2]) - 1, Number(match[3])] : [];
  if (year === undefined || month === undefined || day === undefined)
    throw new RangeError(`Not a YYYY-MM-DD date: ${date}`);
  const time = utc(year, month, day);
  const check = new Date(time);
  if (check.getUTCMonth() !== month || check.getUTCDate() !== day) throw new RangeError(`Not a calendar date: ${date}`);
  return { year, month, day, time };
};

/** True for a real calendar date written `YYYY-MM-DD`. */
export const isCalendarDate = (value: unknown): value is string => {
  if (typeof value !== 'string' || !DATE.test(value)) return false;
  try {
    parts(value);
    return true;
  } catch {
    return false;
  }
};

/** Midnight UTC of a `YYYY-MM-DD` date, in ms. Calendar dates have no time zone. */
export const dayTime = (date: string) => parts(date).time;

/** The `YYYY-MM-DD` date of a UTC time in ms. */
export const dayString = (time: number) => {
  const date = new Date(time);
  const year = String(date.getUTCFullYear()).padStart(4, '0');
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * The window of `zoom` that contains `from`: its first and last day,
 * inclusive. Pure calendar math, so it gives the same answer in every time
 * zone. Use it for the query too, so the drawn window and the read window
 * match. Weeks start on Monday unless `weekStartsOn` is 0 (Sunday).
 */
export function timelineRange(zoom: TimelineZoom, from: string, weekStartsOn: 0 | 1 = 1): TimelineRange {
  const { year, month, time } = parts(from);
  if (zoom === 'week') {
    const offset = (new Date(time).getUTCDay() - weekStartsOn + 7) % 7;
    const start = time - offset * DAY;
    return { start: dayString(start), end: dayString(start + 6 * DAY) };
  }
  const first = zoom === 'month' ? month : month - (month % 3);
  const months = zoom === 'month' ? 1 : 3;
  return { start: dayString(utc(year, first, 1)), end: dayString(utc(year, first + months, 0)) };
}

/**
 * The first day of the window before (`-1`) or after (`1`) the one that
 * contains `from`.
 */
export function shiftTimeline(zoom: TimelineZoom, from: string, step: -1 | 1, weekStartsOn: 0 | 1 = 1): string {
  const { start } = timelineRange(zoom, from, weekStartsOn);
  const { year, month, time } = parts(start);
  if (zoom === 'week') return dayString(time + step * 7 * DAY);
  return dayString(utc(year, month + step * (zoom === 'month' ? 1 : 3), 1));
}

/** The window's name: "October 2026", "12–18 Oct 2026", or "Q4 2026". */
/** ICU versions differ on thin and narrow spaces, so server and browser text would not match. */
export const plainSpaces = (text: string) => text.replaceAll(/[\u2009\u202f]/g, ' ');

export function timelineTitle(zoom: TimelineZoom, from: string, weekStartsOn: 0 | 1 = 1, locale?: string) {
  const range = timelineRange(zoom, from, weekStartsOn);
  const start = parts(range.start);
  if (zoom === 'quarter') return `Q${Math.floor(start.month / 3) + 1} ${start.year}`;
  if (zoom === 'month')
    return new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(start.time);
  return plainSpaces(
    new Intl.DateTimeFormat(locale, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    }).formatRange(start.time, dayTime(range.end)),
  );
}

const clocks = new Map<string, Intl.DateTimeFormat>();

/**
 * The wall-clock time of `time` in `timeZone` (default: the reader's), as ms
 * read as if it were UTC. It puts timestamps on the same axis as dates.
 */
export function wallClock(time: number, timeZone?: string) {
  const key = timeZone ?? '';
  let clock = clocks.get(key);
  if (!clock) {
    clock = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
    });
    clocks.set(key, clock);
  }
  const part = Object.fromEntries(clock.formatToParts(time).map(item => [item.type, Number(item.value)]));
  const seconds = ((part.hour ?? 0) * 60 + (part.minute ?? 0)) * 60 + (part.second ?? 0);
  return (
    utc(part.year ?? 1970, (part.month ?? 1) - 1, part.day ?? 1) + seconds * 1000 + (((time % 1000) + 1000) % 1000)
  );
}

/** Today as `YYYY-MM-DD` in `timeZone`, or in the reader's time zone. */
export const timelineToday = (timeZone?: string, now = Date.now()) =>
  dayString(Math.floor(wallClock(now, timeZone) / DAY) * DAY);
