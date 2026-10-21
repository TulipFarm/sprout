import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { Button } from '../../packages/sprout/src/components/button.js';
import {
  RichTextEditor,
  type RichTextEditorProps,
  type RichTextValue,
} from '../../packages/sprout/src/components/rich-text-editor.js';
import { axeViolations, emulate, setTheme, settle, themes } from './support.js';

function colorOf(token: string) {
  const probe = document.createElement('span');
  probe.style.color = `var(${token})`;
  document.body.append(probe);
  const value = getComputedStyle(probe).color;
  probe.remove();
  return value;
}

const text = (value: string) => ({ type: 'text', text: value });
const p = (value?: string) => ({
  type: 'paragraph',
  ...(value && { content: [text(value)] }),
});
const empty: RichTextValue = { type: 'doc', content: [p()] };

const formatted: RichTextValue = {
  type: 'doc',
  content: [
    { type: 'heading', attrs: { level: 2 }, content: [text('Renewal plan')] },
    {
      type: 'paragraph',
      content: [
        { type: 'text', text: 'Northwind', marks: [{ type: 'bold' }] },
        text(' renews in '),
        {
          type: 'text',
          text: 'March',
          marks: [{ type: 'link', attrs: { href: 'https://example.com/northwind' } }],
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
    {
      type: 'orderedList',
      content: [{ type: 'listItem', content: [p('Send quote')] }],
    },
    { type: 'blockquote', content: [p('Keep the 12% discount.')] },
    {
      type: 'codeBlock',
      attrs: { language: 'sql' },
      content: [text('select 1')],
    },
  ],
};

function Editor({
  initial = empty,
  onSend = () => {},
  ...props
}: Partial<RichTextEditorProps> & { initial?: RichTextValue }) {
  const [value, setValue] = useState(initial);
  return (
    <div style={{ width: 420, padding: 16 }}>
      <RichTextEditor value={value} onChange={setValue} onSend={onSend} {...props} />
    </div>
  );
}

const box = (name = 'Message') => page.getByRole('textbox', { name });
const wrapper = (node: Element) => node.closest('[data-slot="rich-text-editor"]')!;

/** Tiptap mounts after the first render. */
async function mounted(name = 'Message') {
  await expect.element(box(name)).toBeInTheDocument();
  return box(name).element() as HTMLElement;
}

describe('RichTextEditor in a real browser', () => {
  it.each(themes)('%s %s styles formatted content and passes axe', async (theme, mode) => {
    setTheme(theme, mode);
    const screen = await render(
      <Editor
        initial={formatted}
        ariaLabel="Renewal plan draft"
        toolbarAddon={
          <Button size="sm" variant="ghost">
            Bold
          </Button>
        }
      />,
    );
    const editor = await mounted('Renewal plan draft');
    await settle();
    for (const selector of ['h2', 'strong', 'a', 'ul', 'ol', 'blockquote', 'code', 'pre'])
      await expect.element(page.elementLocator(editor.querySelector(selector)!)).toBeVisible();
    expect(editor.querySelector('a')!.getAttribute('href')).toBe('https://example.com/northwind');
    expect(getComputedStyle(editor).color).toBe(colorOf('--sprout-text'));
    expect(getComputedStyle(editor.querySelector('a')!).color).toBe(colorOf('--sprout-primary'));
    expect(getComputedStyle(editor.querySelector('pre')!).backgroundColor).toBe(colorOf('--sprout-hover'));
    expect(getComputedStyle(editor.querySelector('blockquote')!).borderLeftColor).toBe(colorOf('--sprout-line'));
    expect(
      getComputedStyle(screen.container.querySelector('[data-slot="rich-text-editor-toolbar"]')!).borderTopColor,
    ).toBe(colorOf('--sprout-line'));
    expect(await axeViolations(screen.container)).toEqual([]);
  });

  it('default and compact sizes grow to a cap, then scroll', async () => {
    await render(
      <>
        <Editor ariaLabel="Local draft" />
        <Editor ariaLabel="Quick note" size="sm" />
      </>,
    );
    const full = await mounted('Local draft');
    const compact = await mounted('Quick note');
    expect(full.getAttribute('aria-multiline')).toBe('true');
    expect(full.getAttribute('aria-autocomplete')).toBe('list');
    expect(getComputedStyle(full).fontSize).toBe('16px');
    expect(getComputedStyle(compact).fontSize).toBe('14px');
    expect(full.getBoundingClientRect().height).toBeGreaterThanOrEqual(80);
    expect(compact.getBoundingClientRect().height).toBeGreaterThanOrEqual(40);
    expect(compact.getBoundingClientRect().height).toBeLessThan(80);
    await box('Quick note').click();
    for (let line = 0; line < 10; line++) await userEvent.keyboard('{Shift>}{Enter}{/Shift}');
    expect(compact.getBoundingClientRect().height).toBeLessThanOrEqual(128);
    expect(compact.scrollHeight).toBeGreaterThan(compact.clientHeight);
    await box('Local draft').click();
    for (let line = 0; line < 16; line++) await userEvent.keyboard('{Shift>}{Enter}{/Shift}');
    expect(full.getBoundingClientRect().height).toBeLessThanOrEqual(256);
    expect(full.scrollHeight).toBeGreaterThan(full.clientHeight);
  });

  it('Enter sends, Shift+Enter breaks, lists keep Enter, and Cmd+Enter sends from a list', async () => {
    let sent = 0;
    await render(<Editor onSend={() => sent++} />);
    const editor = await mounted();
    await box().click();
    await userEvent.keyboard('- first');
    await userEvent.keyboard('{Enter}');
    await userEvent.keyboard('second');
    expect(editor.querySelectorAll('ul > li')).toHaveLength(2);
    expect(sent).toBe(0);
    await userEvent.keyboard('{Enter}{Enter}after{Shift>}{Enter}{/Shift}more');
    expect(editor.querySelectorAll('p br:not(.ProseMirror-trailingBreak)')).toHaveLength(1);
    expect(sent).toBe(0);
    await userEvent.keyboard('{Enter}');
    expect(sent).toBe(1);
    await userEvent.keyboard('{Control>}{Enter}{/Control}');
    expect(sent).toBe(2);
  });

  it('markdown shortcuts make headings and fenced code, where Enter stays in the block', async () => {
    let sent = 0;
    await render(
      <>
        <Editor ariaLabel="Heading" onSend={() => sent++} />
        <Editor ariaLabel="Code" onSend={() => sent++} />
      </>,
    );
    const heading = await mounted('Heading');
    const code = await mounted('Code');
    await box('Heading').click();
    await userEvent.keyboard('## Weekly numbers');
    expect(heading.querySelector('h2')?.textContent).toBe('Weekly numbers');
    await box('Code').click();
    await userEvent.keyboard('```sql select 1{Enter}');
    expect(code.querySelector('pre code')?.textContent).toBe('select 1\n');
    expect(sent).toBe(0);
  });

  it('a fence typed after Shift+Enter still starts a code block', async () => {
    let sent = 0;
    await render(<Editor onSend={() => sent++} />);
    const editor = await mounted();
    await box().click();
    await userEvent.keyboard('Run this:{Shift>}{Enter}{/Shift}```js ');
    expect(editor.querySelector('p')?.textContent).toBe('Run this:');
    expect(editor.querySelectorAll('pre code')).toHaveLength(1);
    expect(sent).toBe(0);
  });

  it('disabled editors are inert, faded, and not-allowed', async () => {
    await render(
      <Editor ariaLabel="Archived chat message" initial={{ type: 'doc', content: [p('Archived')] }} disabled />,
    );
    const editor = await mounted('Archived chat message');
    expect(editor.getAttribute('contenteditable')).toBe('false');
    expect(editor.getAttribute('aria-disabled')).toBe('true');
    expect(getComputedStyle(wrapper(editor)).opacity).toBe('0.6');
    expect(getComputedStyle(editor).cursor).toBe('not-allowed');
  });

  it('a condensed editor is one row with the toolbar inline', async () => {
    await render(
      <Editor
        condensed
        placeholder="Send a separate message…"
        toolbarAddon={
          <Button size="icon-sm" aria-label="Send message">
            ↑
          </Button>
        }
      />,
    );
    const editor = await mounted();
    const toolbar = wrapper(editor).querySelector('[data-slot="rich-text-editor-toolbar"]')!;
    expect(editor.querySelector('p')!.getAttribute('data-placeholder')).toBe('Send a separate message…');
    expect(editor.getBoundingClientRect().height).toBeLessThan(80);
    expect(toolbar.getBoundingClientRect().top).toBeLessThan(editor.getBoundingClientRect().bottom);
    expect(toolbar.getBoundingClientRect().left).toBeGreaterThanOrEqual(editor.getBoundingClientRect().right - 1);
    expect(getComputedStyle(toolbar).borderTopWidth).toBe('0px');
  });

  it('fits a phone with long words and a code line that scrolls inside its block', async () => {
    await page.viewport(390, 844);
    await render(
      <div style={{ padding: 16 }}>
        <RichTextEditor
          value={{
            type: 'doc',
            content: [
              p('Supercalifragilisticexpialidocious-renewal-notes-for-northwind-traders'),
              {
                type: 'codeBlock',
                content: [text("select * from renewals where account = 'northwind' and seats > 100")],
              },
            ],
          }}
          onChange={() => {}}
          onSend={() => {}}
          toolbarAddon={
            <Button size="sm" variant="ghost">
              Attach
            </Button>
          }
        />
      </div>,
    );
    const editor = await mounted();
    const outer = wrapper(editor);
    expect(outer.getBoundingClientRect().right).toBeLessThanOrEqual(390);
    expect(outer.scrollWidth).toBeLessThanOrEqual(outer.clientWidth + 1);
    const pre = editor.querySelector('pre')!;
    expect(pre.scrollWidth).toBeGreaterThan(pre.clientWidth);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
  });

  it('fades over 120ms, and reduced motion turns it off', async () => {
    await render(<Editor />);
    const editor = await mounted();
    expect(getComputedStyle(wrapper(editor)).transitionDuration).toBe('0.12s');
    await emulate({ reducedMotion: true });
    expect(getComputedStyle(wrapper(editor)).transitionDuration).toBe('0s');
  });
});
