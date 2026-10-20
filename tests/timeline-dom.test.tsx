// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TimelineChart, TimelineWindowBar, timelineRange } from '../packages/sprout/src/components/timeline.js';

// Recharts draws nothing until its box is measured, and jsdom measures 0.
beforeEach(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(private callback: ResizeObserverCallback) {}
      observe(target: Element) {
        this.callback(
          [{ target, contentRect: { width: 640, height: 320 } } as unknown as ResizeObserverEntry],
          this as unknown as ResizeObserver,
        );
      }
      unobserve() {}
      disconnect() {}
    },
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const rows = [
  { id: 'b', name: 'Build', start: '2026-10-05', end: '2026-10-09' },
  { id: 'a', name: 'Plan', start: '2026-10-01', end: '2026-10-03' },
  { id: 'c', name: 'Launch', start: '2026-10-20', end: '' },
];

function renderTimeline(onRowOpen = vi.fn()) {
  render(
    <>
      <button type="button">Before</button>
      <TimelineChart
        rows={rows}
        category="name"
        start="start"
        end="end"
        rowKey="id"
        title="Tasks"
        window={timelineRange('month', '2026-10-01')}
        onRowOpen={onRowOpen}
        renderActions={row => (
          <button type="button" aria-label={`Edit ${String(row.name)}`}>
            Edit
          </button>
        )}
      />
      <button type="button">After</button>
    </>,
  );
  return onRowOpen;
}

const items = () => screen.getAllByRole('listitem');

describe('record timeline keyboard', () => {
  it('lists rows in start order with one tab stop', () => {
    renderTimeline();
    expect(screen.getByRole('list', { name: 'Tasks' })).toBeTruthy();
    expect(items().map(item => item.querySelector('.sprout-timeline-label-title')?.textContent)).toEqual([
      'Plan',
      'Build',
      'Launch',
    ]);
    expect(items().map(item => item.tabIndex)).toEqual([0, -1, -1]);
    expect(document.querySelector('.sprout-timeline-plot')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('moves with arrows, Home and End, and opens with Enter', () => {
    const onRowOpen = renderTimeline();
    const [first, second, third] = items();
    first!.focus();
    fireEvent.keyDown(first!, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(second);
    expect(items().map(item => item.tabIndex)).toEqual([-1, 0, -1]);
    fireEvent.keyDown(second!, { key: 'End' });
    expect(document.activeElement).toBe(third);
    fireEvent.keyDown(third!, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(third);
    fireEvent.keyDown(third!, { key: 'Home' });
    expect(document.activeElement).toBe(first);
    fireEvent.keyDown(first!, { key: 'ArrowUp' });
    expect(document.activeElement).toBe(first);
    fireEvent.keyDown(first!, { key: 'Enter' });
    expect(onRowOpen).toHaveBeenCalledWith(rows[1]);
  });

  it('only lets Tab reach the active row actions', () => {
    renderTimeline();
    const edit = (name: string) => screen.getByRole('button', { name: `Edit ${name}` });
    expect(edit('Plan').tabIndex).toBe(0);
    expect(edit('Build').tabIndex).toBe(-1);
    fireEvent.keyDown(items()[0]!, { key: 'ArrowDown' });
    expect(edit('Plan').tabIndex).toBe(-1);
    expect(edit('Build').tabIndex).toBe(0);
  });

  it('opens a row on click but not from its actions', () => {
    const onRowOpen = renderTimeline();
    fireEvent.click(screen.getByRole('button', { name: 'Edit Launch' }));
    expect(onRowOpen).not.toHaveBeenCalled();
    fireEvent.click(items()[2]!);
    expect(onRowOpen).toHaveBeenCalledWith(rows[2]);
  });

  it('keeps Enter inside actions for the action', () => {
    const onRowOpen = renderTimeline();
    fireEvent.keyDown(screen.getByRole('button', { name: 'Edit Plan' }), { key: 'Enter' });
    expect(onRowOpen).not.toHaveBeenCalled();
  });
});

describe('TimelineWindowBar', () => {
  it('moves the window and changes its size', () => {
    const onChange = vi.fn();
    render(<TimelineWindowBar zoom="month" from="2026-10-14" today="2026-03-03" onChange={onChange} locale="en-GB" />);
    expect(screen.getByText('October 2026').getAttribute('aria-live')).toBe('polite');
    fireEvent.click(screen.getByRole('button', { name: 'Previous month' }));
    expect(onChange).toHaveBeenLastCalledWith({ zoom: 'month', from: '2026-09-01' });
    fireEvent.click(screen.getByRole('button', { name: 'Next month' }));
    expect(onChange).toHaveBeenLastCalledWith({ zoom: 'month', from: '2026-11-01' });
    fireEvent.click(screen.getByRole('button', { name: 'Today' }));
    expect(onChange).toHaveBeenLastCalledWith({ zoom: 'month', from: '2026-03-03' });
    fireEvent.click(screen.getByRole('button', { name: 'Quarter' }));
    expect(onChange).toHaveBeenLastCalledWith({ zoom: 'quarter', from: '2026-10-14' });
  });
});

describe('TimelineChart edge rows and states', () => {
  it('reads timestamps and skips rows without a usable start', () => {
    render(
      <TimelineChart
        rows={[
          { id: 'n', name: 'Epoch', start: Date.UTC(2026, 9, 6, 12), end: Date.UTC(2026, 9, 8, 12) },
          { id: 'i', name: 'Infinite', start: Number.POSITIVE_INFINITY, end: '' },
          { id: 's', name: 'Stamp', start: '2026-10-07T09:00:00Z', end: 'nonsense' },
          { id: 'x', name: 'Garbage', start: 'not a date', end: '' },
          { id: 'e', name: 'Empty', start: '', end: '' },
        ]}
        category="name"
        start="start"
        end="end"
        rowKey="id"
        title="Mixed"
        timeZone="UTC"
        window={timelineRange('month', '2026-10-01')}
      />,
    );
    expect(items().map(item => item.textContent)).toEqual([
      expect.stringContaining('Epoch'),
      expect.stringContaining('Stamp'),
    ]);
  });

  it('cuts bars at both window edges, marks reversed rows, and colors by series', () => {
    const { container } = render(
      <TimelineChart
        rows={[
          { id: 'w', name: 'Wide', start: '2026-09-20', end: '2026-11-10', team: 'Ops' },
          { id: 'l', name: 'Left', start: '2026-09-28', end: '2026-10-02', team: 'Ops' },
          { id: 'r', name: 'Back', start: '2026-10-09', end: '2026-10-06', team: 'Web' },
          { id: 'p', name: 'Point', start: '2026-10-08', team: 'Web' },
          { id: 'o', name: 'Outside', start: '2026-12-01', end: '2026-12-02', team: 'Web' },
        ]}
        category="name"
        start="start"
        end="end"
        seriesKey="team"
        series={[
          { key: 'Ops', label: 'Ops', color: 'var(--sprout-chart-1)' },
          { key: 'Web', label: 'Web', color: 'var(--sprout-chart-2)' },
        ]}
        rowKey="id"
        title="Week"
        window={timelineRange('week', '2026-10-07')}
        today="2026-10-07"
        renderLabel={row => <strong>{String(row.name)}!</strong>}
      />,
    );
    const text = items()
      .map(item => item.textContent)
      .join('|');
    expect(text).toContain('Wide!');
    expect(text).toContain('End before start');
    expect(text).not.toContain('Outside');
    expect(container.querySelector('.sprout-timeline-legend')?.textContent).toContain('Ops');
  });

  it('shows the error panel with a default message and an optional retry', () => {
    const onRetry = vi.fn();
    const props = {
      rows: [],
      category: 'name',
      start: 'start',
      title: 'Tasks',
      window: timelineRange('month', '2026-10-01'),
      status: 'error' as const,
    };
    const { rerender } = render(<TimelineChart {...props} />);
    expect(screen.getByText('Something went wrong while reading these rows.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Try again' })).toBeNull();
    rerender(<TimelineChart {...props} error="Server said no." onRetry={onRetry} />);
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledOnce();
    expect(screen.getByText('Server said no.')).toBeTruthy();
  });

  it('says the window is empty, or shows a custom empty slot', () => {
    const props = {
      rows: [],
      category: 'name',
      start: 'start',
      title: 'Tasks',
      window: timelineRange('month', '2026-10-01'),
    };
    const { rerender } = render(<TimelineChart {...props} />);
    expect(screen.getByText(/^Nothing between/)).toBeTruthy();
    rerender(<TimelineChart {...props} empty={<p>No tasks this month.</p>} />);
    expect(screen.getByText('No tasks this month.')).toBeTruthy();
  });
});
