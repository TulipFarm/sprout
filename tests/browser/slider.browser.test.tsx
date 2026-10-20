import { describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { Slider } from '../../packages/sprout/src/components/slider.js';
import { axeViolations, emulate, setTheme, settle, themes } from './support.js';

function Sliders() {
  return (
    <div style={{ display: 'flex', gap: 32, padding: 16, alignItems: 'start' }}>
      <div style={{ display: 'grid', gap: 24, width: 280 }}>
        <Slider data-testid="single" aria-label="Volume" defaultValue={40} />
        <Slider data-testid="range" aria-label="Range" defaultValue={[20, 75]} />
        <Slider data-testid="disabled" aria-label="Disabled" defaultValue={65} disabled />
      </div>
      <div style={{ height: 160 }}>
        <Slider data-testid="vertical" aria-label="Vertical volume" orientation="vertical" defaultValue={60} />
      </div>
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

const thumb = (name: string) => page.getByRole('slider', { name, exact: true });
const thumbBox = (name: string) => thumb(name).element().closest('[data-slot="slider-thumb"]')!;
const part = (root: Element, slot: string) => root.querySelector(`[data-slot="${slot}"]`)!;
const box = (node: Element) => node.getBoundingClientRect();
const value = (name: string) => Number(thumb(name).element().getAttribute('aria-valuenow'));

describe('Slider in a real browser', () => {
  it.each(themes)('%s %s passes axe and paints its tokens', async (theme, mode) => {
    setTheme(theme, mode);
    const screen = await render(<Sliders />);
    await settle();
    const single = screen.getByTestId('single').element();
    expect(getComputedStyle(part(single, 'slider-range')).backgroundColor).toBe(colorOf('--sprout-primary'));
    expect(getComputedStyle(part(single, 'slider-track')).backgroundColor).toBe(colorOf('--sprout-input'));
    const knob = getComputedStyle(part(single, 'slider-thumb'));
    expect(knob.backgroundColor).toBe('rgb(255, 255, 255)');
    expect(knob.borderTopColor).toBe(colorOf('--sprout-focus'));
    expect(await axeViolations(screen.container)).toEqual([]);
  });

  it('thumbs and tracks keep their geometry and edge alignment', async () => {
    const screen = await render(<Sliders />);
    await settle();
    for (const knob of screen.container.querySelectorAll('[data-slot="slider-thumb"]')) {
      expect(box(knob).width).toBeCloseTo(12, 0);
      expect(box(knob).height).toBeCloseTo(12, 0);
    }
    for (const id of ['single', 'range', 'disabled'])
      expect(box(part(screen.getByTestId(id).element(), 'slider-track')).height).toBeCloseTo(4, 0);

    thumb('Range minimum').element().focus();
    await userEvent.keyboard('{Home}');
    thumb('Range maximum').element().focus();
    await userEvent.keyboard('{End}');
    expect([value('Range minimum'), value('Range maximum')]).toEqual([0, 100]);
    const range = screen.getByTestId('range').element();
    const track = box(part(range, 'slider-track'));
    expect(box(thumbBox('Range minimum')).x).toBeCloseTo(track.x, 0);
    expect(box(thumbBox('Range maximum')).right).toBeCloseTo(track.right, 0);
    // The fill runs from the first thumb's center to the last thumb's center.
    expect(box(part(range, 'slider-range')).width).toBeCloseTo(track.width - 12, 0);
  });

  it('disabled sliders dim, ignore clicks and are skipped by keyboard', async () => {
    const screen = await render(<Sliders />);
    const disabled = screen.getByTestId('disabled').element();
    const control = getComputedStyle(part(disabled, 'slider-control'));
    expect(control.opacity).toBe('0.5');
    expect(control.cursor).toBe('not-allowed');
    await userEvent.click(part(disabled, 'slider-track'), {
      position: { x: 10, y: 2 },
      force: true,
    });
    expect(value('Disabled')).toBe(65);
    thumb('Range maximum').element().focus();
    await userEvent.tab();
    await expect.element(thumb('Vertical volume')).toHaveFocus();
  });

  it('keyboard moves thumbs and shows a focus ring', async () => {
    await render(<Sliders />);
    await userEvent.tab();
    await expect.element(thumb('Volume')).toHaveFocus();
    await expect.poll(() => getComputedStyle(thumbBox('Volume')).boxShadow).toMatch(/0px 0px 0px 3px$/);
    const steps: [string, number][] = [
      ['{ArrowRight}', 41],
      ['{ArrowLeft}{ArrowLeft}', 39],
      ['{PageUp}', 49],
      ['{End}', 100],
      ['{Home}', 0],
    ];
    for (const [keys, expected] of steps) {
      await userEvent.keyboard(keys);
      expect(value('Volume')).toBe(expected);
    }
    await userEvent.tab();
    await userEvent.keyboard('{ArrowRight}');
    expect(value('Range minimum')).toBe(21);
    await userEvent.tab();
    await userEvent.keyboard('{ArrowLeft}');
    expect(value('Range maximum')).toBe(74);
    await userEvent.tab();
    await userEvent.keyboard('{ArrowUp}');
    expect(value('Vertical volume')).toBe(61);
    await userEvent.keyboard('{ArrowDown}{ArrowDown}');
    expect(value('Vertical volume')).toBe(59);
  });

  it('pointer clicks and drags set the value', async () => {
    const screen = await render(<Sliders />);
    const track = part(screen.getByTestId('single').element(), 'slider-track');
    const { width } = box(track);
    await userEvent.click(track, { position: { x: width * 0.8, y: 2 } });
    expect(value('Volume')).toBeGreaterThanOrEqual(78);
    expect(value('Volume')).toBeLessThanOrEqual(82);
    await userEvent.dragAndDrop(thumbBox('Volume'), track, {
      targetPosition: { x: width * 0.25, y: 2 },
    });
    expect(value('Volume')).toBeGreaterThanOrEqual(22);
    expect(value('Volume')).toBeLessThanOrEqual(28);
  });

  it('vertical slider fills its parent and grows upward', async () => {
    const screen = await render(<Sliders />);
    await settle();
    const vertical = screen.getByTestId('vertical').element();
    const track = box(part(vertical, 'slider-track'));
    expect(track.width).toBeCloseTo(4, 0);
    expect(track.height).toBeGreaterThanOrEqual(160);
    const fill = box(part(vertical, 'slider-range'));
    expect(fill.bottom).toBeCloseTo(track.bottom, 0);
    expect(fill.height / track.height).toBeCloseTo(0.6, 1);
    const knob = box(thumbBox('Vertical volume'));
    expect(knob.top).toBeGreaterThanOrEqual(track.top);
    expect(knob.bottom).toBeLessThanOrEqual(track.bottom + 0.5);
  });

  it('ring fades in 120ms and stops for reduced motion', async () => {
    await render(<Sliders />);
    expect(getComputedStyle(thumbBox('Volume')).transitionDuration).toBe('0.12s, 0.12s');
    await emulate({ reducedMotion: true });
    expect(getComputedStyle(thumbBox('Volume')).transitionDuration).toBe('0s');
  });

  it('does not overflow a 390px viewport', async () => {
    await page.viewport(390, 800);
    const screen = await render(
      <div style={{ padding: 16 }}>
        <Slider aria-label="Range" defaultValue={[0, 100]} />
      </div>,
    );
    await settle();
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
    for (const knob of screen.container.querySelectorAll('[data-slot="slider-thumb"]')) {
      expect(box(knob).left).toBeGreaterThanOrEqual(0);
      expect(box(knob).right).toBeLessThanOrEqual(390);
    }
  });
});
