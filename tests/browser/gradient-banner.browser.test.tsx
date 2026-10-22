import { describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import {
  GradientBanner,
  GradientBannerBadge,
  GradientBannerPanel,
  GradientBannerProgress,
  gradientBannerSizeNames,
  gradientBannerVariantNames,
} from '../../packages/sprout/src/components/gradient-banner.js';
import { axeViolations, emulate, setTheme, settle, srgb, themes } from './support.js';

function Gallery() {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr)',
        gap: 12,
        padding: 16,
      }}
    >
      {gradientBannerVariantNames.map(variant => (
        <GradientBanner key={variant} variant={variant} size="sm">
          <p style={{ margin: 0 }}>{variant}</p>
        </GradientBanner>
      ))}
      <GradientBanner variant="iris" size="md">
        <GradientBannerPanel>
          <GradientBannerBadge>Draft</GradientBannerBadge>
          Post the weekly update in #team-announcements-and-planting-schedule
        </GradientBannerPanel>
      </GradientBanner>
      <GradientBanner variant="cobalt" size="md">
        <GradientBannerPanel tone="dark" style={{ display: 'grid', width: 280 }}>
          <GradientBannerBadge>Marketing agent</GradientBannerBadge>
          <GradientBannerProgress value={38} aria-label="Spring launch email" />
        </GradientBannerPanel>
      </GradientBanner>
      <GradientBanner variant="mint" size="sm" />
    </div>
  );
}

const bannerOf = (variant: string) =>
  document.querySelector<HTMLElement>(`[data-slot="gradient-banner"][data-variant="${variant}"]`)!;

describe('GradientBanner in a real browser', () => {
  it.each(themes)('%s %s passes axe', async (theme, mode) => {
    setTheme(theme, mode);
    const screen = await render(<Gallery />);
    await settle();
    expect(await axeViolations(screen.container)).toEqual([]);
  });

  it.each([390, 1280])('at %ipx no banner spills sideways', async width => {
    await page.viewport(width, 900);
    await render(<Gallery />);
    await settle();
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
    for (const banner of document.querySelectorAll<HTMLElement>('[data-slot="gradient-banner"]'))
      expect(banner.scrollWidth).toBeLessThanOrEqual(banner.clientWidth + 1);
  });

  it('each variant paints its own base and ink', async () => {
    await render(<Gallery />);
    const bases = gradientBannerVariantNames.map(variant =>
      getComputedStyle(bannerOf(variant)).getPropertyValue('--sprout-gradient-banner-base'),
    );
    expect(new Set(bases).size).toBe(6);
    expect(srgb(getComputedStyle(bannerOf('cobalt').querySelector('p')!).color)).toBe('rgb(255, 253, 247)');
    expect(srgb(getComputedStyle(bannerOf('aurora').querySelector('p')!).color)).toBe('rgb(37, 40, 45)');
    const art = bannerOf('aurora').querySelector<HTMLElement>('[data-slot="gradient-banner-art"]')!;
    const box = bannerOf('aurora').getBoundingClientRect();
    const artBox = art.getBoundingClientRect();
    expect([artBox.width, artBox.height]).toEqual([box.width, box.height]);
  });

  it('sizes set minimum height, padding, and radius', async () => {
    await render(
      <div style={{ display: 'grid', gap: 12, padding: 16 }}>
        {gradientBannerSizeNames.map(size => (
          <GradientBanner key={size} size={size} texture={false}>
            {size}
          </GradientBanner>
        ))}
      </div>,
    );
    const sizes = {
      sm: { height: 96, padding: '16px', radius: '8px' },
      md: { height: 160, padding: '20px', radius: '12px' },
      lg: { height: 240, padding: '24px', radius: '12px' },
    };
    for (const [size, want] of Object.entries(sizes)) {
      const banner = document.querySelector<HTMLElement>(`[data-size="${size}"]`)!;
      const style = getComputedStyle(banner);
      expect(style.paddingTop).toBe(want.padding);
      expect(style.borderTopLeftRadius).toBe(want.radius);
      expect(banner.getBoundingClientRect().height).toBeGreaterThanOrEqual(want.height);
    }
  });

  it('panels and badges follow the tone', async () => {
    await render(<Gallery />);
    const light = document.querySelector<HTMLElement>('[data-tone="light"]')!;
    const dark = document.querySelector<HTMLElement>('[data-tone="dark"]')!;
    expect(srgb(getComputedStyle(light).backgroundColor)).toBe('rgb(255, 255, 255)');
    expect(srgb(getComputedStyle(light).color)).toBe('rgb(37, 40, 45)');
    expect(srgb(getComputedStyle(dark).backgroundColor)).toBe('rgb(25, 29, 32)');
    expect(srgb(getComputedStyle(dark).color)).toBe('rgb(255, 255, 255)');
    const badge = (panel: HTMLElement) =>
      getComputedStyle(panel.querySelector('[data-slot="gradient-banner-badge"]')!).backgroundColor;
    expect(srgb(badge(light))).toBe('rgb(241, 242, 244)');
    expect(srgb(badge(dark))).toBe('rgb(48, 55, 59)');
  });

  it('progress fills its 4px track by value and mirrors in RTL', async () => {
    await emulate({ reducedMotion: true });
    await render(
      <div style={{ display: 'grid', gap: 8, width: 300, padding: 16 }}>
        {[0, 37.5, 100, 150].map(value => (
          <GradientBannerProgress key={value} value={value} aria-label={`Spring launch email ${value}`} />
        ))}
        <div dir="rtl">
          <GradientBannerProgress value={50} aria-label="RTL" />
        </div>
      </div>,
    );
    const bars = page.getByRole('progressbar').elements();
    for (const [index, scale] of [0, 0.375, 1, 1].entries()) {
      const box = bars[index]!.getBoundingClientRect();
      expect(box.height).toBe(4);
      const fill = bars[index]!.firstElementChild!.getBoundingClientRect();
      expect(Math.abs(fill.width - box.width * scale)).toBeLessThan(1.5);
      expect(fill.left).toBeCloseTo(box.left, 0);
    }
    const rtl = bars[4]!;
    const fill = rtl.firstElementChild!.getBoundingClientRect();
    expect(fill.right).toBeCloseTo(rtl.getBoundingClientRect().right, 0);
  });

  it('progress eases its fill, and reduced motion removes the transition', async () => {
    const screen = await render(<GradientBannerProgress value={20} aria-label="Spring launch email" />);
    const fill = () => document.querySelector<HTMLElement>('.sprout-gradient-banner-progress-fill')!;
    expect(getComputedStyle(fill()).transitionDuration).toBe('0.18s');
    await emulate({ reducedMotion: true });
    await screen.rerender(<GradientBannerProgress value={60} aria-label="Spring launch email" />);
    expect(getComputedStyle(fill()).transitionDuration).toBe('0s');
  });
});
