import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { ReasoningEffort } from '../../packages/sprout/src/components/reasoning-effort.js';
import { axeViolations, emulate, setTheme, settle, themes } from './support.js';

const levels = ['Quick', 'Balanced', 'Thorough', 'Maximum'];

function Effort({
  initial = 1,
  options = levels,
  label,
}: {
  initial?: number;
  options?: readonly string[];
  label?: string;
}) {
  const [value, setValue] = useState(initial);
  return (
    <div style={{ padding: 48 }}>
      <ReasoningEffort levels={options} value={value} onValueChange={setValue} label={label} />
      <p role="status">Selected level: {options[value]}</p>
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

const part = (name: string) => document.querySelector<HTMLElement>(`[data-slot="reasoning-effort-${name}"]`)!;
const root = () => document.querySelector<HTMLElement>('[data-slot="reasoning-effort"]')!;
const opacity = (node: Element) => Number(getComputedStyle(node).opacity);

function pointer(type: string, clientX: number) {
  const track = part('track');
  const y = track.getBoundingClientRect().top + 16;
  track.dispatchEvent(
    new PointerEvent(type, {
      bubbles: true,
      button: 0,
      buttons: type === 'pointerup' ? 0 : 1,
      pointerId: 1,
      pointerType: 'mouse',
      isPrimary: true,
      clientX,
      clientY: y,
    }),
  );
}

describe('ReasoningEffort in a real browser', () => {
  it.each(themes)('%s %s paints fill, thumb and shell from tokens and passes axe', async (theme, mode) => {
    setTheme(theme, mode);
    const screen = await render(<Effort />);
    await settle();
    expect(getComputedStyle(part('fill')).backgroundColor).toBe(colorOf('--sprout-primary'));
    expect(getComputedStyle(part('thumb')).backgroundColor).toBe('rgb(255, 255, 255)');
    expect(getComputedStyle(part('shell')).stroke).toBe(colorOf('--sprout-line'));
    expect(await axeViolations(screen.container)).toEqual([]);
  });

  it('is a 256 by 52 control that fits a phone', async () => {
    await page.viewport(390, 700);
    await render(<Effort />);
    const box = root().getBoundingClientRect();
    expect(box.width).toBeCloseTo(256, 0);
    expect(box.height).toBeCloseTo(52, 0);
    expect(box.left).toBeGreaterThanOrEqual(0);
    expect(box.right).toBeLessThanOrEqual(390);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
  });

  it('keyboard moves one level, jumps to the ends, and shows a focus outline', async () => {
    const screen = await render(<Effort />);
    const slider = screen.getByRole('slider', { name: 'Reasoning effort' });
    const status = screen.getByRole('status');
    await expect.element(slider).toHaveAttribute('aria-valuetext', 'Balanced');
    await userEvent.tab();
    await expect.element(slider).toHaveFocus();
    const style = getComputedStyle(slider.element());
    expect(style.outlineStyle).toBe('solid');
    expect(style.outlineWidth).toBe('1px');
    await expect.poll(() => style.outlineColor).toBe(colorOf('--sprout-focus-ring'));
    await userEvent.keyboard('{ArrowRight}');
    await expect.element(status).toHaveTextContent('Selected level: Thorough');
    await expect.element(slider).toHaveAttribute('aria-valuenow', '2');
    await userEvent.keyboard('{ArrowUp}');
    await userEvent.keyboard('{ArrowRight}');
    await expect.element(status).toHaveTextContent('Selected level: Maximum');
    await userEvent.keyboard('{Home}');
    await userEvent.keyboard('{ArrowLeft}');
    await userEvent.keyboard('{ArrowDown}');
    await expect.element(slider).toHaveAttribute('aria-valuenow', '0');
    await userEvent.keyboard('{End}');
    await userEvent.keyboard('{ArrowDown}');
    await expect.element(status).toHaveTextContent('Selected level: Thorough');
    await userEvent.tab();
    await expect.element(slider).not.toHaveFocus();
  });

  it('dragging opens the bubble inside the track and snaps on release', async () => {
    const screen = await render(<Effort label="Sprout" />);
    const status = screen.getByRole('status');
    const track = part('track').getBoundingClientRect();
    const bubble = part('bubble');
    expect(opacity(bubble)).toBe(0);

    pointer('pointerdown', track.left + 16 + (224 / 3) * 1);
    await expect.poll(() => root().dataset.dragging).toBe('true');
    pointer('pointermove', track.left + track.width * 0.62);
    await expect.element(status).toHaveTextContent('Selected level: Thorough');
    await expect.poll(() => opacity(bubble)).toBeGreaterThan(0.98);
    expect(bubble.textContent).toBe('SproutThorough');
    expect(part('shell').getAttribute('d')).toContain('C');

    pointer('pointermove', track.right + 40);
    await expect.element(status).toHaveTextContent('Selected level: Maximum');
    await expect.poll(() => opacity(bubble)).toBeGreaterThan(0.98);
    expect(bubble.getBoundingClientRect().right).toBeLessThanOrEqual(track.right);

    pointer('pointermove', track.left + track.width * 0.4);
    pointer('pointerup', track.left + track.width * 0.4);
    await expect.poll(() => root().dataset.dragging).toBe('false');
    await expect.element(status).toHaveTextContent('Selected level: Balanced');
    await expect.poll(() => opacity(bubble)).toBe(0);
    await expect
      .poll(() => {
        const thumb = part('thumb').getBoundingClientRect();
        return Math.round(thumb.left + thumb.width / 2 - track.left);
      })
      .toBe(Math.round(16 + 224 / 3));
  });

  it('a real click on the track picks the nearest level', async () => {
    const screen = await render(<Effort />);
    await page.elementLocator(part('track')).click({ position: { x: 18, y: 16 } });
    await expect.element(screen.getByRole('status')).toHaveTextContent('Selected level: Quick');
  });

  it.each([
    [4, 'Maximum'],
    [3, 'Thorough'],
    [2, 'Balanced'],
    [1, 'Quick'],
  ])('%i levels spread ticks evenly', async (count, last) => {
    const options = levels.slice(0, count);
    const screen = await render(<Effort initial={0} options={options} />);
    const ticks = [...document.querySelectorAll<HTMLElement>('[data-slot="reasoning-effort-tick"]')];
    expect(ticks).toHaveLength(count);
    const xs = ticks.map(tick => tick.getBoundingClientRect().left);
    const gaps = xs.slice(1).map((x, index) => x - xs[index]!);
    for (const gap of gaps) expect(gap).toBeCloseTo(gaps[0]!, 0);
    const slider = screen.getByRole('slider');
    await expect.element(slider).toHaveAttribute('aria-valuemax', String(count - 1));
    (slider.element() as HTMLElement).focus();
    await userEvent.keyboard('{End}');
    await expect.element(slider).toHaveAttribute('aria-valuetext', last);
  });

  it('animates the bubble text, and jumps instead of tweening with reduced motion', async () => {
    await render(<Effort />);
    const text = () => document.querySelector('.sprout-reasoning-effort-bubble-text')!;
    expect(getComputedStyle(text()).animationName).toBe('sprout-reasoning-effort-level-in');
    await emulate({ reducedMotion: true });
    expect(getComputedStyle(text()).animationName).toBe('none');
  });

  it('with reduced motion the thumb lands on the end without a tween', async () => {
    await emulate({ reducedMotion: true });
    const screen = await render(<Effort />);
    (screen.getByRole('slider').element() as HTMLElement).focus();
    await userEvent.keyboard('{End}');
    await expect.element(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', '3');
    expect(parseFloat(part('thumb').style.left)).toBeCloseTo(256 - 2.4 - 27.2, 1);
  });
});
