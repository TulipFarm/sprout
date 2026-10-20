import { describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { Input } from '../../packages/sprout/src/components/input.js';
import { axeViolations, emulate, setTheme, settle, themes } from './support.js';

function colorOf(token: string) {
  const probe = document.createElement('span');
  probe.style.color = `var(${token})`;
  document.body.append(probe);
  const value = getComputedStyle(probe).color;
  probe.remove();
  return value;
}

function Labeled({ label, ...props }: { label: string } & Parameters<typeof Input>[0]) {
  return (
    <label style={{ display: 'grid', gap: 4 }}>
      {label}
      <Input {...props} />
    </label>
  );
}

function States({ scale }: { scale?: 'default' | 'lg' }) {
  return (
    <div style={{ display: 'grid', gap: 12, padding: 16, maxWidth: 360 }}>
      <Labeled label="Event title" scale={scale} defaultValue="Spring launch" />
      <Labeled label="Project name" scale={scale} placeholder="For example, Spring launch" />
      <Labeled label="Webhook key" scale={scale} readOnly defaultValue="whk_123" />
      <Labeled label="Team name" scale={scale} disabled defaultValue="Growth" />
      <Labeled label="Guest email" scale={scale} aria-invalid="true" defaultValue="ana@" />
      <Labeled label="Attachment" scale={scale} type="file" />
    </div>
  );
}

const field = (name: string) => page.getByLabelText(name, { exact: true });

describe('Input in a real browser', () => {
  it.each(themes)('%s %s paints theme tokens and passes axe', async (theme, mode) => {
    setTheme(theme, mode);
    const screen = await render(<States />);
    await settle();
    const filled = getComputedStyle(field('Event title').element());
    expect(filled.backgroundColor).toBe(colorOf('--sprout-surface'));
    expect(filled.borderTopColor).toBe(colorOf('--sprout-input'));
    expect(filled.color).toBe(colorOf('--sprout-text'));
    expect(await axeViolations(screen.container)).toEqual([]);
  });

  it.each([
    ['default', '32px', '14px', '10px'],
    ['lg', '44px', '16px', '12px'],
  ] as const)('%s scale renders at Cloud dimensions', async (scale, height, font, padding) => {
    const screen = await render(<States scale={scale} />);
    for (const input of screen.container.querySelectorAll('input')) {
      const style = getComputedStyle(input);
      expect(style.height).toBe(height);
      expect(style.fontSize).toBe(font);
      expect(style.paddingLeft).toBe(padding);
      expect(style.borderTopWidth).toBe('1px');
    }
  });

  it('disabled and invalid states use their tokens', async () => {
    await emulate({ reducedMotion: true });
    await render(<States />);
    const disabled = getComputedStyle(field('Team name').element());
    expect(disabled.opacity).toBe('0.5');
    expect(disabled.cursor).toBe('not-allowed');
    expect(disabled.backgroundColor).toBe(colorOf('--sprout-hover'));
    const invalid = field('Guest email');
    expect(getComputedStyle(invalid.element()).borderTopColor).toBe(colorOf('--sprout-danger'));
    (field('Webhook key').element() as HTMLElement).focus();
    await userEvent.tab();
    await expect.element(invalid).toHaveFocus();
    expect(getComputedStyle(invalid.element()).outlineColor).toBe(colorOf('--sprout-danger'));
  });

  it('keyboard focus shows the ring and skips disabled fields', async () => {
    await emulate({ reducedMotion: true });
    await render(<States />);
    await userEvent.tab();
    const title = field('Event title');
    await expect.element(title).toHaveFocus();
    const style = getComputedStyle(title.element());
    expect(style.outlineStyle).toBe('solid');
    expect(style.outlineWidth).toBe('1px');
    expect(style.outlineOffset).toBe('0px');
    expect(style.borderTopColor).toBe(colorOf('--sprout-border'));
    await userEvent.tab();
    await userEvent.keyboard('C0123456789');
    await expect.element(field('Project name')).toHaveValue('C0123456789');
    await userEvent.tab({ shift: true });
    await expect.element(title).toHaveFocus();
    (field('Webhook key').element() as HTMLElement).focus();
    await userEvent.tab();
    await expect.element(field('Guest email')).toHaveFocus();
  });

  it('native number stepping still works', async () => {
    await render(<Labeled label="Check every" type="number" min={1} max={1440} defaultValue={15} />);
    (field('Check every').element() as HTMLElement).focus();
    await userEvent.keyboard('{ArrowUp}');
    await expect.element(field('Check every')).toHaveValue(16);
  });

  it('fits a phone without horizontal overflow', async () => {
    await page.viewport(390, 844);
    const screen = await render(<States scale="lg" />);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
    for (const input of screen.container.querySelectorAll('input')) {
      const box = input.getBoundingClientRect();
      expect(box.left).toBeGreaterThanOrEqual(0);
      expect(box.right).toBeLessThanOrEqual(390);
    }
  });

  it('colors transition only when motion is allowed', async () => {
    await render(<States />);
    const input = field('Event title').element();
    expect(getComputedStyle(input).transitionDuration).toMatch(/^0\.12s/);
    await emulate({ reducedMotion: true });
    expect(getComputedStyle(input).transitionDuration).toBe('0s');
  });
});
