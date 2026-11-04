import type { ReactNode } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import * as sprout from '../packages/sprout/src/index.js';
import { MessageRichText } from '../packages/sprout/src/components/message-rich-text.js';
import { ReferenceHintBody, referenceDetail, referenceHover } from '../packages/sprout/src/internal/reference-hint.js';
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

  it('renders every block type and mark, and leaves keywords inside code alone', () => {
    const node = (type: string, content?: RichTextValue[], attrs?: Record<string, unknown>): RichTextValue => ({
      type,
      content,
      attrs,
    });
    const html = renderToString(
      <MessageRichText
        keywords={[{ ...slack, color: '#4a154b' }]}
        value={node('doc', [
          node('heading', [text('Title')], { level: 9 }),
          node('heading', [text('Untitled')]),
          node('paragraph', [
            text('a', [{ type: 'italic' }]),
            text('b', [{ type: 'strike' }]),
            text('c', [{ type: 'underline' }]),
            text('slack', [{ type: 'code' }]),
            { type: 'hardBreak' },
            text('ping slack now'),
            text(' '),
            reference('skill', 'tidy', 'tidy'),
          ]),
          node('bulletList', [node('listItem', [node('paragraph', [text('one')])])]),
          node('orderedList', [node('listItem', [node('paragraph', [text('two')])])], { start: 3 }),
          node('orderedList', [node('listItem', [node('paragraph')])]),
          node('blockquote', [node('paragraph', [text('quoted')])]),
          node('codeBlock', [text('let x = 1;'), { type: 'text' }]),
          node('horizontalRule'),
          node('callout', [text('loose text')]),
          node('section', [node('paragraph', [text('nested')])]),
          node('empty'),
        ])}
      />,
    );
    for (const part of [
      '<h6><span>Title</span></h6>',
      '<h1><span>Untitled</span></h1>',
      '<em>a</em>',
      '<s>b</s>',
      '<u>c</u>',
      '<code>slack</code>',
      '<br/>',
      '<ul><li><p><span>one</span></p></li></ul>',
      '<ol start="3">',
      '<blockquote><p><span>quoted</span></p></blockquote>',
      '<pre><code>let x = 1;</code></pre>',
      '<hr/>',
      '<p><span>loose text</span></p>',
      '<p><span>nested</span></p>',
      'data-tinted=""',
      '>/tidy</span>',
      '<ol><li><p></p></li></ol>',
    ])
      expect(html).toContain(part);
    expect(html.match(/data-keyword="slack" data-connected="true" data-icon/g)).toHaveLength(1);
    expect(html).toMatch(/<span>ping <\/span>.*data-keyword="slack".*<span> now<\/span>/);
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

describe('reference hints', () => {
  it('reads stored chip details, filling in what is missing', () => {
    expect(referenceDetail(undefined)).toEqual({ kind: 'file', id: '', label: '', description: undefined });
    expect(referenceDetail({ kind: 'agent', id: 'r', label: 'researcher', description: 'Finds sources' })).toEqual({
      kind: 'agent',
      id: 'r',
      label: 'researcher',
      description: 'Finds sources',
    });
  });

  it('picks a name card for agents and skills, a peek for previewable files, and nothing otherwise', () => {
    const agent = referenceDetail({ kind: 'agent', id: 'r', label: 'r' });
    const file = referenceDetail({ kind: 'file', id: 'f', label: 'f' });
    const csv = { name: 'q3.csv', mediaType: 'text/csv', source: { kind: 'remote', url: '/q3.csv' } } as const;
    const zip = { name: 'a.zip', mediaType: 'application/zip', source: { kind: 'remote', url: '/a.zip' } } as const;
    expect(referenceHover(agent, undefined)).toBe('hint');
    expect(referenceHover(file, undefined)).toBeNull();
    expect(referenceHover(file, { file: zip })).toBeNull();
    expect(referenceHover(file, { file: csv })).toBe('peek');
  });

  it('shows the app icon when given one, else a fallback per kind, and the description when there is one', () => {
    const body = (kind: string, media?: ReactNode, description?: string) =>
      renderToString(
        <ReferenceHintBody reference={referenceDetail({ kind, id: 'x', label: 'x', description })} media={media} />,
      );
    expect(body('agent', <img alt="" src="/a.png" />, 'Finds sources')).toContain('src="/a.png"');
    expect(body('agent', undefined, 'Finds sources')).toContain('Finds sources');
    for (const kind of ['agent', 'skill', 'file']) {
      const html = body(kind);
      expect(html).toContain('<svg');
      expect(html).not.toContain('keyword-hint-account');
    }
  });
});

describe('MessageRichText edge cases', () => {
  it('opens a file it cannot preview from a plain button, and tolerates empty nodes', () => {
    const zip = { name: 'a.zip', mediaType: 'application/zip', source: { kind: 'remote', url: '/a.zip' } } as const;
    const html = renderToString(
      <MessageRichText
        keywords={[{ id: 'notion', label: 'Notion' }]}
        resolveReference={() => ({ file: zip })}
        value={{
          type: 'doc',
          content: [
            { type: 'paragraph', content: [{ type: 'text' }, text('see notion'), reference('file', 'a', 'a.zip')] },
            { type: 'codeBlock' },
          ],
        }}
      />,
    );
    expect(html).toMatch(
      /<button type="button" class="[^"]*sprout-message-rich-text-file[^"]*"><span[^>]*data-id="a">/,
    );
    expect(html).not.toContain('tooltip-trigger');
    expect(html).toContain('data-keyword="notion"');
    expect(html).toContain('<pre><code></code></pre>');
  });
});
