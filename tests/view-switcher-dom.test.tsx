// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ViewSwitcher,
  type ViewSwitcherOption,
  type ViewSwitcherView,
} from '../packages/sprout/src/components/view-switcher.js';

const Icon = () => <svg />;

const initial: ViewSwitcherView[] = [
  { id: 'table', label: 'Table', icon: Icon },
  { id: 'list', label: 'List', icon: Icon, closable: true },
  { id: 'board', label: 'Board', icon: Icon, closable: true },
];

const options: ViewSwitcherOption[] = [
  { id: 'list', label: 'List', icon: Icon, description: 'One record per row.' },
  { id: 'chart', label: 'Chart', icon: Icon, description: 'Totals by group.' },
  {
    id: 'timeline',
    label: 'Timeline',
    icon: Icon,
    description: 'Records on dates.',
    unavailable: 'Timeline needs a date field.',
  },
];

function Harness({
  start = 'list',
  keepValue = false,
  onAdd,
  onChange,
}: {
  start?: string;
  keepValue?: boolean;
  onAdd?: (id: string) => void;
  onChange?: (id: string) => void;
}) {
  const [views, setViews] = useState(initial);
  const [value, setValue] = useState(start);
  return (
    <ViewSwitcher
      views={views}
      value={value}
      panelId="records"
      onValueChange={id => {
        onChange?.(id);
        setValue(id);
      }}
      options={options}
      onAdd={onAdd}
      onClose={id => {
        setViews(current => current.filter(view => view.id !== id));
        if (id === value && !keepValue) setValue('table');
      }}
    />
  );
}

let observers: Array<() => void> = [];

beforeEach(() => {
  observers = [];
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(callback: ResizeObserverCallback) {
        observers.push(() => callback([], this as unknown as ResizeObserver));
      }
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const tab = (name: string) => screen.getByRole('tab', { name: new RegExp(`^${name}`) });

describe('ViewSwitcher in the DOM', () => {
  it('switches views on click', () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    fireEvent.click(tab('Board'));
    expect(onChange).toHaveBeenCalledWith('board');
    expect(tab('Board').getAttribute('aria-selected')).toBe('true');
    expect(tab('Board').getAttribute('aria-controls')).toBe('records');
  });

  it('closes the focused tab with Delete and moves focus to the active view', () => {
    render(<Harness />);
    tab('List').focus();
    fireEvent.keyDown(tab('List'), { key: 'Delete' });
    expect(screen.queryByRole('tab', { name: /^List/ })).toBeNull();
    expect(document.activeElement).toBe(tab('Table'));
  });

  it('focuses the neighbour with Backspace when the app keeps the closed value', () => {
    render(<Harness start="board" keepValue />);
    tab('Board').focus();
    fireEvent.keyDown(tab('Board'), { key: 'Backspace' });
    expect(screen.queryByRole('tab', { name: /^Board/ })).toBeNull();
    expect(document.activeElement).toBe(tab('List'));
  });

  it('ignores other keys and views that cannot close', () => {
    render(<Harness />);
    fireEvent.keyDown(tab('List'), { key: 'Enter' });
    fireEvent.keyDown(tab('Table'), { key: 'Delete' });
    expect(screen.getAllByRole('tab')).toHaveLength(3);
  });

  it('closes a tab from its close control without selecting it', () => {
    const onChange = vi.fn();
    render(<Harness start="table" onChange={onChange} />);
    const control = tab('Board').querySelector('[data-slot="view-switcher-close"]')!;
    fireEvent.pointerDown(control);
    fireEvent.mouseDown(control);
    fireEvent.click(control);
    expect(screen.queryByRole('tab', { name: /^Board/ })).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('lists options with open, available and unavailable states', async () => {
    const onAdd = vi.fn();
    render(<Harness onAdd={onAdd} />);
    fireEvent.click(screen.getByRole('button', { name: 'Add view' }));
    const items = await screen.findAllByRole('menuitem');
    expect(items).toHaveLength(3);

    const [list, chart, timeline] = items as [HTMLElement, HTMLElement, HTMLElement];
    expect(list.getAttribute('data-open')).not.toBeNull();
    expect(list.textContent).toContain('Already open.');
    expect(chart.getAttribute('data-open')).toBeNull();
    expect(timeline.getAttribute('aria-disabled')).toBe('true');
    expect(timeline.textContent).toContain('Timeline needs a date field.');
    expect(timeline.textContent).not.toContain('Records on dates.');

    fireEvent.click(timeline);
    expect(onAdd).not.toHaveBeenCalled();
    fireEvent.click(chart);
    expect(onAdd).toHaveBeenCalledWith('chart');
  });

  it('scrolls the active tab into view and marks overflow on both edges', () => {
    vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockReturnValue(600);
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(200);
    const rects: Record<string, number> = { table: 0, list: 300, board: -200 };
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      const id = this.id.replace('records-tab-', '');
      const left = this.getAttribute('role') === 'tab' ? (rects[id] ?? 0) : 0;
      const width = this.getAttribute('role') === 'tab' ? 80 : 200;
      return { left, right: left + width, top: 0, bottom: 32, width, height: 32, x: left, y: 0 } as DOMRect;
    });

    render(<Harness />);
    const list = screen.getByRole('tablist');
    expect(list.scrollLeft).toBe(204);
    expect(list.hasAttribute('data-overflow-start')).toBe(true);
    expect(list.hasAttribute('data-overflow-end')).toBe(true);

    fireEvent.click(tab('Board'));
    expect(list.scrollLeft).toBeLessThan(0);

    act(() => {
      list.scrollLeft = 0;
      fireEvent.scroll(list);
      for (const notify of observers) notify();
    });
    expect(list.hasAttribute('data-overflow-start')).toBe(false);
    expect(list.hasAttribute('data-overflow-end')).toBe(true);
  });
});
