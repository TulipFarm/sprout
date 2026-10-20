import { readFileSync } from 'node:fs';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  TimelineChart,
  TimelineWindowBar,
  shiftTimeline,
  timelineRange,
  timelineToday,
  timelineZoomNames,
} from '../packages/sprout/src/components/timeline.js';
import { timelineTitle, wallClock } from '../packages/sprout/src/internal/charts/timeline-dates.js';
import * as sprout from '../packages/sprout/src/index.js';

describe('timelineRange', () => {
  it('is exported from the package root and its own entry, with its own styles', () => {
    for (const name of ['TimelineChart', 'TimelineWindowBar', 'timelineRange', 'shiftTimeline', 'timelineToday'])
      expect(sprout).toHaveProperty(name);
    expect(timelineZoomNames).toEqual(['week', 'month', 'quarter']);
    const pkg = JSON.parse(readFileSync(new URL('../packages/sprout/package.json', import.meta.url), 'utf8'));
    expect(pkg.exports['./timeline']).toEqual({
      types: './dist/components/timeline.d.ts',
      import: './dist/components/timeline.js',
    });
    expect(readFileSync(new URL('../packages/sprout/src/styles/index.css', import.meta.url), 'utf8')).toContain(
      "@import './timeline.css';",
    );
  });

  it('covers whole months, including month ends and leap years', () => {
    expect(timelineRange('month', '2026-10-17')).toEqual({ start: '2026-10-01', end: '2026-10-31' });
    expect(timelineRange('month', '2026-04-30')).toEqual({ start: '2026-04-01', end: '2026-04-30' });
    expect(timelineRange('month', '2028-02-10')).toEqual({ start: '2028-02-01', end: '2028-02-29' });
    expect(timelineRange('month', '2026-02-28')).toEqual({ start: '2026-02-01', end: '2026-02-28' });
    expect(timelineRange('month', '2100-02-01').end).toBe('2100-02-28');
    expect(timelineRange('month', '2000-02-01').end).toBe('2000-02-29');
    expect(timelineRange('month', '2026-12-31')).toEqual({ start: '2026-12-01', end: '2026-12-31' });
  });

  it('covers quarters at their boundaries', () => {
    expect(timelineRange('quarter', '2026-01-01')).toEqual({ start: '2026-01-01', end: '2026-03-31' });
    expect(timelineRange('quarter', '2026-03-31')).toEqual({ start: '2026-01-01', end: '2026-03-31' });
    expect(timelineRange('quarter', '2026-04-01')).toEqual({ start: '2026-04-01', end: '2026-06-30' });
    expect(timelineRange('quarter', '2026-09-30')).toEqual({ start: '2026-07-01', end: '2026-09-30' });
    expect(timelineRange('quarter', '2026-12-31')).toEqual({ start: '2026-10-01', end: '2026-12-31' });
  });

  it('starts weeks on Monday or Sunday, across month and year ends', () => {
    // 2026-10-20 is a Tuesday.
    expect(timelineRange('week', '2026-10-20')).toEqual({ start: '2026-10-19', end: '2026-10-25' });
    expect(timelineRange('week', '2026-10-20', 0)).toEqual({ start: '2026-10-18', end: '2026-10-24' });
    // Sunday is the last day of a Monday week and the first of a Sunday week.
    expect(timelineRange('week', '2026-10-25')).toEqual({ start: '2026-10-19', end: '2026-10-25' });
    expect(timelineRange('week', '2026-10-25', 0)).toEqual({ start: '2026-10-25', end: '2026-10-31' });
    expect(timelineRange('week', '2027-01-01')).toEqual({ start: '2026-12-28', end: '2027-01-03' });
    expect(timelineRange('week', '2027-01-01', 0)).toEqual({ start: '2026-12-27', end: '2027-01-02' });
    expect(timelineRange('week', '2028-03-01')).toEqual({ start: '2028-02-28', end: '2028-03-05' });
  });

  it('rejects text that is not a calendar date', () => {
    for (const bad of ['2026-02-30', '2026-13-01', '20261001', '2026-10-01T00:00:00Z', ''])
      expect(() => timelineRange('month', bad)).toThrow(RangeError);
  });

  it('gives the same window in every time zone', () => {
    // Pure calendar math: no Date in local time is ever read.
    const original = process.env.TZ;
    for (const zone of ['Pacific/Kiritimati', 'Pacific/Pago_Pago', 'Asia/Kolkata']) {
      process.env.TZ = zone;
      expect(timelineRange('month', '2026-03-01')).toEqual({ start: '2026-03-01', end: '2026-03-31' });
    }
    process.env.TZ = original;
  });
});

describe('shiftTimeline', () => {
  it('moves to the first day of the next or previous window', () => {
    expect(shiftTimeline('month', '2026-01-31', 1)).toBe('2026-02-01');
    expect(shiftTimeline('month', '2026-03-31', -1)).toBe('2026-02-01');
    expect(shiftTimeline('month', '2026-12-15', 1)).toBe('2027-01-01');
    expect(shiftTimeline('month', '2027-01-15', -1)).toBe('2026-12-01');
    expect(shiftTimeline('quarter', '2026-11-20', 1)).toBe('2027-01-01');
    expect(shiftTimeline('quarter', '2026-02-20', -1)).toBe('2025-10-01');
    expect(shiftTimeline('week', '2026-12-30', 1)).toBe('2027-01-04');
    expect(shiftTimeline('week', '2026-12-30', -1, 0)).toBe('2026-12-20');
  });
});

describe('window title and dates', () => {
  it('names the window', () => {
    expect(timelineTitle('month', '2026-10-17', 1, 'en-US')).toBe('October 2026');
    expect(timelineTitle('quarter', '2026-10-17')).toBe('Q4 2026');
    expect(timelineTitle('quarter', '2026-01-01')).toBe('Q1 2026');
    const week = (from: string) => timelineTitle('week', from, 1, 'en-GB').replaceAll(/[\u2009\u202f]/g, ' ');
    expect(week('2026-10-14')).toBe('12 – 18 Oct 2026');
    expect(week('2026-12-30')).toBe('28 Dec 2026 – 3 Jan 2027');
  });

  it('reads times on the wall clock of a zone and finds today there', () => {
    const instant = Date.UTC(2026, 9, 31, 20, 30);
    expect(new Date(wallClock(instant, 'Asia/Kolkata')).toISOString()).toBe('2026-11-01T02:00:00.000Z');
    expect(new Date(wallClock(instant, 'America/New_York')).toISOString()).toBe('2026-10-31T16:30:00.000Z');
    expect(timelineToday('Asia/Kolkata', instant)).toBe('2026-11-01');
    expect(timelineToday('UTC', instant)).toBe('2026-10-31');
  });
});

const tasks = [
  { id: 'b', task: 'Build', start: '2026-10-05', end: '2026-10-09' },
  { id: 'a', task: 'Plan', start: '2026-09-28', end: '2026-10-02' },
  { id: 'c', task: 'Launch', start: '2026-10-20', end: null },
  { id: 'd', task: 'Review', start: '2026-10-12', end: '2026-10-10' },
  { id: 'e', task: 'Support', start: '2026-10-26', end: '2026-11-20' },
  { id: 'f', task: 'Old', start: '2026-08-01', end: '2026-08-02' },
];
const october = { start: '2026-10-01', end: '2026-10-31' };

describe('TimelineChart record mode', () => {
  it('lists rows in start order with their dates in words', () => {
    const html = renderToString(
      <TimelineChart
        rows={tasks}
        rowKey="id"
        category="task"
        start="start"
        end="end"
        window={october}
        locale="en-GB"
        title="Tasks"
      />,
    ).replaceAll(/[\u2009\u202f]/g, ' ');
    expect(html).toContain('aria-label="Tasks"');
    expect(html).toMatch(/<ol[^>]*aria-label="Tasks"/);
    const titles = [...html.matchAll(/sprout-timeline-label-title">([^<]+)</g)].map(match => match[1]);
    expect(titles).toEqual(['Plan', 'Build', 'Review', 'Launch', 'Support']);
    expect(html).toMatch(/28 Sept? – 2 Oct 2026/);
    expect(html).toContain('Starts before window');
    expect(html).toContain('Ends after window');
    expect(html).toContain('5 – 9 Oct 2026');
    expect(html).toContain('20 Oct 2026, no end');
    expect(html).toContain('Starts 12 Oct 2026, ends 10 Oct 2026');
    expect(html).toContain('End before start');
    expect(html).not.toContain('Old');
    expect(html).toMatch(/class="sprout-timeline-plot" aria-hidden="true"/);
  });

  it('shows the window, empty, loading, error and undated states', () => {
    const empty = renderToString(
      <TimelineChart
        rows={[]}
        category="task"
        start="start"
        window={october}
        locale="en-GB"
        undated={{ count: 1, field: 'Start date' }}
      />,
    );
    expect(empty).toContain('Nothing in this window');
    expect(empty).toContain('Nothing between 1 Oct 2026 and 31 Oct 2026.');
    expect(empty).toContain('1 row without Start date');
    const many = renderToString(
      <TimelineChart
        rows={tasks}
        category="task"
        start="start"
        window={october}
        undated={{ count: '1,204', field: 'Start date', action: <a href="#undated">Show in Table</a> }}
        notice={<p>Showing the first 100 of 340 rows.</p>}
      />,
    );
    expect(many).toContain('1,204 rows without Start date');
    expect(many).toContain('Show in Table');
    expect(many).toContain('Showing the first 100 of 340 rows.');
    const loading = renderToString(
      <TimelineChart rows={[]} category="task" start="start" window={october} status="loading" />,
    );
    expect(loading).toContain('aria-busy="true"');
    expect(loading).toContain('aria-label="Loading timeline"');
    const busy = renderToString(
      <TimelineChart rows={tasks} category="task" start="start" window={october} status="loading" />,
    );
    expect(busy).toContain('aria-busy="true"');
    expect(busy).toContain('Build');
    const error = renderToString(
      <TimelineChart
        rows={tasks}
        category="task"
        start="start"
        window={october}
        status="error"
        error="The server did not answer."
        onRetry={() => {}}
        undated={{ count: 2, field: 'Start date' }}
      />,
    );
    expect(error).toContain('role="alert"');
    expect(error).toContain('The server did not answer.');
    expect(error).toContain('Try again');
    expect(error).not.toContain('without Start date');
    expect(
      renderToString(
        <TimelineChart rows={[]} category="task" start="start" window={october} empty={<p>Pick a window.</p>} />,
      ),
    ).toContain('Pick a window.');
  });

  it('draws every row as a point when there is no end field', () => {
    const html = renderToString(
      <TimelineChart rows={tasks} category="task" start="start" window={october} locale="en-GB" />,
    );
    expect(html).not.toContain('no end');
    expect(html).not.toContain('End before start');
    expect(html).toContain('>5 Oct 2026<');
  });

  it('shows times in the given zone', () => {
    const html = renderToString(
      <TimelineChart
        rows={[{ task: 'Call', at: Date.UTC(2026, 9, 31, 20, 30) }]}
        category="task"
        start="at"
        window={{ start: '2026-11-01', end: '2026-11-07' }}
        timeZone="Asia/Kolkata"
        locale="en-GB"
      />,
    );
    expect(html).toContain('1 Nov 2026, 2:00');
  });

  it('keeps the plain chart for calls without a window or list', () => {
    const html = renderToString(
      <TimelineChart rows={tasks.slice(0, 2)} category="task" start="start" end="end" title="Plan" />,
    );
    expect(html).toContain('data-variant="timeline"');
    expect(html).not.toContain('sprout-timeline-labels');
    expect(html).toContain('height:7rem');
  });
});

describe('TimelineWindowBar', () => {
  it('names its controls and the window', () => {
    const html = renderToString(
      <TimelineWindowBar
        zoom="month"
        from="2026-10-17"
        today="2026-10-20"
        locale="en-US"
        onChange={() => {}}
        actions={<button type="button">Start field</button>}
      />,
    );
    expect(html).toContain('aria-label="Previous month"');
    expect(html).toContain('aria-label="Next month"');
    expect(html).toContain('>Today<');
    expect(html).toContain('aria-label="Window size"');
    expect(html).toMatch(/aria-live="polite"[^>]*>October 2026</);
    for (const label of ['Week', 'Month', 'Quarter']) expect(html).toContain(`>${label}<`);
    expect(html).toContain('Start field');
  });
});
