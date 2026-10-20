import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import * as sprout from '../packages/sprout/src/index.js';
import { MessageResponse, MessageTableViewport } from '../packages/sprout/src/components/message-response.js';

const table = '| Task | Owner |\n| --- | --- |\n| Plant | Alex |\n| Water | Robin |';

describe('MessageResponse', () => {
  it('is exported from the package root', () => {
    expect(sprout).toHaveProperty('MessageResponse');
    expect(sprout).toHaveProperty('MessageTableViewport');
  });

  it('renders GitHub Markdown with native roles', () => {
    const html = renderToString(
      <MessageResponse>
        {
          '### Garden plan\n\nA **small plan** with ~~old~~ `code`.\n\n- Sun\n  - Partial\n- Water\n\n1. Dig\n2. Plant\n\n- [x] Order bulbs\n- [ ] Buy mulch\n\n> Start small.\n\n---\n\nSee https://example.com/plan'
        }
      </MessageResponse>,
    );
    expect(html).toContain('data-slot="message-response"');
    expect(html).toContain('class="sprout-message-response"');
    expect(html).toContain('<h3>Garden plan</h3>');
    expect(html).toContain('<strong>small plan</strong>');
    expect(html).toContain('<del>old</del>');
    expect(html).toContain('<code>code</code>');
    expect(html).toMatch(/<ul>[\s\S]*<ul>/);
    expect(html).toContain('<ol>');
    expect(html).toContain('class="contains-task-list"');
    expect(html).toMatch(/type="checkbox" disabled="" aria-label="Task" checked=""/);
    expect(html).toContain('<blockquote>');
    expect(html).toContain('<hr/>');
    expect(html).toContain('href="https://example.com/plan"');
  });

  it('puts each table in a named, focusable scroll region', () => {
    const html = renderToString(<MessageResponse>{table}</MessageResponse>);
    expect(html).toContain('class="sprout-message-response-table"');
    expect(html).toContain('role="region"');
    expect(html).toContain('aria-label="Response table"');
    expect(html).toContain('tabindex="0"');
    expect(html).not.toContain('data-bounded');
  });

  it('bounds tables inside a bounded viewport only', () => {
    const bounded = renderToString(
      <MessageTableViewport bounded>
        <MessageResponse>{table}</MessageResponse>
      </MessageTableViewport>,
    );
    expect(bounded).toContain('data-bounded=""');
    const open = renderToString(
      <MessageTableViewport bounded={false}>
        <MessageResponse>{table}</MessageResponse>
      </MessageTableViewport>,
    );
    expect(open).not.toContain('data-bounded');
  });

  it('keeps table column alignment', () => {
    const html = renderToString(
      <MessageResponse>{'| Item | Price |\n| :--- | ---: |\n| Bulbs | $14 |'}</MessageResponse>,
    );
    expect(html).toMatch(/<th style="text-align:left">Item<\/th>/);
    expect(html).toMatch(/<td style="text-align:right">\$14<\/td>/);
  });

  it('renders fences as Code Blocks with the fence language or text', () => {
    const html = renderToString(<MessageResponse>{'```sql\nSELECT 1;\n```\n\n```\nplain words\n```'}</MessageResponse>);
    expect(html).toContain('data-slot="code-block"');
    expect(html).toContain('data-language="sql"');
    expect(html).toContain('data-language="text"');
    expect(html).toMatch(/aria-label="sql code"/i);
    expect(html).toContain('plain words');
    // The fence's trailing newline is stripped, so there is one line number.
    expect(html).toMatch(/sprout-code-block-gutter"[^>]*>1<\/pre>/);
  });

  it('opens links in a new tab by default', () => {
    const html = renderToString(<MessageResponse>{'[notes](https://example.com/notes)'}</MessageResponse>);
    expect(html).toContain('<a href="https://example.com/notes" target="_blank" rel="noopener noreferrer">notes</a>');
  });

  it('routes every link through renderLink', () => {
    const seen: string[] = [];
    const html = renderToString(
      <MessageResponse
        renderLink={(href, children) => {
          seen.push(href);
          return (
            <button type="button" data-href={href}>
              {children}
            </button>
          );
        }}
      >
        {'[source](#knowledge-citation=abc:0) and [file](/v1/downloads/1)'}
      </MessageResponse>,
    );
    expect(seen).toEqual(['#knowledge-citation=abc:0', '/v1/downloads/1']);
    expect(html).toContain('<button type="button" data-href="#knowledge-citation=abc:0">source</button>');
    expect(html).not.toContain('<a ');
  });

  it('drops raw HTML and images', () => {
    const html = renderToString(
      <MessageResponse>
        {'Hi <b>bold</b><script>alert(1)</script>\n\n![hero](https://example.com/a.png)'}
      </MessageResponse>,
    );
    expect(html).not.toContain('<b>');
    expect(html).not.toContain('<script');
    expect(html).not.toContain('<img');
  });

  it('marks a streaming reply busy and shows a hidden caret', () => {
    const streaming = renderToString(<MessageResponse streaming>{'Partial'}</MessageResponse>);
    expect(streaming).toContain('aria-busy="true"');
    expect(streaming).toContain('data-streaming=""');
    expect(streaming).toMatch(/<span aria-hidden="true" class="sprout-message-response-caret"><\/span>/);
    const done = renderToString(<MessageResponse>{'Done'}</MessageResponse>);
    expect(done).toContain('aria-busy="false"');
    expect(done).not.toContain('sprout-message-response-caret');
  });

  it('renders an empty waiting reply with only the caret', () => {
    const html = renderToString(<MessageResponse streaming>{''}</MessageResponse>);
    expect(html).toMatch(
      /<div data-slot="message-response" data-streaming="" aria-busy="true" class="sprout-message-response"><span aria-hidden="true"/,
    );
  });

  it('passes through div props and merges className', () => {
    const html = renderToString(
      <MessageResponse id="reply-1" className="handoff" aria-label="Handoff">
        {'Hi'}
      </MessageResponse>,
    );
    expect(html).toContain('id="reply-1"');
    expect(html).toContain('aria-label="Handoff"');
    expect(html).toContain('class="sprout-message-response handoff"');
  });
});
