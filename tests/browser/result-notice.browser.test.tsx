import { describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import '../../packages/sprout/src/styles/themes/chatgpt.css';
import '../../packages/sprout/src/styles/themes/claude.css';
import '../../packages/sprout/src/styles/themes/cloudflare.css';
import '../../packages/sprout/src/styles/themes/discord.css';
import '../../packages/sprout/src/styles/themes/github.css';
import '../../packages/sprout/src/styles/themes/grok.css';
import '../../packages/sprout/src/styles/themes/linear.css';
import '../../packages/sprout/src/styles/themes/notion.css';
import '../../packages/sprout/src/styles/themes/perplexity.css';
import '../../packages/sprout/src/styles/themes/raycast.css';
import '../../packages/sprout/src/styles/themes/spotify.css';
import '../../packages/sprout/src/styles/themes/stripe.css';
import '../../packages/sprout/src/styles/themes/supabase.css';
import '../../packages/sprout/src/styles/themes/vercel.css';
import { Button } from '../../packages/sprout/src/components/button.js';
import { ResultNotice } from '../../packages/sprout/src/components/result-notice.js';
import { axeViolations, emulate, settle } from './support.js';

const allThemes = [
  'chatgpt',
  'claude',
  'cloudflare',
  'discord',
  'github',
  'grok',
  'linear',
  'neutral',
  'notion',
  'perplexity',
  'raycast',
  'spotify',
  'stripe',
  'supabase',
  'tulipfarm',
  'vercel',
].flatMap(theme => (['light', 'dark'] as const).map(mode => [theme, mode] as const));

function Notice({ total = 2431 as number | string, opened = () => {} }) {
  return (
    <ResultNotice
      shown={100}
      total={total}
      noun="rows"
      action={
        <Button size="sm" variant="ghost" onClick={opened}>
          Open in Table
        </Button>
      }
    />
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

const notice = () => document.querySelector<HTMLElement>('[data-slot="result-notice"]')!;
const part = (name: string) => notice().querySelector<HTMLElement>(`[data-slot="result-notice-${name}"]`)!;

describe('ResultNotice in a real browser', () => {
  it.each(allThemes)('%s %s passes axe and paints surface, muted text, text counts and a line', async (theme, mode) => {
    const root = document.documentElement;
    root.setAttribute('data-sprout-theme', theme);
    root.classList.toggle('dark', mode === 'dark');
    root.classList.toggle('light', mode === 'light');
    const screen = await render(<Notice />);
    await settle();
    const style = getComputedStyle(notice());
    expect(style.backgroundColor).toBe(colorOf('--sprout-surface'));
    expect(style.color).toBe(colorOf('--sprout-muted'));
    expect(style.borderTopColor).toBe(colorOf('--sprout-line'));
    expect(getComputedStyle(part('message').querySelector('strong')!).color).toBe(colorOf('--sprout-text'));
    expect(await axeViolations(screen.container)).toEqual([]);
  });

  it('exposes the message as a status and the action as a button', async () => {
    const screen = await render(<Notice total="10000+" />);
    await expect.element(screen.getByRole('status')).toHaveTextContent('Showing the first 100 of 10,000+ rows.');
    await expect.element(screen.getByRole('button', { name: 'Open in Table' })).toBeVisible();
    expect(notice().querySelector('svg')!.getAttribute('aria-hidden')).toBe('true');
  });

  it('sits on one row at 1440px with the action at the end', async () => {
    await page.viewport(1440, 900);
    await render(<Notice />);
    const box = notice().getBoundingClientRect();
    const message = part('message').getBoundingClientRect();
    const action = part('action').getBoundingClientRect();
    expect(box.height).toBe(36);
    expect(Math.abs(action.top + action.height / 2 - (message.top + message.height / 2))).toBeLessThan(1);
    expect(box.right - action.right).toBeLessThanOrEqual(5);
    expect(getComputedStyle(notice()).fontSize).toBe('14px');
    expect(getComputedStyle(notice()).fontVariantNumeric).toBe('tabular-nums');
  });

  it('wraps the action under the message at 320px without overflow', async () => {
    await page.viewport(320, 900);
    await render(<Notice total="10000+" />);
    const box = notice().getBoundingClientRect();
    const message = part('message').getBoundingClientRect();
    const action = part('action').getBoundingClientRect();
    expect(action.top).toBeGreaterThanOrEqual(message.bottom - 1);
    expect(action.right).toBeLessThanOrEqual(box.right + 0.5);
    expect(notice().scrollWidth).toBeLessThanOrEqual(notice().clientWidth);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(320);
  });

  it('keyboard reaches the action and activates it', async () => {
    let opened = 0;
    const screen = await render(<Notice opened={() => (opened += 1)} />);
    await userEvent.tab();
    const action = screen.getByRole('button', { name: 'Open in Table' });
    await expect.element(action).toHaveFocus();
    expect(getComputedStyle(action.element()).outlineStyle).toBe('solid');
    await userEvent.keyboard('{Enter}');
    expect(opened).toBe(1);
  });

  it('updates its status text when the counts change', async () => {
    const screen = await render(<Notice />);
    await screen.rerender(<Notice total={84210} />);
    await expect.element(screen.getByRole('status')).toHaveTextContent('Showing the first 100 of 84,210 rows.');
  });

  it('enters with motion only when motion is allowed', async () => {
    await render(<Notice />);
    expect(getComputedStyle(notice()).animationName).toBe('sprout-result-notice-in');
    expect(getComputedStyle(notice()).animationDuration).toBe('0.18s');
    await emulate({ reducedMotion: true });
    expect(getComputedStyle(notice()).animationName).toBe('none');
  });
});
