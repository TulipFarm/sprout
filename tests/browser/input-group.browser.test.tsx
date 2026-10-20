import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-react';
import { page, userEvent } from 'vitest/browser';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
  InputGroupTextarea,
} from '../../packages/sprout/src/components/input-group.js';
import { axeViolations, emulate, setTheme, settle, themes } from './support.js';

const Search = () => (
  <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
    <circle cx="7" cy="7" r="4" fill="none" stroke="currentColor" />
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

const groupOf = (node: Element) => node.closest<HTMLElement>("[data-slot='input-group']")!;
const css = (node: Element) => getComputedStyle(node);

function Gallery() {
  return (
    <div style={{ display: 'grid', gap: 12, padding: 16, maxWidth: 480 }}>
      <InputGroup data-testid="small">
        <InputGroupAddon>
          <Search />
        </InputGroupAddon>
        <InputGroupInput aria-label="Search chats" placeholder="Search" />
        <InputGroupAddon align="inline-end">
          <InputGroupText>⌘ K</InputGroupText>
        </InputGroupAddon>
      </InputGroup>
      <InputGroup size="lg" data-testid="large">
        <InputGroupAddon>
          <Search />
        </InputGroupAddon>
        <InputGroupInput aria-label="Search the workspace" />
      </InputGroup>
      <InputGroup>
        <InputGroupAddon>
          <InputGroupText>sprout.dev/</InputGroupText>
        </InputGroupAddon>
        <InputGroupInput aria-label="Workspace URL" aria-invalid="true" />
      </InputGroup>
      <InputGroup>
        <InputGroupInput aria-label="Invite link" defaultValue="sprout.dev/j/4" />
        <InputGroupAddon align="inline-end">
          <InputGroupButton data-testid="xs">Copy</InputGroupButton>
          <InputGroupButton size="sm" variant="secondary" data-testid="sm">
            Share
          </InputGroupButton>
          <InputGroupButton size="icon-xs" aria-label="Info" data-testid="icon-xs">
            <Search />
          </InputGroupButton>
          <InputGroupButton size="icon-sm" aria-label="More" data-testid="icon-sm">
            <Search />
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
    </div>
  );
}

function Composer() {
  const [message, setMessage] = useState('');
  const tooLong = message.length > 400;
  return (
    <form style={{ padding: 16, maxWidth: 560 }} onSubmit={e => e.preventDefault()}>
      <InputGroup variant="composer" data-testid="composer">
        <InputGroupTextarea
          aria-label="Message"
          value={message}
          aria-invalid={tooLong}
          onChange={event => setMessage(event.target.value)}
        />
        <InputGroupAddon align="block-end">
          <InputGroupButton size="icon-sm" aria-label="Add a file">
            <Search />
          </InputGroupButton>
          <InputGroupButton
            size="icon-sm"
            type="submit"
            variant={message ? 'default' : 'secondary'}
            disabled={!message || tooLong}
            aria-label="Send message"
          >
            <Search />
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
    </form>
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

describe('InputGroup in a real browser', () => {
  it.each(themes)('%s %s passes axe and paints the surface and border', async (theme, mode) => {
    setTheme(theme, mode);
    const screen = await render(<Gallery />);
    await settle();
    const group = screen.getByTestId('small').element();
    expect(css(group).backgroundColor).toBe(colorOf('--sprout-surface'));
    expect(css(group).borderTopColor).toBe(colorOf('--sprout-input'));
    expect(await axeViolations(screen.container)).toEqual([]);
  });

  it('sizes, additions and buttons render at Cloud dimensions', async () => {
    const screen = await render(<Gallery />);
    const small = screen.getByRole('textbox', { name: 'Search chats' }).element();
    const large = screen.getByRole('textbox', { name: 'Search the workspace' }).element();
    expect(groupOf(small).getBoundingClientRect().height).toBe(32);
    expect(groupOf(large).getBoundingClientRect().height).toBe(44);
    expect(css(small).fontSize).toBe('14px');
    expect(css(large).fontSize).toBe('16px');
    expect(css(small).paddingLeft).toBe('6px');
    expect(css(small).paddingRight).toBe('6px');
    expect(css(small).borderTopWidth).toBe('0px');
    expect(css(screen.getByText('⌘ K').element()).color).toBe(colorOf('--sprout-muted'));
    const sizes: Record<string, [number, number]> = {
      xs: [24, 0],
      sm: [28, 0],
      'icon-xs': [24, 24],
      'icon-sm': [28, 28],
    };
    for (const [id, [h, w]] of Object.entries(sizes)) {
      const button = screen.getByTestId(id).element();
      const box = button.getBoundingClientRect();
      expect(box.height, id).toBe(h);
      if (w) expect(box.width, id).toBe(w);
      expect(button.getAttribute('type')).toBe('button');
      expect(css(button).boxShadow).toBe('none');
    }
  });

  it('keyboard focus rings the group and addons focus the control', async () => {
    const screen = await render(<Gallery />);
    const input = screen.getByRole('textbox', { name: 'Search chats' });
    const group = groupOf(input.element());
    expect(css(group).outlineWidth).toBe('0px');
    await tabFromStart();
    await expect.element(input).toHaveFocus();
    expect(css(group).outlineWidth).toBe('1px');
    expect(css(group).outlineColor).toBe('rgba(0, 0, 0, 0)');
    await expect.poll(() => css(group).borderTopColor).toBe(colorOf('--sprout-border'));

    await screen.getByTestId('large').element().querySelector<HTMLElement>("[data-align='inline-start']")!.click();
    await expect.element(screen.getByRole('textbox', { name: 'Search the workspace' })).toHaveFocus();
  });

  it('invalid and disabled states come from the control', async () => {
    const screen = await render(
      <>
        <Gallery />
        <InputGroup>
          <InputGroupInput aria-label="Saving" disabled />
        </InputGroup>
      </>,
    );
    const invalid = screen.getByRole('textbox', { name: 'Workspace URL' });
    expect(css(groupOf(invalid.element())).borderTopColor).toBe(colorOf('--sprout-danger'));
    const disabled = screen.getByRole('textbox', { name: 'Saving' }).element();
    expect(css(groupOf(disabled)).opacity).toBe('0.5');
    expect(css(disabled).opacity).toBe('1');
  });

  it('composer focuses, grows, validates and enables send', async () => {
    const screen = await render(<Composer />);
    const group = screen.getByTestId('composer').element();
    expect(css(group).borderTopColor).toBe(colorOf('--sprout-input'));
    const send = screen.getByRole('button', { name: 'Send message' });
    await expect.element(send).toBeDisabled();
    expect(send.element().getBoundingClientRect().width).toBe(28);
    const message = screen.getByRole('textbox', { name: 'Message' });
    await tabFromStart();
    await expect.element(message).toHaveFocus();
    await expect.poll(() => css(group).borderTopColor).toBe(colorOf('--sprout-border'));
    await userEvent.keyboard('Summarize the Q3 forecast.');
    await expect.element(send).toBeEnabled();
    await expect.element(send).toHaveAttribute('data-variant', 'default');
    await message.fill('x'.repeat(401));
    await expect.element(message).toHaveAttribute('aria-invalid', 'true');
    await expect.poll(() => css(group).borderTopColor).toBe(colorOf('--sprout-danger'));
    await expect.element(send).toBeDisabled();
  });

  it('groups fit a 390px phone without spilling', async () => {
    await page.viewport(390, 800);
    const screen = await render(<Gallery />);
    await settle();
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
    for (const group of screen.container.querySelectorAll<HTMLElement>("[data-slot='input-group']")) {
      const box = group.getBoundingClientRect();
      expect(box.left).toBeGreaterThanOrEqual(0);
      expect(box.right).toBeLessThanOrEqual(390);
      expect(group.scrollWidth).toBeLessThanOrEqual(group.clientWidth + 1);
    }
  });

  it('transitions run only without reduced motion', async () => {
    const screen = await render(<Gallery />);
    const group = screen.getByTestId('small').element();
    expect(css(group).transitionDuration).toContain('0.12s');
    await emulate({ reducedMotion: true });
    expect(css(group).transitionDuration).toBe('0s');
  });
});
