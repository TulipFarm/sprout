import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-react';
import { page, userEvent } from 'vitest/browser';
import {
  ActivityPanel,
  ToolActivity,
  toolActivityStatusNames,
  type ToolActivityItem,
} from '../../packages/sprout/src/components/tool-activity.js';
import { axeViolations, emulate, setTheme, settle, themes } from './support.js';

const icon = (
  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
    <circle cx="12" cy="12" r="9" />
  </svg>
);
const pixel =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

const everyStatus: ToolActivityItem[] = toolActivityStatusNames.map(status => ({
  id: status,
  label: `Step ${status} with a long label that should wrap nicely on phones`,
  status,
  visual: icon,
  detail:
    status === 'failed' || status === 'blocked' || status === 'waiting'
      ? `Detail for ${status}: https://example.com/a/very/long/address/that/must/wrap`
      : undefined,
}));

const search: ToolActivityItem[] = [
  {
    id: 'web',
    label: 'Searched the web',
    status: 'completed',
    visual: icon,
    query: 'UK services inflation September 2026',
    urls: [
      'https://www.ons.gov.uk/a',
      'https://www.bankofengland.co.uk/b',
      'https://www.ft.com/c',
      'https://www.bbc.co.uk/d',
      'https://www.reuters.com/markets/e',
    ],
    failedUrls: ['https://example.com/down'],
    sources: [{ url: 'https://www.ons.gov.uk/a', title: 'ONS inflation' }],
  },
  { id: 'read', label: 'Read the brief', status: 'completed', visual: icon },
];

const trigger = () => document.querySelector<HTMLElement>('.sprout-tool-activity-trigger')!;

describe('ToolActivity in a real browser', () => {
  it('opens while pending, toggles by keyboard with a focus ring, and hides the list', async () => {
    await render(<ToolActivity items={everyStatus} />);
    const button = page.getByRole('button', {
      name: 'Using 8 tools · 3 need attention',
    });
    await expect.element(button).toHaveAttribute('aria-expanded', 'true');
    await expect.element(page.getByRole('list', { name: 'Tool activity' })).toBeVisible();
    expect(document.querySelector('[data-status="failed"] [data-slot="tool-detail"]')).toHaveAttribute(
      'data-tone',
      'danger',
    );
    await userEvent.tab();
    await expect.element(button).toHaveFocus();
    expect(getComputedStyle(trigger()).outlineStyle).toBe('solid');
    await userEvent.keyboard('{Enter}');
    await expect.element(button).toHaveAttribute('aria-expanded', 'false');
    expect(document.querySelector('ol[aria-label="Tool activity"]')).toBeNull();
    await userEvent.keyboard(' ');
    await expect.element(button).toHaveAttribute('aria-expanded', 'true');
  });

  it('colors failed and blocked details red and keeps waiting muted', async () => {
    await emulate({ reducedMotion: true });
    await render(<ToolActivity items={everyStatus} />);
    const color = (status: string) =>
      getComputedStyle(document.querySelector(`[data-status="${status}"] [data-slot="tool-detail"]`)!).color;
    expect(color('failed')).toBe(color('blocked'));
    expect(color('waiting')).not.toBe(color('failed'));
  });

  it('loads favicons, expands sources, and flags pages that failed', async () => {
    await render(
      <ToolActivity
        items={search}
        variant="transcript"
        sourceIcon={url => (url.includes('bbc') ? '/missing.png' : pixel)}
      />,
    );
    await page.getByRole('button', { name: 'Tool activity · 2 tools' }).click();
    const sources = page.getByRole('list', { name: 'Web sources' });
    await expect.element(sources).toBeVisible();
    expect(sources.getByRole('link').elements()).toHaveLength(4);
    expect(sources.getByRole('link').elements()[0]).toHaveAttribute('target', '_blank');
    await expect
      .poll(() => document.querySelectorAll('[data-slot="source-favicon"][data-status="loaded"]').length)
      .toBe(3);
    await expect
      .poll(() => document.querySelectorAll('[data-slot="source-favicon"][data-status="failed"]').length)
      .toBe(1);
    await page.getByRole('button', { name: '2 more' }).click();
    expect(sources.getByRole('link').elements()).toHaveLength(6);
    expect(document.querySelector('[data-failed="true"]')!.textContent).toContain('Page unavailable');
    await page.getByRole('button', { name: 'Show fewer sources' }).click();
    expect(sources.getByRole('link').elements()).toHaveLength(4);
  });

  it('the stepper follows the newest row inside a 40% panel and shades once scrolled', async () => {
    function Stepper() {
      const [items, setItems] = useState<ToolActivityItem[]>(
        Array.from({ length: 4 }, (_, i) => ({
          id: `s${3 - i}`,
          label: `Step ${3 - i}`,
          status: 'completed',
          visual: icon,
        })),
      );
      return (
        <div style={{ height: 400, display: 'flex', flexDirection: 'column' }}>
          <button
            type="button"
            onClick={() =>
              setItems(list => [
                {
                  id: `s${list.length}`,
                  label: `Step ${list.length}`,
                  status: 'running',
                  visual: icon,
                },
                ...list,
              ])
            }
          >
            Add step
          </button>
          <ActivityPanel working activityLabel="Sharing the draft" hasResult>
            <ToolActivity items={items} variant="stepper" active />
          </ActivityPanel>
          <p style={{ flex: 1 }}>Result</p>
        </div>
      );
    }
    await render(<Stepper />);
    const panel = document.querySelector<HTMLElement>('[data-slot="activity-panel"]')!;
    const viewport = document.querySelector<HTMLElement>('[data-slot="activity-viewport"]')!;
    for (let i = 0; i < 6; i++) await page.getByRole('button', { name: 'Add step' }).click();
    expect(panel.getBoundingClientRect().height).toBeLessThanOrEqual(160.5);
    expect(viewport.scrollHeight).toBeGreaterThan(viewport.clientHeight);
    await expect.poll(() => viewport.scrollHeight - viewport.clientHeight - viewport.scrollTop).toBeLessThan(2);
    const ids = [...document.querySelectorAll('[data-tool-id]')].map(row => row.getAttribute('data-tool-id'));
    expect(ids.at(-1)).toBe('s9');
    expect(ids[0]).toBe('s0');
    viewport.scrollTop = 0;
    await expect.poll(() => panel.querySelector('[data-scrolled]')).toBeNull();
    viewport.scrollTop = 10;
    await expect.poll(() => panel.querySelector('[data-scrolled]')).not.toBeNull();
    await settle();
    expect(getComputedStyle(panel.querySelector('.sprout-activity-panel-frame')!, '::before').opacity).toBe('1');
    viewport.focus();
    await expect.element(page.elementLocator(viewport)).toHaveFocus();
    expect(getComputedStyle(panel).borderBottomWidth).toBe('1px');
  });

  it('rows wrap long labels and details inside a phone width', async () => {
    await page.viewport(320, 800);
    await render(<ToolActivity items={everyStatus} />);
    for (const row of document.querySelectorAll('.sprout-tool-activity-row'))
      expect(row.scrollWidth).toBeLessThanOrEqual(row.clientWidth + 1);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(320);
  });

  it('keeps marks on the first line of a wrapped label', async () => {
    await page.viewport(320, 800);
    await render(<ToolActivity items={everyStatus} />);
    for (const head of document.querySelectorAll('.sprout-tool-activity-head')) {
      const mark = head.querySelector('.sprout-tool-activity-mark')!.getBoundingClientRect();
      const label = head.querySelector('.sprout-tool-activity-label')!.getBoundingClientRect();
      expect(label.height).toBeGreaterThan(30);
      expect(Math.abs(mark.top - label.top)).toBeLessThanOrEqual(1);
    }
  });

  it('fades rows in and spins the running mark, and stops under reduced motion', async () => {
    await render(<ToolActivity items={everyStatus} />);
    const row = document.querySelector('.sprout-tool-activity-row')!;
    expect(getComputedStyle(row).animationName).toBe('sprout-tool-activity-in');
    expect(getComputedStyle(trigger()).transitionDuration).toMatch(/^0\.12s/);
    await emulate({ reducedMotion: true });
    expect(getComputedStyle(row).animationName).toBe('none');
    expect(getComputedStyle(trigger()).transitionDuration).toBe('0s');
  });

  it.each(themes)('%s %s passes axe', async (theme, mode) => {
    setTheme(theme, mode);
    const screen = await render(
      <>
        <ToolActivity items={everyStatus} />
        <ToolActivity items={search} variant="transcript" />
        <ActivityPanel working={false}>
          <ToolActivity items={search} variant="stepper" />
        </ActivityPanel>
      </>,
    );
    await settle();
    expect(await axeViolations(screen.container)).toEqual([]);
  });
});
