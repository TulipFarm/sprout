import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import * as sprout from '../packages/sprout/src/index.js';
import { MessageRichText } from '../packages/sprout/src/components/message-rich-text.js';
import {
  keywordAccounts,
  type RichTextKeyword,
  type RichTextValue,
} from '../packages/sprout/src/components/rich-text-editor.js';

const text = (value: string, marks?: RichTextValue['marks']): RichTextValue => ({ type: 'text', text: value, marks });
const reference = (kind: string, id: string, label: string, description?: string): RichTextValue => ({
  type: 'chatReference',
  attrs: { kind, id, label, description },
});
const doc = (...content: RichTextValue[]): RichTextValue => ({
  type: 'doc',
  content: [{ type: 'paragraph', content }],
});

const slack: RichTextKeyword = { id: 'slack', label: 'Slack', icon: <svg />, account: 'acme.slack.com' };
const github: RichTextKeyword = { id: 'github', label: 'GitHub', connected: false };

describe('MessageRichText', () => {
  it('is exported from the package root', () => {
    expect(sprout).toHaveProperty('MessageRichText');
    expect(sprout).toHaveProperty('keywordAccounts');
  });

  it('renders marks, keeps safe links and drops unsafe ones', () => {
    const html = renderToString(
      <MessageRichText
        value={doc(
          text('bold', [{ type: 'bold' }]),
          text(' '),
          text('site', [{ type: 'link', attrs: { href: 'https://example.com' } }]),
          text(' '),
          text('bad', [{ type: 'link', attrs: { href: 'javascript:alert(1)' } }]),
        )}
      />,
    );
    expect(html).toContain('data-slot="message-rich-text"');
    expect(html).toContain('<strong>bold</strong>');
    expect(html).toContain('href="https://example.com" target="_blank" rel="noopener noreferrer"');
    expect(html).not.toContain('javascript:');
  });

  it('shows keywords with the composer chip markup, and the sent account wins over the current one', () => {
    const value = doc(text('Ask slack and github'));
    const html = renderToString(<MessageRichText value={value} keywords={[slack, github]} />);
    expect(html).toMatch(/class="sprout-rich-text-keyword" data-keyword="slack" data-connected="true" data-icon=""/);
    expect(html).toMatch(/class="sprout-rich-text-keyword-status" data-keyword="github" data-connected="false"/);
    const sent = renderToString(
      <MessageRichText value={value} keywords={[slack, github]} accounts={{ github: 'acme-org' }} />,
    );
    expect(sent).toMatch(/data-keyword="github" data-connected="true"/);
    expect(sent).not.toContain('sprout-rich-text-keyword-status');
  });

  it('renders tagged agents, skills and files with their prefix, and only a known file as a button', () => {
    const value = doc(
      reference('agent', 'researcher', 'researcher', 'Finds sources'),
      text(' '),
      reference('file', 'q3', 'q3.csv'),
      text(' '),
      reference('file', 'gone', 'gone.pdf'),
    );
    const html = renderToString(
      <MessageRichText
        value={value}
        resolveReference={ref =>
          ref.id === 'q3'
            ? { file: { name: 'q3.csv', mediaType: 'text/csv', source: { kind: 'remote', url: '/q3.csv' } } }
            : undefined
        }
      />,
    );
    expect(html).toMatch(/data-chat-reference="agent" data-id="researcher">@researcher</);
    expect(html).toMatch(
      /<button type="button" class="[^"]*sprout-message-rich-text-file[^"]*"[^>]*><span[^>]*data-id="q3">#q3.csv/,
    );
    expect(html).not.toMatch(/<button[^>]*><span[^>]*data-id="gone"/);
    expect(html).toContain('#gone.pdf');
  });
});

describe('keywordAccounts', () => {
  it('records the account of each connected keyword in the message', () => {
    const value = doc(text('Post to slack, then check github and linear'));
    const linear: RichTextKeyword = { id: 'linear', label: 'Linear' };
    expect(keywordAccounts(value, [slack, { ...github, account: 'acme-org' }, linear])).toEqual({
      slack: 'acme.slack.com',
    });
    expect(keywordAccounts(doc(text('nothing here')), [slack])).toEqual({});
  });
});
