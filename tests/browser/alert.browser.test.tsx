import { describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { Alert, AlertAction, AlertDescription, AlertTitle } from '../../packages/sprout/src/components/alert.js';
import { Button } from '../../packages/sprout/src/components/button.js';
import { axeViolations, emulate, setTheme, settle, themes } from './support.js';

const Info = () => (
  <svg viewBox="0 0 16 16" aria-hidden="true">
    <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" />
  </svg>
);

function Pair() {
  return (
    <div style={{ display: 'grid', gap: 12, padding: 16, width: 480 }}>
      {(['default', 'destructive'] as const).map(variant => (
        <Alert key={variant} variant={variant} data-testid={variant}>
          <Info />
          <AlertTitle>Payment {variant}</AlertTitle>
          <AlertDescription>
            The invoice is ready. <a href="#details">See what changes</a>
          </AlertDescription>
          <AlertAction>
            <Button size="xs" variant="outline">
              Undo
            </Button>
          </AlertAction>
        </Alert>
      ))}
    </div>
  );
}

function colorOf(token: string) {
  const probe = document.createElement('span');
  probe.style.color = `var(${token})`;
  document.body.append(probe);
  const value = getComputedStyle(probe).color;
  probe.remove();
  return value;
}

const part = (alert: Element, slot: string) => alert.querySelector(`[data-slot="${slot}"]`)!;

describe('Alert in a real browser', () => {
  it.each(themes)('%s %s passes axe', async (theme, mode) => {
    setTheme(theme, mode);
    const screen = await render(<Pair />);
    await settle();
    expect(await axeViolations(screen.container)).toEqual([]);
  });

  it('variants have distinct tones and dark mode changes the surface', async () => {
    await emulate({ reducedMotion: true });
    const screen = await render(<Pair />);
    const plain = screen.getByTestId('default').element();
    const danger = screen.getByTestId('destructive').element();
    expect(getComputedStyle(danger).color).toBe(colorOf('--sprout-danger'));
    expect(getComputedStyle(part(plain, 'alert-title')).fontWeight).toBe('500');
    expect(getComputedStyle(part(plain, 'alert-description')).color).not.toBe(
      getComputedStyle(part(danger, 'alert-description')).color,
    );
    const light = getComputedStyle(plain).backgroundColor;
    setTheme('neutral', 'dark');
    expect(getComputedStyle(plain).backgroundColor).not.toBe(light);
  });

  it('icon, text and action keep their geometry', async () => {
    const screen = await render(<Pair />);
    await settle();
    const alert = screen.getByTestId('default').element();
    const icon = alert.querySelector(':scope > svg')!.getBoundingClientRect();
    expect([icon.width, icon.height]).toEqual([16, 16]);
    const title = part(alert, 'alert-title').getBoundingClientRect();
    const description = part(alert, 'alert-description').getBoundingClientRect();
    expect(title.left).toBeGreaterThan(icon.right);
    expect(Math.abs(description.left - title.left)).toBeLessThan(1);
    expect(getComputedStyle(alert).paddingRight).toBe('72px');
    const box = alert.getBoundingClientRect();
    const action = part(alert, 'alert-action').getBoundingClientRect();
    expect(box.right - action.right).toBeCloseTo(9, 0);
    expect(action.top - box.top).toBeCloseTo(9, 0);
  });

  it('description buttons and links get their spacing', async () => {
    const screen = await render(
      <Alert>
        <AlertDescription>
          Nothing selected.
          <Button variant="outline" size="xs">
            Use current selection
          </Button>
        </AlertDescription>
        <pre>log line</pre>
      </Alert>,
    );
    const button = screen.getByRole('button').element();
    expect(getComputedStyle(button).display).toBe('flex');
    expect(getComputedStyle(button).marginTop).toBe('8px');
    expect(getComputedStyle(screen.container.querySelector('pre')!).marginTop).toBe('0px');
  });

  it('tab order follows reading order and inline links show focus', async () => {
    const screen = await render(<Pair />);
    await userEvent.tab();
    const link = screen.getByRole('link').first().element();
    expect(document.activeElement).toBe(link);
    expect(getComputedStyle(link).outlineStyle).toBe('solid');
    expect(getComputedStyle(link).textDecorationLine).toBe('underline');
    await userEvent.tab();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Undo' }).first().element());
  });

  it('fades in, and reduced motion turns the fade off', async () => {
    const screen = await render(<Pair />);
    const alert = screen.getByTestId('default').element();
    expect(getComputedStyle(alert).animationName).toBe('sprout-alert-in');
    expect(getComputedStyle(alert).animationDuration).toBe('0.18s');
    await emulate({ reducedMotion: true });
    expect(getComputedStyle(alert).animationName).toBe('none');
  });
});
