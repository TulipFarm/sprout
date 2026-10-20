import { describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { Button, buttonSizeNames, buttonVariantNames } from '../../packages/sprout/src/components/button.js';
import { axeViolations, emulate, setTheme, settle, size, themes } from './support.js';

const Plus = () => (
  <svg viewBox="0 0 16 16" aria-hidden="true">
    <path d="M8 2v12M2 8h12" stroke="currentColor" />
  </svg>
);

function Gallery() {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: 16 }}>
      {buttonVariantNames.map(variant => (
        <Button key={variant} variant={variant}>
          {variant}
        </Button>
      ))}
      <Button disabled>Disabled</Button>
      <Button state={{ kind: 'busy' }} pendingLabel="Saving…">
        Save
      </Button>
      <Button state={{ kind: 'blocked', reason: 'Choose an owner first.' }}>Publish</Button>
    </div>
  );
}

describe('Button in a real browser', () => {
  it.each(themes)('%s %s passes axe and paints a filled primary', async (theme, mode) => {
    setTheme(theme, mode);
    const screen = await render(<Gallery />);
    await settle();
    const primary = screen.getByRole('button', {
      name: 'default',
      exact: true,
    });
    expect(getComputedStyle(primary.element()).backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
    expect(await axeViolations(screen.container)).toEqual([]);
  });

  it('every size renders with its documented geometry', async () => {
    const expected: Record<string, [number | null, number]> = {
      default: [null, 28],
      xs: [null, 24],
      sm: [null, 28],
      lg: [null, 36],
      icon: [32, 32],
      'icon-xs': [24, 24],
      'icon-sm': [28, 28],
      'icon-lg': [36, 36],
      onboarding: [null, 44],
      bud: [64, 64],
      'bud-labeled': [null, 48],
      'chat-row': [null, 44],
      'card-title': [null, 40],
      'result-card': [null, 32],
      'calendar-title': [null, 32],
      calendar: [null, 32],
      'calendar-icon': [32, 32],
      nav: [null, 32],
      badge: [null, 28],
    };
    const screen = await render(
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {buttonSizeNames.map(name => (
          <Button key={name} size={name} aria-label={name}>
            {name.startsWith('icon') || name === 'bud' ? (
              <Plus />
            ) : (
              <>
                <Plus />
                {name}
              </>
            )}
          </Button>
        ))}
      </div>,
    );
    const node = (name: string) => screen.container.querySelector(`[data-size="${name}"]`)!;
    for (const [name, [width, height]] of Object.entries(expected)) {
      const [w, h] = size(node(name));
      if (width !== null) expect(w, name).toBe(width);
      expect(h, name).toBe(height);
    }
    const css = (name: string) => getComputedStyle(node(name));
    expect(css('calendar-title').fontSize).toBe('18px');
    expect(css('task-link').whiteSpace).toBe('normal');
    expect(css('column-header-end').flexDirection).toBe('row-reverse');
    expect(css('bud').touchAction).toBe('none');
    for (const name of ['xs', 'icon-xs']) expect(getComputedStyle(node(name).querySelector('svg')!).width).toBe('12px');
  });

  it('keyboard activates, shows a focus ring, and busy stops the spinner', async () => {
    await emulate({ reducedMotion: true });
    let clicks = 0;
    const screen = await render(
      <>
        <Button onClick={() => clicks++}>Add item</Button>
        <Button state={{ kind: 'busy' }} pendingLabel="Saving…">
          Save
        </Button>
      </>,
    );
    const add = screen.getByRole('button', { name: 'Add item' });
    await expect.element(add).toHaveAttribute('type', 'button');
    await userEvent.tab();
    await expect.element(add).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    await userEvent.keyboard(' ');
    expect(clicks).toBe(2);
    const ring = getComputedStyle(add.element());
    expect(ring.outlineStyle).toBe('solid');
    expect(ring.outlineWidth).toBe('1px');

    const busy = screen.getByRole('button', { name: 'Saving…' });
    await expect.element(busy).toHaveAttribute('aria-busy', 'true');
    expect(getComputedStyle(busy.element()).opacity).toBe('0.5');
    expect(getComputedStyle(busy.element().querySelector('svg')!).animationName).toBe('none');
  });

  it('blocked buttons stay focusable and describe the reason', async () => {
    const screen = await render(<Button state={{ kind: 'blocked', reason: 'Choose an owner first.' }}>Publish</Button>);
    const publish = screen.getByRole('button', { name: 'Publish' });
    await userEvent.tab();
    await expect.element(publish).toHaveFocus();
    await expect.element(publish).toHaveAccessibleDescription('Choose an owner first.');
  });

  it('disabled links are inert', async () => {
    const screen = await render(
      <Button nativeButton={false} disabled render={<a href="#elsewhere">Unavailable link</a>} />,
    );
    const link = screen.getByText('Unavailable link');
    await expect.element(link).toHaveAttribute('aria-disabled', 'true');
    expect(getComputedStyle(link.element()).pointerEvents).toBe('none');
  });

  it('does not overflow a 320px viewport', async () => {
    await page.viewport(320, 640);
    await render(<Gallery />);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(320);
  });
});
