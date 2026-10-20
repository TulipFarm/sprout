// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { act, render } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import {
  TypedText,
  typedTextCharacterDuration,
  typedTextMaxDuration,
} from '../packages/sprout/src/components/typed-text.js';
import * as sprout from '../packages/sprout/src/index.js';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

describe('TypedText', () => {
  it('is exported from the package root, its subpath, and the stylesheet', () => {
    expect(sprout.TypedText).toBe(TypedText);
    expect(typedTextCharacterDuration).toBe(25);
    expect(typedTextMaxDuration).toBe(800);
    const manifest = JSON.parse(read('../packages/sprout/package.json'));
    expect(manifest.exports['./typed-text']).toEqual({
      types: './dist/components/typed-text.d.ts',
      import: './dist/components/typed-text.js',
    });
    expect(read('../packages/sprout/src/styles/index.css')).toContain('@import "./typed-text.css";');
  });

  it('renders the full text for screen readers and a hidden visual copy', () => {
    const html = renderToString(<TypedText text="Prepare our investor pitch" />);
    expect(html).toBe(
      '<span data-slot="typed-text" data-state="idle" class="sprout-typed-text">' +
        '<span class="sprout-typed-text-sr-only">Prepare our investor pitch</span>' +
        '<span aria-hidden="true">Prepare our investor pitch</span></span>',
    );
  });

  it('shows the first render at once, with or without animation', () => {
    for (const animate of [true, false, undefined]) {
      const html = renderToString(<TypedText text="This sentence appears immediately." animate={animate} />);
      expect(html.match(/This sentence appears immediately\./g)).toHaveLength(2);
      expect(html).toContain('data-state="idle"');
    }
  });

  it('passes span attributes through', () => {
    const html = renderToString(<TypedText text="New chat" className="font-medium" id="title" data-testid="t" />);
    expect(html).toContain('class="sprout-typed-text font-medium"');
    expect(html).toContain('id="title"');
    expect(html).toContain('data-testid="t"');
  });

  it('hides the screen-reader copy visually without colors of its own', () => {
    const css = read('../packages/sprout/src/styles/typed-text.css');
    expect(css).toMatch(/\.sprout-typed-text-sr-only\s*{[^}]*position: absolute;[^}]*clip:/);
    expect(css).not.toMatch(/--sprout-(text|muted|surface)/);
  });

  it('types a changed text in over animation frames', () => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'performance'] });
    try {
      const { container, rerender } = render(<TypedText text="Hi" />);
      const visual = () => container.querySelector('[aria-hidden="true"]');
      const root = container.firstElementChild!;
      expect(visual()?.textContent).toBe('Hi');

      rerender(<TypedText text="Hello" />);
      expect(root.getAttribute('data-state')).toBe('typing');
      expect(visual()?.textContent).toBe('H');

      act(() => vi.advanceTimersByTime(typedTextMaxDuration));
      expect(visual()?.textContent).toBe('Hello');
      expect(root.getAttribute('data-state')).toBe('idle');
    } finally {
      vi.useRealTimers();
    }
  });

  it('shows changes at once when animate is false', () => {
    const { container, rerender } = render(<TypedText text="Hi" animate={false} />);
    rerender(<TypedText text="Hello" animate={false} />);
    expect(container.querySelector('[aria-hidden="true"]')?.textContent).toBe('Hello');
  });
});
