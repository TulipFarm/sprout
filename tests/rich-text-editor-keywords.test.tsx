// @vitest-environment jsdom
import { act, fireEvent, render, waitFor } from '@testing-library/react';
import { createRef } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  RichTextEditor,
  findKeywords,
  type RichTextEditorHandle,
  type RichTextKeyword,
  type RichTextValue,
} from '../packages/sprout/src/components/rich-text-editor.js';
import { ChatInput } from '../packages/sprout/src/components/chat-input.js';
import * as sprout from '../packages/sprout/src/index.js';

const doc = (...content: RichTextValue[]): RichTextValue => ({ type: 'doc', content });
const p = (...content: RichTextValue[]): RichTextValue => ({ type: 'paragraph', content });
const text = (value: string, marks?: RichTextValue['marks']): RichTextValue => ({
  type: 'text',
  text: value,
  ...(marks ? { marks } : {}),
});
const ids = (value: RichTextValue, keywords: readonly RichTextKeyword[]) =>
  findKeywords(value, keywords).map(keyword => keyword.id);

const keywords: RichTextKeyword[] = [
  { id: 'openai', label: 'ChatGPT', match: ['ChatGPT', 'OpenAI'], icon: <svg data-testid="openai" /> },
  {
    id: 'slack',
    label: 'Slack',
    icon: <svg data-testid="slack" />,
    accounts: [
      { id: 'tf', label: 'tulipfarm.slack.com' },
      { id: 'acme', label: 'acme.slack.com' },
    ],
    account: 'tf',
  },
  { id: 'google-drive', label: 'Google Drive' },
  { id: 'google', label: 'Google' },
  { id: 'hubspot', label: 'HubSpot', connected: false },
];

describe('findKeywords', () => {
  it('is exported from the package root', () => {
    expect(sprout).toHaveProperty('findKeywords');
  });

  it('matches case-insensitively, any alias, and returns each keyword once in first-mention order', () => {
    const value = doc(p(text('Post to slack, ask openai, then SLACK again and ChatGPT.')));
    expect(ids(value, keywords)).toEqual(['slack', 'openai']);
  });

  it('respects word boundaries', () => {
    expect(ids(doc(p(text('slacking off with Slackbot in hubspots'))), keywords)).toEqual([]);
    expect(ids(doc(p(text('(Slack)'))), keywords)).toEqual(['slack']);
  });

  it('prefers the longest term and allows any whitespace inside multi-word terms', () => {
    expect(ids(doc(p(text('Save to Google  Drive'))), keywords)).toEqual(['google-drive']);
    expect(ids(doc(p(text('Search Google'))), keywords)).toEqual(['google']);
  });

  it('skips code marks and code blocks, and does not join across hard breaks or nodes', () => {
    const value = doc(
      p(text('run '), text('slack', [{ type: 'code' }])),
      { type: 'codeBlock', content: [text('ChatGPT')] },
      p(text('Google'), { type: 'hardBreak' }, text('Drive')),
    );
    expect(ids(value, keywords)).toEqual(['google']);
  });

  it('matches across mark boundaries in one text run', () => {
    expect(ids(doc(p(text('Hub', [{ type: 'bold' }]), text('Spot'))), keywords)).toEqual(['hubspot']);
  });

  it('matches short aliases and prefers the full name over an alias inside it', () => {
    const docs: RichTextKeyword[] = [
      { id: 'google-docs', label: 'Google Docs', match: ['Google Docs', 'GDocs', 'Docs'] },
    ];
    const hits = (value: string) => ids(doc(p(text(value))), docs);
    expect(hits('open google docs')).toEqual(['google-docs']);
    expect(hits('a gdocs link')).toEqual(['google-docs']);
    expect(hits('the Docs')).toEqual(['google-docs']);
    expect(hits('docstring')).toEqual([]);
  });

  it('ignores empty or missing terms', () => {
    expect(ids(doc(p(text('anything'))), [{ id: 'x', label: '', match: [' '] }])).toEqual([]);
    expect(ids(doc(), keywords)).toEqual([]);
  });
});

async function setup(
  value: RichTextValue,
  onKeywordConnect?: (keyword: RichTextKeyword) => void,
  onKeywordAccountChange?: (keyword: RichTextKeyword, accountId: string) => void,
) {
  const ref = createRef<RichTextEditorHandle>();
  const view = render(
    <RichTextEditor
      ref={ref}
      aria-label="Message"
      value={value}
      onChange={() => {}}
      keywords={keywords}
      onKeywordConnect={onKeywordConnect}
      onKeywordAccountChange={onKeywordAccountChange}
    />,
  );
  await waitFor(() => expect(ref.current?.editor()).toBeTruthy());
  await waitFor(() => expect(view.container.querySelector('.sprout-rich-text-keyword')).toBeTruthy());
  return { ...view, editor: ref.current!.editor()! };
}

describe('RichTextEditor keywords', () => {
  beforeEach(() => {
    const rect = { left: 0, right: 40, top: 60, bottom: 80, width: 40, height: 20, x: 0, y: 60 } as DOMRect;
    const rects = () => Object.assign([rect], { item: () => rect }) as unknown as DOMRectList;
    Range.prototype.getBoundingClientRect = () => rect;
    Range.prototype.getClientRects = rects;
    Element.prototype.getClientRects ??= rects;
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({
      ...rect,
      top: 0,
      bottom: 200,
      right: 400,
      width: 400,
      height: 200,
    });
    return () => vi.restoreAllMocks();
  });

  it('decorates matches as chips with a brand glyph while keeping plain text', async () => {
    const { container, editor } = await setup(doc(p(text('Use ChatGPT and Slack'))));
    const chips = [...container.querySelectorAll<HTMLElement>('.sprout-rich-text-keyword')];
    expect(chips.map(chip => [chip.textContent, chip.dataset.keyword, chip.dataset.connected])).toEqual([
      ['ChatGPT', 'openai', 'true'],
      ['Slack', 'slack', 'true'],
    ]);
    const icons = container.querySelectorAll('.ProseMirror .sprout-rich-text-keyword-icon');
    expect(icons).toHaveLength(2);
    expect(icons[0]!.getAttribute('aria-hidden')).toBe('true');
    expect(icons[0]!.querySelector('[data-testid="openai"]')).toBeTruthy();
    expect(editor.getText()).toBe('Use ChatGPT and Slack');
    expect(container.querySelector('.ProseMirror .sprout-rich-text-keyword-status')).toBeNull();
  });

  it('updates chips as the text changes', async () => {
    const { container, editor } = await setup(doc(p(text('Use Slack'))));
    act(() => {
      editor.commands.setContent(doc(p(text('Use Google Drive'))));
    });
    await waitFor(() =>
      expect(
        [...container.querySelectorAll<HTMLElement>('.sprout-rich-text-keyword')].map(chip => chip.dataset.keyword),
      ).toEqual(['google-drive']),
    );
  });

  it('marks disconnected keywords, announces them, and connects from the hint', async () => {
    const onConnect = vi.fn();
    const { container, editor, getByRole, findByRole } = await setup(doc(p(text('Log it in HubSpot'))), onConnect);
    act(() => {
      editor.commands.setContent(doc(p(text('Use HubSpot'))));
    });
    expect(getByRole('status').textContent).toBe("HubSpot isn't connected.");
    const chip = container.querySelector<HTMLElement>('.sprout-rich-text-keyword')!;
    expect(chip.dataset.connected).toBe('false');
    expect(container.querySelector('.ProseMirror .sprout-rich-text-keyword-status')).toBeTruthy();

    fireEvent.pointerOver(chip);
    const button = await findByRole('button', { name: 'Connect HubSpot' });
    expect(button.closest('.sprout-rich-text-keyword-hint')?.textContent).toContain("HubSpot isn't connected");
    fireEvent.click(button);
    expect(onConnect).toHaveBeenCalledWith(expect.objectContaining({ id: 'hubspot' }));
  });

  it('shows the account of a connected chip and switches it from a menu', async () => {
    const onChange = vi.fn();
    const { container, findByRole, getByRole, queryByRole } = await setup(
      doc(p(text('Post to Slack'))),
      undefined,
      onChange,
    );
    fireEvent.pointerOver(container.querySelector('.sprout-rich-text-keyword')!);
    const button = await findByRole('button', { name: 'Switch Slack account' });
    const hint = button.closest<HTMLElement>('.sprout-rich-text-keyword-hint')!;
    expect(hint.querySelector('.sprout-rich-text-keyword-hint-label')?.textContent).toBe('Slack');
    expect(hint.querySelector('.sprout-rich-text-keyword-hint-account')?.textContent).toBe('tulipfarm.slack.com');
    expect(hint.querySelector('[data-testid="slack"]')?.closest('[aria-hidden="true"]')).toBeTruthy();
    expect(button.getAttribute('aria-haspopup')).toBe('menu');

    fireEvent.click(button);
    const menu = getByRole('menu', { name: 'Slack accounts' });
    expect(button.getAttribute('aria-expanded')).toBe('true');
    const current = getByRole('menuitemradio', { name: 'tulipfarm.slack.com' });
    expect(current.getAttribute('aria-checked')).toBe('true');
    expect(document.activeElement).toBe(current);
    fireEvent.keyDown(menu, { key: 'ArrowDown' });
    const other = getByRole('menuitemradio', { name: 'acme.slack.com' });
    expect(document.activeElement).toBe(other);
    fireEvent.keyDown(menu, { key: 'Escape' });
    expect(queryByRole('menu')).toBeNull();
    expect(document.activeElement).toBe(button);

    fireEvent.click(button);
    fireEvent.click(getByRole('menuitemradio', { name: 'acme.slack.com' }));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ id: 'slack' }), 'acme');
    expect(queryByRole('menu')).toBeNull();
  });

  it('keeps the menu open with a spinner until an async switch settles', async () => {
    let settle!: { resolve: () => void; reject: () => void };
    const onChange = vi.fn(
      () =>
        new Promise<void>((resolve, reject) => {
          settle = { resolve, reject: () => reject(new Error('nope')) };
        }),
    );
    const { container, findByRole, getByRole, queryByRole, getAllByRole } = await setup(
      doc(p(text('Post to Slack'))),
      undefined,
      onChange,
    );
    fireEvent.pointerOver(container.querySelector('.sprout-rich-text-keyword')!);
    fireEvent.click(await findByRole('button', { name: 'Switch Slack account' }));
    fireEvent.click(getByRole('menuitemradio', { name: 'acme.slack.com' }));
    const menu = getByRole('menu', { name: 'Slack accounts' });
    expect(menu.getAttribute('aria-busy')).toBe('true');
    expect(getByRole('menuitemradio', { name: 'acme.slack.com' }).querySelector('[data-slot="spinner"]')).toBeTruthy();
    expect(getByRole('menuitemradio', { name: 'tulipfarm.slack.com' }).getAttribute('aria-disabled')).toBe('true');

    await act(async () => settle.reject());
    expect(queryByRole('menu')).toBeTruthy();
    expect(menu.getAttribute('aria-busy')).toBeNull();
    expect(container.querySelector('.sprout-rich-text-keyword-menu-error')?.textContent).toBe(
      "Couldn't switch. Try again.",
    );
    expect(getAllByRole('status').some(el => el.textContent === "Couldn't switch the Slack account.")).toBe(true);

    fireEvent.click(getByRole('menuitemradio', { name: 'acme.slack.com' }));
    await act(async () => settle.resolve());
    expect(queryByRole('menu')).toBeNull();
  });

  it('announces the account when the caret enters a chip', async () => {
    const { editor, getByRole } = await setup(doc(p(text('Post to Slack'))), undefined, vi.fn());
    act(() => {
      editor.commands.focus(11);
    });
    await waitFor(() =>
      expect(getByRole('status').textContent).toBe('Slack uses tulipfarm.slack.com. Press Tab to change it.'),
    );
  });

  it('hides Switch with a single account', async () => {
    const one: RichTextKeyword[] = [{ id: 'notion', label: 'Notion', account: 'Personal' }];
    const view = render(
      <RichTextEditor
        value={doc(p(text('Notion')))}
        onChange={() => {}}
        onSend={() => {}}
        keywords={one}
        onKeywordAccountChange={() => {}}
      />,
    );
    await waitFor(() => expect(view.container.querySelector('.sprout-rich-text-keyword')).toBeTruthy());
    fireEvent.pointerOver(view.container.querySelector('.sprout-rich-text-keyword')!);
    await waitFor(() =>
      expect(view.container.querySelector('.sprout-rich-text-keyword-hint-account')?.textContent).toBe('Personal'),
    );
    expect(view.queryByRole('button', { name: 'Switch Notion account' })).toBeNull();
  });

  it('shows no tooltip for a connected chip without an account', async () => {
    const { container } = await setup(doc(p(text('Ask ChatGPT'))));
    fireEvent.pointerOver(container.querySelector('.sprout-rich-text-keyword')!);
    await new Promise(resolve => setTimeout(resolve, 20));
    expect(container.querySelector('.sprout-rich-text-keyword-hint')).toBeNull();
  });

  it('omits the Connect button without a handler', async () => {
    const { container, queryByRole } = await setup(doc(p(text('HubSpot'))));
    fireEvent.pointerOver(container.querySelector('.sprout-rich-text-keyword')!);
    await waitFor(() => expect(container.querySelector('.sprout-rich-text-keyword-hint')).toBeTruthy());
    expect(queryByRole('button', { name: 'Connect HubSpot' })).toBeNull();
  });
});

describe('ChatInput integrations', () => {
  it('forwards integrations and the connect handler to the editor', async () => {
    const onConnect = vi.fn();
    const view = render(
      <ChatInput
        value={doc(p(text('Send it to Slack and HubSpot')))}
        onValueChange={() => {}}
        onSend={() => {}}
        integrations={keywords}
        onConnectIntegration={onConnect}
      />,
    );
    await waitFor(() => expect(view.container.querySelectorAll('.sprout-rich-text-keyword')).toHaveLength(2));
    const offline = view.container.querySelector<HTMLElement>('.sprout-rich-text-keyword[data-connected="false"]')!;
    expect(offline.textContent).toBe('HubSpot');
  });
});
