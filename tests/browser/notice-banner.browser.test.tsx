import { describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { Button } from '../../packages/sprout/src/components/button.js';
import { NoticeBanner } from '../../packages/sprout/src/components/notice-banner.js';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../packages/sprout/src/components/select.js';
import { axeViolations, emulate, setTheme, settle, themes } from './support.js';

const integrations = ['Google Calendar (robin@greenhouse.example)', 'GitHub (@garden-bot)', 'Seed catalog MCP'];

function Reauthorize({
  picker = true,
  pickerWidth = '100%',
  busy = false,
  message = '3 integrations need authorization. Approve the updated permissions to continue.',
}: {
  picker?: boolean;
  pickerWidth?: string;
  busy?: boolean;
  message?: string;
}) {
  return (
    <NoticeBanner
      aria-label="Integration authorization"
      actions={
        <>
          {picker && (
            <div style={{ width: pickerWidth, minWidth: 0 }}>
              <Select defaultValue={integrations[0]} disabled={busy}>
                <SelectTrigger width="full" aria-label="Integration to reauthorize">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {integrations.map(name => (
                    <SelectItem key={name} value={name}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <Button variant="outline" disabled={busy} focusableWhenDisabled aria-busy={busy}>
            {busy ? 'Please wait...' : 'Update permissions'}
          </Button>
        </>
      }
    >
      <p role="status">{message}</p>
    </NoticeBanner>
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

const banner = () => document.querySelector<HTMLElement>('[data-slot="notice-banner"]')!;
const slot = (name: string) => banner().querySelector<HTMLElement>(`[data-slot="notice-banner-${name}"]`)!;

describe('NoticeBanner in a real browser', () => {
  it.each(themes)('%s %s passes axe and paints surface, muted text and a line', async (theme, mode) => {
    setTheme(theme, mode);
    const screen = await render(<Reauthorize />);
    await settle();
    const style = getComputedStyle(banner());
    expect(style.backgroundColor).toBe(colorOf('--sprout-surface'));
    expect(style.color).toBe(colorOf('--sprout-muted'));
    expect(style.borderBottomColor).toBe(colorOf('--sprout-line'));
    expect(await axeViolations(screen.container)).toEqual([]);
  });

  it('stacks on a phone with full-width actions under the message', async () => {
    await page.viewport(390, 900);
    await render(<Reauthorize />);
    const style = getComputedStyle(banner());
    expect(style.flexDirection).toBe('column');
    expect(style.rowGap).toBe('8px');
    expect(style.padding).toBe('8px 16px');
    expect(style.fontSize).toBe('14px');
    expect(style.borderBottomWidth).toBe('1px');
    const content = slot('content').getBoundingClientRect();
    const row = slot('actions').getBoundingClientRect();
    expect(Math.abs(row.width - content.width)).toBeLessThan(1);
    const trigger = page.getByRole('combobox').element().getBoundingClientRect();
    expect(Math.abs(trigger.width - row.width)).toBeLessThan(1);
    expect(row.top).toBeGreaterThan(content.bottom - 1);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
  });

  it('sits on one row from 640px with compact controls', async () => {
    await page.viewport(1024, 900);
    await render(<Reauthorize pickerWidth="16rem" />);
    const style = getComputedStyle(banner());
    expect(style.flexDirection).toBe('row');
    expect(style.alignItems).toBe('center');
    expect(style.columnGap).toBe('16px');
    expect(style.padding).toBe('8px 24px');
    expect(getComputedStyle(slot('actions')).width).not.toBe(getComputedStyle(banner()).width);
    const trigger = page.getByRole('combobox').element();
    expect(Math.round(trigger.getBoundingClientRect().width)).toBe(256);
    expect(trigger.getBoundingClientRect().height).toBe(32);
    const action = page.getByRole('button').element();
    expect(action.getBoundingClientRect().height).toBe(32);
    expect(getComputedStyle(action).fontSize).toBe('14px');
  });

  it('keyboard reaches the picker then the action, and a busy action keeps focus', async () => {
    const screen = await render(<Reauthorize />);
    await userEvent.tab();
    await expect.element(screen.getByRole('combobox', { name: 'Integration to reauthorize' })).toHaveFocus();
    await userEvent.tab();
    const action = screen.getByRole('button', { name: 'Update permissions' });
    await expect.element(action).toHaveFocus();
    expect(getComputedStyle(action.element()).outlineStyle).toBe('solid');
    await screen.rerender(<Reauthorize busy />);
    const busy = screen.getByRole('button', { name: 'Please wait...' });
    await expect.element(busy).toHaveFocus();
    await expect.element(busy).toHaveAttribute('aria-disabled', 'true');
    await expect.element(screen.getByRole('combobox')).toBeDisabled();
  });

  it('enters with motion only when motion is allowed', async () => {
    await render(<Reauthorize picker={false} />);
    expect(getComputedStyle(banner()).animationName).toBe('sprout-notice-banner-in');
    expect(getComputedStyle(banner()).animationDuration).toBe('0.18s');
    await emulate({ reducedMotion: true });
    expect(getComputedStyle(banner()).animationName).toBe('none');
  });

  it('long names wrap without overflow at 320px', async () => {
    await page.viewport(320, 900);
    await render(
      <Reauthorize message="Google Calendar (robin.greenhouse.operations@greenhouse-northwind.example) needs authorization. Approve the updated permissions to continue." />,
    );
    const outer = banner().getBoundingClientRect();
    expect(banner().scrollWidth).toBeLessThanOrEqual(banner().clientWidth);
    for (const control of slot('actions').children)
      expect(control.getBoundingClientRect().right).toBeLessThanOrEqual(outer.right + 0.5);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(320);
  });
});
