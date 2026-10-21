import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import {
  ToggleGroup,
  ToggleGroupItem,
  toggleGroupSizeNames,
  toggleGroupVariantNames,
} from '../packages/sprout/src/components/toggle-group.js';
import * as sprout from '../packages/sprout/src/index.js';

describe('ToggleGroup', () => {
  it('is exported from the package root', () => {
    for (const name of ['ToggleGroup', 'ToggleGroupItem', 'toggleGroupVariantNames', 'toggleGroupSizeNames']) {
      expect(sprout).toHaveProperty(name);
    }
    expect(toggleGroupVariantNames).toEqual(['default', 'outline']);
    expect(toggleGroupSizeNames).toEqual(['md', 'sm', 'lg']);
  });

  it('renders a named Base UI group with default variant, size, and spacing', () => {
    const html = renderToString(
      <ToggleGroup aria-label="Text style" defaultValue={['bold']}>
        <ToggleGroupItem value="bold" aria-label="Bold" />
        <ToggleGroupItem value="italic" aria-label="Italic" />
      </ToggleGroup>,
    );
    expect(html).toContain('role="group"');
    expect(html).toContain('aria-label="Text style"');
    expect(html).toContain('data-slot="toggle-group"');
    expect(html).toContain('data-orientation="horizontal"');
    expect(html).toContain('data-variant="default"');
    expect(html).toContain('data-size="md"');
    expect(html).toContain('data-spacing="2"');
    expect(html).toContain('--sprout-toggle-group-spacing:2');
    expect(html).toContain(
      'class="sprout-toggle-group-item sprout-toggle-group-item-default sprout-toggle-group-item-size-md"',
    );
    expect(html.match(/aria-pressed="true"/g)).toHaveLength(1);
    expect(html.match(/aria-pressed="false"/g)).toHaveLength(1);
  });

  it('passes every variant, size, spacing, and orientation to items', () => {
    for (const variant of toggleGroupVariantNames) {
      for (const size of toggleGroupSizeNames) {
        for (const orientation of ['horizontal', 'vertical'] as const) {
          const html = renderToString(
            <ToggleGroup variant={variant} size={size} spacing={0} orientation={orientation}>
              <ToggleGroupItem value="a">A</ToggleGroupItem>
            </ToggleGroup>,
          );
          expect(html).toContain(`sprout-toggle-group-item-${variant}`);
          expect(html).toContain(`sprout-toggle-group-item-size-${size}`);
          expect(html.match(/data-spacing="0"/g)).toHaveLength(2);
          expect(html.match(new RegExp(`data-orientation="${orientation}"`, 'g'))).toHaveLength(2);
        }
      }
    }
  });

  it('presses every value in a multiple group and marks disabled state', () => {
    const html = renderToString(
      <ToggleGroup multiple defaultValue={['bold', 'italic']} disabled>
        <ToggleGroupItem value="bold">Bold</ToggleGroupItem>
        <ToggleGroupItem value="italic">Italic</ToggleGroupItem>
      </ToggleGroup>,
    );
    expect(html).toContain('data-multiple');
    expect(html.match(/aria-pressed="true"/g)).toHaveLength(2);
    expect(html.match(/data-disabled/g)!.length).toBeGreaterThanOrEqual(3);
    const item = renderToString(
      <ToggleGroup value={['7']}>
        <ToggleGroupItem value="7">7d</ToggleGroupItem>
        <ToggleGroupItem value="30" disabled>
          30d
        </ToggleGroupItem>
      </ToggleGroup>,
    );
    expect(item.match(/\sdisabled=""/g)).toHaveLength(1);
  });

  it('merges class names, style, and state functions', () => {
    const html = renderToString(
      <ToggleGroup className={state => `is-${state.orientation}`} style={{ marginTop: 4 }} spacing={1}>
        <ToggleGroupItem value="a" className={state => (state.pressed ? 'on' : 'off')}>
          A
        </ToggleGroupItem>
      </ToggleGroup>,
    );
    expect(html).toContain('class="sprout-toggle-group is-horizontal"');
    expect(html).toContain('--sprout-toggle-group-spacing:1');
    expect(html).toContain('margin-top:4px');
    expect(html).toContain('sprout-toggle-group-item-size-md off');
  });
});
