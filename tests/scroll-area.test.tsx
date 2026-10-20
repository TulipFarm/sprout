import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import {
  ScrollArea,
  ScrollBar,
  scrollAreaOrientationNames,
  scrollAreaSizeNames,
  scrollAreaVariantNames,
} from '../packages/sprout/src/components/scroll-area.js';
import * as sprout from '../packages/sprout/src/index.js';

describe('ScrollArea', () => {
  it('is exported from the package root', () => {
    for (const name of [
      'ScrollArea',
      'ScrollBar',
      'scrollAreaSizeNames',
      'scrollAreaVariantNames',
      'scrollAreaOrientationNames',
    ]) {
      expect(sprout).toHaveProperty(name);
    }
    expect(scrollAreaSizeNames).toEqual(['auto', 'sm', 'md']);
    expect(scrollAreaVariantNames).toEqual(['plain', 'table']);
    expect(scrollAreaOrientationNames).toEqual(['vertical', 'horizontal', 'both']);
  });

  it('renders a plain auto root with a viewport by default', () => {
    const html = renderToString(
      <ScrollArea>
        <p>Sample record 1 · Meadow project</p>
      </ScrollArea>,
    );
    expect(html).toContain('data-slot="scroll-area"');
    expect(html).toContain('data-size="auto"');
    expect(html).toContain('data-variant="plain"');
    expect(html).toContain('class="sprout-scroll-area"');
    expect(html).toContain('data-slot="scroll-area-viewport"');
    expect(html).toMatch(/class="sprout-scroll-area-viewport[ "]/);
    expect(html).not.toContain('role="region"');
    expect(html).toContain('Sample record 1 · Meadow project');
  });

  it('supports every size, variant, and orientation', () => {
    for (const size of scrollAreaSizeNames) {
      for (const variant of scrollAreaVariantNames) {
        for (const orientation of scrollAreaOrientationNames) {
          const html = renderToString(
            <ScrollArea size={size} variant={variant} orientation={orientation}>
              <p>Row</p>
            </ScrollArea>,
          );
          expect(html).toContain(`data-size="${size}"`);
          expect(html).toContain(`data-variant="${variant}"`);
        }
      }
    }
  });

  it('makes the table viewport a region named by viewportLabel', () => {
    const html = renderToString(
      <ScrollArea variant="table" orientation="both" viewportLabel="Bulb plantings" data-slot="table-container">
        <table aria-label="Bulb plantings" />
      </ScrollArea>,
    );
    expect(html).toContain('role="region"');
    expect(html).toContain('aria-label="Bulb plantings"');
    // Cloud's Table overrides the root slot to table-container.
    expect(html).toMatch(/<div role="presentation"[^>]*data-slot="table-container"/);
    expect(html).toContain('data-slot="scroll-area-viewport"');
  });

  it('labels a plain viewport without a region role', () => {
    const html = renderToString(
      <ScrollArea size="sm" viewportLabel="sm sample records">
        <p>Row</p>
      </ScrollArea>,
    );
    expect(html).toContain('aria-label="sm sample records"');
    expect(html).not.toContain('role="region"');
  });

  it('merges string and state class names and passes props through', () => {
    const plain = renderToString(
      <ScrollArea className="h-72" id="activity" data-x="1">
        <p>Row</p>
      </ScrollArea>,
    );
    expect(plain).toContain('class="sprout-scroll-area h-72"');
    expect(plain).toContain('id="activity"');
    expect(plain).toContain('data-x="1"');
    const fn = renderToString(
      <ScrollArea className={() => 'from-state'}>
        <p>Row</p>
      </ScrollArea>,
    );
    expect(fn).toContain('class="sprout-scroll-area from-state"');
  });

  it('renders a ScrollBar track and thumb for each orientation', () => {
    for (const orientation of ['vertical', 'horizontal'] as const) {
      const html = renderToString(
        <ScrollArea orientation="vertical">
          <ScrollBar keepMounted orientation={orientation} className="custom-bar" />
        </ScrollArea>,
      );
      expect(html).toContain('data-slot="scroll-area-scrollbar"');
      expect(html).toContain(`data-orientation="${orientation}"`);
      expect(html).toContain('sprout-scroll-area-scrollbar custom-bar');
      expect(html).toContain('data-slot="scroll-area-thumb"');
    }
  });
});
