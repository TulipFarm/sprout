import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';

const dir = new URL('../packages/sprout/src/styles/themes/', import.meta.url);
const presets = readdirSync(dir).filter(file => file.endsWith('.css'));

function block(css: string, selector: string) {
  const start = css.indexOf(selector);
  expect(start, selector).toBeGreaterThan(-1);
  const open = css.indexOf('{', start);
  return Object.fromEntries(
    [...css.slice(open + 1, css.indexOf('}', open)).matchAll(/(--sprout-[\w-]+):\s*([^;]+);/g)].map(
      ([, name, value]) => [name, value.trim()],
    ),
  );
}

function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map(i => {
    const c = Number.parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

function contrast(a: string, b: string) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}

describe.each(presets)('themes/%s', file => {
  const css = readFileSync(new URL(file, dir), 'utf8');
  const slug = file.replace(/\.css$/, '');

  it('keeps the prefers-color-scheme dark block in sync with .dark', () => {
    expect(block(css, `:root:not(.light):not(.dark)[data-sprout-theme='${slug}']`)).toEqual(
      block(css, `.dark[data-sprout-theme='${slug}']`),
    );
  });
});

describe('themes/tulipfarm.css', () => {
  const css = readFileSync(new URL('tulipfarm.css', dir), 'utf8');
  const modes = {
    light: block(css, `.light [data-sprout-theme='tulipfarm'] {`),
    dark: block(css, `.dark [data-sprout-theme='tulipfarm'] {`),
  };
  // Products read these instead of keeping their own copies, so each mode must set them.
  const brand = [
    '--sprout-sidebar',
    '--sprout-popover',
    '--sprout-body',
    '--sprout-faint',
    '--sprout-primary-text',
    '--sprout-card-raised',
    '--sprout-chart-1',
    '--sprout-chart-5',
    '--sprout-shadow-control',
    '--sprout-shadow-overlay',
  ];
  const text = [
    ['--sprout-text', '--sprout-canvas'],
    ['--sprout-body', '--sprout-canvas'],
    ['--sprout-muted', '--sprout-surface'],
    ['--sprout-muted', '--sprout-sidebar'],
    ['--sprout-text', '--sprout-popover'],
    ['--sprout-primary-text', '--sprout-surface'],
    ['--sprout-on-primary', '--sprout-primary'],
  ] as const;

  for (const [mode, values] of Object.entries(modes)) {
    it(`${mode} sets every brand token`, () => {
      for (const token of brand) expect(values, token).toHaveProperty(token);
    });

    for (const [fg, bg] of text) {
      it(`${mode} ${fg} on ${bg} is at least 4.5:1`, () => {
        expect(contrast(values[fg]!, values[bg]!)).toBeGreaterThanOrEqual(4.5);
      });
    }
  }
});
