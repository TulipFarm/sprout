import { readFileSync } from 'node:fs';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { GlassBanner, GlassChip } from '../packages/sprout/src/components/glass-banner.js';
import * as sprout from '../packages/sprout/src/index.js';

const root = new URL('../packages/sprout/', import.meta.url);

describe('GlassBanner', () => {
  it('renders hidden bubble art, title, caption, and a chip list named by the caption', () => {
    const html = renderToString(
      <GlassBanner title="Connect once. Your agents work there." caption="Example activity">
        <GlassChip icon={<svg data-icon="gmail" />}>Drafted 3 follow-ups</GlassChip>
        <GlassChip icon={<svg data-icon="slack" />}>Answered in #support</GlassChip>
        <GlassChip icon={<svg data-icon="jira" />}>Triaged 5 new issues</GlassChip>
      </GlassBanner>,
    );
    expect(html).toMatch(/^<div data-slot="glass-banner" class="sprout-glass-banner">/);
    expect(html).toContain('<div data-slot="glass-banner-art" class="sprout-glass-banner-art" aria-hidden="true">');
    expect(html.match(/data-slot="glass-bubble"/g)).toHaveLength(5);
    const captionId = html.match(/<p id="([^"]+)" data-slot="glass-banner-caption"/)![1];
    expect(html).toContain('>Connect once. Your agents work there.</p>');
    expect(html).toContain('>Example activity</p>');
    expect(html).toContain(
      `<ul data-slot="glass-banner-chips" class="sprout-glass-banner-chips" aria-labelledby="${captionId}">`,
    );
    expect(html.match(/<li data-slot="glass-chip"/g)).toHaveLength(3);
    expect(html.match(/data-slot="glass-chip-icon"/g)).toHaveLength(3);
    expect(html).toContain('<svg data-icon="slack"></svg>');
  });

  it('names the chip list by the title when there is no caption', () => {
    for (const caption of [undefined, null, false, '']) {
      const html = renderToString(
        <GlassBanner title="Grow your next idea" caption={caption}>
          <GlassChip>Try a new workflow</GlassChip>
        </GlassBanner>,
      );
      expect(html).not.toContain('glass-banner-caption');
      const titleId = html.match(/<p id="([^"]+)" data-slot="glass-banner-title"/)![1];
      expect(html).toContain(`aria-labelledby="${titleId}"`);
    }
  });

  it('accepts rich title and caption nodes', () => {
    const html = renderToString(
      <GlassBanner title={<b>Grow</b>} caption={<i>Fictional project starters</i>}>
        <GlassChip>Garden notes</GlassChip>
      </GlassBanner>,
    );
    expect(html).toContain('<b>Grow</b>');
    expect(html).toContain('<i>Fictional project starters</i>');
    expect(html).toMatch(/aria-labelledby="[^"]+-caption"/);
  });

  it('gives sibling banners unique ids', () => {
    const html = renderToString(
      <>
        <GlassBanner title="One" caption="First">
          <GlassChip>a</GlassChip>
        </GlassBanner>
        <GlassBanner title="Two" caption="Second">
          <GlassChip>b</GlassChip>
        </GlassBanner>
      </>,
    );
    const ids = [...html.matchAll(/ id="([^"]+)"/g)].map(m => m[1]);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('merges className and passes props', () => {
    const html = renderToString(
      <GlassBanner title="t" className="mt-4" data-testid="banner" id="hero">
        <GlassChip className="extra" data-chip="1">
          x
        </GlassChip>
      </GlassBanner>,
    );
    expect(html).toContain('class="sprout-glass-banner mt-4"');
    expect(html).toContain('data-testid="banner"');
    expect(html).toContain('id="hero"');
    expect(html).toContain('class="sprout-glass-chip extra"');
    expect(html).toContain('data-chip="1"');
  });
});

describe('GlassChip', () => {
  it('renders icon and text chips', () => {
    expect(renderToString(<GlassChip icon={<svg />}>Garden notes</GlassChip>)).toBe(
      '<li data-slot="glass-chip" class="sprout-glass-chip"><span data-slot="glass-chip-surface" class="sprout-glass-chip-surface"><span data-slot="glass-chip-icon" class="sprout-glass-chip-icon"><svg></svg></span><span data-slot="glass-chip-label" class="sprout-glass-chip-label">Garden notes</span></span></li>',
    );
    const text = renderToString(<GlassChip>Try a new workflow</GlassChip>);
    expect(text).not.toContain('glass-chip-icon');
    expect(text).toContain('>Try a new workflow</span>');
    expect(text).not.toContain('tabindex');
  });
});

describe('Glass Banner package wiring', () => {
  it('is exported, has a subpath, and ships its CSS', () => {
    expect(sprout).toHaveProperty('GlassBanner');
    expect(sprout).toHaveProperty('GlassChip');
    const manifest = JSON.parse(readFileSync(new URL('package.json', root), 'utf8'));
    expect(manifest.exports['./glass-banner']).toEqual({
      types: './dist/components/glass-banner.d.ts',
      import: './dist/components/glass-banner.js',
    });
    expect(readFileSync(new URL('src/styles/index.css', root), 'utf8')).toContain("@import './glass-banner.css';");
    const css = readFileSync(new URL('src/styles/glass-banner.css', root), 'utf8');
    expect(css).toContain('.dark {');
    expect(css).toContain('prefers-color-scheme: dark');
    expect(css).toContain('@container (min-width: 44rem)');
    expect(css).toContain('prefers-reduced-motion: reduce');
    expect(css).toContain('min-height: 15rem');
    expect(css).not.toMatch(/var\(--glass-/);
  });
});
