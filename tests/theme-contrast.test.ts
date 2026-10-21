import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../packages/sprout/src/styles/index.css', import.meta.url), 'utf8');

function tokens(selector: string) {
  const start = css.indexOf(`${selector} {`);
  expect(start, `${selector} block`).toBeGreaterThan(-1);
  const block = css.slice(start, css.indexOf('}', start));
  return Object.fromEntries(
    [...block.matchAll(/(--sprout-[\w-]+):\s*(#[0-9a-f]{6});/gi)].map(([, name, hex]) => [name, hex]),
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

const modes = { light: tokens(':root,\n  .light'), dark: tokens('.dark') };
const rules = [
  ['--sprout-input', 3],
  ['--sprout-border', 3],
  ['--sprout-hover', 1.15],
  ['--sprout-line', 1.15],
] as const;

describe('default token contrast on --sprout-surface', () => {
  it('keeps the prefers-color-scheme dark block in sync with .dark', () => {
    expect(tokens(':root:not(.light):not(.dark)')).toEqual(modes.dark);
  });

  for (const [mode, values] of Object.entries(modes)) {
    for (const [token, min] of rules) {
      it(`${mode} ${token} is at least ${min}:1`, () => {
        expect(contrast(values[token]!, values['--sprout-surface']!)).toBeGreaterThanOrEqual(min);
      });
    }
  }
});
