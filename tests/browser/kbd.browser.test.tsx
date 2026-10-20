import { describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { Button } from '../../packages/sprout/src/components/button.js';
import { Kbd, KbdGroup } from '../../packages/sprout/src/components/kbd.js';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../../packages/sprout/src/components/tooltip.js';
import { axeViolations, emulate, setTheme, settle, themes } from './support.js';

const Arrow = () => (
  <svg viewBox="0 0 16 16" aria-hidden="true">
    <path d="M8 2v12M3 9l5 5 5-5" stroke="currentColor" fill="none" />
  </svg>
);

function Keys() {
  return (
    <div style={{ display: 'grid', gap: 12, padding: 16, maxWidth: 360 }}>
      <div data-testid="default" style={{ display: 'flex', gap: 8 }}>
        <Kbd>⌘</Kbd>
        <Kbd>/</Kbd>
        <Kbd>Enter</Kbd>
      </div>
      <div data-testid="outline" style={{ display: 'flex', gap: 8 }}>
        <Kbd variant="outline">↑↓</Kbd>
        <Kbd variant="outline">Esc</Kbd>
      </div>
      <KbdGroup data-testid="group">
        <Kbd>
          <Arrow />
        </Kbd>
        <Kbd>K</Kbd>
      </KbdGroup>
      <p>
        Press <Kbd>Esc</Kbd> to close.
      </p>
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

const keyIn = (screen: { container: HTMLElement }, id: string) =>
  screen.container.querySelector(`[data-testid="${id}"] kbd`)!;

describe('Kbd in a real browser', () => {
  it.each(themes)('%s %s passes axe and paints its tokens', async (theme, mode) => {
    setTheme(theme, mode);
    const screen = await render(<Keys />);
    await settle();
    const plain = getComputedStyle(keyIn(screen, 'default'));
    const outline = getComputedStyle(keyIn(screen, 'outline'));
    expect(plain.backgroundColor).toBe(colorOf('--sprout-secondary'));
    expect(outline.backgroundColor).toBe(colorOf('--sprout-surface'));
    expect(outline.borderTopColor).toBe(colorOf('--sprout-line'));
    for (const key of screen.container.querySelectorAll('kbd'))
      expect(key.scrollWidth).toBeLessThanOrEqual(key.clientWidth);
    expect(await axeViolations(screen.container)).toEqual([]);
  });

  it('keys keep compact geometry for symbols, words, and icons', async () => {
    const screen = await render(<Keys />);
    await settle();
    const box = (text: string) => screen.getByText(text, { exact: true }).element().getBoundingClientRect();
    const symbol = box('⌘');
    expect(Math.round(symbol.height)).toBe(20);
    expect(symbol.width).toBeGreaterThanOrEqual(20);
    expect(symbol.width).toBeLessThanOrEqual(22);
    expect(Math.round(box('/').width)).toBe(20);
    expect(Math.round(box('Enter').height)).toBe(20);
    expect(box('Enter').width).toBeGreaterThan(20);
    const css = getComputedStyle(keyIn(screen, 'default'));
    expect(css.pointerEvents).toBe('none');
    expect(css.userSelect).toBe('none');
    expect(css.fontSize).toBe('12px');

    const group = screen.getByTestId('group').element();
    const icon = getComputedStyle(group.querySelector('svg')!);
    expect([icon.width, icon.height]).toEqual(['12px', '12px']);
    const [first, second] = [...group.querySelectorAll('[data-slot="kbd"]')].map(key => key.getBoundingClientRect());
    expect(Math.round(second.x - first.right)).toBe(4);
    expect(getComputedStyle(screen.container.querySelector('p kbd')!).display).toBe('inline-flex');
  });

  it('keys inside a tooltip keep their fill', async () => {
    const screen = await render(
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger render={<Button variant="outline" aria-label="Search" />}>S</TooltipTrigger>
          <TooltipContent>
            Search
            <KbdGroup>
              <Kbd>⌘</Kbd>
              <Kbd>K</Kbd>
            </KbdGroup>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>,
    );
    await userEvent.tab();
    await expect.element(screen.getByRole('button', { name: 'Search' })).toHaveFocus();
    const tooltip = page.getByRole('tooltip');
    await expect.element(tooltip).toBeVisible();
    const keys = [...tooltip.element().querySelectorAll('[data-slot="kbd"]')];
    expect(keys.map(key => key.textContent)).toEqual(['⌘', 'K']);
    expect(getComputedStyle(keys[0]).backgroundColor).toBe(colorOf('--sprout-secondary'));
    await userEvent.keyboard('{Escape}');
    await expect.element(tooltip).not.toBeInTheDocument();
  });

  it('reduced motion removes the color transition', async () => {
    const screen = await render(<Keys />);
    const key = keyIn(screen, 'default');
    expect(getComputedStyle(key).transitionDuration).toMatch(/^0\.12s/);
    await emulate({ reducedMotion: true });
    expect(getComputedStyle(key).transitionDuration).toBe('0s');
  });

  it('does not overflow a 390px viewport', async () => {
    await page.viewport(390, 800);
    await render(<Keys />);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
  });
});
