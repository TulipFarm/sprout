import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import * as sprout from '../packages/sprout/src/index.js';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '../packages/sprout/src/components/hover-card.js';

function tag(html: string, slot: string) {
  const match = html.match(new RegExp(`<([a-z0-9]+)[^>]*data-slot="${slot}"[^>]*>`));
  expect(match, slot).toBeTruthy();
  return match![0];
}

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

describe('Hover Card', () => {
  it('exports the three Cloud parts from the root and its subpath', () => {
    expect(sprout.HoverCard).toBe(HoverCard);
    expect(sprout.HoverCardTrigger).toBe(HoverCardTrigger);
    expect(sprout.HoverCardContent).toBe(HoverCardContent);
    const manifest = JSON.parse(read('../packages/sprout/package.json'));
    expect(manifest.exports['./hover-card']).toEqual({
      types: './dist/components/hover-card.d.ts',
      import: './dist/components/hover-card.js',
    });
    expect(read('../packages/sprout/src/styles/index.css')).toContain("@import './hover-card.css';");
  });

  it('renders a link trigger through render and no card until opened', () => {
    const html = renderToString(
      <HoverCard>
        <HoverCardTrigger
          className="extra-link"
          render={<a href="#fictional-profile" onClick={event => event.preventDefault()} />}
        >
          Alex Meadow · top
        </HoverCardTrigger>
        <HoverCardContent side="top">
          <p className="font-medium">Alex Meadow</p>
          <p className="text-sm text-sprout-muted">Fictional garden project coordinator.</p>
        </HoverCardContent>
      </HoverCard>,
    );
    const trigger = tag(html, 'hover-card-trigger');
    expect(trigger).toMatch(/^<a /);
    expect(trigger).toContain('href="#fictional-profile"');
    expect(trigger).toContain('sprout-hover-card-trigger extra-link');
    expect(html).toContain('Alex Meadow · top');
    expect(html).not.toContain('hover-card-content');
    expect(html).not.toContain('Fictional garden project coordinator.');
  });

  it('renders a plain anchor by default and merges a state class function', () => {
    const html = renderToString(
      <HoverCard>
        <HoverCardTrigger href="/people/priya" className={() => 'state-class'}>
          Priya Raman
        </HoverCardTrigger>
      </HoverCard>,
    );
    const trigger = tag(html, 'hover-card-trigger');
    expect(trigger).toMatch(/^<a /);
    expect(trigger).toContain('href="/people/priya"');
    expect(trigger).toContain('sprout-hover-card-trigger state-class');
  });

  it('styles the card like Cloud: 16rem panel, small text, and motion only when allowed', () => {
    const css = read('../packages/sprout/src/styles/hover-card.css');
    expect(css).toMatch(/\.sprout-hover-card-content \{[^}]*width: 16rem;/);
    expect(css).toMatch(/\.sprout-hover-card-content \{[^}]*padding: 10px;/);
    expect(css).toMatch(/\.sprout-hover-card-content \{[^}]*font-size: var\(--sprout-text-sm\);/);
    expect(css).toMatch(/\.sprout-hover-card-positioner \{[^}]*z-index: 50;/);
    expect(css).toContain('@media (prefers-reduced-motion: no-preference)');
    for (const side of ['top', 'bottom', 'left', 'right']) {
      expect(css).toContain(`[data-side='${side}']`);
    }
    expect(css).not.toMatch(/--(?!sprout-|available-|transform-origin)[a-z-]+:/);
  });

  it('is listed in the docs navigation', () => {
    expect(read('../apps/docs/src/data/nav.ts')).toContain("'Hover Card'");
  });
});
