import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { Button } from '../../packages/sprout/src/components/button.js';
import {
  Message,
  MessageAvatar,
  MessageBubble,
  MessageContent,
  MessageFooter,
  MessageGroup,
  MessageHeader,
  MessageReactions,
  type MessageBubbleVariant,
} from '../../packages/sprout/src/components/message.js';
import { axeViolations, emulate, parkPointer, setTheme, settle, themes } from './support.js';

const css = (node: Element) => getComputedStyle(node);
const box = (node: Element) => node.getBoundingClientRect();
const slot = (name: string, root: ParentNode = document) => root.querySelector<HTMLElement>(`[data-slot="${name}"]`)!;

function fillOf(token: string) {
  const probe = document.createElement('span');
  probe.style.background = token;
  document.body.append(probe);
  const value = getComputedStyle(probe).backgroundColor;
  probe.remove();
  return value;
}
const colorOf = (token: string) => {
  const probe = document.createElement('span');
  probe.style.color = `var(${token})`;
  document.body.append(probe);
  const value = getComputedStyle(probe).color;
  probe.remove();
  return value;
};

/** Tabs from the top of the page, whatever the previous test left focused. */
async function tabFromStart() {
  const start = document.createElement('button');
  document.body.prepend(start);
  start.focus();
  await userEvent.tab();
  start.remove();
}

function Reaction() {
  const [pressed, setPressed] = useState(false);
  return (
    <button type="button" aria-pressed={pressed} onClick={() => setPressed(!pressed)}>
      👍 {pressed ? 2 : 1}
    </button>
  );
}

/** A short thread: Ana on the start side, you on the end side. */
function Thread() {
  return (
    <div style={{ width: 560, padding: 24 }}>
      <MessageGroup>
        <Message data-testid="ana">
          <MessageAvatar>
            <span
              style={{
                width: 32,
                height: 32,
                display: 'grid',
                placeItems: 'center',
              }}
            >
              AM
            </span>
          </MessageAvatar>
          <MessageContent>
            <MessageHeader>Ana Morales</MessageHeader>
            <MessageBubble variant="secondary">Bed 2 tomatoes are ready on Friday.</MessageBubble>
            <MessageBubble
              variant="secondary"
              reactions={
                <MessageReactions side="bottom" align="end">
                  <Reaction />
                </MessageReactions>
              }
            >
              Can you bring the crates?
            </MessageBubble>
            <MessageFooter>Read 9:41</MessageFooter>
          </MessageContent>
        </Message>
        <Message align="end" data-testid="you">
          <MessageContent>
            <MessageHeader>You</MessageHeader>
            <MessageBubble>Yes, I'll bring six.</MessageBubble>
            <MessageBubble variant="destructive" render={<button type="button" />}>
              Not delivered. Retry
            </MessageBubble>
            <MessageFooter>Sent</MessageFooter>
          </MessageContent>
        </Message>
      </MessageGroup>
    </div>
  );
}

const variants: Record<MessageBubbleVariant, string> = {
  default: 'var(--sprout-primary)',
  secondary: 'var(--sprout-secondary)',
  outline: 'var(--sprout-surface)',
  destructive: 'var(--sprout-danger-subtle)',
  ghost: 'transparent',
  muted: '',
  tinted: '',
};

/** Moves the pointer off the fixture; earlier files can leave it hovering here. */
describe('Message in a real browser', () => {
  it.each(themes)('%s %s passes axe and paints each fill', async (theme, mode) => {
    setTheme(theme, mode);
    const screen = await render(
      <div style={{ width: 560 }}>
        <Thread />
        {Object.keys(variants).map(variant => (
          <MessageBubble key={variant} variant={variant as MessageBubbleVariant} data-testid={variant}>
            {variant} bubble
          </MessageBubble>
        ))}
      </div>,
    );
    await settle();
    expect(await axeViolations(document.body)).toEqual([]);
    const fill = (variant: string) => css(screen.getByTestId(variant).element()).backgroundColor;
    for (const [variant, token] of Object.entries(variants))
      if (token) expect(fill(variant), variant).toBe(fillOf(token));
    expect(css(screen.getByTestId('outline').element()).borderTopColor).toBe(colorOf('--sprout-line'));
    expect(new Set(['muted', 'tinted', 'secondary', 'outline'].map(fill)).size).toBe(4);
    expect(css(slot('message-header')).color).toBe(colorOf('--sprout-muted'));
  });

  it('lays out start and end messages', async () => {
    const screen = await render(<Thread />);
    const ana = screen.getByTestId('ana').element();
    const you = screen.getByTestId('you').element();
    expect(css(you).flexDirection).toBe('row-reverse');

    const avatar = slot('message-avatar', ana);
    const content = slot('message-content', ana);
    const [first, second] = ana.querySelectorAll('.sprout-message-bubble');
    expect(box(avatar).width).toBeGreaterThanOrEqual(32);
    expect(box(content).left - box(avatar).right).toBe(8);
    expect(Math.abs(box(avatar).bottom - box(second!).bottom)).toBeLessThanOrEqual(1);
    expect(box(second!).top - box(first!).bottom).toBe(10);
    expect(css(slot('message-header', ana)).paddingLeft).toBe('12px');

    const end = slot('message-content', you);
    const right = box(end).right;
    for (const node of you.querySelectorAll('.sprout-message-bubble'))
      expect(Math.round(box(node).right)).toBe(Math.round(right));
    expect(css(slot('message-footer', you)).justifyContent).toBe('flex-end');
    expect(Math.round(box(slot('message-header', you)).right)).toBe(Math.round(right));
  });

  it('sizes bubbles and keeps long content inside', async () => {
    const long = 'Compost'.repeat(80);
    const screen = await render(
      <div style={{ width: 400 }}>
        <Message>
          <MessageContent data-testid="content">
            <MessageHeader style={{ whiteSpace: 'nowrap' }}>
              <span data-testid="name" style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                Ana Morales from the greenhouse cooperative in the valley north of town
              </span>
            </MessageHeader>
            <MessageBubble data-testid="bubble">Short</MessageBubble>
            <MessageBubble data-testid="long">{long}</MessageBubble>
          </MessageContent>
        </Message>
      </div>,
    );
    const bubble = css(screen.getByTestId('bubble').element());
    expect(bubble.padding).toBe('8px 12px');
    expect(bubble.fontSize).toBe('14px');
    expect(bubble.borderTopLeftRadius).toBe('12px');
    const width = box(screen.getByTestId('content').element()).width;
    const node = screen.getByTestId('long').element();
    expect(box(node).width).toBeLessThanOrEqual(width * 0.8 + 1);
    expect(node.scrollWidth).toBeLessThanOrEqual(node.clientWidth + 1);
    const name = screen.getByTestId('name').element();
    expect(name.scrollWidth).toBeGreaterThan(name.clientWidth);
    expect(box(name).right).toBeLessThanOrEqual(box(node).left + width + 1);
  });

  it('a ghost bubble drops the meta inset, a ghost button does not', async () => {
    const screen = await render(
      <>
        <Message data-testid="ghost">
          <MessageContent>
            <MessageHeader>Sprout</MessageHeader>
            <MessageBubble variant="ghost">Here is the plan.</MessageBubble>
            <MessageFooter>Just now</MessageFooter>
          </MessageContent>
        </Message>
        <Message data-testid="plain">
          <MessageContent>
            <MessageBubble>Thanks</MessageBubble>
            <MessageFooter>
              <Button variant="ghost" size="sm">
                Copy
              </Button>
            </MessageFooter>
          </MessageContent>
        </Message>
      </>,
    );
    const ghost = screen.getByTestId('ghost').element();
    expect(css(slot('message-header', ghost)).paddingLeft).toBe('0px');
    expect(css(slot('message-footer', ghost)).paddingLeft).toBe('0px');
    expect(css(ghost.querySelector('.sprout-message-bubble')!).padding).toBe('0px');
    const plain = screen.getByTestId('plain').element();
    expect(css(slot('message-footer', plain)).paddingLeft).toBe('12px');
  });

  it('reactions sit 12px in and toggle from the keyboard', async () => {
    const screen = await render(<Thread />);
    const frame = slot('message-bubble-frame');
    const pill = slot('message-reactions');
    expect(Math.round(box(frame).right - box(pill).right)).toBe(12);
    expect(box(pill).bottom).toBeGreaterThan(box(frame).bottom);
    expect(css(pill).boxShadow).toContain(fillOf('var(--sprout-surface)'));
    const reaction = screen.getByRole('button', { name: '👍 1' });
    const node = reaction.element() as HTMLElement;
    expect(box(node).height).toBe(24);
    node.focus();
    await userEvent.keyboard(' ');
    await expect.element(screen.getByRole('button', { name: '👍 2' })).toHaveAttribute('aria-pressed', 'true');
    await tabFromStart();
    await expect.element(page.elementLocator(node)).toHaveFocus();
    expect(css(node).outlineStyle).toBe('solid');
  });

  it('top reactions sit above the bubble on the start corner', async () => {
    await render(
      <MessageBubble
        reactions={
          <MessageReactions side="top" align="start">
            🌱
          </MessageReactions>
        }
      >
        Seedlings are up.
      </MessageBubble>,
    );
    const frame = box(slot('message-bubble-frame'));
    const pill = box(slot('message-reactions'));
    expect(Math.round(pill.left - frame.left)).toBe(12);
    expect(pill.top).toBeLessThan(frame.top);
  });

  it('interactive bubbles show focus and hover', async () => {
    const screen = await render(
      <MessageBubble variant="secondary" render={<a href="#plan" />}>
        Open the planting plan
      </MessageBubble>,
    );
    const link = screen.getByRole('link', { name: 'Open the planting plan' });
    const node = link.element();
    await parkPointer();
    expect(css(node).transitionDuration).toContain('0.12s');
    await tabFromStart();
    await expect.element(link).toHaveFocus();
    expect(css(node).outlineStyle).toBe('solid');
    await expect.poll(() => css(node).outlineColor).toBe(colorOf('--sprout-focus-ring'));
    const rest = css(node).backgroundColor;
    await link.hover();
    await expect.poll(() => css(node).backgroundColor).not.toBe(rest);
  });

  it('a destructive retry bubble rings in the danger color', async () => {
    const screen = await render(<Thread />);
    const retry = screen.getByRole('button', { name: 'Not delivered. Retry' });
    await tabFromStart();
    for (let step = 0; step < 5 && !retry.element().matches(':focus'); step++) await userEvent.tab();
    await expect.element(retry).toHaveFocus();
    await expect.poll(() => css(retry.element()).outlineColor).toBe(colorOf('--sprout-danger'));
  });

  it('flips end messages in RTL', async () => {
    const screen = await render(
      <div dir="rtl">
        <Thread />
      </div>,
    );
    const you = screen.getByTestId('you').element();
    const content = box(slot('message-content', you));
    for (const node of you.querySelectorAll('.sprout-message-bubble'))
      expect(Math.round(box(node).left)).toBe(Math.round(content.left));
    const ana = screen.getByTestId('ana').element();
    expect(box(slot('message-avatar', ana)).left).toBeGreaterThan(box(slot('message-content', ana)).left);
  });

  it('fits a 390px phone', async () => {
    await page.viewport(390, 844);
    await render(
      <div style={{ padding: 12 }}>
        <MessageGroup>
          <Message>
            <MessageContent>
              <MessageBubble variant="secondary">{'https://example.com/'.repeat(10)}</MessageBubble>
            </MessageContent>
          </Message>
        </MessageGroup>
      </div>,
    );
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
  });

  it('reduced motion removes the transitions', async () => {
    const screen = await render(<Thread />);
    expect(css(slot('message-header')).transitionDuration).toContain('0.12s');
    screen.unmount();
    await emulate({ reducedMotion: true });
    await render(<Thread />);
    expect(css(slot('message-header')).transitionDuration).toBe('0s');
    expect(css(document.querySelector('.sprout-message-bubble')!).transitionDuration).toBe('0s');
  });
});
