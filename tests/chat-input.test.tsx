import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import * as sprout from '../packages/sprout/src/index.js';
import {
  ChatInput,
  chatInputReferenceKindNames,
  chatInputStatusNames,
  type ChatInputProps,
} from '../packages/sprout/src/components/chat-input.js';
import type { RichTextValue } from '../packages/sprout/src/components/rich-text-editor.js';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');
const empty: RichTextValue = { type: 'doc', content: [{ type: 'paragraph' }] };
const filled: RichTextValue = {
  type: 'doc',
  content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hi' }] }],
};
const noop = () => {};

const render = (props: Partial<ChatInputProps> = {}) =>
  renderToString(
    <ChatInput
      value={empty}
      onValueChange={noop}
      onSend={noop}
      models={[
        { id: 'opus', label: 'Claude Opus 5.5', brand: 'claude' },
        { id: 'gpt', label: 'GPT-5.5', brand: 'openai' },
      ]}
      model="opus"
      projects={[{ id: 'q3', label: 'Q3 research' }]}
      project="q3"
      modes={[{ id: 'plan', label: 'Plan' }]}
      attachActions={[{ id: 'local', label: 'Upload', onSelect: noop }]}
      prompts={[{ id: 'clarify', label: 'Clarify user problem' }]}
      {...props}
    />,
  );

const sendButton = (html: string) => html.match(/<button[^>]*aria-label="Send message"[^>]*>/)?.[0] ?? '';

describe('ChatInput', () => {
  it('is exported from the package root, subpath, CSS entry, and docs', () => {
    expect(sprout.ChatInput).toBe(ChatInput);
    expect(sprout.chatInputStatusNames).toBe(chatInputStatusNames);
    const pkg = JSON.parse(read('../packages/sprout/package.json'));
    expect(pkg.exports['./chat-input']).toEqual({
      types: './dist/components/chat-input.d.ts',
      import: './dist/components/chat-input.js',
    });
    expect(pkg.dependencies).toHaveProperty('@tiptap/suggestion');
    expect(read('../packages/sprout/src/styles/index.css')).toContain('@import "./chat-input.css";');
    expect(read('../apps/docs/src/data/nav.ts')).toMatch(/component\(\s*"Chat Input"/);
  });

  it('lists reference kinds and statuses', () => {
    expect(chatInputReferenceKindNames).toEqual(['agent', 'skill', 'file']);
    expect(chatInputStatusNames).toEqual(['idle', 'streaming']);
  });

  it('renders the bar: attach, mode, project, model, send', () => {
    const html = render();
    expect(html).toContain('data-slot="chat-input"');
    expect(html).toContain('data-status="idle"');
    expect(html).toContain('aria-label="Add files and more"');
    expect(html).toContain('aria-label="Mode: Default"');
    expect(html).toContain('Q3 research');
    expect(html).toContain('Claude Opus 5.5');
    expect(html).toContain('data-brand="claude"');
    expect(html.indexOf('Q3 research')).toBeLessThan(html.indexOf('Claude Opus 5.5'));
    expect(html.indexOf('Claude Opus 5.5')).toBeLessThan(html.indexOf('aria-label="Send message"'));
  });

  it('enables send only with content', () => {
    expect(sendButton(render())).toContain('disabled');
    expect(sendButton(render({ value: filled }))).not.toContain('disabled');
    expect(
      sendButton(
        render({
          attachments: [{ id: 'a', name: 'spec.pdf', mediaType: 'application/pdf' }],
        }),
      ),
    ).not.toContain('disabled');
    expect(sendButton(render({ value: filled, disabled: true }))).toContain('disabled');
  });

  it('shows prompts only while empty and idle', () => {
    expect(render()).toContain('Clarify user problem');
    expect(render({ value: filled })).not.toContain('Clarify user problem');
    expect(render({ status: 'streaming' })).not.toContain('Clarify user problem');
  });

  it('swaps send for stop while streaming', () => {
    const html = render({ status: 'streaming', onStop: noop });
    expect(html).toContain('data-status="streaming"');
    expect(html).toContain('aria-label="Stop"');
    expect(html).not.toContain('aria-label="Send message"');
  });

  it('shows the active mode as a removable chip', () => {
    const html = render({ mode: 'plan' });
    expect(html).toContain('aria-label="Mode: Plan"');
    expect(html).toContain('aria-label="Turn off Plan"');
  });

  it('shows attachments as chips', () => {
    const html = render({
      attachments: [{ id: 'a', name: 'spec.pdf', mediaType: 'application/pdf' }],
      onRemoveAttachment: noop,
    });
    expect(html).toContain('sprout-chat-input-attachments');
    expect(html).toContain('spec.pdf');
  });
});
