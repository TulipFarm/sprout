import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-react';
import { page, userEvent } from 'vitest/browser';
import { ResultCard, type ResultApp, type ResultCardState } from '../../packages/sprout/src/components/result-card.js';
import { axeViolations, emulate, setTheme, settle, themes } from './support.js';

const apps: ResultApp[] = [
  {
    brand: 'slack',
    name: 'Slack',
    actions: [
      { label: 'Posted the weekly update', state: 'completed' },
      { label: 'Pinned the summary', state: 'unknown' },
    ],
  },
  {
    brand: 'google-slides',
    name: 'Google Slides',
    actions: [
      { label: 'Opened the deck', state: 'completed' },
      { label: 'Added the chart', state: 'completed' },
    ],
  },
  {
    brand: 'github',
    name: 'GitHub',
    actions: [{ label: 'Read open issues', state: 'completed' }],
  },
  {
    brand: 'gmail',
    name: 'Gmail',
    actions: [{ label: 'Drafted the email', state: 'pending' }],
  },
  { brand: 'jira', name: 'Jira', actions: [] },
];

const states: ResultCardState[] = ['default', 'loading', 'running', 'disabled', 'error', 'success'];

function Workflow({ width = 560, state = 'default' }: { width?: number; state?: ResultCardState }) {
  return (
    <div style={{ width, maxWidth: '100%' }}>
      <ResultCard
        title="Weekly team update"
        kind="Workflow"
        apps={apps}
        status={state === 'default' ? 'Ready' : state}
        state={state}
        action={{ label: 'View slides', onClick: () => undefined }}
      />
    </div>
  );
}

function Gallery() {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr)',
        gap: 12,
        padding: 16,
      }}
    >
      {states.map(state => (
        <div key={state} data-testid={state}>
          <Workflow state={state} />
        </div>
      ))}
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

const dialog = (name: string) => page.getByRole('dialog', { name });
const status = (state: ResultCardState) =>
  document.querySelector<HTMLElement>(`[data-testid="${state}"] [role=status]`)!;

describe('ResultCard in a real browser', () => {
  it.each(themes)('%s %s passes axe and tints success and error', async (theme, mode) => {
    setTheme(theme, mode);
    const screen = await render(<Gallery />);
    await settle();
    expect(await axeViolations(screen.container)).toEqual([]);
    expect(getComputedStyle(status('success')).color).toBe(colorOf('--sprout-success'));
    expect(getComputedStyle(status('error')).color).toBe(colorOf('--sprout-danger'));
    expect(getComputedStyle(status('default')).color).toBe(colorOf('--sprout-muted'));
    await screen.getByTestId('default').getByRole('button', { name: 'Slack actions' }).click();
    await expect.element(dialog('Slack actions')).toBeVisible();
    await settle();
    expect(await axeViolations()).toEqual([]);
  });

  for (const [width, beside] of [
    [560, true],
    [320, false],
  ] as const)
    it(`the action sits ${beside ? 'beside' : 'below'} the text in a ${width}px card`, async () => {
      const screen = await render(<Workflow width={width} />);
      const title = screen.getByRole('heading', { level: 3 }).element();
      const action = screen.getByRole('button', { name: 'View slides' });
      const titleBox = title.getBoundingClientRect();
      const actionBox = action.element().getBoundingClientRect();
      if (beside) expect(actionBox.top).toBeLessThan(titleBox.bottom);
      else expect(actionBox.top).toBeGreaterThanOrEqual(titleBox.bottom);
    });

  it('cards fit a 390px phone', async () => {
    await page.viewport(390, 800);
    const screen = await render(<Gallery />);
    await settle();
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
    for (const card of screen.container.querySelectorAll('[data-slot="result-card"]'))
      expect(card.scrollWidth).toBeLessThanOrEqual(card.clientWidth + 1);
  });

  it('app tiles open their actions by keyboard and return focus on Escape', async () => {
    const screen = await render(<Workflow />);
    const group = screen.getByRole('group', { name: 'Apps used' });
    expect(group.getByRole('button').elements()).toHaveLength(3);
    const slack = group.getByRole('button', { name: 'Slack actions' });
    (slack.element() as HTMLElement).focus();
    await userEvent.keyboard('{Enter}');
    await expect.poll(() => document.querySelector('[role=dialog]')?.textContent).toContain('Posted the weekly update');
    await expect.poll(() => dialog('Slack actions').element().contains(document.activeElement)).toBe(true);
    await userEvent.keyboard('{Escape}');
    await expect.poll(() => document.querySelector('[role=dialog]')).toBeNull();
    await expect.element(slack).toHaveFocus();

    await userEvent.tab();
    await userEvent.tab();
    const more = group.getByRole('button', { name: '3 more apps' });
    await expect.element(more).toHaveFocus();
    await expect.element(more).toHaveTextContent('+3');
    await userEvent.keyboard(' ');
    await expect.element(dialog('3 more apps')).toBeVisible();
    expect(dialog('3 more apps').element().querySelectorAll('h4')).toHaveLength(3);
    await userEvent.keyboard('{Escape}');
    await expect.element(more).toHaveFocus();
  });

  it('hovering a tile opens its actions without moving focus', async () => {
    const screen = await render(
      <>
        <button>Elsewhere</button>
        <Workflow />
      </>,
    );
    const elsewhere = screen.getByRole('button', { name: 'Elsewhere' });
    (elsewhere.element() as HTMLElement).focus();
    await screen.getByRole('button', { name: 'Google Slides actions' }).hover();
    const actions = dialog('Google Slides actions');
    await expect.element(actions).toBeVisible();
    expect(actions.element().querySelectorAll('[data-state="completed"]')).toHaveLength(2);
    await expect.element(elsewhere).toHaveFocus();
    await screen.getByRole('heading', { level: 3 }).hover();
    await expect.poll(() => document.querySelector('[role=dialog]')).toBeNull();
  });

  it('status color changes ease over 0.18s, and not under reduced motion', async () => {
    await render(<Gallery />);
    expect(getComputedStyle(status('success')).transitionDuration).toBe('0.18s');
    await emulate({ reducedMotion: true });
    expect(getComputedStyle(status('success')).transitionDuration).toBe('0s');
  });

  it('fine pointers keep the compact action', async () => {
    const screen = await render(<Workflow />);
    const action = screen.getByRole('button', { name: 'View slides' });
    expect(getComputedStyle(action.element()).height).not.toBe('44px');
  });
});
