import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import { Kbd, KbdGroup, kbdVariantNames } from '../packages/sprout/src/components/kbd.js';
import * as sprout from '../packages/sprout/src/index.js';

describe('Kbd', () => {
  it('is exported from the package root', () => {
    for (const name of ['Kbd', 'KbdGroup', 'kbdVariantNames']) expect(sprout).toHaveProperty(name);
    expect(kbdVariantNames).toEqual(['default', 'outline']);
  });

  it('renders a kbd with slot, default variant, and children', () => {
    const html = renderToString(<Kbd>⌘</Kbd>);
    expect(html).toBe('<kbd data-slot="kbd" data-variant="default" class="sprout-kbd">⌘</kbd>');
  });

  it('supports every variant with realistic keys', () => {
    for (const variant of kbdVariantNames)
      for (const key of ['⌘', 'Enter', 'Esc', '↑ ↓', '[ ]']) {
        const html = renderToString(<Kbd variant={variant}>{key}</Kbd>);
        expect(html).toContain(`data-variant="${variant}"`);
        expect(html).toContain(`>${key}</kbd>`);
      }
  });

  it('passes attributes and merges classes', () => {
    const html = renderToString(
      <Kbd variant="outline" aria-hidden="true" className="hidden" id="enter" title="Enter">
        ↵
      </Kbd>,
    );
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('id="enter"');
    expect(html).toContain('title="Enter"');
    expect(html).toContain('class="sprout-kbd hidden"');
  });

  it('keeps icons and text together inside a key', () => {
    const html = renderToString(
      <Kbd>
        <svg aria-hidden="true" />
        Cmd
      </Kbd>,
    );
    expect(html).toContain('<svg aria-hidden="true"></svg>Cmd</kbd>');
  });

  it('groups keys inside a kbd', () => {
    const html = renderToString(
      <KbdGroup className="ml-2">
        <Kbd>⌘</Kbd>
        <Kbd>K</Kbd>
      </KbdGroup>,
    );
    expect(html).toMatch(/^<kbd data-slot="kbd-group" class="sprout-kbd-group ml-2"><kbd data-slot="kbd"/);
    expect(html.match(/data-slot="kbd"/g)).toHaveLength(2);
    expect(html).toContain('>K</kbd></kbd>');
  });

  it('renders inline in text', () => {
    const html = renderToString(
      <p>
        Press <Kbd>Esc</Kbd> to close.
      </p>,
    );
    expect(html).toContain('Press <kbd');
    expect(html).toContain('>Esc</kbd> to close.');
  });
});
