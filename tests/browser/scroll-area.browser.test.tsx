import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { ScrollArea, type ScrollAreaProps } from '../../packages/sprout/src/components/scroll-area.js';
import { axeViolations, emulate, setTheme, settle, themes } from './support.js';

function Records({ count, wide = false }: { count: number; wide?: boolean }) {
  return (
    <div style={{ width: wide ? '40rem' : undefined }}>
      {Array.from({ length: count }, (_, index) => (
        <p key={index} style={{ margin: 0, padding: '6px 12px' }}>
          Sample record {index + 1} · Meadow project
        </p>
      ))}
    </div>
  );
}

function Area(props: ScrollAreaProps & { children: ReactNode }) {
  return (
    <div style={{ width: 360, padding: 16 }}>
      <ScrollArea {...props} />
    </div>
  );
}

function Grid({ rows = 20 }: { rows?: number }) {
  return (
    <div style={{ width: 360, padding: 16 }}>
      <ScrollArea variant="table" orientation="both" viewportLabel="Bulb plantings" data-testid="grid">
        <table style={{ width: 720, borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Project', 'Bulb', 'Location', 'Status'].map(heading => (
                <th
                  key={heading}
                  scope="col"
                  style={{
                    position: 'sticky',
                    top: 0,
                    background: 'var(--sprout-surface)',
                  }}
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }, (_, index) => (
              <tr key={index}>
                <td>Meadow</td>
                <td>Tulip {index + 1}</td>
                <td>North bed</td>
                <td>Planted</td>
              </tr>
            ))}
          </tbody>
        </table>
      </ScrollArea>
    </div>
  );
}

function colorOf(token: string) {
  const probe = document.createElement('span');
  probe.style.color = `var(${token})`;
  document.body.append(probe);
  const value = getComputedStyle(probe).color;
  probe.remove();
  return value;
}

const bars = (root: Element, orientation: string) =>
  root.querySelectorAll(`:scope > [data-slot="scroll-area-scrollbar"][data-orientation="${orientation}"]`).length;
const viewportOf = (root: Element) => root.querySelector<HTMLElement>('[data-slot="scroll-area-viewport"]')!;

describe('ScrollArea in a real browser', () => {
  it.each(themes)('%s %s frames the table variant with the input border and passes axe', async (theme, mode) => {
    setTheme(theme, mode);
    const screen = await render(<Grid />);
    await settle();
    const grid = screen.getByTestId('grid').element();
    expect(getComputedStyle(grid).borderTopColor).toBe(colorOf('--sprout-input'));
    expect(getComputedStyle(grid).backgroundColor).toBe(colorOf('--sprout-surface'));
    expect(await axeViolations(screen.container)).toEqual([]);
  });

  it('sizes set the height and draw bars only on overflowing axes', async () => {
    const screen = await render(
      <>
        <Area size="sm" data-testid="sm">
          <Records count={16} />
        </Area>
        <Area size="md" orientation="both" data-testid="md">
          <Records count={16} wide />
        </Area>
        <Area variant="table" viewportLabel="Few records" data-testid="auto">
          <Records count={8} />
        </Area>
      </>,
    );
    const sm = screen.getByTestId('sm').element();
    const md = screen.getByTestId('md').element();
    const auto = screen.getByTestId('auto').element();
    expect(Math.round(sm.getBoundingClientRect().height)).toBe(160);
    expect(Math.round(md.getBoundingClientRect().height)).toBe(256);
    await expect.poll(() => bars(sm, 'vertical')).toBe(1);
    expect(bars(sm, 'horizontal')).toBe(0);
    await expect.poll(() => bars(md, 'horizontal')).toBe(1);
    expect(bars(md, 'vertical')).toBe(1);
    expect(md.querySelector(':scope > [data-slot="scroll-area-corner"]')).not.toBeNull();
    expect(bars(auto, 'vertical')).toBe(0);
    await expect.element(screen.getByRole('region', { name: 'Few records' })).toBeVisible();

    const bar = sm.querySelector<HTMLElement>(':scope > [data-slot="scroll-area-scrollbar"]')!;
    expect(getComputedStyle(bar).width).toBe('10px');
    expect(Math.round(bar.getBoundingClientRect().right)).toBe(Math.round(sm.getBoundingClientRect().right));
  });

  it('table variant caps at 60dvh, scrolls both ways, and keeps a sticky header pinned', async () => {
    await page.viewport(900, 800);
    const screen = await render(<Grid rows={60} />);
    const grid = screen.getByTestId('grid').element();
    const viewport = screen.getByRole('region', { name: 'Bulb plantings' });
    expect(getComputedStyle(viewport.element()).maxHeight).toBe('480px');
    await expect.poll(() => bars(grid, 'vertical')).toBe(1);
    await expect.poll(() => bars(grid, 'horizontal')).toBe(1);
    const header = screen.getByRole('columnheader', { name: 'Project' });
    const before = header.element().getBoundingClientRect().top;
    viewport.element().scrollTo({ top: 200 });
    await expect.poll(() => grid.hasAttribute('data-overflow-y-start')).toBe(true);
    expect(Math.round(header.element().getBoundingClientRect().top)).toBe(Math.round(before));
  });

  it('keyboard focuses an overflowing viewport and scrolls it', async () => {
    const screen = await render(
      <Area size="sm" data-testid="sm">
        <Records count={16} />
      </Area>,
    );
    const viewport = viewportOf(screen.getByTestId('sm').element());
    await expect.poll(() => viewport.tabIndex).toBe(0);
    await userEvent.tab();
    expect(document.activeElement).toBe(viewport);
    expect(getComputedStyle(viewport).outlineStyle).toBe('solid');
    expect(getComputedStyle(viewport).outlineWidth).toBe('1px');
    await userEvent.keyboard('{End}');
    await expect.poll(() => viewport.scrollTop).toBeGreaterThan(100);
    await userEvent.keyboard('{Home}');
    await expect.poll(() => viewport.scrollTop).toBe(0);
  });

  it('a horizontal row on a phone scrolls sideways with arrow keys', async () => {
    await page.viewport(390, 800);
    const screen = await render(
      <ScrollArea orientation="horizontal" viewportLabel="Projects" data-testid="row">
        <ul aria-label="Projects" style={{ display: 'flex', gap: 12, margin: 0, padding: 12 }}>
          {Array.from({ length: 6 }, (_, index) => (
            <li key={index} style={{ flex: '0 0 200px', listStyle: 'none' }}>
              Project {index + 1}
            </li>
          ))}
        </ul>
      </ScrollArea>,
    );
    const row = screen.getByTestId('row').element();
    await expect.poll(() => bars(row, 'horizontal')).toBe(1);
    expect(bars(row, 'vertical')).toBe(0);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
    const viewport = viewportOf(row);
    viewport.focus();
    await userEvent.keyboard('{ArrowRight}{ArrowRight}');
    await expect.poll(() => viewport.scrollLeft).toBeGreaterThan(0);
  });

  it('content that fits draws no bar and is skipped by Tab', async () => {
    const screen = await render(
      <Area size="sm" variant="table" viewportLabel="No plantings" data-testid="empty">
        <p>No plantings yet</p>
      </Area>,
    );
    const empty = screen.getByTestId('empty').element();
    // Sprout sets no box-sizing, so the 1px table border sits outside 10rem.
    expect(empty.clientHeight).toBe(160);
    await expect.poll(() => viewportOf(empty).tabIndex).toBe(-1);
    expect(bars(empty, 'vertical')).toBe(0);
  });

  it('thumb color transitions respect reduced motion', async () => {
    const screen = await render(
      <Area size="sm" data-testid="sm">
        <Records count={16} />
      </Area>,
    );
    const root = screen.getByTestId('sm').element();
    await expect.poll(() => root.querySelector('[data-slot="scroll-area-thumb"]')).not.toBeNull();
    const thumb = root.querySelector('[data-slot="scroll-area-thumb"]')!;
    expect(getComputedStyle(thumb).transitionDuration).toBe('0.12s');
    await emulate({ reducedMotion: true });
    expect(getComputedStyle(thumb).transitionDuration).toBe('0s');
  });
});
