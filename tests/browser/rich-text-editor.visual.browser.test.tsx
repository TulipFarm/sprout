import { expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { Button } from '../../packages/sprout/src/components/button.js';
import { RichTextEditor } from '../../packages/sprout/src/components/rich-text-editor.js';
import { setTheme, settle, themes } from './support.js';

const text = (value: string) => ({ type: 'text', text: value });
const p = (value?: string) => ({
  type: 'paragraph',
  ...(value && { content: [text(value)] }),
});

it.each(themes)('rich-text-editor %s %s', async (theme, mode) => {
  setTheme(theme, mode);
  const screen = await render(
    <div
      data-testid="shot"
      style={{
        display: 'grid',
        gap: 16,
        width: 420,
        padding: 16,
        background: 'var(--sprout-canvas)',
      }}
    >
      <RichTextEditor
        ariaLabel="Renewal plan draft"
        value={{
          type: 'doc',
          content: [
            {
              type: 'heading',
              attrs: { level: 2 },
              content: [text('Renewal plan')],
            },
            {
              type: 'paragraph',
              content: [
                { type: 'text', text: 'Northwind', marks: [{ type: 'bold' }] },
                text(' renews in '),
                {
                  type: 'text',
                  text: 'March',
                  marks: [{ type: 'link', attrs: { href: 'https://example.com' } }],
                },
                text(' with '),
                { type: 'text', text: 'seats', marks: [{ type: 'code' }] },
                text('.'),
              ],
            },
            {
              type: 'bulletList',
              content: [{ type: 'listItem', content: [p('Confirm seats')] }],
            },
            { type: 'blockquote', content: [p('Keep the 12% discount.')] },
            { type: 'codeBlock', content: [text('select 1')] },
          ],
        }}
        onChange={() => {}}
        onSend={() => {}}
        toolbarAddon={
          <Button size="sm" variant="ghost">
            Bold
          </Button>
        }
      />
      <RichTextEditor
        ariaLabel="Quick note"
        size="sm"
        placeholder="Add a quick note…"
        value={{ type: 'doc', content: [p()] }}
        onChange={() => {}}
        onSend={() => {}}
      />
      <RichTextEditor
        ariaLabel="Archived"
        disabled
        value={{ type: 'doc', content: [p('Archived message')] }}
        onChange={() => {}}
        onSend={() => {}}
      />
    </div>,
  );
  await expect.element(page.getByRole('textbox', { name: 'Archived' })).toBeInTheDocument();
  await settle();
  await expect.element(screen.getByTestId('shot')).toMatchScreenshot(`rich-text-editor-${theme}-${mode}`);
});
