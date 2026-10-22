import { afterEach, describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { Status, statusStateNames, type StatusState } from '../../packages/sprout/src/components/status.js';
import { axeViolations, emulate, resetEmulation, setTheme, settle, srgb, themes } from './support.js';

afterEach(resetEmulation);

function Gallery() {
  return (
    <div style={{ display: 'flex', gap: 12, padding: 16, background: 'var(--sprout-canvas)' }}>
      {statusStateNames.map(state => (
        <Status key={state} state={state} data-testid={state} />
      ))}
      <Status state="running" value={40} data-testid="progress" />
    </div>
  );
}

const luminance = (color: string) => {
  const [r, g, b] = srgb(color)
    .match(/\d+/g)!
    .map(Number)
    .map(channel => {
      const c = channel / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
};
const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
};

describe('Status', () => {
  it.each(themes)('has no axe violations and readable glyphs in %s %s', async (theme, mode) => {
    setTheme(theme, mode);
    const screen = await render(<Gallery />);
    await settle();
    expect(await axeViolations(screen.container)).toEqual([]);
    for (const state of ['success', 'warning', 'error', 'stopped'] as const) {
      const root = screen.getByTestId(state).element();
      const fill = getComputedStyle(root.querySelector('.sprout-status-fill')!).fill;
      const glyph = root.querySelector('.sprout-status-glyph, .sprout-status-dot')!;
      const ink =
        getComputedStyle(glyph).stroke !== 'none' ? getComputedStyle(glyph).stroke : getComputedStyle(glyph).fill;
      expect(contrast(fill, ink), `${state} glyph`).toBeGreaterThanOrEqual(3);
      expect(contrast(fill, getComputedStyle(document.body).backgroundColor), `${state} fill`).toBeGreaterThanOrEqual(
        3,
      );
    }
  });

  it('replays its entrance when the state changes, but not when the amount moves', async () => {
    function Harness({ state, value }: { state: StatusState; value?: number }) {
      return <Status state={state} value={value} data-testid="status" />;
    }
    const screen = await render(<Harness state="running" value={20} />);
    const mark = () => screen.getByTestId('status').element().querySelector('svg')!;
    const first = mark();
    await screen.rerender(<Harness state="running" value={60} />);
    expect(mark()).toBe(first);
    expect(screen.getByTestId('status').element().getAttribute('aria-label')).toBe('Running, 60%');
    await screen.rerender(<Harness state="success" />);
    expect(mark()).not.toBe(first);
    expect(
      mark()
        .getAnimations()
        .map(animation => (animation as CSSAnimation).animationName),
    ).toContain('sprout-status-enter');
  });

  it('spins at the Spinner’s speed and replays its glyph on hover', async () => {
    await emulate({ reducedMotion: false });
    const screen = await render(<Gallery />);
    await settle();
    const spin = screen.getByTestId('running').element().querySelector('.sprout-status-spin')!;
    const [animation] = spin.getAnimations() as CSSAnimation[];
    expect(animation?.animationName).toBe('sprout-status-spin');
    expect(animation?.effect?.getComputedTiming().duration).toBe(1000);
    const active = screen.getByTestId('progress').element().querySelector('[data-segment="active"]')!;
    expect(active.getAnimations().map(a => (a as CSSAnimation).animationName)).toEqual(['sprout-status-fade-cycle']);

    const success = screen.getByTestId('success');
    const glyph = success.element().querySelector('.sprout-status-glyph')!;
    expect(glyph.getAnimations().filter(a => a.playState === 'running')).toHaveLength(0);
    await userEvent.hover(success);
    expect(glyph.getAnimations().filter(a => a.playState === 'running').length).toBeGreaterThan(0);
    await expect.poll(() => getComputedStyle(success.element().querySelector('svg')!).transform).not.toBe('none');
  });

  it('only fades, and stands still, with reduced motion', async () => {
    await emulate({ reducedMotion: true });
    const screen = await render(<Gallery />);
    const names = (element: Element) =>
      element.getAnimations().map(animation => (animation as CSSAnimation).animationName);
    expect(names(screen.getByTestId('running').element().querySelector('.sprout-status-spin')!)).toEqual([]);
    expect(names(screen.getByTestId('success').element().querySelector('svg')!)).toEqual(['sprout-status-fade']);
    expect(names(screen.getByTestId('progress').element().querySelector('[data-segment="active"]')!)).toEqual([]);
    expect(names(screen.getByTestId('success').element().querySelector('.sprout-status-glyph')!)).toEqual([]);
    await settle();
    await userEvent.hover(screen.getByTestId('success'));
    expect(screen.getByTestId('success').element().querySelector('.sprout-status-glyph')!.getAnimations()).toHaveLength(
      0,
    );
  });

  it('is sized like Spinner', async () => {
    const screen = await render(
      <div>
        <Status size="sm" data-testid="sm" />
        <Status data-testid="md" />
        <Status size="lg" data-testid="lg" />
      </div>,
    );
    for (const [id, px] of [
      ['sm', 12],
      ['md', 16],
      ['lg', 20],
    ] as const) {
      const box = screen.getByTestId(id).element().getBoundingClientRect();
      expect([box.width, box.height]).toEqual([px, px]);
    }
    void page;
  });
});
