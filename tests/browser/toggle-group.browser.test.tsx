import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import {
  ToggleGroup,
  ToggleGroupItem,
  type ToggleGroupSize,
  type ToggleGroupVariant,
} from '../../packages/sprout/src/components/toggle-group.js';
import { axeViolations, emulate, setTheme, themes } from './support.js';

function glyph(d: string) {
  return function Glyph(props: { 'aria-hidden'?: 'true' }) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} {...props}>
        <path d={d} />
      </svg>
    );
  };
}
const Bold = glyph('M7 5h6a3.5 3.5 0 0 1 0 7H7zm0 7h7a3.5 3.5 0 0 1 0 7H7z');
const Italic = glyph('M10 5h8M6 19h8M14 5l-4 14');
const Underline = glyph('M7 4v7a5 5 0 0 0 10 0V4M5 20h14');

function colorOf(value: string) {
  const probe = document.createElement('span');
  probe.style.color = value;
  document.body.append(probe);
  const result = getComputedStyle(probe).color;
  probe.remove();
  return result;
}

const button = (name: string) => page.getByRole('button', { name, exact: true });
const el = (name: string) => button(name).element() as HTMLElement;
const css = (name: string) => getComputedStyle(el(name));

function Single() {
  const [value, setValue] = useState(['model']);
  return (
    <ToggleGroup
      aria-label="Split usage by"
      variant="outline"
      size="sm"
      spacing={0}
      value={value}
      onValueChange={next => {
        if (next.length) setValue(next);
      }}
    >
      <ToggleGroupItem value="model">Model</ToggleGroupItem>
      <ToggleGroupItem value="agent">Agent</ToggleGroupItem>
      <ToggleGroupItem value="user">User</ToggleGroupItem>
    </ToggleGroup>
  );
}

function Theme() {
  return (
    <>
      <ToggleGroup aria-label="Theme" variant="outline" defaultValue={['system']}>
        <ToggleGroupItem value="system">System</ToggleGroupItem>
        <ToggleGroupItem value="light">Light</ToggleGroupItem>
        <ToggleGroupItem value="dark">Dark</ToggleGroupItem>
      </ToggleGroup>
      <button type="button" style={{ minWidth: 24, minHeight: 24 }}>
        After
      </button>
    </>
  );
}

function TextStyle() {
  return (
    <ToggleGroup
      aria-label="Text style"
      variant="outline"
      orientation="vertical"
      spacing={0}
      multiple
      defaultValue={['bold']}
    >
      <ToggleGroupItem value="bold" aria-label="Bold">
        <Bold aria-hidden="true" />
      </ToggleGroupItem>
      <ToggleGroupItem value="italic" aria-label="Italic">
        <Italic aria-hidden="true" />
      </ToggleGroupItem>
      <ToggleGroupItem value="underline" aria-label="Underline">
        <Underline aria-hidden="true" />
      </ToggleGroupItem>
    </ToggleGroup>
  );
}

describe('ToggleGroup in a real browser', () => {
  it.each(themes)('%s %s presses with the primary tokens', async (theme, mode) => {
    await emulate({ reducedMotion: true });
    setTheme(theme, mode);
    await render(<Single />);
    expect(el('Model')).toHaveAttribute('aria-pressed', 'true');
    expect(css('Model').color).toBe(colorOf('var(--sprout-primary)'));
    expect(css('Model').backgroundColor).toBe(colorOf('var(--sprout-primary-subtle)'));
  });

  it('sizes, variants, and spacing render at Cloud dimensions', async () => {
    const heights = { sm: '28px', default: '32px', lg: '36px' } as const;
    const variants: ToggleGroupVariant[] = ['default', 'outline'];
    await render(
      <div style={{ display: 'grid', gap: 8 }}>
        {variants.flatMap(variant =>
          (Object.keys(heights) as ToggleGroupSize[]).map(size => (
            <ToggleGroup key={variant + size} aria-label={`${variant} ${size}`} variant={variant} size={size}>
              <ToggleGroupItem value="a">{`${variant} ${size} a`}</ToggleGroupItem>
              <ToggleGroupItem value="b">b</ToggleGroupItem>
            </ToggleGroup>
          )),
        )}
        <ToggleGroup aria-label="Format" variant="outline">
          <ToggleGroupItem value="bold" aria-label="Bold">
            <Bold aria-hidden="true" />
          </ToggleGroupItem>
          <ToggleGroupItem value="underline" aria-label="Underline" disabled>
            <Underline aria-hidden="true" />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>,
    );
    for (const variant of variants)
      for (const [size, height] of Object.entries(heights)) {
        const group = page.getByRole('group', { name: `${variant} ${size}` }).element();
        expect(group).toHaveAttribute('data-variant', variant);
        expect(group).toHaveAttribute('data-size', size);
        expect(getComputedStyle(group).columnGap).toBe('8px');
        const item = css(`${variant} ${size} a`);
        expect(item.height).toBe(height);
        expect(item.borderTopColor).toBe(variant === 'outline' ? colorOf('var(--sprout-input)') : 'rgba(0, 0, 0, 0)');
        expect(item.fontSize).toBe(size === 'sm' ? '12px' : '14px');
      }
    expect(css('Bold').minWidth).toBe('32px');
    // Cloud pads icon-only items 10px on each side of the 16px icon.
    expect(css('Bold').paddingLeft).toBe('10px');
    expect(getComputedStyle(el('Bold').querySelector('svg')!).width).toBe('16px');
    expect(el('Underline')).toBeDisabled();
    expect(css('Underline').opacity).toBe('0.5');
  });

  it('joins segmented items with shared borders and outer corners only', async () => {
    await render(<Single />);
    const group = page.getByRole('group', { name: 'Split usage by' }).element();
    expect(getComputedStyle(group).columnGap).toBe('0px');
    expect(css('Model').borderTopRightRadius).toBe('0px');
    expect(css('Model').borderLeftWidth).toBe('1px');
    expect(css('User').borderLeftWidth).toBe('0px');
    expect(css('User').borderTopLeftRadius).toBe('0px');
    expect(css('User').borderTopRightRadius).not.toBe('0px');
    const a = el('Model').getBoundingClientRect();
    const b = el('Agent').getBoundingClientRect();
    expect(Math.round(b.left)).toBe(Math.round(a.right));
  });

  it('keeps a controlled single selection from clearing', async () => {
    await render(<Single />);
    await button('Agent').click();
    await expect.element(button('Agent')).toHaveAttribute('aria-pressed', 'true');
    await expect.element(button('Model')).toHaveAttribute('aria-pressed', 'false');
    await button('Agent').click();
    await expect.element(button('Agent')).toHaveAttribute('aria-pressed', 'true');
  });

  it('moves with arrows, Home, and End, presses with Space and Enter, and leaves on Tab', async () => {
    await render(<Theme />);
    await userEvent.tab();
    await expect.element(button('System')).toHaveFocus();
    expect(css('System').outlineStyle).toBe('solid');
    await userEvent.keyboard('{ArrowRight}');
    await expect.element(button('Light')).toHaveFocus();
    await userEvent.keyboard(' ');
    await expect.element(button('Light')).toHaveAttribute('aria-pressed', 'true');
    await userEvent.keyboard('{End}');
    await expect.element(button('Dark')).toHaveFocus();
    await userEvent.keyboard('{ArrowRight}');
    await expect.element(button('System')).toHaveFocus();
    await userEvent.keyboard('{ArrowLeft}');
    await expect.element(button('Dark')).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    await expect.element(button('Dark')).toHaveAttribute('aria-pressed', 'true');
    await userEvent.keyboard('{Home}');
    await expect.element(button('System')).toHaveFocus();
    await userEvent.tab();
    await expect.element(button('After')).toHaveFocus();
  });

  it('stacks vertical groups and moves with up and down arrows', async () => {
    await render(<TextStyle />);
    const group = page.getByRole('group', { name: 'Text style' }).element();
    expect(group).toHaveAttribute('data-orientation', 'vertical');
    el('Bold').focus();
    await userEvent.keyboard('{ArrowDown}');
    await expect.element(button('Italic')).toHaveFocus();
    await userEvent.keyboard('{ArrowDown}');
    await userEvent.keyboard(' ');
    await expect.element(button('Underline')).toHaveAttribute('aria-pressed', 'true');
    await expect.element(button('Bold')).toHaveAttribute('aria-pressed', 'true');
    await userEvent.keyboard('{ArrowUp}');
    await userEvent.keyboard(' ');
    await expect.element(button('Italic')).toHaveAttribute('aria-pressed', 'true');
    const bold = el('Bold').getBoundingClientRect();
    const italic = el('Italic').getBoundingClientRect();
    expect(italic.top).toBeGreaterThan(bold.top);
    expect(Math.round(italic.left)).toBe(Math.round(bold.left));
    expect(css('Italic').borderTopWidth).toBe('0px');
  });

  it('disables every item when the group is disabled', async () => {
    await render(
      <ToggleGroup aria-label="Layout" size="sm" variant="outline" disabled>
        <ToggleGroupItem value="list">List</ToggleGroupItem>
        <ToggleGroupItem value="board">
          <Bold aria-hidden="true" />
          Board
        </ToggleGroupItem>
      </ToggleGroup>,
    );
    const group = page.getByRole('group', { name: 'Layout' }).element();
    expect(group).toHaveAttribute('data-disabled', '');
    expect(el('List')).toBeDisabled();
    expect(el('Board')).toBeDisabled();
    expect(getComputedStyle(el('Board').querySelector('svg')!).width).toBe('14px');
  });

  it('transitions colors in 0.12s and drops it under reduced motion', async () => {
    await render(<Single />);
    expect(css('Agent').transitionDuration).toMatch(/^0\.12s/);
    await emulate({ reducedMotion: true });
    expect(css('Agent').transitionDuration).toBe('0s');
  });

  it('stays inside a phone viewport', async () => {
    await page.viewport(320, 640);
    await render(
      <>
        <Single />
        <Theme />
        <TextStyle />
      </>,
    );
    for (const group of document.querySelectorAll('[role="group"]')) {
      const rect = group.getBoundingClientRect();
      expect(rect.left).toBeGreaterThanOrEqual(0);
      expect(rect.right).toBeLessThanOrEqual(320);
    }
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(320);
  });

  it.each(themes)('%s %s passes axe', async (theme, mode) => {
    setTheme(theme, mode);
    const screen = await render(
      <>
        <Single />
        <Theme />
        <TextStyle />
      </>,
    );
    expect(await axeViolations(screen.container)).toEqual([]);
  });
});
