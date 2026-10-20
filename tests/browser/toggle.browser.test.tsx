import { describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { ToggleGroup } from '../../packages/sprout/src/components/toggle-group.js';
import { Toggle } from '../../packages/sprout/src/components/toggle.js';
import { axeViolations, emulate, setTheme, settle, themes } from './support.js';

const Icon = (props: { 'data-icon'?: string }) => (
  <svg viewBox="0 0 16 16" aria-hidden="true" {...props}>
    <path d="M3 3h10v10H3z" fill="none" stroke="currentColor" />
  </svg>
);

function colorOf(token: string) {
  const probe = document.createElement('span');
  probe.style.color = `var(${token})`;
  document.body.append(probe);
  const value = getComputedStyle(probe).color;
  probe.remove();
  return value;
}

function Gallery() {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: 16 }}>
      {(['default', 'outline'] as const).map(variant => (
        <div key={variant} style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          <Toggle variant={variant} aria-label={`${variant} bold off`}>
            <Icon />
          </Toggle>
          <Toggle variant={variant} defaultPressed>
            <Icon data-icon="inline-start" />
            {variant} bold on
          </Toggle>
          <Toggle variant={variant} disabled defaultPressed>
            {variant} italic disabled on
          </Toggle>
          <Toggle variant={variant} disabled>
            {variant} italic disabled
          </Toggle>
        </div>
      ))}
    </div>
  );
}

/** Tabs from the top of the page, whatever the previous test left focused. */
async function tabFromStart() {
  const start = document.createElement('button');
  document.body.prepend(start);
  start.focus();
  await userEvent.tab();
  start.remove();
}

describe('Toggle in a real browser', () => {
  it.each(themes)('%s %s passes axe and paints the pressed tone', async (theme, mode) => {
    setTheme(theme, mode);
    const screen = await render(<Gallery />);
    await settle();
    const pressed = screen.getByRole('button', { name: 'outline bold on' }).element();
    expect(getComputedStyle(pressed).color).toBe(colorOf('--sprout-primary'));
    expect(getComputedStyle(pressed).backgroundColor).toBe(colorOf('--sprout-primary-subtle'));
    expect(await axeViolations(screen.container)).toEqual([]);
  });

  it('sizes and variants render at Cloud dimensions', async () => {
    const sizes = {
      sm: { height: '28px', font: '12px', icon: '14px', start: '6px' },
      default: { height: '32px', font: '14px', icon: '16px', start: '8px' },
      lg: { height: '36px', font: '14px', icon: '16px', start: '8px' },
    };
    const screen = await render(
      <div style={{ display: 'grid', gap: 8 }}>
        {(['default', 'outline'] as const).flatMap(variant =>
          (['sm', 'default', 'lg'] as const).map(size => (
            <div key={variant + size} data-testid={`${variant}-${size}`}>
              <Toggle variant={variant} size={size} defaultPressed>
                <Icon data-icon="inline-start" />
                Starred
              </Toggle>
              <Toggle variant={variant} size={size} aria-label="Star">
                <Icon />
              </Toggle>
            </div>
          )),
        )}
        <Toggle aria-label="Group by owner">
          Group
          <Icon data-icon="inline-end" />
        </Toggle>
      </div>,
    );
    const input = colorOf('--sprout-input');
    for (const variant of ['default', 'outline'])
      for (const [size, spec] of Object.entries(sizes)) {
        const [labeled, iconOnly] = [...screen.getByTestId(`${variant}-${size}`).element().children] as HTMLElement[];
        for (const button of [labeled, iconOnly]) {
          const css = getComputedStyle(button);
          expect(css.height, size).toBe(spec.height);
          expect(css.fontSize).toBe(spec.font);
          expect(css.paddingInlineEnd).toBe('10px');
          expect(css.borderTopColor).toBe(variant === 'outline' ? input : 'rgba(0, 0, 0, 0)');
          expect(getComputedStyle(button.querySelector('svg')!).width).toBe(spec.icon);
        }
        expect(getComputedStyle(labeled).paddingInlineStart).toBe(spec.start);
        expect(getComputedStyle(labeled).columnGap).toBe('4px');
        const box = iconOnly.getBoundingClientRect();
        expect(box.width).toBeGreaterThanOrEqual(box.height);
      }
    const group = getComputedStyle(screen.getByRole('button', { name: 'Group by owner' }).element());
    expect(group.paddingInlineEnd).toBe('8px');
    expect(group.paddingInlineStart).toBe('10px');
  });

  it('disabled toggles keep their state, fade and ignore presses', async () => {
    const screen = await render(<Gallery />);
    const on = screen.getByRole('button', {
      name: 'default italic disabled on',
    });
    await expect.element(on).toBeDisabled();
    expect(getComputedStyle(on.element()).opacity).toBe('0.5');
    await on.click({ force: true });
    await expect.element(on).toHaveAttribute('aria-pressed', 'true');
  });

  it('keyboard focuses with a ring and presses with Space and Enter', async () => {
    const screen = await render(
      <div role="toolbar" aria-label="Formatting">
        <Toggle defaultPressed>Bold</Toggle>
        <Toggle>Italic</Toggle>
      </div>,
    );
    const bold = screen.getByRole('button', { name: 'Bold' });
    const italic = screen.getByRole('button', { name: 'Italic' });
    await tabFromStart();
    await expect.element(bold).toHaveFocus();
    const ring = getComputedStyle(bold.element());
    expect(ring.outlineStyle).toBe('solid');
    expect(ring.outlineWidth).toBe('1px');
    await userEvent.keyboard(' ');
    await expect.element(bold).toHaveAttribute('aria-pressed', 'false');
    await userEvent.tab();
    await expect.element(italic).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    await expect.element(italic).toHaveAttribute('aria-pressed', 'true');
  });

  it('hover tints an unpressed toggle', async () => {
    const screen = await render(<Gallery />);
    const off = screen.getByRole('button', { name: 'default bold off' });
    await off.hover();
    await settle();
    expect(getComputedStyle(off.element()).backgroundColor).toBe(colorOf('--sprout-hover'));
    expect(getComputedStyle(off.element()).color).toBe(colorOf('--sprout-text'));
  });

  it('busy shows a progress cursor and invalid uses the danger border', async () => {
    const screen = await render(
      <>
        <Toggle aria-busy="true" disabled>
          Follow table
        </Toggle>
        <Toggle aria-invalid="true">Pin to sidebar</Toggle>
      </>,
    );
    expect(getComputedStyle(screen.getByRole('button', { name: 'Follow table' }).element()).cursor).toBe('progress');
    const pin = screen.getByRole('button', { name: 'Pin to sidebar' });
    expect(getComputedStyle(pin.element()).borderTopColor).toBe(colorOf('--sprout-danger'));
    await tabFromStart();
    expect(getComputedStyle(pin.element()).outlineColor).toBe(colorOf('--sprout-danger'));
  });

  it('toggles in a group move focus with arrow keys and keep one choice', async () => {
    const screen = await render(
      <ToggleGroup defaultValue={['30d']} aria-label="time range">
        {['7d', '30d', '90d'].map(value => (
          <Toggle key={value} value={value} variant="outline" size="sm">
            {value}
          </Toggle>
        ))}
      </ToggleGroup>,
    );
    const thirty = screen.getByRole('button', { name: '30d' });
    const ninety = screen.getByRole('button', { name: '90d' });
    expect(getComputedStyle(thirty.element()).height).toBe('28px');
    await tabFromStart();
    await expect.element(screen.getByRole('button', { name: '7d' })).toHaveFocus();
    await userEvent.keyboard('{ArrowRight}');
    await expect.element(thirty).toHaveFocus();
    await userEvent.keyboard('{ArrowRight}');
    await expect.element(ninety).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    await expect.element(ninety).toHaveAttribute('aria-pressed', 'true');
    await expect.element(thirty).toHaveAttribute('aria-pressed', 'false');
  });

  it('reduced motion removes the color transition', async () => {
    const screen = await render(<Toggle>Bold</Toggle>);
    const toggle = screen.getByRole('button').element();
    expect(getComputedStyle(toggle).transitionDuration).toMatch(/^0\.12s/);
    await emulate({ reducedMotion: true });
    expect(getComputedStyle(toggle).transitionDuration).toBe('0s');
  });

  it('fits a 390px phone without clipping labels', async () => {
    await page.viewport(390, 800);
    const screen = await render(<Gallery />);
    await settle();
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
    for (const button of screen.container.querySelectorAll('button')) {
      const box = button.getBoundingClientRect();
      expect(box.left).toBeGreaterThanOrEqual(0);
      expect(box.right).toBeLessThanOrEqual(390);
      expect(button.scrollWidth).toBeLessThanOrEqual(button.clientWidth);
    }
  });
});
