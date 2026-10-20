import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import {
  Progress,
  ProgressIndicator,
  ProgressLabel,
  ProgressTrack,
  ProgressValue,
} from '../packages/sprout/src/components/progress.js';
import * as sprout from '../packages/sprout/src/index.js';

const css = readFileSync(new URL('../packages/sprout/src/styles/progress.css', import.meta.url), 'utf8');

const attribute = (html: string, name: string) => html.match(new RegExp(`${name}="([^"]*)"`))?.[1];

describe('Progress', () => {
  it('is exported from the package root and its subpath', () => {
    for (const name of ['Progress', 'ProgressIndicator', 'ProgressLabel', 'ProgressTrack', 'ProgressValue'])
      expect(sprout).toHaveProperty(name);
    const manifest = JSON.parse(readFileSync(new URL('../packages/sprout/package.json', import.meta.url), 'utf8'));
    expect(manifest.exports['./progress']).toEqual({
      types: './dist/components/progress.d.ts',
      import: './dist/components/progress.js',
    });
    expect(readFileSync(new URL('../packages/sprout/src/styles/index.css', import.meta.url), 'utf8')).toContain(
      '@import "./progress.css";',
    );
  });

  it('renders a named bare bar with its own track and indicator', () => {
    const html = renderToString(<Progress value={32} aria-label="Workspace storage used" />);
    expect(html).toContain('role="progressbar"');
    expect(html).toContain('aria-label="Workspace storage used"');
    expect(html).toContain('aria-valuenow="32"');
    expect(html).toContain('aria-valuemin="0"');
    expect(html).toContain('aria-valuemax="100"');
    expect(html).toContain('data-slot="progress"');
    expect(html).toContain('data-slot="progress-track"');
    expect(html).toContain('data-slot="progress-indicator"');
    expect(html).toContain('width:32%');
    expect(html).toContain('data-progressing');
    expect(html).toMatch(/class="sprout-progress"/);
    expect(html).not.toContain('aria-labelledby');
  });

  it('reads custom value text for uploads', () => {
    for (const [sent, size, text] of [
      [3.1, 8.4, 'Uploading 3.1 MB of 8.4 MB'],
      [8.4, 8.4, 'Saving…'],
    ] as const) {
      const html = renderToString(
        <Progress
          value={Math.floor((sent / size) * 100)}
          aria-label="Uploading Q3 board deck.pdf"
          getAriaValueText={() => text}
        />,
      );
      expect(attribute(html, 'aria-valuetext')).toBe(text);
      expect(html).toContain('aria-label="Uploading Q3 board deck.pdf"');
    }
  });

  it('labels the bar and shows the formatted value before the track', () => {
    const html = renderToString(
      <Progress value={40}>
        <ProgressLabel>Progress</ProgressLabel>
        <ProgressValue />
      </Progress>,
    );
    // Base UI links aria-labelledby after hydration; the browser test reads
    // the resulting accessible name.
    expect(html).toMatch(/<span[^>]*id="[^"]+"[^>]*data-slot="progress-label"/);
    expect(html).toMatch(/data-slot="progress-value"[^>]*>40%<\/span>/);
    expect(html.indexOf('progress-value')).toBeLessThan(html.indexOf('progress-track'));
  });

  it('covers empty, complete, and indeterminate values', () => {
    const empty = renderToString(
      <Progress value={0}>
        <ProgressLabel>Progress</ProgressLabel>
        <ProgressValue />
      </Progress>,
    );
    expect(empty).toContain('aria-valuenow="0"');
    expect(empty).toContain('width:0%');
    expect(empty).toMatch(/>0%<\/span>/);

    const complete = renderToString(
      <Progress value={100}>
        <ProgressLabel>Complete</ProgressLabel>
        <ProgressValue />
      </Progress>,
    );
    expect(complete).toContain('data-complete');
    expect(complete).toContain('width:100%');
    expect(complete).toMatch(/>100%<\/span>/);

    const waiting = renderToString(
      <Progress value={null}>
        <ProgressLabel>Waiting</ProgressLabel>
        <ProgressValue />
      </Progress>,
    );
    expect(waiting).toContain('data-indeterminate');
    expect(waiting).not.toContain('aria-valuenow');
    expect(waiting).toMatch(
      /<div data-indeterminate="" data-slot="progress-indicator" class="sprout-progress-indicator"><\/div>/,
    );
    expect(waiting).toMatch(/data-slot="progress-value"[^>]*><\/span>/);
  });

  it('passes classes, state classes, min, max, and format through', () => {
    const html = renderToString(
      <Progress value={3} min={0} max={4} format={{ style: 'decimal' }} className={state => `custom-${state.status}`}>
        <ProgressLabel className="label-extra">Steps</ProgressLabel>
        <ProgressValue>{formatted => `${formatted} of 4`}</ProgressValue>
      </Progress>,
    );
    expect(html).toContain('class="sprout-progress custom-progressing"');
    expect(html).toContain('class="sprout-progress-label label-extra"');
    expect(html).toContain('aria-valuemax="4"');
    expect(html).toContain('width:75%');
    expect(html).toContain('>3 of 4</span>');
  });

  it('exposes the track and indicator for custom bars', () => {
    expect(typeof ProgressTrack).toBe('function');
    expect(typeof ProgressIndicator).toBe('function');
  });

  it('animates within the motion budget and respects reduced motion', () => {
    expect(css).toContain('var(--sprout-motion-normal, 180ms)');
    expect(css).toMatch(/prefers-reduced-motion: reduce\)[\s\S]*animation: none/);
    expect(css).toContain('forced-colors: active');
    expect(css).toContain('var(--sprout-primary)');
    expect(css).toContain(':dir(rtl)');
  });
});
