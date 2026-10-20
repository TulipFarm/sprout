import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import type { ButtonSize } from '../../packages/sprout/src/components/button.js';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '../../packages/sprout/src/components/pagination.js';
import { axeViolations, emulate, setTheme, settle, themes } from './support.js';

function Pager({
  total = 3,
  start = 1,
  link = 'icon',
  edge = 'default',
  label,
  dir,
  ellipsis = true,
}: {
  total?: number;
  start?: number;
  link?: ButtonSize;
  edge?: ButtonSize;
  label?: string;
  dir?: 'ltr' | 'rtl';
  ellipsis?: boolean;
}) {
  const [current, setCurrent] = useState(start);
  const go = (page: number) => (event: React.MouseEvent) => {
    event.preventDefault();
    setCurrent(Math.min(total, Math.max(1, page)));
  };
  return (
    <div dir={dir}>
      <Pagination aria-label={label}>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious href="#" size={edge} disabled={current === 1} onClick={go(current - 1)} />
          </PaginationItem>
          {Array.from({ length: total }, (_, i) => i + 1).map(n => (
            <PaginationItem key={n}>
              <PaginationLink href="#" size={link} isActive={n === current} onClick={go(n)}>
                {n}
              </PaginationLink>
            </PaginationItem>
          ))}
          {ellipsis && (
            <PaginationItem>
              <PaginationEllipsis />
            </PaginationItem>
          )}
          <PaginationItem>
            <PaginationNext href="#" size={edge} disabled={current === total} onClick={go(current + 1)} />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
      <p role="status">Page {current}</p>
    </div>
  );
}

const link = (name: string) => page.getByRole('link', { name, exact: true });

describe('Pagination in a real browser', () => {
  it.each(themes)('%s %s passes axe', async (theme, mode) => {
    setTheme(theme, mode);
    const screen = await render(<Pager start={2} />);
    await settle();
    expect(await axeViolations(screen.container)).toEqual([]);
  });

  it('links, edges and the ellipsis keep their Cloud sizes', async () => {
    await render(<Pager />);
    const one = link('1').element();
    expect(one.getBoundingClientRect().width).toBe(32);
    expect(one.getBoundingClientRect().height).toBe(32);
    expect(one.className).toMatch(/sprout-button-variant-outline/);
    expect(link('2').element().className).toMatch(/sprout-button-variant-ghost/);
    const previous = link('Go to previous page').element();
    const next = link('Go to next page').element();
    expect(previous.getBoundingClientRect().height).toBe(28);
    expect(getComputedStyle(previous).paddingLeft).toBe('6px');
    expect(getComputedStyle(next).paddingRight).toBe('6px');
    const label = previous.querySelector('.sprout-pagination-label')!;
    expect(getComputedStyle(label).display).toBe('block');
    const ellipsis = document.querySelector('[data-slot="pagination-ellipsis"]')!;
    expect(getComputedStyle(ellipsis).width).toBe('32px');
  });

  it.each([
    ['icon-sm', 'sm', 28, 28],
    ['icon', 'default', 32, 28],
    ['icon-lg', 'lg', 36, 36],
  ] as const)('%s pages pair with %s edges', async (linkSize, edgeSize, square, edge) => {
    await render(<Pager start={2} link={linkSize} edge={edgeSize} />);
    const active = document.querySelector('[aria-current="page"]')!;
    const box = active.getBoundingClientRect();
    expect([box.width, box.height]).toEqual([square, square]);
    expect(link('Go to next page').element().getBoundingClientRect().height).toBe(edge);
  });

  it('keyboard moves through links with a focus ring and activates with Enter', async () => {
    const screen = await render(<Pager start={2} />);
    await userEvent.tab();
    const previous = link('Go to previous page');
    await expect.element(previous).toHaveFocus();
    expect(getComputedStyle(previous.element()).outlineStyle).toBe('solid');
    await userEvent.tab();
    await expect.element(link('1')).toHaveFocus();
    await userEvent.tab();
    await userEvent.tab();
    await expect.element(link('3')).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    await expect.element(screen.getByRole('status')).toHaveTextContent('Page 3');
    await expect.element(link('3')).toHaveAttribute('aria-current', 'page');
    await userEvent.tab({ shift: true });
    await expect.element(link('2')).toHaveFocus();
    await userEvent.tab();
    await userEvent.tab();
    await expect.element(link('Go to next page')).not.toHaveFocus();
    await userEvent.keyboard('{Shift>}{Tab}{Tab}{Tab}{Tab}{/Shift}');
    await expect.element(previous).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    await expect.element(screen.getByRole('status')).toHaveTextContent('Page 2');
  });

  it('disabled edges fade, leave the tab order and ignore clicks', async () => {
    const screen = await render(<Pager total={1} ellipsis={false} />);
    const previous = link('Go to previous page');
    await expect.element(previous).toHaveAttribute('aria-disabled', 'true');
    await expect.element(previous).toHaveAttribute('tabindex', '-1');
    expect(getComputedStyle(previous.element()).opacity).toBe('0.5');
    await userEvent.tab();
    await expect.element(link('1')).toHaveFocus();
    await userEvent.tab();
    await expect.element(link('Go to next page')).not.toHaveFocus();
    await link('Go to next page').click({ force: true });
    await expect.element(screen.getByRole('status')).toHaveTextContent('Page 1');
  });

  it('a phone hides edge labels, keeps edges square and fits the width', async () => {
    await page.viewport(390, 900);
    const screen = await render(<Pager total={7} start={4} />);
    const previous = link('Go to previous page').element();
    expect(getComputedStyle(previous.querySelector('.sprout-pagination-label')!).display).toBe('none');
    const box = previous.getBoundingClientRect();
    expect(Math.round(box.width)).toBe(Math.round(box.height));
    const list = screen.container.querySelector('[data-slot="pagination-content"]')!.getBoundingClientRect();
    expect(list.right).toBeLessThanOrEqual(390);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
  });

  it('chevrons flip in right-to-left text', async () => {
    await render(
      <>
        <Pager dir="ltr" />
        <Pager dir="rtl" />
      </>,
    );
    const [ltr, rtl] = document.querySelectorAll('.sprout-pagination-previous svg');
    expect(getComputedStyle(ltr!).transform).toBe('none');
    expect(getComputedStyle(rtl!).transform).toBe('matrix(-1, 0, 0, 1, 0, 0)');
  });

  it('link transitions respect reduced motion', async () => {
    await render(<Pager />);
    const two = link('2').element();
    expect(getComputedStyle(two).transitionDuration).toMatch(/0\.12s/);
    await emulate({ reducedMotion: true });
    expect(getComputedStyle(two).transitionDuration).toMatch(/^0s(, 0s)*$/);
  });
});
