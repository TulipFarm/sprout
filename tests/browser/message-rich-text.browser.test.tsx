import { describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { ChatInput, type ChatInputResolvedReference } from '../../packages/sprout/src/components/chat-input.js';
import { MessageBubble } from '../../packages/sprout/src/components/message.js';
import { MessageRichText } from '../../packages/sprout/src/components/message-rich-text.js';
import type { RichTextKeyword, RichTextValue } from '../../packages/sprout/src/components/rich-text-editor.js';
import { setTheme, themes } from './support.js';

const csv = new File(['Region,Revenue\nNorth,"1,200"\nSouth,980'], 'q3.csv', { type: 'text/csv' });
const resolve = (ref: { id: string }): ChatInputResolvedReference | undefined =>
  ref.id === 'q3'
    ? { file: { name: 'q3.csv', mediaType: 'text/csv', source: { kind: 'local', file: csv } } }
    : undefined;

const slack: RichTextKeyword = { id: 'slack', label: 'Slack', account: 'acme.slack.com' };
const value: RichTextValue = {
  type: 'doc',
  content: [
    {
      type: 'paragraph',
      content: [
        { type: 'text', text: 'Ask ' },
        {
          type: 'chatReference',
          attrs: { kind: 'agent', id: 'researcher', label: 'researcher', description: 'Finds sources' },
        },
        { type: 'text', text: ' to post ' },
        { type: 'chatReference', attrs: { kind: 'file', id: 'q3', label: 'q3.csv' } },
        { type: 'text', text: ' in slack' },
      ],
    },
  ],
};

const message = () => render(<MessageRichText value={value} keywords={[slack]} resolveReference={resolve} />);

describe('MessageRichText in a real browser', () => {
  it('hovering a keyword shows the account it used', async () => {
    const screen = await message();
    await userEvent.hover(screen.container.querySelector('[data-keyword="slack"]')!);
    await expect.element(page.getByText('acme.slack.com')).toBeVisible();
  });

  it('focusing a tagged agent shows what it does', async () => {
    await message();
    await userEvent.tab();
    await expect.element(page.getByText('Finds sources')).toBeVisible();
  });

  it('a file chip peeks at the table on hover and opens the viewer on click', async () => {
    const screen = await message();
    const file = screen.container.querySelector<HTMLElement>('.sprout-message-rich-text-file')!;
    await userEvent.hover(file);
    const peek = page.elementLocator(document.body).getByRole('table');
    await expect.element(peek).toBeVisible();
    await expect.element(peek.getByRole('cell', { name: '1,200' })).toBeVisible();
    await userEvent.click(file);
    await expect.element(page.getByRole('dialog')).toBeVisible();
    await expect.element(page.getByRole('dialog').getByText('q3.csv').first()).toBeVisible();
  });

  it('the composer file chip peeks and opens the same viewer', async () => {
    const screen = await render(
      <ChatInput value={value} onValueChange={() => {}} onSend={() => {}} resolveReference={resolve} />,
    );
    const chip = screen.container.querySelector<HTMLElement>('[data-chat-reference="file"]')!;
    await userEvent.hover(chip);
    await expect.element(page.getByRole('cell', { name: '1,200' })).toBeVisible();
    await userEvent.click(chip);
    await expect.element(page.getByRole('dialog')).toBeVisible();
  });

  it.each(themes)('%s %s draws chips at the same height as the composer', async (theme, mode) => {
    setTheme(theme, mode);
    const screen = await render(
      <div>
        <div data-testid="composer">
          <ChatInput
            value={value}
            onValueChange={() => {}}
            onSend={() => {}}
            integrations={[slack]}
            resolveReference={resolve}
          />
        </div>
        <div data-testid="message">
          <MessageBubble>
            <MessageRichText value={value} keywords={[slack]} resolveReference={resolve} />
          </MessageBubble>
        </div>
      </div>,
    );
    const height = (root: string, selector: string) =>
      screen.getByTestId(root).element().querySelector(selector)!.getBoundingClientRect().height;
    for (const selector of [
      '[data-keyword="slack"]',
      '[data-chat-reference="agent"]',
      '[data-chat-reference="file"]',
    ]) {
      await expect.poll(() => height('composer', selector)).toBeGreaterThan(0);
      expect(height('message', selector), selector).toBe(height('composer', selector));
    }
  });
});
