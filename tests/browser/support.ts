import axe from 'axe-core';
import { cdp, page, userEvent } from 'vitest/browser';

export type Theme = 'neutral' | 'tulipfarm';
export type Mode = 'light' | 'dark';

export const themes = [
  ['neutral', 'light'],
  ['neutral', 'dark'],
  ['tulipfarm', 'light'],
  ['tulipfarm', 'dark'],
] as const satisfies ReadonlyArray<readonly [Theme, Mode]>;

/** Applies a Sprout theme and color mode to the whole document. */
export function setTheme(theme: Theme, mode: Mode) {
  const root = document.documentElement;
  root.setAttribute('data-sprout-theme', theme);
  root.classList.toggle('dark', mode === 'dark');
  root.classList.toggle('light', mode === 'light');
}

/**
 * Runs axe on `node` (default: the whole page, so portaled popups count)
 * against WCAG 2.2 AA and returns `id: target` per failure. Base UI's
 * invisible focus guards are skipped.
 */
export async function axeViolations(node: Element = document.body) {
  const context = { include: [node], exclude: ['[data-base-ui-focus-guard]'] };
  const { violations } = await axe.run(context, {
    runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'],
  });
  return violations.flatMap(violation => violation.nodes.map(n => `${violation.id}: ${n.target.join(' ')}`));
}

/** Waits for fonts, two frames, and every finite animation, so layout and color settle. */
export async function settle() {
  await document.fonts.ready;
  await new Promise(requestAnimationFrame);
  await new Promise(requestAnimationFrame);
  // Spinners loop forever and `fill: both` keeps finished animations listed.
  const running = () =>
    document
      .getAnimations()
      .filter(
        animation =>
          animation.playState !== 'finished' && animation.effect?.getComputedTiming().iterations !== Infinity,
      );
  while (running().length) await Promise.allSettled(running().map(animation => animation.finished));
}

/** The border-box size of `node`, rounded to whole pixels. */
export function size(node: Element) {
  const box = node.getBoundingClientRect();
  return [Math.round(box.width), Math.round(box.height)] as const;
}

/** Moves the mouse to the bottom-right corner so nothing renders hovered. */
export async function parkPointer() {
  const corner = document.createElement('div');
  corner.style.cssText = 'position:fixed;right:0;bottom:0;width:4px;height:4px;z-index:9999';
  document.body.append(corner);
  await userEvent.hover(page.elementLocator(corner));
  corner.remove();
}

let emulated = false;
// The visual project starts with reduced motion on; resets must keep it.
const startsReduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Emulates reduced motion; `resetEmulation` undoes it. Touch lives in its own
 * project because turning touch emulation off on Linux leaves no hover at all.
 */
export async function emulate({ reducedMotion = startsReduced }: { reducedMotion?: boolean }) {
  emulated = reducedMotion !== startsReduced;
  await cdp().send('Emulation.setEmulatedMedia', {
    features: [
      {
        name: 'prefers-reduced-motion',
        value: reducedMotion ? 'reduce' : '',
      },
    ],
  });
}

export async function resetEmulation() {
  if (emulated) await emulate({});
}
