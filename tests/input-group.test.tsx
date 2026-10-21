import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
  InputGroupTextarea,
  inputGroupAddonAlignNames,
  inputGroupButtonSizeNames,
  inputGroupSizeNames,
  inputGroupVariantNames,
} from '../packages/sprout/src/components/input-group.js';
import { Field } from '../packages/sprout/src/components/field.js';
import * as sprout from '../packages/sprout/src/index.js';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');
const css = read('../packages/sprout/src/styles/input-group.css');

describe('InputGroup', () => {
  it('is exported from the package root, its subpath, the CSS entry, and the docs', () => {
    for (const name of [
      'InputGroup',
      'InputGroupAddon',
      'InputGroupButton',
      'InputGroupInput',
      'InputGroupText',
      'InputGroupTextarea',
      'inputGroupAddonAlignNames',
      'inputGroupButtonSizeNames',
      'inputGroupSizeNames',
      'inputGroupVariantNames',
    ]) {
      expect(sprout).toHaveProperty(name);
    }
    const pkg = JSON.parse(read('../packages/sprout/package.json'));
    expect(pkg.exports['./input-group']).toEqual({
      types: './dist/components/input-group.d.ts',
      import: './dist/components/input-group.js',
    });
    expect(read('../packages/sprout/src/styles/index.css')).toContain("@import './input-group.css';");
    expect(read('../apps/docs/src/data/nav.ts')).toContain("'Input Group'");
  });

  it('names every Cloud size, variant, alignment, and button size', () => {
    expect(inputGroupSizeNames).toEqual(['md', 'sm', 'lg']);
    expect(inputGroupVariantNames).toEqual(['default', 'composer', 'question-composer']);
    expect(inputGroupAddonAlignNames).toEqual(['inline-start', 'inline-end', 'block-start', 'block-end']);
    expect(inputGroupButtonSizeNames).toEqual(['md', 'icon']);
  });

  it('renders a group with defaults and merges classes', () => {
    const html = renderToString(
      <InputGroup className="w-auto">
        <InputGroupInput aria-label="Search" />
      </InputGroup>,
    );
    expect(html).toMatch(/^<div[^>]*role="group"/);
    expect(html).toContain('data-slot="input-group"');
    expect(html).toContain('data-size="md"');
    expect(html).toContain('data-variant="default"');
    expect(html).toContain(
      'class="sprout-input-group sprout-input-group-size-md sprout-input-group-variant-default w-auto"',
    );
  });

  it('renders every size and variant', () => {
    for (const size of inputGroupSizeNames) {
      const html = renderToString(<InputGroup size={size} />);
      expect(html).toContain(`data-size="${size}"`);
      expect(html).toContain(`sprout-input-group-size-${size}`);
    }
    for (const variant of inputGroupVariantNames) {
      const html = renderToString(<InputGroup variant={variant} />);
      expect(html).toContain(`data-variant="${variant}"`);
      expect(html).toContain(`sprout-input-group-variant-${variant}`);
    }
    expect(css).toContain('.sprout-input-group-size-lg');
    expect(css).toContain('.sprout-input-group-variant-composer');
    expect(css).toContain('.sprout-input-group-variant-question-composer');
  });

  it('renders addons with every alignment', () => {
    expect(renderToString(<InputGroupAddon />)).toContain('data-align="inline-start"');
    for (const align of inputGroupAddonAlignNames) {
      const html = renderToString(
        <InputGroupAddon align={align}>
          <InputGroupText>app.tulipfarm.ai/</InputGroupText>
        </InputGroupAddon>,
      );
      expect(html).toContain('role="group"');
      expect(html).toContain('data-slot="input-group-addon"');
      expect(html).toContain(`data-align="${align}"`);
      expect(html).toContain(`sprout-input-group-addon-align-${align}`);
      expect(html).toContain('data-slot="input-group-text"');
      expect(css).toContain(`.sprout-input-group-addon-align-${align}`);
    }
  });

  it('renders ghost default type=button buttons by default and every size', () => {
    const html = renderToString(<InputGroupButton>Copy</InputGroupButton>);
    expect(html).toContain('type="button"');
    expect(html).toContain('data-size="md"');
    expect(html).toContain('data-variant="ghost"');
    expect(html).toContain('sprout-button-variant-ghost');
    expect(html).toContain('sprout-input-group-button-size-md');
    for (const size of inputGroupButtonSizeNames) {
      const sized = renderToString(
        <InputGroupButton size={size} variant="default" type="submit" aria-label="Send message" />,
      );
      expect(sized).toContain(`data-size="${size}"`);
      expect(sized).toContain('type="submit"');
      expect(sized).toContain('sprout-button-variant-default');
      expect(sized).toContain(`sprout-input-group-button-size-${size}`);
    }
    const busy = renderToString(<InputGroupButton variant="secondary" disabled aria-busy />);
    expect(busy).toContain('disabled=""');
    expect(busy).toContain('aria-busy="true"');
  });

  it('marks the input and textarea as the group control and keeps native props', () => {
    const input = renderToString(
      <InputGroupInput
        id="workspace-slug"
        name="workspace-slug"
        maxLength={48}
        required
        aria-invalid
        aria-describedby="workspace-slug-hint"
        className="extra"
      />,
    );
    expect(input).toMatch(/^<input/);
    expect(input).toContain('data-slot="input-group-control"');
    expect(input).toContain('maxLength="48"');
    expect(input).toContain('aria-invalid="true"');
    expect(input).toContain('sprout-input sprout-input-scale-md sprout-input-group-input extra');
    const textarea = renderToString(<InputGroupTextarea aria-label="Draft message" placeholder="Write something…" />);
    expect(textarea).toMatch(/^<textarea/);
    expect(textarea).toContain('data-slot="input-group-control"');
    expect(textarea).toContain('data-variant="embedded"');
    expect(textarea).toContain('sprout-input-group-textarea');
  });

  it('reads a surrounding Field through the group', () => {
    const html = renderToString(
      <Field label="Workspace URL" required error="Enter a workspace URL." id="slug">
        <InputGroup size="lg">
          <InputGroupAddon>
            <InputGroupText>app.tulipfarm.ai/</InputGroupText>
          </InputGroupAddon>
          <InputGroupInput />
        </InputGroup>
      </Field>,
    );
    expect(html).toContain('id="slug"');
    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain('aria-describedby="slug-error"');
  });

  it('styles focus, invalid, disabled, block layout, and reduced motion from the control', () => {
    expect(css).toContain(".sprout-input-group:has([data-slot='input-group-control']:focus-visible)");
    expect(css).toContain("[data-slot='input-group-control'][aria-invalid='true']");
    expect(css).toContain("[data-slot='input-group-control']:disabled");
    expect(css).toContain(".sprout-input-group:has(> [data-align='block-end'])");
    expect(css).toContain("[data-slot='combobox-content']");
    expect(css).toContain('@media (pointer: coarse)');
    expect(css).toContain('@media (prefers-reduced-motion: no-preference)');
    expect(css).toContain('@media (forced-colors: active)');
    expect(css).not.toMatch(/#[0-9a-f]{3,6}\b/i);
  });
});
