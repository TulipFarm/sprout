import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { Status, statusSizeNames, statusStateNames } from '../packages/sprout/src/components/status.js';
import * as sprout from '../packages/sprout/src/index.js';

const css = readFileSync(new URL('../packages/sprout/src/styles/status.css', import.meta.url), 'utf8');

const attribute = (html: string, name: string) => html.match(new RegExp(`${name}="([^"]*)"`))?.[1];

describe('Status', () => {
  it('is exported from the package root and its subpath', () => {
    for (const name of ['Status', 'statusSizeNames', 'statusStateNames']) expect(sprout).toHaveProperty(name);
    const manifest = JSON.parse(readFileSync(new URL('../packages/sprout/package.json', import.meta.url), 'utf8'));
    expect(manifest.exports['./status']).toEqual({
      types: './dist/components/status.d.ts',
      import: './dist/components/status.js',
    });
    expect(readFileSync(new URL('../packages/sprout/src/styles/index.css', import.meta.url), 'utf8')).toContain(
      "@import './status.css';",
    );
  });

  it('lists every state and size', () => {
    expect(statusStateNames).toEqual([
      'pending',
      'running',
      'paused',
      'success',
      'warning',
      'error',
      'stopped',
      'skipped',
    ]);
    expect(statusSizeNames).toEqual(['sm', 'md', 'lg']);
  });

  it('is a pending, medium img by default', () => {
    const html = renderToString(<Status />);
    expect(html).toContain('role="img"');
    expect(attribute(html, 'aria-label')).toBe('Pending');
    expect(attribute(html, 'data-slot')).toBe('status');
    expect(attribute(html, 'data-state')).toBe('pending');
    expect(attribute(html, 'data-size')).toBe('md');
    expect(html).toContain('class="sprout-status sprout-status-size-md"');
  });

  it.each([
    ['pending', 'Pending'],
    ['running', 'Running'],
    ['paused', 'Paused'],
    ['success', 'Succeeded'],
    ['warning', 'Warning'],
    ['error', 'Failed'],
    ['stopped', 'Stopped'],
    ['skipped', 'Skipped'],
  ] as const)('names %s “%s” and draws its own mark', (state, name) => {
    const html = renderToString(<Status state={state} />);
    expect(attribute(html, 'aria-label')).toBe(name);
    expect(attribute(html, 'data-mark')).toBe(state);
  });

  it('fills a segment per eighth of a known amount, and fades the one in progress', () => {
    const html = renderToString(<Status state="running" value={40.4} />);
    expect(attribute(html, 'aria-label')).toBe('Running, 40%');
    expect(attribute(html, 'data-mark')).toBe('progress');
    expect(html).toContain('data-determinate=""');
    const segments = [...html.matchAll(/data-segment="(\w+)"/g)].map(match => match[1]);
    expect(segments).toEqual(['done', 'done', 'done', 'active', 'todo', 'todo', 'todo', 'todo']);
    expect(
      [...renderToString(<Status state="running" value={100} />).matchAll(/data-segment="(\w+)"/g)].every(
        match => match[1] === 'done',
      ),
    ).toBe(true);
    expect(css).toContain('sprout-status-fade-cycle 1.4s');
  });

  it('clamps the amount and spins when it is unknown', () => {
    expect(attribute(renderToString(<Status state="running" value={140} />), 'aria-label')).toBe('Running, 100%');
    expect(attribute(renderToString(<Status state="running" value={-5} />), 'aria-label')).toBe('Running, 0%');
    for (const value of [null, undefined, Number.NaN]) {
      const html = renderToString(<Status state="running" value={value} />);
      expect(attribute(html, 'data-mark')).toBe('running');
      expect(html).toContain('sprout-status-spin');
      expect(html).not.toContain('data-determinate');
    }
  });

  it('ignores the amount outside running', () => {
    const html = renderToString(<Status state="success" value={40} />);
    expect(attribute(html, 'aria-label')).toBe('Succeeded');
    expect(html).not.toContain('data-determinate');
  });

  it('takes a name, or hides when text beside it says the state', () => {
    expect(attribute(renderToString(<Status state="error" aria-label="Build failed" />), 'aria-label')).toBe(
      'Build failed',
    );
    const hidden = renderToString(<Status state="error" aria-hidden="true" />);
    expect(hidden).not.toContain('role=');
    expect(hidden).not.toContain('aria-label');
    expect(hidden).toContain('aria-hidden="true"');
  });

  it('respects reduced motion and forced colors', () => {
    expect(css).toMatch(/prefers-reduced-motion: no-preference/);
    expect(css).toMatch(
      /prefers-reduced-motion: reduce\)\s*{\s*\.sprout-status-mark\s*{\s*animation: sprout-status-fade/,
    );
    expect(css).toContain('@media (hover: hover) and (pointer: fine)');
    expect(css).toContain('forced-colors: active');
    expect(css).toContain('sprout-status-spin 1s linear infinite');
  });
  it('renders only the mark until its tooltip is first used', () => {
    const html = renderToString(<Status state="success" />);
    expect(html).toMatch(/^<span[^>]*data-slot="status"/);
    expect(html).toContain('aria-label="Succeeded"');
    expect(html).not.toContain('tabindex');
    expect(html).toBe(renderToString(<Status state="success" tooltip={false} />));
  });
});
