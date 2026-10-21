import { describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  type TabsListVariant,
} from '../../packages/sprout/src/components/tabs.js';
import { axeViolations, emulate, setTheme, settle, themes } from './support.js';

function Project({
  variant = 'default',
  orientation = 'horizontal',
  name = 'Project',
}: {
  variant?: TabsListVariant;
  orientation?: 'horizontal' | 'vertical';
  name?: string;
}) {
  return (
    <Tabs defaultValue="overview" orientation={orientation}>
      <TabsList variant={variant} aria-label={name}>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="tasks">Tasks</TabsTrigger>
        <TabsTrigger value="disabled" disabled>
          Disabled
        </TabsTrigger>
      </TabsList>
      <TabsContent value="overview">Project summary.</TabsContent>
      <TabsContent value="tasks">Three sample tasks.</TabsContent>
      <TabsContent value="disabled">Unavailable.</TabsContent>
    </Tabs>
  );
}

const variants: TabsListVariant[] = ['default', 'line', 'steps'];

function Gallery() {
  return (
    <div style={{ display: 'grid', gap: 24, padding: 16 }}>
      {variants.map(variant => (
        <Project key={variant} variant={variant} name={`${variant} tabs`} />
      ))}
    </div>
  );
}

const primary = {
  'neutral light': 'rgb(38, 38, 38)',
  'neutral dark': 'rgb(237, 237, 237)',
  'tulipfarm light': 'rgb(24, 128, 56)',
  'tulipfarm dark': 'rgb(117, 206, 142)',
};

const list = (name = 'Project') => page.getByRole('tablist', { name });
const tab = (name: string, scope = list()) => scope.getByRole('tab', { name });

describe('Tabs in a real browser', () => {
  it.each(themes)('%s %s passes axe and tints the active step', async (theme, mode) => {
    setTheme(theme, mode);
    const screen = await render(<Gallery />);
    await settle();
    expect(await axeViolations(screen.container)).toEqual([]);
    const step = tab('Overview', list('steps tabs')).element();
    expect(getComputedStyle(step).color).toBe(primary[`${theme} ${mode}`]);
    expect(getComputedStyle(step, '::after').backgroundColor).toBe(primary[`${theme} ${mode}`]);
  });

  for (const variant of variants)
    for (const orientation of ['horizontal', 'vertical'] as const)
      it(`${variant} ${orientation} marks the active tab and ignores the disabled one`, async () => {
        await render(<Project variant={variant} orientation={orientation} />);
        await expect.element(list()).toHaveAttribute('data-orientation', orientation);
        if (orientation === 'vertical') await expect.element(list()).toHaveAttribute('aria-orientation', 'vertical');
        else expect(list().element().hasAttribute('aria-orientation')).toBe(false);
        const active = tab('Overview');
        await expect.element(active).toHaveAttribute('aria-selected', 'true');
        await settle();
        expect(getComputedStyle(active.element(), '::after').opacity).toBe(variant === 'default' ? '0' : '1');
        if (variant === 'default')
          expect(getComputedStyle(active.element()).backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
        const disabled = tab('Disabled');
        await expect.element(disabled).toHaveAttribute('data-disabled', '');
        expect(getComputedStyle(disabled.element()).opacity).toBe('0.5');
        await disabled.click({ force: true });
        await expect.element(active).toHaveAttribute('aria-selected', 'true');
      });

  it('every list variant is --sprout-control-height tall', async () => {
    await render(<Gallery />);
    const heights = () =>
      variants.map(
        name =>
          page
            .getByRole('tablist', { name: `${name} tabs` })
            .element()
            .getBoundingClientRect().height,
      );
    const trigger = () => page.getByRole('tab', { name: 'Overview' }).first().element().getBoundingClientRect().height;
    expect(heights()).toEqual([32, 32, 32]);
    expect(trigger()).toBe(26);
    document.documentElement.style.setProperty('--sprout-control-height', '40px');
    try {
      expect(heights()).toEqual([40, 40, 40]);
    } finally {
      document.documentElement.style.removeProperty('--sprout-control-height');
    }
  });

  it('keyboard moves between tabs, skips selecting disabled ones, and reaches the panel', async () => {
    await render(
      <>
        <button>Before</button>
        <Project />
      </>,
    );
    (page.getByRole('button', { name: 'Before' }).element() as HTMLElement).focus();
    const overview = tab('Overview');
    const tasks = tab('Tasks');
    const disabled = tab('Disabled');
    await userEvent.tab();
    await expect.element(overview).toHaveFocus();
    expect(getComputedStyle(overview.element()).outlineStyle).toBe('solid');
    await userEvent.keyboard('{ArrowRight}');
    await expect.element(tasks).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    await expect.element(tasks).toHaveAttribute('aria-selected', 'true');
    await expect.element(page.getByRole('tabpanel', { name: 'Tasks' })).toHaveTextContent('Three sample tasks.');
    await userEvent.keyboard('{ArrowRight}');
    await expect.element(disabled).toHaveFocus();
    await expect.element(disabled).toHaveAttribute('aria-disabled', 'true');
    await userEvent.keyboard('{Enter}');
    await expect.element(tasks).toHaveAttribute('aria-selected', 'true');
    await userEvent.keyboard('{ArrowRight}');
    await expect.element(overview).toHaveFocus();
    await userEvent.keyboard('{End}');
    await expect.element(disabled).toHaveFocus();
    await userEvent.keyboard('{Home}');
    await expect.element(overview).toHaveFocus();
    await userEvent.keyboard(' ');
    await expect.element(overview).toHaveAttribute('aria-selected', 'true');
    await userEvent.tab();
    await expect.element(page.getByRole('tabpanel', { name: 'Overview' })).toHaveFocus();
  });

  it('vertical lists move with ArrowDown and ArrowUp', async () => {
    await render(<Project orientation="vertical" />);
    (tab('Overview').element() as HTMLElement).focus();
    await userEvent.keyboard('{ArrowDown}');
    await expect.element(tab('Tasks')).toHaveFocus();
    await userEvent.keyboard('{ArrowUp}');
    await expect.element(tab('Overview')).toHaveFocus();
  });

  it('long lists scroll in their wrapper at 390px without clipping labels', async () => {
    await page.viewport(390, 800);
    const sections = ['Overview', 'Instructions', 'Access', 'Execution', 'Slack', 'Triggers', 'Settings'];
    const screen = await render(
      <div style={{ padding: 16 }}>
        <Gallery />
        <Tabs defaultValue="Overview">
          <div data-testid="scroller" style={{ overflowX: 'auto' }}>
            <TabsList variant="line" aria-label="Agent sections">
              {sections.map(name => (
                <TabsTrigger key={name} value={name}>
                  {name}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
        </Tabs>
      </div>,
    );
    await settle();
    const scroller = screen.getByTestId('scroller').element();
    expect(scroller.scrollWidth).toBeGreaterThan(scroller.clientWidth);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
    for (const trigger of document.querySelectorAll<HTMLElement>('[data-slot="tabs-trigger"]'))
      expect(trigger.scrollWidth).toBeLessThanOrEqual(trigger.clientWidth + 1);
  });

  it('colors ease over 0.12s and the underline over 0.18s, and not under reduced motion', async () => {
    await render(<Project variant="line" />);
    const trigger = tab('Overview').element();
    expect(getComputedStyle(trigger).transitionDuration).toMatch(/^0\.12s/);
    expect(getComputedStyle(trigger, '::after').transitionDuration).toBe('0.18s');
    await emulate({ reducedMotion: true });
    expect(getComputedStyle(trigger).transitionDuration).toBe('0s');
    expect(getComputedStyle(trigger, '::after').transitionDuration).toBe('0s');
  });
});
