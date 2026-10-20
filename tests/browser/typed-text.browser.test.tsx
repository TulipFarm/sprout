import { useState } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { TypedText } from '../../packages/sprout/src/components/typed-text.js';
import { axeViolations, emulate, setTheme, settle, themes } from './support.js';

const long = 'Compare Q3 vendor contracts for the Lisbon and Porto warehouse expansion';
const emoji = '👩‍🌾 Crew booked for Café Søndergård 🌷';

function Title({ next, animate, width }: { next: string; animate?: boolean; width?: number }) {
  const [text, setText] = useState('New chat');
  return (
    <div style={{ padding: 16, width, boxSizing: 'border-box' }}>
      <h4
        data-testid="heading"
        title={text}
        style={{
          margin: 0,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          color: 'var(--sprout-muted)',
        }}
      >
        <TypedText text={text} animate={animate} />
      </h4>
      <button onClick={() => setText(next)}>Rename</button>
    </div>
  );
}

const root = () => document.querySelector<HTMLElement>('[data-slot="typed-text"]')!;
const visible = () => root().querySelector('[aria-hidden="true"]')!;

/** Records every visible string until the test reads it. */
function recordFrames() {
  const frames: string[] = [];
  new MutationObserver(() => frames.push(visible().textContent ?? '')).observe(visible(), {
    characterData: true,
    childList: true,
    subtree: true,
  });
  return frames;
}

const rename = () => page.getByRole('button', { name: 'Rename' }).click();
const heading = () => page.getByRole('heading', { level: 4 });

const realFrame = window.requestAnimationFrame;
afterEach(() => {
  window.requestAnimationFrame = realFrame;
});

describe('TypedText in a real browser', () => {
  it.each(themes)('%s %s inherits its color and passes axe', async (theme, mode) => {
    setTheme(theme, mode);
    const screen = await render(<Title next={long} />);
    await settle();
    expect(getComputedStyle(root()).color).toBe(getComputedStyle(root().parentElement!).color);
    const hidden = root().querySelector('.sprout-typed-text-sr-only')!.getBoundingClientRect();
    expect([hidden.width, hidden.height]).toEqual([1, 1]);
    expect(await axeViolations(screen.container)).toEqual([]);
  });

  it('types a change in under a second while screen readers get the whole text', async () => {
    await render(<Title next={long} />);
    await expect.element(heading()).toHaveAccessibleName('New chat');
    const frames = recordFrames();
    const started = performance.now();
    await rename();
    await expect.element(heading()).toHaveAccessibleName(long);
    await expect.poll(() => root().dataset.state).toBe('idle');
    expect(performance.now() - started).toBeLessThan(2000);
    expect(frames.length).toBeGreaterThan(3);
    expect(frames[0]).toBe('C');
    expect(frames.at(-1)).toBe(long);
    for (const [index, frame] of frames.entries()) {
      expect(long.startsWith(frame)).toBe(true);
      if (index) expect(frame.length).toBeGreaterThanOrEqual(frames[index - 1]!.length);
    }
  });

  it('never splits emoji or accented letters', async () => {
    await render(<Title next={emoji} />);
    const frames = recordFrames();
    await rename();
    await expect.poll(() => root().dataset.state).toBe('idle');
    const parts = Array.from(
      new Intl.Segmenter('und', { granularity: 'grapheme' }).segment(emoji),
      item => item.segment,
    );
    const prefixes = new Set(parts.map((_, index) => parts.slice(0, index + 1).join('')));
    expect(frames.every(frame => prefixes.has(frame))).toBe(true);
    expect(frames[0]).toBe('👩‍🌾');
    expect(frames.at(-1)).toBe(emoji);
  });

  it('a long title ellipsizes in its heading on a 390px phone', async () => {
    await page.viewport(390, 800);
    await render(<Title next={long} animate={false} width={390} />);
    await rename();
    await expect.element(heading()).toHaveAttribute('title', long);
    const node = heading().element();
    expect(node.scrollWidth).toBeGreaterThan(node.clientWidth);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
  });

  for (const [why, animate] of [
    ['animate={false}', false],
    ['reduced motion', true],
  ] as const)
    it(`${why} shows changes at once`, async () => {
      if (animate) await emulate({ reducedMotion: true });
      await render(<Title next={long} animate={animate} />);
      const frames = recordFrames();
      await rename();
      await expect.element(heading()).toHaveAccessibleName(long);
      await settle();
      expect(frames).toEqual([long]);
      expect(root().dataset.state).toBe('idle');
    });

  it('turning on reduced motion mid-change finishes the text', async () => {
    await render(<Title next={long} />);
    window.requestAnimationFrame = () => 0;
    await rename();
    await expect.poll(() => root().dataset.state).toBe('typing');
    await emulate({ reducedMotion: true });
    await expect.poll(() => root().dataset.state).toBe('idle');
    expect(visible().textContent).toBe(long);
  });
});
