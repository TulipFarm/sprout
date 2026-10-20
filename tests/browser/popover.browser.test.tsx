import type { ComponentProps } from 'react';
import { describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { Button } from '../../packages/sprout/src/components/button.js';
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
  popoverContentSizeNames,
  type PopoverContentProps,
} from '../../packages/sprout/src/components/popover.js';
import { axeViolations, emulate, setTheme, settle, themes } from './support.js';

function Pop({
  label = 'Customize',
  title = 'Group and calculate',
  trigger,
  ...content
}: PopoverContentProps & {
  label?: string;
  title?: string;
  trigger?: Partial<ComponentProps<typeof PopoverTrigger>>;
}) {
  return (
    <Popover>
      <PopoverTrigger render={<Button variant="outline" />} {...trigger}>
        {label}
      </PopoverTrigger>
      <PopoverContent {...content}>
        <PopoverHeader>
          <PopoverTitle>{title}</PopoverTitle>
          <PopoverDescription>Group rows by owner and total the forecast for each group.</PopoverDescription>
        </PopoverHeader>
        <Button size="sm">Apply</Button>
        <Button size="sm" variant="ghost">
          Reset
        </Button>
      </PopoverContent>
    </Popover>
  );
}

const popup = () => document.querySelector<HTMLElement>('[data-slot="popover-content"][data-open]')!;
const popups = () => page.getByRole('dialog');

/** The panel stays in the viewport, and nothing inside it spills sideways. */
function contained(node: Element) {
  const box = node.getBoundingClientRect();
  const inside = [...node.querySelectorAll('*')].every(child => {
    const rect = child.getBoundingClientRect();
    return !rect.width || (rect.left >= box.left - 1 && rect.right <= box.right + 1);
  });
  return {
    inViewport: box.left >= 0 && box.top >= 0 && box.right <= innerWidth + 0.5 && box.bottom <= innerHeight + 0.5,
    inside,
    noScroll: node.scrollWidth <= node.clientWidth + 1,
  };
}
const fits = { inViewport: true, inside: true, noScroll: true };

const widths = {
  default: 288,
  menu: 384,
  picker: 288,
  panel: 512,
  'work-list': 512,
  'app-actions': 320,
  bud: 384,
} as const;

describe('Popover in a real browser', () => {
  it.each(themes)('%s %s passes axe while open', async (theme, mode) => {
    setTheme(theme, mode);
    const screen = await render(<Pop />);
    await screen.getByRole('button', { name: 'Customize' }).click();
    await settle();
    expect(getComputedStyle(popup()).backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
    expect(await axeViolations()).toEqual([]);
  });

  it('keyboard opens, moves focus inside, and Escape returns focus', async () => {
    const screen = await render(<Pop />);
    const trigger = screen.getByRole('button', { name: 'Customize' });
    await expect.element(trigger).toHaveAttribute('aria-haspopup', 'dialog');
    await expect.element(trigger).toHaveAttribute('aria-expanded', 'false');
    await userEvent.tab();
    await userEvent.keyboard('{Enter}');
    const dialog = page.getByRole('dialog', { name: 'Group and calculate' });
    await expect.element(dialog).toBeVisible();
    await expect.element(trigger).toHaveAttribute('aria-expanded', 'true');
    await expect.poll(() => popup().contains(document.activeElement)).toBe(true);
    await userEvent.tab();
    expect(popup().contains(document.activeElement)).toBe(true);
    await userEvent.keyboard('{Escape}');
    await expect.element(dialog).not.toBeInTheDocument();
    await expect.element(trigger).toHaveFocus();
    await userEvent.keyboard(' ');
    await expect.element(popups()).toBeVisible();
    await userEvent.click(document.body, { position: { x: 5, y: 700 } });
    await expect.element(popups()).not.toBeInTheDocument();
  });

  it.each(popoverContentSizeNames)('%s size keeps its width and fits a phone', async size => {
    await emulate({ reducedMotion: true });
    for (const width of [1280, 390]) {
      await page.viewport(width, 900);
      const screen = await render(
        <div style={{ padding: 16 }}>
          <Pop size={size} label={`Open ${size} ${width}`} />
        </div>,
      );
      await screen.getByRole('button').click();
      await settle();
      expect(popup().dataset.size).toBe(size);
      const box = popup().getBoundingClientRect();
      expect(box.width).toBeLessThanOrEqual(widths[size] + 1);
      expect(box.width).toBeGreaterThanOrEqual(Math.min(widths[size], width - 32) - 16);
      expect(contained(popup())).toEqual(fits);
      await userEvent.keyboard('{Escape}');
      await expect.element(popups()).not.toBeInTheDocument();
      await screen.unmount();
    }
  });

  it('hover opens without stealing focus, leaving closes it, and keyboard moves focus in', async () => {
    const screen = await render(
      <div style={{ padding: 40 }}>
        <Pop
          label="Send to Slack"
          size="app-actions"
          align="start"
          trigger={{ openOnHover: true, delay: 100, closeDelay: 0 }}
        />
      </div>,
    );
    const trigger = screen.getByRole('button', { name: 'Send to Slack' });
    await trigger.hover();
    await expect.element(popups()).toBeVisible();
    await settle();
    expect(popup().contains(document.activeElement)).toBe(false);
    const anchor = trigger.element().getBoundingClientRect();
    expect(popup().dataset.align).toBe('start');
    expect(Math.abs(popup().getBoundingClientRect().left - anchor.left)).toBeLessThan(2);
    await userEvent.unhover(trigger);
    await userEvent.hover(document.body, { position: { x: 1200, y: 700 } });
    await expect.element(popups()).not.toBeInTheDocument();
    (trigger.element() as HTMLElement).focus();
    await userEvent.keyboard('{Enter}');
    await expect.element(page.getByRole('button', { name: 'Apply' })).toHaveFocus();
  });

  it.each(['top', 'right', 'bottom', 'left'] as const)(
    '%s placement aligns to the start and stays on screen',
    async side => {
      await render(
        <div style={{ padding: 320, display: 'inline-block' }}>
          <Pop side={side} align="start" />
        </div>,
      );
      await page.getByRole('button', { name: 'Customize' }).click();
      await settle();
      expect(popup().dataset.side).toBe(side);
      expect(popup().dataset.align).toBe('start');
      expect(contained(popup())).toEqual(fits);
    },
  );

  it('start alignment flips to end near the right edge', async () => {
    await render(
      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: 8 }}>
        <Pop align="start" size="panel" />
      </div>,
    );
    await page.getByRole('button', { name: 'Customize' }).click();
    await settle();
    const anchor = page.getByRole('button', { name: 'Customize' }).element().getBoundingClientRect();
    expect(popup().dataset.align).toBe('end');
    expect(Math.abs(popup().getBoundingClientRect().right - anchor.right)).toBeLessThan(2);
    expect(contained(popup())).toEqual(fits);
  });

  it('keepMounted hides the positioner and keeps a draft', async () => {
    await render(
      <Popover>
        <PopoverTrigger render={<Button />}>Open Bud quick chat</PopoverTrigger>
        <PopoverContent size="bud" keepMounted aria-label="Bud">
          <textarea aria-label="Message Bud" />
        </PopoverContent>
      </Popover>,
    );
    const trigger = page.getByRole('button', { name: 'Open Bud quick chat' });
    await trigger.click();
    await page.getByRole('textbox', { name: 'Message Bud' }).fill('Remind me');
    await userEvent.keyboard('{Escape}');
    const positioner = document.querySelector('.sprout-popover-positioner')!;
    await expect.poll(() => positioner.hasAttribute('hidden')).toBe(true);
    expect(getComputedStyle(positioner).display).toBe('none');
    await trigger.click();
    await expect.element(page.getByRole('textbox', { name: 'Message Bud' })).toHaveValue('Remind me');
  });

  it('fades and scales in, and reduced motion removes the transition', async () => {
    const screen = await render(<Pop />);
    await screen.getByRole('button').click();
    await settle();
    const style = getComputedStyle(popup());
    expect(style.opacity).toBe('1');
    expect(style.transitionProperty).toBe('opacity, scale, translate');
    expect(style.transitionDuration).toBe('0.12s, 0.12s, 0.12s');
    await emulate({ reducedMotion: true });
    expect(getComputedStyle(popup()).transitionDuration).toBe('0s');
  });
});
