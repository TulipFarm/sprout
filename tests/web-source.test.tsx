import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import { WebSource, webSourceIcon } from '../packages/sprout/src/components/web-source.js';

const decode = (html: string) => html.replaceAll('&#x27;', "'").replaceAll('&amp;', '&');

describe('WebSource', () => {
  it('links the page with its favicon and title', () => {
    const html = decode(renderToString(<WebSource url="https://www.example.com/guide" title=" A guide " />));
    expect(html).toContain('data-slot="source-chip"');
    expect(html).toContain('href="https://www.example.com/guide"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain('>A guide<');
    expect(html).toContain('src="https://icon.horse/icon/www.example.com"');
    expect(html).toContain('crossorigin="anonymous"');
    expect(html).toContain('referrerPolicy="no-referrer"');
    expect(html).toContain('data-status="loading"');
  });

  it('shows the address without a title', () => {
    const html = renderToString(<WebSource url="https://www.example.com/guide" title="  " />);
    expect(html).toContain('>example.com/guide<');
  });

  it('uses a custom icon and falls back to a globe when there is none', () => {
    expect(renderToString(<WebSource url="https://a.test" icon={() => 'data:image/png;base64,AA'} />)).toContain(
      'src="data:image/png;base64,AA"',
    );
    const html = renderToString(<WebSource url="https://a.test" icon={() => null} />);
    expect(html).not.toContain('<img');
    expect(html).toContain('data-status="failed"');
  });

  it('renders as a block chip by default and inline on request', () => {
    expect(renderToString(<WebSource url="https://a.test" />)).toContain('data-variant="block"');
    expect(renderToString(<WebSource url="https://a.test" variant="inline" />)).toContain('data-variant="inline"');
  });

  it('marks a page that could not be read', () => {
    const html = renderToString(<WebSource url="https://a.test" failed />);
    expect(html).toContain('data-failed="true"');
    expect(html).toContain('Page unavailable. Retry or paste the text.');
  });

  it('only links and fetches icons for http pages', () => {
    const html = renderToString(<WebSource url="javascript:alert(1)" />);
    expect(html).not.toContain('href=');
    expect(html).not.toContain('<img');
    expect(html).toContain('data-slot="source-chip"');
    expect(webSourceIcon('ftp://a.test')).toBeNull();
    expect(webSourceIcon('not a url')).toBeNull();
    expect(webSourceIcon('http://a.test/x')).toBe('https://icon.horse/icon/a.test');
  });
});
