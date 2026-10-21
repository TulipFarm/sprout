import { readFileSync } from 'node:fs';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  GradientBanner,
  GradientBannerBadge,
  GradientBannerPanel,
  GradientBannerProgress,
  gradientBannerPanelToneNames,
  gradientBannerSizeNames,
  gradientBannerVariantNames,
} from '../packages/sprout/src/components/gradient-banner.js';
import * as sprout from '../packages/sprout/src/index.js';

const root = new URL('../packages/sprout/', import.meta.url);

describe('GradientBanner', () => {
  it('defaults to a textured aurora lg banner with hidden art', () => {
    const html = renderToString(
      <GradientBanner>
        <p>aurora</p>
      </GradientBanner>,
    );
    expect(html).toMatch(
      /^<div data-slot="gradient-banner" data-variant="aurora" data-size="lg" class="sprout-gradient-banner">/,
    );
    expect(html).toContain(
      '<div data-slot="gradient-banner-art" class="sprout-gradient-banner-art" aria-hidden="true">',
    );
    expect(html).toContain('data-slot="gradient-banner-texture"');
    expect(html).toContain('<feTurbulence');
    const id = html.match(/<filter id="([^"]+)"/)![1];
    expect(html).toContain(`filter="url(#${id})"`);
    expect(html).toContain(
      '<div data-slot="gradient-banner-content" class="sprout-gradient-banner-content"><p>aurora</p></div>',
    );
  });

  it('names every Cloud variant, size, and tone', () => {
    expect(gradientBannerVariantNames).toEqual(['aurora', 'citrus', 'lagoon', 'iris', 'cobalt', 'mint']);
    expect(gradientBannerSizeNames).toEqual(['sm', 'md', 'lg']);
    expect(gradientBannerPanelToneNames).toEqual(['light', 'dark']);
    for (const variant of gradientBannerVariantNames)
      for (const size of gradientBannerSizeNames) {
        const html = renderToString(<GradientBanner variant={variant} size={size} />);
        expect(html).toContain(`data-variant="${variant}" data-size="${size}"`);
      }
  });

  it('drops texture and content wrappers when asked or empty', () => {
    const flat = renderToString(
      <GradientBanner size="sm" texture={false}>
        <p>sm · no texture</p>
      </GradientBanner>,
    );
    expect(flat).not.toContain('gradient-banner-texture');
    expect(flat).toContain('sm · no texture');
    for (const children of [undefined, null, false, true])
      expect(renderToString(<GradientBanner>{children}</GradientBanner>)).not.toContain('gradient-banner-content');
    expect(
      renderToString(
        <GradientBanner>
          {false}
          {null}
        </GradientBanner>,
      ),
    ).not.toContain('gradient-banner-content');
    expect(renderToString(<GradientBanner>{0}</GradientBanner>)).toContain('gradient-banner-content');
  });

  it('gives unique grain ids to sibling banners', () => {
    const html = renderToString(
      <>
        <GradientBanner />
        <GradientBanner />
      </>,
    );
    const ids = [...html.matchAll(/<filter id="([^"]+)"/g)].map(m => m[1]);
    expect(new Set(ids).size).toBe(2);
  });

  it('merges className and passes props', () => {
    const html = renderToString(<GradientBanner className="w-64" id="hero" data-demo="x" />);
    expect(html).toContain('class="sprout-gradient-banner w-64"');
    expect(html).toContain('id="hero"');
    expect(html).toContain('data-demo="x"');
  });
});

describe('GradientBannerPanel and Badge', () => {
  it('defaults to a light panel and supports dark', () => {
    expect(renderToString(<GradientBannerPanel>Hi</GradientBannerPanel>)).toBe(
      '<div data-slot="gradient-banner-panel" data-tone="light" class="sprout-gradient-banner-panel">Hi</div>',
    );
    const dark = renderToString(
      <GradientBannerPanel tone="dark" className="x">
        <GradientBannerBadge>Example</GradientBannerBadge>
        <span>How agents work in TulipFarm</span>
      </GradientBannerPanel>,
    );
    expect(dark).toContain('data-tone="dark" class="sprout-gradient-banner-panel x"');
    expect(dark).toContain(
      '<span data-slot="gradient-banner-badge" class="sprout-gradient-banner-badge">Example</span>',
    );
  });
});

describe('GradientBannerProgress', () => {
  const render = (value: number) => renderToString(<GradientBannerProgress value={value} aria-label="Run" />);

  it('is a named progressbar with rounded, clamped values', () => {
    const html = render(37.5);
    expect(html).toContain('role="progressbar"');
    expect(html).toContain('aria-valuemin="0"');
    expect(html).toContain('aria-valuemax="100"');
    expect(html).toContain('aria-valuenow="38"');
    expect(html).toContain('aria-label="Run"');
    expect(html).toContain('--sprout-gradient-banner-progress:0.375');
    expect(render(140)).toContain('aria-valuenow="100"');
    expect(render(140)).toContain('--sprout-gradient-banner-progress:1');
    expect(render(-5)).toContain('aria-valuenow="0"');
    expect(render(-5)).toContain('--sprout-gradient-banner-progress:0');
    expect(render(Number.NaN)).toContain('aria-valuenow="0"');
  });

  it('keeps caller styles', () => {
    const html = renderToString(<GradientBannerProgress value={50} style={{ marginTop: 4 }} />);
    expect(html).toContain('margin-top:4px');
    expect(html).toContain('--sprout-gradient-banner-progress:0.5');
  });
});

describe('Gradient Banner package wiring', () => {
  it('is exported, has a subpath, and ships its CSS', () => {
    for (const name of ['GradientBanner', 'GradientBannerBadge', 'GradientBannerPanel', 'GradientBannerProgress'])
      expect(sprout).toHaveProperty(name);
    const manifest = JSON.parse(readFileSync(new URL('package.json', root), 'utf8'));
    expect(manifest.exports['./gradient-banner']).toEqual({
      types: './dist/components/gradient-banner.d.ts',
      import: './dist/components/gradient-banner.js',
    });
    expect(readFileSync(new URL('src/styles/index.css', root), 'utf8')).toContain("@import './gradient-banner.css';");
    const css = readFileSync(new URL('src/styles/gradient-banner.css', root), 'utf8');
    for (const variant of gradientBannerVariantNames.slice(1)) expect(css).toContain(`[data-variant='${variant}']`);
    for (const height of ['6rem', '10rem', '15rem']) expect(css).toContain(`min-height: ${height}`);
    expect(css).toContain('prefers-reduced-motion: reduce');
    expect(css).not.toMatch(/--banner-/);
  });
});
