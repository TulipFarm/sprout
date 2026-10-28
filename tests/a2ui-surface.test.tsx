// @vitest-environment jsdom
import { fireEvent, render, screen, within } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  A2uiSurface,
  A2uiUnavailable,
  compactTableRows,
  readSurface,
  sproutAdapters,
  sproutCatalog,
  type A2uiAdapter,
} from '../packages/sprout/src/a2ui/surface.js';
import { Metric } from '../packages/sprout/src/components/metric.js';

const version = 'v0.9.1';

function messages(components: Record<string, unknown>[], data?: unknown) {
  return [
    { version, createSurface: { surfaceId: 's1', catalogId: sproutCatalog.id } },
    { version, updateComponents: { surfaceId: 's1', components } },
    ...(data === undefined ? [] : [{ version, updateDataModel: { surfaceId: 's1', value: data } }]),
  ];
}

const rows = Array.from({ length: 14 }, (_, index) => ({ name: `App ${index + 1}`, gb: index + 0.5 }));
const table = { id: 'root', component: 'Table', label: 'Apps', columns: [{ key: 'name', label: 'Name' }], rows };

// Recharts draws nothing until its box is measured, and jsdom measures 0.
beforeEach(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(private callback: ResizeObserverCallback) {}
      observe(target: Element) {
        this.callback(
          [{ target, contentRect: { width: 640, height: 240 } } as unknown as ResizeObserverEntry],
          this as unknown as ResizeObserver,
        );
      }
      unobserve() {}
      disconnect() {}
    },
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('A2uiSurface', () => {
  it('draws every catalog component with Sprout components', () => {
    const components = [
      {
        id: 'root',
        component: 'Section',
        title: 'Report',
        children: [
          'heading',
          'row',
          'card',
          'tabs',
          'details',
          'list',
          'progress',
          'callout',
          'code',
          'divider',
          'img',
        ],
      },
      { id: 'heading', component: 'Heading', text: 'Memory', level: 1 },
      { id: 'row', component: 'Row', gap: 'small', align: 'center', children: ['metric', 'badge', 'button'] },
      {
        id: 'metric',
        component: 'Metric',
        label: 'Used',
        value: { path: '/used' },
        change: { value: '1 GB', direction: 'up', tone: 'negative' },
        caption: 'of 16 GB',
        trend: [1, 2, 3],
      },
      { id: 'badge', component: 'Badge', text: 'High', tone: 'error' },
      { id: 'button', component: 'Button', label: 'Free memory', message: 'How do I free memory?' },
      { id: 'card', component: 'Card', title: 'Card title', description: 'Card text', children: ['column'] },
      { id: 'column', component: 'Column', children: ['caption'] },
      { id: 'caption', component: 'Text', text: 'A caption', variant: 'caption' },
      { id: 'tabs', component: 'Tabs', tabs: [{ label: 'First tab', child: 'first' }] },
      { id: 'first', component: 'Text', text: 'Tab body' },
      { id: 'details', component: 'Details', items: [{ title: 'How it was measured', child: 'how' }] },
      { id: 'how', component: 'Text', text: 'Sampled' },
      { id: 'list', component: 'List', ordered: true, children: { componentId: 'item', path: '/apps' } },
      { id: 'item', component: 'Text', text: { path: 'name' } },
      { id: 'progress', component: 'Progress', label: 'Swap', value: 40 },
      { id: 'callout', component: 'Callout', tone: 'error', title: 'Error:', text: 'Out of memory' },
      { id: 'code', component: 'Code', code: 'free -h' },
      { id: 'divider', component: 'Divider' },
      { id: 'img', component: 'Image', src: 'https://example.com/a.png', alt: 'Graph' },
    ];
    const onAction = vi.fn();
    const { container } = render(
      <A2uiSurface
        messages={messages(components, { used: 11.2, apps: [{ name: 'Chrome' }, { name: 'Slack' }] })}
        onAction={onAction}
        allowUrl={() => true}
      />,
    );
    expect(screen.getByRole('region', { name: 'Report' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Memory' }).getAttribute('aria-level')).toBe('2');
    expect(container.querySelector('[data-slot="metric"]')!.textContent).toContain('11.2');
    expect(container.querySelector('.sprout-a2ui-row')!.getAttribute('data-align')).toBe('center');
    expect(screen.getByText('Card title')).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'First tab' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'How it was measured' })).toBeTruthy();
    expect(within(container.querySelector('ol')!).getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByRole('progressbar')).toBeTruthy();
    expect(screen.getByText('Out of memory')).toBeTruthy();
    expect(screen.getByRole('img', { name: 'Graph' }).getAttribute('src')).toBe('https://example.com/a.png');
    expect(container.textContent).not.toContain('"component"');

    fireEvent.click(screen.getByRole('button', { name: 'Free memory' }));
    expect(onAction).toHaveBeenCalledWith({ type: 'send', text: 'How do I free memory?' });
  });

  it('only links allowed URLs and loads no images by default', () => {
    render(
      <A2uiSurface
        messages={messages([
          { id: 'root', component: 'Column', children: ['ok', 'bad', 'img', 'button'] },
          { id: 'ok', component: 'Text', text: '[docs](https://example.com)' },
          { id: 'bad', component: 'Text', text: '[run](javascript:alert(1))' },
          { id: 'img', component: 'Image', src: 'https://example.com/a.png', alt: 'Graph' },
          { id: 'button', component: 'Button', label: 'Ask', message: 'ask' },
        ])}
      />,
    );
    expect(screen.getByRole('link', { name: 'docs' }).getAttribute('rel')).toBe('noopener noreferrer');
    expect(screen.queryByRole('link', { name: 'run' })).toBeNull();
    expect(screen.queryByRole('img', { name: 'Graph' })).toBeNull();
    expect((screen.getByRole('button', { name: 'Ask' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('shows the first rows of a compact table and expands', () => {
    const { container } = render(<A2uiSurface messages={messages([table])} size="compact" />);
    expect(container.querySelectorAll('tbody tr')).toHaveLength(compactTableRows);
    fireEvent.click(screen.getByRole('button', { name: 'Show all 14 rows' }));
    expect(container.querySelectorAll('tbody tr')).toHaveLength(14);
  });

  it('asks the app to expand a compact table when it handles actions', () => {
    const onAction = vi.fn();
    render(<A2uiSurface messages={messages([table])} size="compact" onAction={onAction} />);
    fireEvent.click(screen.getByRole('button', { name: 'Show all 14 rows' }));
    expect(onAction).toHaveBeenCalledWith({ type: 'expand', componentId: 'root' });
  });

  it('shows every row at full size', () => {
    const { container } = render(<A2uiSurface messages={messages([table])} />);
    expect(container.querySelectorAll('tbody tr')).toHaveLength(14);
    expect(screen.queryByRole('button', { name: /Show all/ })).toBeNull();
  });

  it.each(['line', 'area', 'bar', 'pie', 'donut'])('draws a %s chart and its data', type => {
    const chart = {
      id: 'root',
      component: 'Chart',
      type,
      title: 'Memory by app',
      category: 'name',
      series: [{ key: 'gb', label: 'GB' }],
      rows: rows.slice(0, 3),
      unit: 'GB',
      stack: true,
    };
    const { container } = render(<A2uiSurface messages={messages([chart])} size="compact" />);
    expect(container.querySelector('figure.sprout-a2ui-chart')).toBeTruthy();
    const toggle = screen.getByRole('button', { name: 'Show data' });
    fireEvent.click(toggle);
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('table', { name: 'Memory by app' })).toBeTruthy();
    expect(screen.getByText('App 3')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Show chart' }));
    expect(screen.queryByRole('table')).toBeNull();
  });

  it('marks missing, unknown and broken parts without raw JSON', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const Broken: A2uiAdapter = () => {
      throw new Error('boom');
    };
    const { container } = render(
      <A2uiSurface
        messages={messages([
          { id: 'root', component: 'Column', children: ['gone', 'odd', 'bad', 'fails', 'ok', 'root'] },
          { id: 'odd', component: 'Marquee' },
          { id: 'bad', component: 'Text' },
          { id: 'fails', component: 'Badge', text: 'x' },
          { id: 'ok', component: 'Text', text: 'Still here' },
        ])}
        adapters={{ ...sproutAdapters, Badge: Broken }}
      />,
    );
    expect(screen.getAllByText("This part couldn't be displayed.")).toHaveLength(5);
    expect(screen.getByText('Still here')).toBeTruthy();
    expect(container.textContent).not.toContain('Marquee');
  });

  it('shows placeholders while streaming', () => {
    const partial = messages([
      { id: 'root', component: 'Column', children: ['done', 'later', 'half'] },
      { id: 'done', component: 'Text', text: 'Ready' },
      { id: 'half', component: 'Table' },
    ]);
    const { container, rerender } = render(<A2uiSurface messages={partial} streaming />);
    const root = container.querySelector('[data-slot="a2ui-surface"]')!;
    expect(root.getAttribute('aria-busy')).toBe('true');
    expect(container.querySelectorAll('.sprout-a2ui-pending')).toHaveLength(2);
    expect(screen.getByText('Ready')).toBeTruthy();

    rerender(<A2uiSurface messages={partial.slice(1)} streaming />);
    expect(container.querySelectorAll('.sprout-a2ui-pending')).toHaveLength(1);
    rerender(<A2uiSurface messages={partial.slice(1)} />);
    expect(screen.getByText("This part couldn't be displayed.")).toBeTruthy();
  });

  it('accepts a surface that was already read, and hides deleted surfaces', () => {
    const list = messages([{ id: 'root', component: 'Text', text: 'From a surface' }]);
    render(<A2uiSurface surface={readSurface(list)!} className="extra" />);
    expect(screen.getByText('From a surface').closest('.sprout-a2ui.extra')).toBeTruthy();

    const deleted = readSurface([...list, { version, deleteSurface: { surfaceId: 's1' } }])!;
    expect(renderToString(<A2uiSurface surface={deleted} />)).toContain('couldn&#x27;t be displayed');
    expect(renderToString(<A2uiUnavailable />)).toContain('role="note"');
  });
});

describe('Metric', () => {
  it('says the change in words, not only color', () => {
    const { container, rerender } = render(
      <Metric label="Revenue" value="$12k" change={{ value: '4%', direction: 'down', tone: 'negative' }} />,
    );
    const change = container.querySelector('.sprout-metric-change')!;
    expect(change.getAttribute('data-tone')).toBe('negative');
    expect(change.textContent).toBe('↓Down 4%');
    expect(change.querySelector('[aria-hidden="true"]')!.textContent).toBe('↓');

    rerender(<Metric label="Swap" value="0 GB" change={{ value: '0', direction: 'flat', label: 'in 1 hour' }} />);
    expect(container.querySelector('.sprout-metric-change')!.textContent).toBe('→No changein 1 hour');
    expect(container.querySelector('.sprout-metric-change')!.getAttribute('data-tone')).toBe('neutral');
  });

  it('shows the caption and trend only when given', () => {
    const { container, rerender } = render(<Metric label="CPU" value="12%" />);
    expect(container.querySelector('.sprout-metric-trend, .sprout-metric-caption, .sprout-metric-change')).toBeNull();
    rerender(<Metric label="CPU" value="12%" caption="Just now" trend={<svg />} className="x" id="cpu" />);
    const metric = container.querySelector('#cpu')!;
    expect(metric.className).toBe('sprout-metric x');
    expect(metric.querySelector('.sprout-metric-trend svg')).toBeTruthy();
    expect(metric.querySelector('.sprout-metric-caption')!.textContent).toBe('Just now');
  });
});
