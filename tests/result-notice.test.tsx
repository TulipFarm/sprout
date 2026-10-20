import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import { ResultNotice } from '../packages/sprout/src/components/result-notice.js';
import * as sprout from '../packages/sprout/src/index.js';

const text = (html: string) => html.replaceAll(/<[^>]+>/g, '').replaceAll('<!-- -->', '');

describe('ResultNotice', () => {
  it('is exported from the package root', () => {
    expect(sprout).toHaveProperty('ResultNotice', ResultNotice);
  });

  it('renders the message as a status with an icon and the action at the end', () => {
    const html = renderToString(
      <ResultNotice shown={100} total={2431} noun="rows" action={<button type="button">Open in Table</button>} />,
    );
    expect(html).toMatch(/^<div data-slot="result-notice" class="sprout-result-notice">/);
    expect(html).toMatch(/<svg[^>]*class="[^"]*sprout-result-notice-icon"[^>]*aria-hidden="true"/);
    expect(html).toContain('<p role="status" data-slot="result-notice-message"');
    expect(text(html)).toBe('Showing the first 100 of 2,431 rows.Open in Table');
    expect(html).toMatch(
      /<div data-slot="result-notice-action" class="sprout-result-notice-action"><button type="button">Open in Table<\/button><\/div><\/div>$/,
    );
  });

  it.each([
    [100, 10000, 'groups', 'Showing the first 100 of 10,000 groups.'],
    [100, '10000+', 'groups', 'Showing the first 100 of 10,000+ groups.'],
    [100, ' 1234567+ ', 'rows', 'Showing the first 100 of 1,234,567+ rows.'],
    [100, 'many', 'rows', 'Showing the first 100 of many rows.'],
    [1000, '10000+', 'rows', 'Showing the first 1,000 of 10,000+ rows.'],
    [1, 2431, 'rows', 'Showing the first of 2,431 rows.'],
  ])('shown %s of %s %s reads "%s"', (shown, total, noun, message) => {
    expect(text(renderToString(<ResultNotice shown={shown} total={total} noun={noun} />))).toBe(message);
  });

  it('wraps counts in strong so they read in the text color', () => {
    const html = renderToString(<ResultNotice shown={100} total="10000+" noun="groups" />);
    expect(html).toContain('<strong>100</strong>');
    expect(html).toContain('<strong>10,000+</strong>');
  });

  it('renders nothing when an exact total is not above shown', () => {
    expect(renderToString(<ResultNotice shown={100} total={100} noun="rows" />)).toBe('');
    expect(renderToString(<ResultNotice shown={40} total={12} noun="rows" />)).toBe('');
    expect(renderToString(<ResultNotice shown={100} total="100" noun="rows" />)).toBe('');
  });

  it('renders for a capped total even when its digits equal shown', () => {
    expect(text(renderToString(<ResultNotice shown={100} total="100+" noun="rows" />))).toBe(
      'Showing the first 100 of 100+ rows.',
    );
  });

  it('leaves out the action slot when there is no action', () => {
    for (const action of [undefined, null, false]) {
      const html = renderToString(<ResultNotice shown={100} total={2431} noun="rows" action={action} />);
      expect(html).not.toContain('result-notice-action');
    }
  });

  it('merges classes and passes props to the root', () => {
    const html = renderToString(
      <ResultNotice shown={100} total={2431} noun="rows" className="mt-2" id="notice" data-x="1" />,
    );
    expect(html).toContain('class="sprout-result-notice mt-2"');
    expect(html).toContain('id="notice"');
    expect(html).toContain('data-x="1"');
  });
});
