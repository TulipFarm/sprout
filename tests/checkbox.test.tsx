import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { Checkbox, checkboxVariantNames } from '../packages/sprout/src/components/checkbox.js';
import * as sprout from '../packages/sprout/src/index.js';

const css = readFileSync(new URL('../packages/sprout/src/styles/checkbox.css', import.meta.url), 'utf8');

describe('Checkbox', () => {
  it('is exported from the package root, its subpath, and the CSS entry', () => {
    expect(sprout).toHaveProperty('Checkbox');
    expect(sprout).toHaveProperty('checkboxVariantNames');
    expect(checkboxVariantNames).toEqual(['default', 'neutral']);
    const pkg = JSON.parse(readFileSync(new URL('../packages/sprout/package.json', import.meta.url), 'utf8'));
    expect(pkg.exports['./checkbox']).toEqual({
      types: './dist/components/checkbox.d.ts',
      import: './dist/components/checkbox.js',
    });
    const entry = readFileSync(new URL('../packages/sprout/src/styles/index.css', import.meta.url), 'utf8');
    expect(entry).toContain("@import './checkbox.css';");
  });

  it('renders an unchecked Base UI checkbox with the default variant', () => {
    const html = renderToString(<Checkbox aria-label="Select row 4f0c2a91" />);
    expect(html).toContain('role="checkbox"');
    expect(html).toContain('aria-checked="false"');
    expect(html).toContain('aria-label="Select row 4f0c2a91"');
    expect(html).toContain('data-slot="checkbox"');
    expect(html).toContain('data-variant="default"');
    expect(html).toContain('class="sprout-checkbox sprout-checkbox-variant-default"');
    expect(html).toContain('type="checkbox"');
    expect(html).not.toContain('data-slot="checkbox-indicator"');
  });

  it('renders every variant checked, disabled, and invalid with a check mark', () => {
    for (const variant of checkboxVariantNames) {
      const html = renderToString(<Checkbox variant={variant} defaultChecked disabled aria-invalid />);
      expect(html).toContain(`data-variant="${variant}"`);
      expect(html).toContain(`sprout-checkbox-variant-${variant}`);
      expect(html).toContain('aria-checked="true"');
      expect(html).toContain('data-checked');
      expect(html).toContain('data-disabled');
      expect(html).toContain('aria-disabled="true"');
      expect(html).toContain('aria-invalid="true"');
      expect(html).toContain('data-slot="checkbox-indicator"');
      expect(html).toContain('sprout-checkbox-indicator');
    }
  });

  it('shows a mixed state with a minus instead of a check', () => {
    const mixed = renderToString(<Checkbox aria-label="Select all rows" checked={false} indeterminate />);
    const checked = renderToString(<Checkbox aria-label="Select all rows" checked />);
    expect(mixed).toContain('aria-checked="mixed"');
    expect(mixed).toContain('data-indeterminate');
    expect(mixed).toContain('data-slot="checkbox-indicator"');
    const mixedIcon = mixed.match(/<svg[\s\S]*?<\/svg>/)?.[0];
    const checkIcon = checked.match(/<svg[\s\S]*?<\/svg>/)?.[0];
    expect(mixedIcon).toBeTruthy();
    expect(checkIcon).toBeTruthy();
    expect(mixedIcon).not.toEqual(checkIcon);
  });

  it('passes id, name, value, describedby, and className through', () => {
    const html = renderToString(
      <Checkbox
        id="atlassian-share"
        name="share"
        value="yes"
        aria-describedby="share-help"
        className="mt-0.5"
        required
      />,
    );
    expect(html).toContain('id="atlassian-share"');
    expect(html).toContain('name="share"');
    expect(html).toContain('aria-describedby="share-help"');
    expect(html).toContain('sprout-checkbox-variant-default mt-0.5');
    expect(html).toContain('aria-required="true"');
    const fn = renderToString(<Checkbox defaultChecked className={state => (state.checked ? 'is-on' : 'is-off')} />);
    expect(fn).toContain('sprout-checkbox sprout-checkbox-variant-default is-on');
  });

  it('styles states with tokens, a hit area, reduced motion, and forced colors', () => {
    expect(css).toContain('width: 16px');
    expect(css).toContain('inset: -8px -12px');
    expect(css).toContain('.sprout-checkbox[data-indeterminate]');
    expect(css).toContain('.sprout-checkbox-variant-neutral[data-checked]');
    expect(css).toContain('var(--sprout-primary)');
    expect(css).toContain('var(--sprout-danger)');
    expect(css).toContain('prefers-reduced-motion: no-preference');
    expect(css).toContain('forced-colors: active');
    expect(css).not.toMatch(/#[0-9a-f]{3,6}\b/i);
  });
});
