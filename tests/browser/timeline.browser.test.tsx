import { describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { TimelineFixture } from './timeline-fixture.js';
import { axeViolations, setTheme, settle, themes } from './support.js';

const root = () => page.getByTestId('timeline').element();

async function drawn() {
  await expect.poll(() => root().querySelectorAll('.recharts-bar-rectangle').length).toBe(5);
  await settle();
}

/** Each label row's vertical middle against the middle of its SVG mark. */
function offsets() {
  const rows = [...root().querySelectorAll('[data-slot="timeline-row"]')];
  const marks = [...root().querySelectorAll('.recharts-bar-rectangle')];
  expect(marks).toHaveLength(rows.length);
  return rows.map((row, index) => {
    const a = row.getBoundingClientRect();
    const b = marks[index]!.getBoundingClientRect();
    return Math.abs(a.top + a.height / 2 - (b.top + b.height / 2));
  });
}

describe('Record timeline in a real browser', () => {
  it.each(themes)('%s %s pass axe', async (theme, mode) => {
    setTheme(theme, mode);
    const screen = await render(<TimelineFixture />);
    await drawn();
    expect(await axeViolations(screen.container)).toEqual([]);
  });

  it.each([
    [1280, 'neutral'],
    [390, 'tulipfarm'],
  ] as const)('keeps labels and bars on the same rows at %ipx in %s', async (width, theme) => {
    await page.viewport(width, 900);
    setTheme(theme, 'dark');
    await render(<TimelineFixture />);
    await drawn();
    for (const offset of offsets()) expect(offset).toBeLessThan(1.5);
    const plot = root().querySelector('.sprout-timeline-plot')!.getBoundingClientRect();
    const list = root().querySelector('ol')!.getBoundingClientRect();
    expect(Math.abs(plot.height - list.height)).toBeLessThan(1.5);
  });

  it('fits a 390px phone with a narrow label column', async () => {
    await page.viewport(390, 900);
    await render(<TimelineFixture />);
    await drawn();
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
    expect(root().querySelector('.sprout-timeline-label')!.getBoundingClientRect().width).toBeCloseTo(128, 0);
    for (const node of root().querySelectorAll('.recharts-wrapper, [data-slot="timeline-window-bar"]')) {
      expect(node.getBoundingClientRect().right).toBeLessThanOrEqual(390.5);
    }
  });

  it.each(themes)('leads with "End before start" at 390px in %s %s', async (theme, mode) => {
    await page.viewport(390, 900);
    setTheme(theme, mode);
    const screen = await render(<TimelineFixture />);
    await drawn();
    const warning = root().querySelector<HTMLElement>('.sprout-timeline-label-warning')!;
    expect(warning.checkVisibility()).toBe(true);
    expect(warning.getBoundingClientRect().right).toBeLessThanOrEqual(
      warning.closest('.sprout-timeline-label')!.getBoundingClientRect().right + 0.5,
    );
    expect(root().querySelector('.sprout-timeline-label-marker')!.checkVisibility()).toBe(false);
    expect(await axeViolations(screen.container)).toEqual([]);
  });

  it('rounds unclipped bar ends and squares clipped ones', async () => {
    await render(<TimelineFixture />);
    await drawn();
    const bars = [...root().querySelectorAll('.recharts-bar-rectangle')];
    const path = (index: number) =>
      bars[index]!.querySelector('path:not(.sprout-timeline-chevron)')!.getAttribute('d')!;
    // Plan starts before October; Build sits inside it.
    expect(path(0)).toMatch(/^M\s*[\d.]+,\s*[\d.]+\s*L/);
    expect(path(1)).toMatch(/A\s*3/);
    expect(bars[0]!.querySelectorAll('.sprout-timeline-chevron')).toHaveLength(1);
  });

  it('moves the window with the bar and redraws the axis', async () => {
    const screen = await render(<TimelineFixture />);
    await drawn();
    await userEvent.click(screen.getByRole('button', { name: 'Week' }));
    await expect
      .poll(() => root().querySelector('.sprout-timeline-window-title')?.textContent?.replaceAll(/\s/g, ' '))
      .toMatch(/^28 Sept? – 4 Oct 2026$/);
    await expect
      .poll(() =>
        [...root().querySelectorAll('[data-slot="timeline-row"] .sprout-timeline-label-title')].map(n => n.textContent),
      )
      .toEqual(['Plan the launch']);
    await userEvent.click(screen.getByRole('button', { name: 'Next week' }));
    await userEvent.click(screen.getByRole('button', { name: 'Next week' }));
    await expect
      .poll(() => [...root().querySelectorAll('.sprout-timeline-label-title')].map(n => n.textContent))
      .toEqual(['Build pricing page', 'Legal review']);
    expect(root().querySelector('.sprout-timeline-label-clip')?.textContent).toBe('Starts before window');
  });

  it('tabs from the list into the active row actions only', async () => {
    const screen = await render(<TimelineFixture />);
    await drawn();
    const rows = root().querySelectorAll<HTMLElement>('[data-slot="timeline-row"]');
    rows[0]!.focus();
    await userEvent.keyboard('{ArrowDown}');
    expect(document.activeElement).toBe(rows[1]);
    await userEvent.tab();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Edit Build pricing page' }).element());
    await userEvent.tab();
    expect(root().querySelector('ol')!.contains(document.activeElement)).toBe(false);
  });
});
