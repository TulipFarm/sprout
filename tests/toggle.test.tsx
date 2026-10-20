import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import {
  Toggle,
  toggleSizeNames,
  toggleVariantNames,
  toggleVariants,
} from '../packages/sprout/src/components/toggle.js';
import { ToggleGroup } from '../packages/sprout/src/components/toggle-group.js';
import * as sprout from '../packages/sprout/src/index.js';

const css = readFileSync(new URL('../packages/sprout/src/styles/toggle.css', import.meta.url), 'utf8');

describe('Toggle', () => {
  it('is exported from the package root and its subpath', () => {
    for (const name of ['Toggle', 'toggleVariants', 'toggleVariantNames', 'toggleSizeNames']) {
      expect(sprout).toHaveProperty(name);
    }
    expect(toggleVariantNames).toEqual(['default', 'outline']);
    expect(toggleSizeNames).toEqual(['default', 'sm', 'lg']);
    const pkg = JSON.parse(readFileSync(new URL('../packages/sprout/package.json', import.meta.url), 'utf8'));
    expect(pkg.exports['./toggle']).toEqual({
      types: './dist/components/toggle.d.ts',
      import: './dist/components/toggle.js',
    });
    const entry = readFileSync(new URL('../packages/sprout/src/styles/index.css', import.meta.url), 'utf8');
    expect(entry).toContain('@import "./toggle.css";');
  });

  it('renders an unpressed Base UI button with default variant and size', () => {
    const html = renderToString(
      <Toggle aria-label="Bold">
        <svg />
      </Toggle>,
    );
    expect(html).toMatch(/^<button/);
    expect(html).toContain('type="button"');
    expect(html).toContain('aria-pressed="false"');
    expect(html).toContain('aria-label="Bold"');
    expect(html).toContain('data-slot="toggle"');
    expect(html).toContain('data-variant="default"');
    expect(html).toContain('data-size="default"');
    expect(html).toContain('class="sprout-toggle sprout-toggle-variant-default sprout-toggle-size-default"');
    expect(html).not.toContain('data-pressed');
  });

  it('renders every variant and size, pressed and disabled', () => {
    for (const variant of toggleVariantNames) {
      for (const size of toggleSizeNames) {
        const html = renderToString(
          <Toggle variant={variant} size={size} defaultPressed disabled>
            Bold
          </Toggle>,
        );
        expect(html).toContain(`data-variant="${variant}"`);
        expect(html).toContain(`data-size="${size}"`);
        expect(html).toContain(`sprout-toggle-variant-${variant}`);
        expect(html).toContain(`sprout-toggle-size-${size}`);
        expect(html).toContain('aria-pressed="true"');
        expect(html).toContain('data-pressed');
        expect(html).toContain('disabled');
        expect(html).toContain('data-disabled');
      }
    }
  });

  it('supports controlled state, aria-invalid, aria-busy, and className functions', () => {
    const html = renderToString(
      <Toggle
        pressed
        onPressedChange={() => {}}
        aria-invalid
        aria-busy
        className={state => (state.pressed ? 'is-on' : 'is-off')}
      >
        Pin
      </Toggle>,
    );
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('sprout-toggle sprout-toggle-variant-default');
    expect(html).toContain('is-on');
    const merged = renderToString(<Toggle className="custom">A</Toggle>);
    expect(merged).toContain('sprout-toggle-size-default custom');
  });

  it('toggleVariants returns the same classes Toggle renders and merges className', () => {
    expect(toggleVariants()).toBe('sprout-toggle sprout-toggle-variant-default sprout-toggle-size-default');
    for (const variant of toggleVariantNames) {
      for (const size of toggleSizeNames) {
        const html = renderToString(
          <Toggle variant={variant} size={size}>
            A
          </Toggle>,
        );
        expect(html).toContain(`class="${toggleVariants({ variant, size })}"`);
      }
    }
    expect(toggleVariants({ variant: null, size: null })).toBe(toggleVariants());
    expect(toggleVariants({ variant: 'outline', size: 'sm', className: 'extra' })).toBe(
      'sprout-toggle sprout-toggle-variant-outline sprout-toggle-size-sm extra',
    );
  });

  it('joins a Base UI toggle group by value with toggleVariants classes', () => {
    const html = renderToString(
      <ToggleGroup aria-label="Time range" defaultValue={['30d']}>
        {['7d', '30d'].map(value => (
          <Toggle key={value} value={value} variant="outline" size="sm">
            {value}
          </Toggle>
        ))}
      </ToggleGroup>,
    );
    expect(html).toContain('role="group"');
    expect(html.match(/sprout-toggle-variant-outline/g)).toHaveLength(2);
    expect(html.match(/aria-pressed="true"/g)).toHaveLength(1);
  });

  it('renders a custom element with render and value', () => {
    const html = renderToString(
      <Toggle value="bold" render={<span />} nativeButton={false}>
        Bold
      </Toggle>,
    );
    expect(html).toMatch(/^<span/);
    expect(html).toContain('role="button"');
    expect(html).toContain('aria-pressed="false"');
  });

  it('defines Cloud sizes, icon slots, states, and reduced motion in CSS', () => {
    for (const rule of [
      'height: 32px',
      'min-width: 32px',
      'height: 28px',
      'min-width: 28px',
      'height: 36px',
      'min-width: 36px',
      '--sprout-toggle-icon: 0.875rem',
      '[data-icon="inline-start"]',
      '[data-icon="inline-end"]',
      '[data-pressed]',
      '[aria-invalid="true"]',
      '[aria-busy="true"]',
      ':focus-visible',
      'prefers-reduced-motion: no-preference',
      'forced-colors: active',
      'var(--sprout-primary-subtle)',
    ]) {
      expect(css).toContain(rule);
    }
  });
});
