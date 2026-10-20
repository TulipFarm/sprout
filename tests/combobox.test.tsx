import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxCollection,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxInput,
  ComboboxItem,
  ComboboxLabel,
  ComboboxList,
  ComboboxSeparator,
  ComboboxTrigger,
  ComboboxValue,
  useComboboxAnchor,
} from '../packages/sprout/src/components/combobox.js';
import * as sprout from '../packages/sprout/src/index.js';

const fruits = ['Apple', 'Apricot', 'Blueberry', 'Cherry', 'Pear'];

function tag(html: string, slot: string) {
  const match = html.match(new RegExp(`<([a-z0-9]+)[^>]*data-slot="${slot}"[^>]*>`));
  expect(match, slot).toBeTruthy();
  return match![0];
}

describe('Combobox', () => {
  it('exports every Cloud part from the package root and subpath', () => {
    const parts = {
      Combobox,
      ComboboxChip,
      ComboboxChips,
      ComboboxChipsInput,
      ComboboxCollection,
      ComboboxContent,
      ComboboxEmpty,
      ComboboxGroup,
      ComboboxInput,
      ComboboxItem,
      ComboboxLabel,
      ComboboxList,
      ComboboxSeparator,
      ComboboxTrigger,
      ComboboxValue,
      useComboboxAnchor,
    };
    for (const [name, part] of Object.entries(parts)) {
      expect(sprout, name).toHaveProperty(name, part);
    }
    const manifest = JSON.parse(readFileSync(new URL('../packages/sprout/package.json', import.meta.url), 'utf8'));
    expect(manifest.exports['./combobox']).toEqual({
      types: './dist/components/combobox.d.ts',
      import: './dist/components/combobox.js',
    });
    const css = readFileSync(new URL('../packages/sprout/src/styles/index.css', import.meta.url), 'utf8');
    expect(css).toContain("@import './combobox.css';");
  });

  it('renders a searchable input with a chevron trigger in an input group', () => {
    const html = renderToString(
      <Combobox items={fruits}>
        <ComboboxInput aria-label="Choose a fruit" placeholder="Choose a fruit" />
      </Combobox>,
    );
    const group = tag(html, 'input-group');
    expect(group).toContain('sprout-combobox-input-group');
    const input = tag(html, 'input-group-control');
    expect(input).toMatch(/^<input /);
    expect(input).toContain('role="combobox"');
    expect(input).toContain('aria-expanded="false"');
    expect(input).toContain('aria-label="Choose a fruit"');
    expect(input).toContain('placeholder="Choose a fruit"');
    expect(input).toContain('sprout-input-group-input');
    const trigger = tag(html, 'input-group-button');
    expect(trigger).toMatch(/^<button /);
    expect(trigger).toContain('aria-label="Show options"');
    expect(trigger).toContain('sprout-combobox-input-trigger');
    expect(trigger).toContain('sprout-input-group-button-size-icon-xs');
    expect(html).not.toContain('<select');
  });

  it('hides the trigger with showTrigger false and adds a clear button with showClear and a value', () => {
    const bare = renderToString(
      <Combobox items={fruits}>
        <ComboboxInput aria-label="Fruit" showTrigger={false} />
      </Combobox>,
    );
    expect(bare).not.toContain('data-slot="input-group-button"');
    expect(bare).not.toContain('data-slot="combobox-clear"');

    const cleared = renderToString(
      <Combobox items={fruits} defaultValue="Cherry">
        <ComboboxInput aria-label="Fruit" showClear />
      </Combobox>,
    );
    expect(tag(cleared, 'combobox-clear')).toContain('aria-label="Clear selection"');
    expect(tag(cleared, 'input-group-control')).toContain('value="Cherry"');
  });

  it('passes className to the group and children after the addon', () => {
    const html = renderToString(
      <Combobox items={fruits}>
        <ComboboxInput aria-label="Fruit" className="max-w-xs">
          <span data-slot="extra">Icon</span>
        </ComboboxInput>
      </Combobox>,
    );
    expect(tag(html, 'input-group')).toContain('max-w-xs');
    expect(html.indexOf('data-slot="input-group-addon"')).toBeLessThan(html.indexOf('data-slot="extra"'));
  });

  it('disables the input and its buttons', () => {
    const html = renderToString(
      <Combobox items={fruits} disabled>
        <ComboboxInput aria-label="Disabled fruit choice" placeholder="Disabled" />
      </Combobox>,
    );
    expect(tag(html, 'input-group-control')).toContain('disabled');
    expect(tag(html, 'input-group-button')).toMatch(/disabled/);
  });

  it('renders chips with remove buttons, showRemove false, and a chips input', () => {
    const html = renderToString(
      <Combobox items={fruits} multiple defaultValue={['Apple', 'Pear']}>
        <ComboboxChips>
          <ComboboxValue>
            {(values: string[]) =>
              values.map(value => (
                <ComboboxChip key={value} showRemove={value !== 'Pear'}>
                  {value}
                </ComboboxChip>
              ))
            }
          </ComboboxValue>
          <ComboboxChipsInput aria-label="Add fruit" placeholder="Add fruit" />
        </ComboboxChips>
      </Combobox>,
    );
    expect(tag(html, 'combobox-chips')).toContain('sprout-combobox-chips');
    expect(html.match(/data-slot="combobox-chip"/g)).toHaveLength(2);
    expect(html.match(/data-slot="combobox-chip-remove"/g)).toHaveLength(1);
    expect(tag(html, 'combobox-chip-remove')).toContain('aria-label="Remove Apple"');
    const input = tag(html, 'combobox-chip-input');
    expect(input).toContain('role="combobox"');
    expect(input).toContain('sprout-combobox-chips-input');
  });

  it("names a childless trigger and keeps a labelled trigger's children", () => {
    const icon = renderToString(
      <Combobox items={fruits}>
        <ComboboxTrigger />
      </Combobox>,
    );
    expect(tag(icon, 'combobox-trigger')).toContain('aria-label="Show options"');
    const labelled = renderToString(
      <Combobox items={fruits} defaultValue="Pear">
        <ComboboxTrigger>
          <ComboboxValue />
        </ComboboxTrigger>
      </Combobox>,
    );
    expect(tag(labelled, 'combobox-trigger')).not.toContain('aria-label');
    expect(labelled).toContain('Pear');
    expect(labelled).toContain('sprout-combobox-trigger-icon');
  });
});
