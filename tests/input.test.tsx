import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { Input, inputScaleNames } from '../packages/sprout/src/components/input.js';
import { SidebarInput } from '../packages/sprout/src/components/sidebar.js';
import * as sprout from '../packages/sprout/src/index.js';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');
const css = read('../packages/sprout/src/styles/input.css');

describe('Input', () => {
  it('is exported from the package root and its subpath', () => {
    for (const name of ['Input', 'inputScaleNames', 'SidebarInput']) {
      expect(sprout).toHaveProperty(name);
    }
    expect(inputScaleNames).toEqual(['default', 'lg']);
    const pkg = JSON.parse(read('../packages/sprout/package.json'));
    expect(pkg.exports['./input']).toEqual({
      types: './dist/components/input.d.ts',
      import: './dist/components/input.js',
    });
    expect(read('../packages/sprout/src/styles/index.css')).toContain('@import "./input.css";');
  });

  it('renders a Base UI input with the default scale', () => {
    const html = renderToString(<Input placeholder="People Ops helper" />);
    expect(html).toMatch(/^<input/);
    expect(html).toContain('data-slot="input"');
    expect(html).toContain('data-scale="default"');
    expect(html).toContain('class="sprout-input sprout-input-scale-default"');
    expect(html).toContain('placeholder="People Ops helper"');
  });

  it('renders each scale and passes native props through', () => {
    for (const scale of inputScaleNames) {
      const html = renderToString(
        <Input
          scale={scale}
          type="email"
          name="email"
          autoComplete="email"
          maxLength={80}
          required
          readOnly
          value="ada@example.com"
          onChange={() => {}}
        />,
      );
      expect(html).toContain(`data-scale="${scale}"`);
      expect(html).toContain(`sprout-input-scale-${scale}`);
      for (const attr of [
        'type="email"',
        'name="email"',
        'autoComplete="email"',
        'maxLength="80"',
        'required=""',
        'readOnly=""',
        'value="ada@example.com"',
      ]) {
        expect(html).toContain(attr);
      }
    }
  });

  it('covers every Cloud type and numeric prop', () => {
    for (const type of ['text', 'email', 'password', 'number', 'url', 'date', 'time', 'datetime-local', 'file']) {
      expect(renderToString(<Input type={type} />)).toContain(`type="${type}"`);
    }
    const number = renderToString(<Input type="number" inputMode="numeric" min={1} max={1440} step={1} />);
    for (const attr of ['inputMode="numeric"', 'min="1"', 'max="1440"', 'step="1"']) {
      expect(number).toContain(attr);
    }
    const file = renderToString(
      <Input type="file" accept="image/png,image/jpeg,image/webp" multiple hidden tabIndex={-1} aria-hidden />,
    );
    for (const attr of [
      'accept="image/png,image/jpeg,image/webp"',
      'multiple=""',
      'hidden=""',
      'tabindex="-1"',
      'aria-hidden="true"',
    ]) {
      expect(file).toContain(attr);
    }
  });

  it('keeps disabled, invalid, aria, and id props', () => {
    const html = renderToString(
      <Input
        id="atlassian-source-site"
        disabled
        aria-invalid
        aria-describedby="source-site-help source-site-error"
        pattern="[A-Za-z0-9_.-]+"
        autoCapitalize="none"
        spellCheck={false}
      />,
    );
    expect(html).toContain('id="atlassian-source-site"');
    expect(html).toContain('disabled=""');
    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain('aria-describedby="source-site-help source-site-error"');
    expect(html).toContain('pattern="[A-Za-z0-9_.-]+"');
    expect(html).toContain('autoCapitalize="none"');
    expect(html).toContain('spellCheck="false"');
    expect(html).toContain('data-disabled');
  });

  it('lets a composition replace data-slot and add classes', () => {
    const html = renderToString(<Input data-slot="input-group-control" aria-label="Search paths" className="bare" />);
    expect(html).toContain('data-slot="input-group-control"');
    expect(html).toContain('class="sprout-input sprout-input-scale-default bare"');
    const fn = renderToString(<Input className={state => (state.disabled ? 'off' : 'on')} />);
    expect(fn).toContain('class="sprout-input sprout-input-scale-default on"');
  });

  it('renders SidebarInput as a sidebar-slot input', () => {
    const html = renderToString(<SidebarInput aria-label="Search sample sidebar" placeholder="Search locally…" />);
    expect(html).toContain('data-slot="sidebar-input"');
    expect(html).toContain('data-sidebar="input"');
    expect(html).toContain('class="sprout-input sprout-input-scale-default sprout-sidebar-input"');
    expect(read('../packages/sprout/src/styles/sidebar.css')).toContain(
      '.sprout-input.sprout-sidebar-input:not(:disabled)',
    );
  });

  it('styles states with namespaced tokens and gates motion', () => {
    for (const token of [
      '--sprout-input',
      '--sprout-surface',
      '--sprout-text',
      '--sprout-muted',
      '--sprout-border',
      '--sprout-danger',
      '--sprout-radius-control',
    ]) {
      expect(css).toContain(`var(${token})`);
    }
    expect(css).toContain('@layer components');
    expect(css).toContain('.sprout-input::file-selector-button');
    expect(css).toContain('.sprout-input[aria-invalid="true"]');
    expect(css).toMatch(/prefers-reduced-motion: no-preference\)\s*\{\s*\.sprout-input\s*\{\s*transition/);
    expect(css).toContain('forced-colors: active');
    expect(css).not.toMatch(/\bdisplay:\s*(block|flex|grid)/);
  });
});
