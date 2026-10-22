import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { Label } from '../../packages/sprout/src/components/label.js';
import { Switch } from '../../packages/sprout/src/components/switch.js';
import { axeViolations, emulate, focusWidth, setTheme, settle, themes } from './support.js';

function colorOf(token: string) {
  const probe = document.createElement('span');
  probe.style.color = `var(${token})`;
  document.body.append(probe);
  const value = getComputedStyle(probe).color;
  probe.remove();
  return value;
}

const sizes = ['md', 'sm'] as const;

function Matrix() {
  return (
    <div style={{ display: 'grid', gap: 16, padding: 16 }}>
      {sizes.map(size => (
        <div key={size} style={{ display: 'flex', gap: 24 }}>
          <Switch size={size} aria-label={`${size} off`} />
          <Switch size={size} aria-label={`${size} on`} defaultChecked />
          <Switch size={size} aria-label={`${size} disabled`} disabled />
          <Switch size={size} aria-label={`${size} disabled on`} disabled defaultChecked />
          <Switch size={size} aria-label={`${size} invalid`} aria-invalid="true" />
        </div>
      ))}
    </div>
  );
}

function Settings() {
  const [paused, setPaused] = useState(false);
  return (
    <div style={{ display: 'grid', gap: 16, padding: 16, maxWidth: 360 }}>
      <Label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <Switch checked={paused} onCheckedChange={setPaused} />
        Pause motion
      </Label>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <Label htmlFor="summary">Email summaries</Label>
        <Switch id="summary" defaultChecked />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <Label htmlFor="quiet">Quiet hours</Label>
        <Switch id="quiet" />
      </div>
      <Switch aria-label="Auto compacted" disabled />
      <Switch aria-label="Allow DeepSeek V3.2 as a fallback" size="sm" />
    </div>
  );
}

const control = (name: string) => page.getByRole('switch', { name, exact: true });
const thumbOf = (node: Element) => node.querySelector('[data-slot="switch-thumb"]')!;
const offset = (node: Element) => thumbOf(node).getBoundingClientRect().left - node.getBoundingClientRect().left;

describe('Switch in a real browser', () => {
  it.each(themes)('%s %s paints track and thumb tokens and passes axe', async (theme, mode) => {
    setTheme(theme, mode);
    const screen = await render(<Matrix />);
    await settle();
    for (const size of sizes) {
      const on = control(`${size} on`).element();
      const off = control(`${size} off`).element();
      expect(getComputedStyle(on).backgroundColor).toBe(colorOf('--sprout-primary'));
      expect(getComputedStyle(off).backgroundColor).toBe(colorOf('--sprout-muted'));
      expect(getComputedStyle(thumbOf(on)).backgroundColor).toBe(colorOf('--sprout-on-primary'));
      expect(getComputedStyle(thumbOf(off)).backgroundColor).toBe(
        colorOf(mode === 'dark' ? '--sprout-text' : '--sprout-surface'),
      );
    }
    expect(await axeViolations(screen.container)).toEqual([]);
  });

  it.each([
    ['md', 32, 18, 16, 14],
    ['sm', 24, 14, 12, 10],
  ] as const)('%s is a %ipx × %ipx pill whose thumb travels', async (size, w, h, thumb, travel) => {
    await render(<Matrix />);
    await settle();
    const off = control(`${size} off`).element();
    const on = control(`${size} on`).element();
    const box = off.getBoundingClientRect();
    expect(box.width).toBeCloseTo(w, 0);
    expect(box.height).toBeCloseTo(h, 0);
    expect(getComputedStyle(off).borderRadius).toBe('999px');
    expect(thumbOf(on).getBoundingClientRect().width).toBeCloseTo(thumb, 0);
    expect(offset(off)).toBeCloseTo(1, 0);
    expect(offset(on)).toBeCloseTo(1 + travel, 0);
    for (const state of ['disabled', 'disabled on']) {
      const disabled = control(`${size} ${state}`).element();
      expect(getComputedStyle(disabled).opacity).toBe('0.5');
      expect(getComputedStyle(disabled).cursor).toBe('not-allowed');
    }
    expect(getComputedStyle(control(`${size} invalid`).element()).borderTopColor).toBe(colorOf('--sprout-danger'));
  });

  it('a disabled switch ignores clicks', async () => {
    await render(<Matrix />);
    await control('md disabled').click({ force: true });
    await expect.element(control('md disabled')).toHaveAttribute('aria-checked', 'false');
  });

  it('the thumb slides the other way in right-to-left text', async () => {
    await render(
      <div dir="rtl" style={{ padding: 16 }}>
        <Switch aria-label="On" defaultChecked />
      </div>,
    );
    await settle();
    expect(offset(control('On').element())).toBeCloseTo(1, 0);
  });

  it('wrapping and htmlFor labels name and toggle the switch', async () => {
    await render(<Settings />);
    const pause = control('Pause motion');
    await page.getByText('Pause motion').click();
    await expect.element(pause).toHaveAttribute('aria-checked', 'true');
    await pause.click();
    await expect.element(pause).toHaveAttribute('aria-checked', 'false');
    await page.getByText('Quiet hours').click();
    await expect.element(control('Quiet hours')).toHaveAttribute('aria-checked', 'true');
  });

  it('the hit area extends past the track', async () => {
    await render(<Settings />);
    const quiet = control('Quiet hours').element();
    const rect = quiet.getBoundingClientRect();
    const target = document.elementFromPoint(rect.right + 8, rect.top + rect.height / 2);
    expect(target).toBe(quiet);
    await control('Quiet hours').click({
      position: { x: rect.width + 8, y: rect.height / 2 },
    });
    await expect.element(control('Quiet hours')).toHaveAttribute('aria-checked', 'true');
  });

  it('Tab shows a focus ring, Space and Enter toggle, and disabled switches are skipped', async () => {
    await render(<Settings />);
    (page.getByRole('switch', { name: 'Pause motion' }).element() as HTMLElement).focus();
    await userEvent.tab();
    const summary = control('Email summaries');
    await expect.element(summary).toHaveFocus();
    const style = getComputedStyle(summary.element());
    expect(style.outlineStyle).toBe('solid');
    expect(style.outlineWidth).toBe(focusWidth());
    expect(style.outlineColor).toBe(colorOf('--sprout-focus-ring'));
    await userEvent.keyboard(' ');
    await expect.element(summary).toHaveAttribute('aria-checked', 'false');
    await userEvent.tab();
    await expect.element(control('Quiet hours')).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    await expect.element(control('Quiet hours')).toHaveAttribute('aria-checked', 'true');
    await userEvent.tab();
    await expect.element(control('Allow DeepSeek V3.2 as a fallback')).toHaveFocus();
  });

  it('busy switches show a progress cursor', async () => {
    await render(<Switch aria-label="Saving" aria-busy="true" />);
    expect(getComputedStyle(control('Saving').element()).cursor).toBe('progress');
  });

  it('fits a phone with a long label', async () => {
    await page.viewport(390, 844);
    await render(
      <div style={{ padding: 16 }}>
        <Label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Switch />
          Allow Kimi K2 Thinking with extended reasoning across every workspace you manage
        </Label>
      </div>,
    );
    const rect = page.getByRole('switch').element().getBoundingClientRect();
    expect(rect.width).toBeCloseTo(32, 0);
    expect(rect.right).toBeLessThanOrEqual(390);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
  });

  it('track eases over 120ms and the thumb over 180ms, and reduced motion stops both', async () => {
    await render(<Switch aria-label="Motion" />);
    const node = control('Motion').element();
    expect(getComputedStyle(node).transitionDuration).toMatch(/^0\.12s/);
    expect(getComputedStyle(thumbOf(node)).transitionDuration).toMatch(/^0\.18s/);
    await emulate({ reducedMotion: true });
    expect(getComputedStyle(node).transitionDuration).toBe('0s');
    expect(getComputedStyle(thumbOf(node)).transitionDuration).toBe('0s');
  });
});
