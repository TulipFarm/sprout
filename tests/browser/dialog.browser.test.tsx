import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { Button } from '../../packages/sprout/src/components/button.js';
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  type DialogPlacement,
  type DialogSize,
} from '../../packages/sprout/src/components/dialog.js';
import { axeViolations, emulate, setTheme, settle, themes } from './support.js';

function Example({
  size = 'default',
  placement,
  long = false,
  hint,
}: {
  size?: DialogSize;
  placement?: DialogPlacement;
  long?: boolean;
  hint?: string;
}) {
  return (
    <Dialog>
      <DialogTrigger render={<Button />}>Open {size}</DialogTrigger>
      <DialogContent size={size} placement={placement}>
        <DialogHeader>
          <DialogTitle>Rename Field_operations_weekly_plan_final_v2</DialogTitle>
          <DialogDescription>Links and sharing stay the same after renaming.</DialogDescription>
        </DialogHeader>
        <DialogBody>
          <label>
            Name <input defaultValue="Spring launch" />
          </label>
          {long && Array.from({ length: 60 }, (_, i) => <p key={i}>Line {i + 1}</p>)}
        </DialogBody>
        <DialogFooter showCloseButton>
          {hint && <p>{hint}</p>}
          <Button>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const dialog = () => page.getByRole('dialog');
const box = () => dialog().element().getBoundingClientRect();

async function open(size: DialogSize = 'default') {
  await page.getByRole('button', { name: `Open ${size}` }).click();
  await expect.element(dialog()).toBeVisible();
  await settle();
}

async function close() {
  await userEvent.keyboard('{Escape}');
  await expect.element(dialog()).not.toBeInTheDocument();
}

/** Every child stays inside the dialog sideways and nothing scrolls sideways. */
function fits(node: Element) {
  const outer = node.getBoundingClientRect();
  const inside = [...node.querySelectorAll('*')].every(child => {
    const rect = child.getBoundingClientRect();
    return (
      !rect.width ||
      getComputedStyle(child).position === 'fixed' ||
      (rect.left >= outer.left - 1 && rect.right <= outer.right + 1)
    );
  });
  return {
    inViewport: outer.left >= 0 && outer.right <= innerWidth + 0.5,
    inside,
    noScroll: node.scrollWidth <= node.clientWidth + 1,
  };
}

const fitsAll = { inViewport: true, inside: true, noScroll: true };

describe('Dialog in a real browser', () => {
  it('sizes take their widths above 640px and fullscreen fills the viewport', async () => {
    await page.viewport(1440, 900);
    await render(
      <>
        <Example />
        <Example size="form" />
        <Example size="split" />
        <Example size="fullscreen" />
      </>,
    );
    for (const [size, width] of [
      ['default', 384],
      ['form', 576],
      ['split', 1024],
    ] as const) {
      await open(size);
      await expect.element(dialog()).toHaveAttribute('data-size', size);
      expect(getComputedStyle(dialog().element()).width).toBe(`${width}px`);
      expect(fits(dialog().element())).toEqual(fitsAll);
      await close();
    }
    await open('fullscreen');
    expect([box().width, box().height]).toEqual([1440, 900]);
    await close();
  });

  it('every size fits a phone with 16px gutters and no overflow', async () => {
    await page.viewport(390, 800);
    await render(
      <>
        <Example />
        <Example size="form" />
        <Example size="split" />
        <Example size="fullscreen" />
      </>,
    );
    for (const size of ['default', 'form', 'split'] as const) {
      await open(size);
      expect(box().width).toBeLessThanOrEqual(390 - 32 + 0.5);
      expect(fits(dialog().element())).toEqual(fitsAll);
      const footer = dialog().element().querySelector('[data-slot="dialog-footer"]')!;
      expect(getComputedStyle(footer).flexDirection).toBe('column-reverse');
      await close();
    }
    await open('fullscreen');
    expect([box().width, box().height]).toEqual([390, 800]);
    expect(fits(dialog().element())).toEqual(fitsAll);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
  });

  it('top placement pins at 12% of the viewport', async () => {
    await page.viewport(1280, 900);
    await render(<Example size="form" placement="top" />);
    await open('form');
    await expect.element(dialog()).toHaveAttribute('data-placement', 'top');
    expect(Math.abs(box().top - 900 * 0.12)).toBeLessThan(2);
  });

  it('a long body scrolls inside a dialog that fits the viewport', async () => {
    await page.viewport(1280, 860);
    await render(<Example size="form" long />);
    await open('form');
    const body = dialog().element().querySelector('[data-slot="dialog-body"]')!;
    expect(body.scrollHeight).toBeGreaterThan(body.clientHeight);
    expect(box().height).toBeLessThanOrEqual(860 - 32 + 0.5);
    const footer = dialog().element().querySelector('[data-slot="dialog-footer"]')!.getBoundingClientRect();
    expect(footer.bottom).toBeCloseTo(box().bottom - 1, 0);
  });

  it('a footer hint sits at the start and actions line up on the right', async () => {
    await render(<Example size="form" hint="These items are already here." />);
    await open('form');
    const footer = dialog().element().querySelector('[data-slot="dialog-footer"]')!;
    const hint = footer.querySelector('p')!.getBoundingClientRect();
    const actions = [...footer.querySelectorAll('button')].map(b => b.getBoundingClientRect());
    const edge = footer.getBoundingClientRect();
    expect(hint.left - edge.left).toBeCloseTo(16, 0);
    expect(edge.right - actions.at(-1)!.right).toBeCloseTo(16, 0);
    expect(actions[0]!.top).toBeCloseTo(actions[1]!.top, 0);
  });

  it('keyboard opens, traps focus, closes, and restores focus', async () => {
    const screen = await render(<Example />);
    const opener = screen.getByRole('button', { name: 'Open default' });
    (opener.element() as HTMLElement).focus();
    await userEvent.keyboard('{Enter}');
    await expect.element(dialog()).toBeVisible();
    await expect.element(dialog()).toHaveAccessibleDescription('Links and sharing stay the same after renaming.');
    await expect.element(page.getByRole('textbox')).toHaveFocus();
    for (const shift of [false, true])
      for (let i = 0; i < 5; i += 1) {
        await userEvent.tab({ shift });
        expect(dialog().element().contains(document.activeElement)).toBe(true);
      }
    await close();
    await expect.element(opener).toHaveFocus();

    await opener.click();
    await page.getByRole('button', { name: 'Close' }).first().click();
    await expect.element(dialog()).not.toBeInTheDocument();
    await expect.element(opener).toHaveFocus();
  });

  it('a stacked dialog hands focus back to the button that opened it', async () => {
    await render(
      <Dialog>
        <DialogTrigger render={<Button />}>Use in chat</DialogTrigger>
        <DialogContent>
          <DialogTitle>Use file in chat</DialogTitle>
          <Dialog>
            <DialogTrigger render={<Button />}>Share file</DialogTrigger>
            <DialogContent>
              <DialogTitle>Share file</DialogTitle>
              <DialogClose render={<Button />}>Done</DialogClose>
            </DialogContent>
          </Dialog>
        </DialogContent>
      </Dialog>,
    );
    await page.getByRole('button', { name: 'Use in chat' }).click();
    await page.getByRole('button', { name: 'Share file' }).click();
    await expect.element(page.getByRole('dialog', { name: 'Share file' })).toBeVisible();
    expect(document.querySelectorAll('[role=dialog]')).toHaveLength(2);
    await userEvent.keyboard('{Escape}');
    await expect.element(page.getByRole('dialog', { name: 'Share file' })).not.toBeInTheDocument();
    await expect.element(page.getByRole('button', { name: 'Share file' })).toHaveFocus();
  });

  it('a busy dialog ignores Escape and outside clicks', async () => {
    function Busy() {
      const [busy, setBusy] = useState(false);
      return (
        <Dialog
          onOpenChange={(open, details) => {
            if (!open && busy) details.cancel();
          }}
        >
          <DialogTrigger render={<Button />}>Open default</DialogTrigger>
          <DialogContent>
            <DialogTitle>New team</DialogTitle>
            <Button onClick={() => setBusy(true)}>Create team</Button>
          </DialogContent>
        </Dialog>
      );
    }
    await render(<Busy />);
    await open();
    await page.getByRole('button', { name: 'Create team' }).click();
    await userEvent.keyboard('{Escape}');
    await page
      .elementLocator(document.querySelector('[data-slot="dialog-overlay"]')!)
      .click({ position: { x: 5, y: 5 } });
    await expect.element(dialog()).toBeVisible();
  });

  it('motion lasts 180ms and reduced motion removes it', async () => {
    await render(<Example />);
    await open();
    expect(getComputedStyle(dialog().element()).transitionDuration).toBe('0.18s, 0.18s');
    const overlay = document.querySelector('[data-slot="dialog-overlay"]')!;
    expect(getComputedStyle(overlay).transitionDuration).toBe('0.18s');
    expect(getComputedStyle(dialog().element()).opacity).toBe('1');
    await emulate({ reducedMotion: true });
    expect(getComputedStyle(dialog().element()).transitionDuration).toBe('0s');
  });

  it.each(themes)('%s %s passes axe open', async (theme, mode) => {
    setTheme(theme, mode);
    await render(<Example size="form" hint="Saved to Drive." />);
    await open('form');
    expect(await axeViolations()).toEqual([]);
  });
});
