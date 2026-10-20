import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { Badge } from '../packages/sprout/src/components/badge.js';
import { Button } from '../packages/sprout/src/components/button.js';
import {
  Spinner,
  spinnerActivityNames,
  spinnerSizeNames,
  thinkingSpinnerSizeNames,
} from '../packages/sprout/src/components/spinner.js';
import * as sprout from '../packages/sprout/src/index.js';

const css = readFileSync(new URL('../packages/sprout/src/styles/spinner.css', import.meta.url), 'utf8');

describe('Spinner', () => {
  it('is exported from the package root and its subpath', () => {
    expect(sprout).toHaveProperty('Spinner');
    expect(sprout).toHaveProperty('spinnerSizeNames');
    expect(spinnerSizeNames).toEqual(['sm', 'default', 'lg']);
    const manifest = JSON.parse(readFileSync(new URL('../packages/sprout/package.json', import.meta.url), 'utf8'));
    expect(manifest.exports['./spinner']).toEqual({
      types: './dist/components/spinner.d.ts',
      import: './dist/components/spinner.js',
    });
    expect(readFileSync(new URL('../packages/sprout/src/styles/index.css', import.meta.url), 'utf8')).toContain(
      '@import "./spinner.css";',
    );
  });

  it('is a status named Loading by default', () => {
    const html = renderToString(<Spinner />);
    expect(html).toMatch(/^<svg/);
    expect(html).toContain('data-slot="spinner"');
    expect(html).toContain('data-size="default"');
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-label="Loading"');
    expect(html).toContain('focusable="false"');
    expect(html).toContain('class="reicon sprout-spinner sprout-spinner-size-default"');
    expect(html).not.toContain('aria-hidden');
  });

  it('takes a custom accessible name', () => {
    for (const label of ['Opening workspace', 'Uploading', 'Loading example']) {
      const html = renderToString(<Spinner aria-label={label} />);
      expect(html).toContain(`aria-label="${label}"`);
      expect(html).toContain('role="status"');
    }
  });

  it('drops its role and name when hidden beside text', () => {
    for (const hidden of [true, 'true'] as const) {
      const html = renderToString(<Spinner aria-hidden={hidden} />);
      expect(html).toContain('aria-hidden="true"');
      expect(html).not.toContain('role=');
      expect(html).not.toContain('aria-label');
    }
  });

  it('supports every size', () => {
    for (const size of spinnerSizeNames) {
      const html = renderToString(<Spinner size={size} />);
      expect(html).toContain(`data-size="${size}"`);
      expect(html).toContain(`sprout-spinner-size-${size}`);
    }
    expect(css).toMatch(/\.sprout-spinner \{[^}]*width: 16px;[^}]*height: 16px;/);
    expect(css).toMatch(/\.sprout-spinner-size-sm \{\s*width: 12px;\s*height: 12px;/);
    expect(css).toMatch(/\.sprout-spinner-size-lg \{\s*width: 20px;\s*height: 20px;/);
  });

  it('spins only when motion is allowed', () => {
    expect(css).toMatch(
      /@media \(prefers-reduced-motion: no-preference\) \{\s*\.sprout-spinner\[data-variant="default"\] \{\s*animation: sprout-spinner-spin 1s linear infinite;/,
    );
  });

  it('passes className, style, data, and id through', () => {
    const html = renderToString(
      <Spinner
        aria-hidden="true"
        className="text-sprout-info"
        style={{ marginTop: 2 }}
        data-testid="plan-step"
        id="step-spinner"
      />,
    );
    expect(html).toContain('class="reicon sprout-spinner sprout-spinner-size-default text-sprout-info"');
    expect(html).toContain('style="margin-top:2px"');
    expect(html).toContain('data-testid="plan-step"');
    expect(html).toContain('id="step-spinner"');
  });

  it('shows a thinking orb, a status named Thinking, working by default', () => {
    expect(spinnerActivityNames).toEqual([
      'working',
      'searching',
      'solving',
      'listening',
      'connecting',
      'weaving',
      'composing',
      'breathing',
      'shaping',
    ]);
    expect(thinkingSpinnerSizeNames).toEqual(['lg', 'xl']);
    const html = renderToString(<Spinner variant="thinking" />);
    expect(html).toMatch(/^<span/);
    expect(html).toContain('data-variant="thinking"');
    expect(html).toContain('data-size="lg"');
    expect(html).toContain('data-activity="working"');
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-label="Thinking"');
    expect(html).toContain('class="sprout-spinner sprout-spinner-size-lg"');
  });

  it('takes an activity, the xl size, a name, or hides beside text', () => {
    const named = renderToString(
      <Spinner variant="thinking" size="xl" activity="searching" aria-label="Searching Drive" />,
    );
    expect(named).toContain('data-size="xl"');
    expect(named).toContain('data-activity="searching"');
    expect(named).toContain('aria-label="Searching Drive"');
    const hidden = renderToString(<Spinner variant="thinking" aria-hidden="true" />);
    expect(hidden).toContain('aria-hidden="true"');
    expect(hidden).not.toContain('role=');
    expect(hidden).not.toContain('aria-label');
    expect(css).toMatch(/\.sprout-spinner-size-xl \{\s*width: 64px;\s*height: 64px;/);
  });

  it('composes in busy buttons and badges', () => {
    const button = renderToString(
      <Button disabled aria-busy>
        <Spinner aria-hidden="true" />
        Opening sign-in…
      </Button>,
    );
    expect(button).toContain('aria-busy="true"');
    expect(button).toContain('data-slot="spinner"');
    expect(button).toContain('Opening sign-in…');
    const badge = renderToString(
      <Badge variant="secondary">
        <Spinner size="sm" aria-hidden="true" />
        Finding sources
      </Badge>,
    );
    expect(badge).toContain('data-size="sm"');
    expect(badge).toContain('Finding sources');
  });
});
