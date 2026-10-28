import { describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { Button } from '../../packages/sprout/src/components/button.js';
import { PlanOutline, type PlanOutlineTask } from '../../packages/sprout/src/components/plan-outline.js';
import { axeViolations, emulate, setTheme, settle, themes } from './support.js';

const tasks: PlanOutlineTask[] = [
  { id: 'measure', title: 'Measure the bed', mark: 'done', label: 'Verified' },
  {
    id: 'patch',
    title: 'Choose a sunny patch',
    mark: 'pending',
    label: 'Not started',
    brief: 'Find six hours of sun.',
  },
  {
    id: 'soil',
    title: 'Prepare the soil',
    mark: 'running',
    label: 'Working',
    assignee: 'Alex Meadow',
    brief: 'Turn over the bed and add compost.',
    criteria: ['Soil is loose to 20 cm.'],
    dependencies: [{ id: 'patch', title: 'Choose a sunny patch', label: 'Not started' }],
  },
  {
    id: 'colors',
    title: 'Pick bulb colors',
    mark: 'attention',
    label: 'Needs your answer',
    action: <Button size="sm">Answer in task</Button>,
  },
  {
    id: 'prices',
    title: 'Set prices',
    mark: 'blocked',
    label: 'Blocked',
    reason: 'Supplier stock was not confirmed.',
  },
  {
    id: 'stock',
    title: 'Confirm supplier stock',
    mark: 'failed',
    label: 'Failed',
    reason: 'Two suppliers did not reply.',
  },
  {
    id: 'flyers',
    title: 'Print flyers',
    mark: 'cancelled',
    label: 'Cancelled',
  },
];

const nested: PlanOutlineTask[] = [
  {
    id: 'fix',
    title: 'Fix the order',
    mark: 'running',
    label: 'Working',
    children: [
      {
        id: 'email',
        title: 'Email the customer',
        mark: 'pending',
        label: 'Not started',
        dependencies: [{ id: 'ship', title: 'Book next-day shipping', label: 'Not started' }],
      },
    ],
  },
  {
    id: 'replace',
    title: 'Send replacements',
    mark: 'pending',
    label: 'Not started',
    children: [
      {
        id: 'ship',
        title: 'Book next-day shipping',
        mark: 'pending',
        label: 'Not started',
      },
    ],
  },
  {
    id: 'later',
    title: 'Follow up',
    mark: 'pending',
    label: 'Not started',
    children: [],
  },
];

function Plan({ items = tasks, title = 'Meadow garden plan' }: { items?: PlanOutlineTask[]; title?: string }) {
  return (
    <div data-testid="card" style={{ padding: 16, maxWidth: 640 }}>
      <PlanOutline
        title={title}
        brief="Plant a spring bed by the shed."
        status="Running"
        tone="active"
        progress="1 of 6 done · 1 working"
        tasks={items}
      />
    </div>
  );
}

const row = (name: string | RegExp) => page.getByRole('button', { name });

function colorOf(token: string) {
  const probe = document.createElement('span');
  probe.style.color = `var(${token})`;
  document.body.append(probe);
  const value = getComputedStyle(probe).color;
  probe.remove();
  return value;
}

function panelOf(trigger: Element) {
  return document.getElementById(trigger.getAttribute('aria-controls')!)!;
}

describe('PlanOutline in a real browser', () => {
  it('exposes resource types separately from pending and completed status without affecting untyped rows', async () => {
    await render(
      <Plan
        items={[
          {
            id: 'pending',
            title: 'Create records',
            mark: 'pending',
            label: 'Not started',
            brief: 'Prepare records.',
            typeIcon: { icon: <svg />, label: 'Table' },
          },
          {
            id: 'done',
            title: 'Save records',
            mark: 'done',
            label: 'Verified',
            typeIcon: { icon: <svg />, label: 'Table' },
          },
          { id: 'plain', title: 'Read back', mark: 'pending', label: 'Not started' },
        ]}
      />,
    );
    await expect.element(page.getByRole('button', { name: 'Table Create records Not started' })).toBeVisible();
    expect(page.getByRole('img', { name: 'Table', exact: true }).elements()).toHaveLength(2);
    const rows = [...document.querySelectorAll('[data-slot="plan-outline-task"]')];
    expect(rows.map(row => row.getAttribute('data-mark'))).toEqual(['pending', 'done', 'pending']);
    expect(rows[1]?.textContent).toContain('Verified');
    expect(rows[2]?.querySelector('[data-slot="plan-outline-type-icon"]')).toBeNull();
    expect(rows.every(row => row.querySelector('.sprout-plan-outline-mark'))).toBe(true);
  });

  it('marks and rail segments use their status tokens; cancelled is struck and skipped', async () => {
    const screen = await render(<Plan />);
    const plan = screen.container;
    const icon = (mark: string) =>
      getComputedStyle(plan.querySelector(`[data-mark="${mark}"] .sprout-plan-outline-mark`)!).color;
    const segment = (mark: string) =>
      getComputedStyle(plan.querySelector(`.sprout-plan-outline-segment[data-mark="${mark}"]`)!).backgroundColor;
    for (const [mark, token] of [
      ['running', '--sprout-info'],
      ['attention', '--sprout-warning'],
      ['done', '--sprout-success'],
      ['failed', '--sprout-danger'],
    ] as const) {
      expect(icon(mark), mark).toBe(colorOf(token));
      expect(segment(mark), mark).toBe(colorOf(token));
    }
    expect(icon('pending')).toBe(colorOf('--sprout-muted'));
    expect(plan.querySelectorAll('.sprout-plan-outline-segment')).toHaveLength(6);
    const flyers = plan.querySelector('[data-mark="cancelled"] .sprout-plan-outline-task-title')!;
    expect(getComputedStyle(flyers).textDecorationLine).toBe('line-through');
  });

  it('a failed reason is red and a blocked reason is not', async () => {
    await render(<Plan />);
    await row(/Confirm supplier stock/).click();
    await row(/Set prices/).click();
    const failed = page.getByText('Two suppliers did not reply.');
    const blocked = page.getByText('Supplier stock was not confirmed.');
    await expect.element(failed).toBeVisible();
    await expect.element(blocked).toBeVisible();
    expect(getComputedStyle(failed.element()).color).toBe(colorOf('--sprout-danger'));
    expect(getComputedStyle(blocked.element()).color).not.toBe(colorOf('--sprout-danger'));
  });

  it('keyboard opens rows, follows dependencies, and reaches actions', async () => {
    await page.viewport(1280, 400);
    await render(
      <>
        <Plan />
        <div style={{ height: 800 }} />
      </>,
    );
    const soil = row(/Prepare the soil/);
    (soil.element() as HTMLElement).focus();
    await expect.element(soil).toHaveAttribute('aria-expanded', 'false');
    await userEvent.keyboard('{Enter}');
    await expect.element(soil).toHaveAttribute('aria-expanded', 'true');
    const panel = page.elementLocator(panelOf(soil.element()));
    await expect.element(panel.getByText('Done when')).toBeVisible();
    await expect.element(panel.getByText('Starts after')).toBeVisible();
    await userEvent.tab();
    const link = page.getByRole('link', { name: 'Choose a sunny patch' });
    await expect.element(link).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    const target = document.querySelector<HTMLElement>('[data-slot="plan-outline-task"][id$="-task-patch"]')!;
    await expect.element(page.elementLocator(target)).toHaveFocus();
    await expect.element(page.elementLocator(target)).toBeInViewport();

    (soil.element() as HTMLElement).focus();
    await userEvent.keyboard(' ');
    await expect.element(soil).toHaveAttribute('aria-expanded', 'false');

    (row(/Pick bulb colors/).element() as HTMLElement).focus();
    await userEvent.keyboard('{Enter}');
    await userEvent.tab();
    await expect.element(page.getByRole('button', { name: 'Answer in task' })).toHaveFocus();
    await expect.element(row(/Measure the bed/)).not.toBeInTheDocument();
  });

  it('groups collapse, and a link to a task in a closed group opens it', async () => {
    await render(<Plan items={nested} title="Order fix" />);
    await expect.element(page.getByText('This group has no tasks yet.')).toBeVisible();
    const replace = row(/^Send replacements/);
    await expect.element(replace).toHaveAttribute('aria-expanded', 'true');
    await replace.click();
    await expect.element(replace).toHaveAttribute('aria-expanded', 'false');
    await expect
      .poll(() => document.querySelector('[aria-label="Send replacements tasks"]')!.checkVisibility())
      .toBe(false);
    await row(/Email the customer/).click();
    await page.getByRole('link', { name: 'Book next-day shipping' }).click();
    await expect.element(replace).toHaveAttribute('aria-expanded', 'true');
    const shipping = document.querySelector<HTMLElement>('[data-slot="plan-outline-task"][id$="-task-ship"]')!;
    await expect.element(page.elementLocator(shipping)).toBeVisible();
    await expect.element(page.elementLocator(shipping)).toHaveFocus();
    history.replaceState(null, '', location.pathname + location.search);
  });

  it('rows bleed into the card padding without overflowing on a phone', async () => {
    await page.viewport(390, 800);
    const screen = await render(
      <Plan
        items={[
          ...tasks,
          {
            id: 'long',
            title: 'Write_product_descriptions_for_every_variety_in_the_spring_catalog',
            mark: 'pending',
            label: 'Not started',
            brief: 'https://example.com/a/very/long/link/that/should/wrap/inside/the/detail/panel',
          },
        ]}
      />,
    );
    for (const trigger of screen.container.querySelectorAll<HTMLElement>('button[aria-expanded="false"]'))
      trigger.click();
    await settle();
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
    const outline = screen.container.querySelector('[data-slot="plan-outline"]')!;
    expect(outline.scrollWidth).toBeLessThanOrEqual(outline.clientWidth + 9);
    const card = screen.getByTestId('card').element().getBoundingClientRect();
    const rect = outline.getBoundingClientRect();
    expect(rect.left - card.left).toBeGreaterThanOrEqual(8);
    expect(card.right - rect.right).toBeGreaterThanOrEqual(8);
    for (const label of outline.querySelectorAll('.sprout-plan-outline-label'))
      expect(label.getBoundingClientRect().right).toBeLessThanOrEqual(rect.right + 1);
  });

  it('rows animate open with a turning chevron, and reduced motion stops it', async () => {
    await render(<Plan />);
    const soil = row(/Prepare the soil/);
    const chevron = soil.element().querySelector('.sprout-plan-outline-chevron')!;
    expect(getComputedStyle(chevron).transitionDuration).toBe('0.12s');
    await soil.click();
    const panel = panelOf(soil.element());
    expect(getComputedStyle(panel).transitionDuration).toBe('0.18s, 0.12s');
    await settle();
    expect(getComputedStyle(chevron).transform).not.toBe('none');
    const spinner = document.querySelector('.sprout-plan-outline-mark .sprout-spinner')!;
    expect(getComputedStyle(spinner).animationName).not.toBe('none');

    await emulate({ reducedMotion: true });
    expect(getComputedStyle(chevron).transitionDuration).toBe('0s');
    expect(getComputedStyle(panel).transitionDuration).toBe('0s');
    expect(getComputedStyle(spinner).animationName).toBe('none');
  });

  it.each(themes)('%s %s passes axe', async (theme, mode) => {
    setTheme(theme, mode);
    await emulate({ reducedMotion: true });
    const screen = await render(<Plan />);
    await row(/Prepare the soil/).click();
    await settle();
    expect(await axeViolations(screen.container)).toEqual([]);
  });
});
