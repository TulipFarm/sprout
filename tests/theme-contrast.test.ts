import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { contrast } from './color';

const css = readFileSync(new URL('../packages/sprout/src/styles/index.css', import.meta.url), 'utf8');
const tulipfarm = readFileSync(new URL('../packages/sprout/src/styles/themes/tulipfarm.css', import.meta.url), 'utf8');

function tokens(selector: string, source = css) {
  const start = source.indexOf(`${selector} {`);
  expect(start, `${selector} block`).toBeGreaterThan(-1);
  const block = source.slice(start, source.indexOf('}', start));
  return Object.fromEntries(
    [...block.matchAll(/(--sprout-[\w-]+):\s*(oklch\([\d. ]+\));/g)].map(([, name, color]) => [name, color]),
  );
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

describe('TulipFarm theme contrast on --sprout-surface', () => {
  const themeModes = {
    light: tokens(".light [data-sprout-theme='tulipfarm']", tulipfarm),
    dark: tokens(".dark [data-sprout-theme='tulipfarm']", tulipfarm),
  };
  const themeRules = [
    ['--sprout-input', 1.5],
    ['--sprout-border', 3],
    ['--sprout-border-strong', 3],
  ] as const;

  for (const [mode, values] of Object.entries(themeModes)) {
    for (const [token, min] of themeRules) {
      it(`${mode} ${token} is at least ${min}:1`, () => {
        expect(contrast(values[token]!, values['--sprout-surface']!)).toBeGreaterThanOrEqual(min);
      });
    }
  }
});
