import { describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { useState } from 'react';
import { Button } from '../../packages/sprout/src/components/button.js';
import {
  ButtonGroup,
  ButtonGroupSeparator,
  ButtonGroupText,
} from '../../packages/sprout/src/components/button-group.js';
import { axeViolations, emulate, setTheme, settle, themes } from './support.js';

const Plus = () => (
  <svg viewBox="0 0 16 16" aria-hidden="true">
    <path d="M8 2v12M2 8h12" stroke="currentColor" />
  </svg>
);

function Pager({ orientation = 'horizontal' }: { orientation?: 'horizontal' | 'vertical' }) {
  const [pageNumber, setPage] = useState(1);
  const [count, setCount] = useState(1);
  const across = orientation === 'horizontal' ? 'vertical' : 'horizontal';
  return (
    <div style={{ display: 'grid', gap: 8, justifyItems: 'start' }}>
      <ButtonGroup orientation={orientation} aria-label={`${orientation} pages`}>
        <Button variant="secondary" disabled={pageNumber === 1} onClick={() => setPage(pageNumber - 1)}>
          Previous
        </Button>
        <ButtonGroupSeparator orientation={across} />
        <Button variant="secondary" disabled={pageNumber === 3} onClick={() => setPage(pageNumber + 1)}>
          Next
        </Button>
      </ButtonGroup>
      <p role="status">Page {pageNumber} of 3</p>
      <ButtonGroup orientation={orientation} aria-label={`${orientation} quantity`}>
        <ButtonGroupText>Quantity: {count}</ButtonGroupText>
        <Button variant="outline" size="icon" aria-label="Add one" onClick={() => setCount(count + 1)}>
          <Plus />
        </Button>
      </ButtonGroup>
    </div>
  );
}

function radius() {
  const probe = document.createElement('div');
  probe.style.borderRadius = 'var(--sprout-radius-control)';
  document.body.append(probe);
  const value = getComputedStyle(probe).borderTopLeftRadius;
  probe.remove();
  return value;
}

function colorOf(value: string) {
  const probe = document.createElement('span');
  probe.style.color = value;
  document.body.append(probe);
  const color = getComputedStyle(probe).color;
  probe.remove();
  return color;
}

function corners(node: Element) {
  const style = getComputedStyle(node);
  return {
    tl: style.borderTopLeftRadius,
    tr: style.borderTopRightRadius,
    br: style.borderBottomRightRadius,
    bl: style.borderBottomLeftRadius,
    top: style.borderTopWidth,
    left: style.borderLeftWidth,
  };
}

const group = (name: string) => page.getByRole('group', { name }).element();
const button = (scope: Element, name: string) =>
  [...scope.querySelectorAll('button')].find(node => (node.getAttribute('aria-label') ?? node.textContent) === name)!;
const box = (node: Element) => node.getBoundingClientRect();

describe('ButtonGroup in a real browser', () => {
  it.each(themes)('%s %s passes axe and paints text and separators', async (theme, mode) => {
    await emulate({ reducedMotion: true });
    setTheme(theme, mode);
    const screen = await render(
      <div style={{ display: 'flex', gap: 24, padding: 16 }}>
        <Pager />
        <Pager orientation="vertical" />
      </div>,
    );
    await settle();
    const text = screen.container.querySelector('[data-slot="button-group-text"]')!;
    expect(getComputedStyle(text).backgroundColor).toBe(colorOf('var(--sprout-secondary)'));
    expect(getComputedStyle(text).borderTopColor).toBe(colorOf('var(--sprout-input)'));
    expect(
      getComputedStyle(screen.container.querySelector('[data-slot="button-group-separator"]')!).backgroundColor,
    ).toBe(colorOf('var(--sprout-input)'));
    expect(await axeViolations(screen.container)).toEqual([]);
  });

  it('horizontal groups join buttons and separators', async () => {
    await render(<Pager />);
    const r = radius();
    const pager = group('horizontal pages');
    expect(getComputedStyle(pager).flexDirection).toBe('row');
    const previous = button(pager, 'Previous');
    const next = button(pager, 'Next');
    const separator = pager.querySelector('[data-slot="button-group-separator"]')!;
    expect(corners(previous)).toMatchObject({
      tl: r,
      bl: r,
      tr: '0px',
      br: '0px',
      left: '1px',
    });
    expect(corners(next)).toMatchObject({
      tl: '0px',
      bl: '0px',
      tr: r,
      br: r,
      left: '0px',
    });
    const p = box(previous);
    const s = box(separator);
    const n = box(next);
    expect(Math.round(s.width)).toBe(1);
    expect(Math.round(s.height)).toBe(Math.round(p.height) - 2);
    expect(Math.round(s.x - p.right)).toBe(0);
    expect(Math.round(n.x - s.right)).toBe(0);
    expect(Math.round(p.height)).toBe(32);
    const quantity = group('horizontal quantity');
    const text = quantity.querySelector('[data-slot="button-group-text"]')!;
    const add = button(quantity, 'Add one');
    expect(corners(text)).toMatchObject({ tr: '0px', tl: r });
    expect(corners(add)).toMatchObject({ tl: '0px', tr: r, left: '0px' });
    expect(Math.round(box(text).height)).toBe(Math.round(box(add).height));
    expect(getComputedStyle(add.querySelector('svg')!).width).toBe('16px');
  });

  it('vertical groups stack and join top to bottom', async () => {
    await render(<Pager orientation="vertical" />);
    const r = radius();
    const pager = group('vertical pages');
    expect(getComputedStyle(pager).flexDirection).toBe('column');
    const previous = button(pager, 'Previous');
    const next = button(pager, 'Next');
    const separator = pager.querySelector('[data-slot="button-group-separator"]')!;
    expect(corners(previous)).toMatchObject({
      tl: r,
      tr: r,
      bl: '0px',
      br: '0px',
    });
    expect(corners(next)).toMatchObject({
      tl: '0px',
      tr: '0px',
      bl: r,
      br: r,
      top: '0px',
    });
    const s = box(separator);
    const g = box(pager);
    expect(Math.round(s.height)).toBe(1);
    expect(Math.round(s.width)).toBe(Math.round(g.width) - 2);
    expect(Math.round(box(previous).width)).toBe(Math.round(g.width));
    expect(Math.round(box(next).y - s.bottom)).toBe(0);
    const quantity = group('vertical quantity');
    expect(corners(quantity.querySelector('[data-slot="button-group-text"]')!)).toMatchObject({ bl: '0px', tl: r });
    expect(corners(button(quantity, 'Add one'))).toMatchObject({
      tl: '0px',
      top: '0px',
      bl: r,
    });
  });

  it('keyboard moves through the group and lifts the focused ring', async () => {
    await render(<Pager />);
    const pager = group('horizontal pages');
    const next = button(pager, 'Next');
    const status = page.getByRole('status');
    await userEvent.tab();
    expect(document.activeElement).toBe(next);
    await userEvent.keyboard('{Enter}');
    await expect.element(status).toHaveTextContent('Page 2 of 3');
    await userEvent.tab({ shift: true });
    const previous = button(pager, 'Previous');
    expect(document.activeElement).toBe(previous);
    expect(getComputedStyle(previous).zIndex).toBe('1');
    expect(getComputedStyle(previous).outlineStyle).toBe('solid');
    await userEvent.keyboard(' ');
    await expect.element(status).toHaveTextContent('Page 1 of 3');
  });

  it('every button size keeps its height and control-radius corners', async () => {
    const rows = [
      ['sm', 28, 'icon-sm'],
      ['md', 32, 'icon'],
      ['lg', 36, 'icon-lg'],
      ['icon', 32, 'icon'],
    ] as const;
    const screen = await render(
      <div style={{ display: 'grid', gap: 8, justifyItems: 'start' }}>
        {rows.map(([size, , square]) => (
          <ButtonGroup key={size} aria-label={size} data-testid={size}>
            <Button variant="outline" size={size} aria-label="Main">
              {size === 'icon' ? <Plus /> : 'Label'}
            </Button>
            <Button variant="outline" size={square} aria-label="More">
              <Plus />
            </Button>
          </ButtonGroup>
        ))}
      </div>,
    );
    const r = radius();
    for (const [size, height, square] of rows) {
      const [first, last] = screen.getByTestId(size).element().children;
      expect(corners(first!), size).toMatchObject({ tl: r, bl: r, tr: '0px' });
      expect(corners(last!), size).toMatchObject({ tr: r, br: r, tl: '0px' });
      expect(Math.round(box(first!).height), size).toBe(height);
      if (size !== 'md') {
        expect(Math.round(box(last!).height), square).toBe(height);
        expect(Math.round(box(last!).width), square).toBe(height);
      }
    }
  });

  it('outline variants join borders without a separator', async () => {
    await render(
      <ButtonGroup aria-label="Save">
        <Button variant="outline">Publish</Button>
        <Button variant="outline">Save draft</Button>
      </ButtonGroup>,
    );
    expect(corners(page.getByRole('button', { name: 'Save draft' }).element())).toMatchObject({
      left: '0px',
      tl: '0px',
    });
  });

  it('text cells size icons and nested groups are spaced', async () => {
    await render(
      <ButtonGroup aria-label="Calendar toolbar">
        <ButtonGroup aria-label="Week navigation">
          <ButtonGroupText>
            <Plus />
            Week 15
          </ButtonGroupText>
          <Button variant="outline">Next week</Button>
        </ButtonGroup>
        <ButtonGroup aria-label="Jump to date">
          <Button variant="outline">Today</Button>
        </ButtonGroup>
      </ButtonGroup>,
    );
    const icon = group('Week navigation').querySelector('svg')!;
    expect(getComputedStyle(icon).width).toBe('16px');
    expect(getComputedStyle(icon).height).toBe('16px');
    expect(getComputedStyle(group('Calendar toolbar')).columnGap).toBe('8px');
    expect(Math.round(box(group('Jump to date')).x - box(group('Week navigation')).right)).toBe(8);
  });

  it('fits a 320px phone', async () => {
    await page.viewport(320, 700);
    const screen = await render(
      <div style={{ display: 'grid', gap: 16, padding: 16 }}>
        <Pager />
        <Pager orientation="vertical" />
      </div>,
    );
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(320);
    for (const cell of screen.container.querySelectorAll('[data-slot="button-group-text"], [data-slot="button"]'))
      expect(cell.scrollWidth).toBeLessThanOrEqual(cell.clientWidth);
  });

  it('reduced motion removes the text cell transition', async () => {
    const screen = await render(<ButtonGroupText>3 seats</ButtonGroupText>);
    const text = screen.getByText('3 seats').element();
    expect(getComputedStyle(text).transitionDuration).toMatch(/^0\.12s/);
    await emulate({ reducedMotion: true });
    expect(getComputedStyle(text).transitionDuration).toBe('0s');
  });
});
