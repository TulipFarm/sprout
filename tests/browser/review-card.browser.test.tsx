import { describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { Button } from '../../packages/sprout/src/components/button.js';
import {
  ReviewCard,
  ReviewRow,
  ReviewRows,
  ReviewSteps,
  ReviewValues,
} from '../../packages/sprout/src/components/review-card.js';
import { axeViolations, setTheme, settle, themes } from './support.js';

const Table = () => (
  <svg viewBox="0 0 16 16" aria-hidden="true">
    <rect x="2" y="2" width="12" height="12" fill="none" stroke="currentColor" />
  </svg>
);

function Card({ settled = false }: { settled?: boolean }) {
  return (
    <div style={{ padding: 16, maxWidth: 560 }}>
      <ReviewCard
        icon={<Table />}
        title="Update a row in Supplier deliveries with a very long table name"
        label="Review row change"
        badge={{ label: 'Needs review', variant: 'warning' }}
        settled={settled}
        status={<p>Approving changes the row right away.</p>}
        actions={
          <>
            <Button>Approve change</Button>
            <Button variant="outline">Decline</Button>
          </>
        }
      >
        <ReviewRows>
          <ReviewRow label="Table">Supplier deliveries</ReviewRow>
          <ReviewRow label="Status">
            <span>Delivered</span>
            <s>Pending</s>
          </ReviewRow>
        </ReviewRows>
        <ReviewSteps
          title="2 steps"
          steps={[
            { summary: 'Send a webhook' },
            {
              summary: 'Write the row',
              detail: (
                <ReviewValues
                  values={[
                    { name: 'Authorization', value: 'Bearer •••••' },
                    {
                      name: 'X-Request-Id',
                      value: '4c1f9e0b-7d0e-4f5e-9b9a-0a2f5c0d6e11-long-value',
                    },
                  ]}
                />
              ),
            },
          ]}
        />
      </ReviewCard>
    </div>
  );
}

const fits = (node: Element) => node.scrollWidth <= node.clientWidth + 1;

describe('ReviewCard in a real browser', () => {
  it.each(themes)('%s %s passes axe', async (theme, mode) => {
    setTheme(theme, mode);
    const screen = await render(<Card />);
    await settle();
    expect(await axeViolations(screen.container)).toEqual([]);
  });

  it('header keeps its geometry and truncates the title', async () => {
    const screen = await render(<Card />);
    await settle();
    const card = screen.container.querySelector('[data-slot="review-card"]')!;
    const header = card.querySelector('.sprout-review-card-header')!;
    expect(header.getBoundingClientRect().height).toBeGreaterThanOrEqual(48);
    const icon = card.querySelector('.sprout-review-card-icon')!;
    expect(icon.getBoundingClientRect().width).toBe(28);
    const trigger = card.querySelector('.sprout-review-card-trigger') as HTMLElement;
    expect(getComputedStyle(trigger).textOverflow).toBe('ellipsis');
    for (const node of [card, header, card.querySelector('.sprout-review-card-badge')!]) expect(fits(node)).toBe(true);
  });

  it('header toggles by keyboard and pointer, hiding actions when folded', async () => {
    const screen = await render(<Card />);
    const card = screen.getByRole('region', { name: 'Review row change' });
    const trigger = screen.getByRole('button', { name: /Supplier deliveries/ });
    await expect.element(trigger).toHaveAttribute('aria-expanded', 'true');
    await userEvent.tab();
    await expect.element(trigger).toHaveFocus();
    const header = card.element().querySelector('.sprout-review-card-header')!;
    expect(getComputedStyle(header).outlineStyle).toBe('solid');
    await userEvent.keyboard('{Enter}');
    await expect.element(trigger).toHaveAttribute('aria-expanded', 'false');
    await expect.element(card).not.toHaveAttribute('data-open');
    await expect.element(screen.getByRole('button', { name: 'Approve change' })).not.toBeInTheDocument();
    await expect.element(screen.getByText('Supplier deliveries', { exact: true })).not.toBeInTheDocument();
    await userEvent.keyboard(' ');
    await expect.element(trigger).toHaveAttribute('aria-expanded', 'true');
    // The trigger's overlay covers the whole header, badge included.
    const badge = card.element().querySelector('.sprout-review-card-badge')!;
    const { x, y, width, height } = badge.getBoundingClientRect();
    expect(document.elementFromPoint(x + width / 2, y + height / 2)).toBe(trigger.element());
    await userEvent.click(badge, { force: true });
    await expect.element(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('settled cards start folded and open on demand', async () => {
    const screen = await render(<Card settled />);
    const trigger = screen.getByRole('button', { name: /Supplier deliveries/ });
    await expect.element(trigger).toHaveAttribute('aria-expanded', 'false');
    await expect.element(screen.getByText('Approving changes the row right away.')).toBeVisible();
    await trigger.click();
    await expect.element(trigger).toHaveAttribute('aria-expanded', 'true');
    await expect.element(screen.getByText('Send a webhook')).toBeVisible();
  });

  it('does not overflow a 390px viewport', async () => {
    await page.viewport(390, 900);
    const screen = await render(<Card />);
    await settle();
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
    for (const node of screen.container.querySelectorAll(
      '[data-slot="review-card"], .sprout-review-card-header, [data-slot="review-values"]',
    ))
      expect(fits(node)).toBe(true);
  });
});
