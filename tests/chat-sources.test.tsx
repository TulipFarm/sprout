import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import * as sprout from '../packages/sprout/src/index.js';
import {
  ChatSources,
  CheckedCitation,
  InlineCitation,
  citationStateKindNames,
  type ChatSource,
} from '../packages/sprout/src/components/chat-sources.js';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

const garden: ChatSource = {
  id: 'garden-notes',
  title: 'Fictional garden notes',
  location: 'Example collection',
  excerpt: 'Water newly planted bulbs once and keep the soil lightly moist.',
  href: '#sample-notes',
};
const review: ChatSource = {
  id: 'review',
  title: 'Q3 vendor review.pdf',
  location: 'File · Payment terms',
  excerpt: 'Net 30 remains the default.',
  href: '#sample-review',
};

describe('ChatSources', () => {
  it('is exported from the package root, subpath, CSS entry, and docs nav', () => {
    expect(sprout.ChatSources).toBe(ChatSources);
    expect(sprout.CheckedCitation).toBe(CheckedCitation);
    expect(sprout.InlineCitation).toBe(InlineCitation);
    expect(sprout.citationStateKindNames).toBe(citationStateKindNames);
    const manifest = JSON.parse(read('../packages/sprout/package.json'));
    expect(manifest.exports['./chat-sources']).toEqual({
      types: './dist/components/chat-sources.d.ts',
      import: './dist/components/chat-sources.js',
    });
    expect(read('../packages/sprout/src/styles/index.css')).toContain("@import './chat-sources.css';");
    expect(read('../apps/docs/src/data/nav.ts')).toMatch(/component\(\s*'Chat Sources'/);
  });

  it('lists every Cloud citation state', () => {
    expect(citationStateKindNames).toEqual(['idle', 'loading', 'ready', 'unavailable', 'error']);
  });

  it('says when no sources were used', () => {
    const html = renderToString(<ChatSources sources={[]} />);
    expect(html).toContain('No sources were used for this response.');
    expect(html).not.toContain('<ol');
    expect(html).not.toContain('<button');
  });

  it('counts one source and starts closed', () => {
    const html = renderToString(<ChatSources sources={[garden]} />);
    expect(html).toMatch(/<button[^>]*aria-expanded="false"/);
    expect(html).toContain('1<!-- --> <!-- -->source');
    expect(html).not.toContain('sources</span>');
    expect(html).not.toContain(garden.excerpt);
  });

  it('lists numbered sources with new-tab links when open', () => {
    const html = renderToString(<ChatSources sources={[garden, review]} defaultOpen />);
    expect(html).toMatch(/<button[^>]*aria-expanded="true"/);
    expect(html).toContain('2<!-- --> <!-- -->sources');
    const items = html.match(/<li[^>]*>[\s\S]*?<\/li>/g) ?? [];
    expect(items).toHaveLength(2);
    expect(items[0]).toContain('>1</span>');
    expect(items[0]).toContain('Fictional garden notes');
    expect(items[0]).toContain('Example collection');
    expect(items[1]).toContain('>2</span>');
    expect(items[1]).toContain('href="#sample-review"');
    expect(items[1]).toContain('target="_blank"');
    expect(items[1]).toContain('rel="noopener noreferrer"');
    expect(items[1]).toContain(' in a new tab');
    expect(html).toMatch(/data-slot="collapsible-indicator"/);
  });

  it('forwards props and merges class names', () => {
    const html = renderToString(<ChatSources sources={[garden]} id="sources" className="extra" />);
    expect(html).toContain('id="sources"');
    expect(html).toMatch(/class="[^"]*sprout-chat-sources[^"]*extra/);
    const empty = renderToString(<ChatSources sources={[]} className="extra" />);
    expect(empty).toContain('class="sprout-chat-sources extra"');
  });
});

describe('InlineCitation', () => {
  it('is a secondary extra-small icon button named for its source', () => {
    const html = renderToString(<InlineCitation source={garden} number={3} />);
    expect(html).toContain('aria-label="Source 3: Fictional garden notes"');
    expect(html).toContain('sprout-button-variant-secondary');
    expect(html).toContain('sprout-button-size-icon-xs');
    expect(html).toContain('data-slot="inline-citation"');
    expect(html).toMatch(/>3<\/button>/);
  });
});

describe('CheckedCitation', () => {
  it('is a task link named for its label', () => {
    const html = renderToString(
      <CheckedCitation label="Garden notes" state={{ kind: 'idle' }} onOpen={() => {}} onRetry={() => {}} />,
    );
    expect(html).toContain('aria-label="Source: Garden notes"');
    expect(html).toContain('sprout-button-variant-link');
    expect(html).toContain('sprout-button-size-md');
    expect(html).toContain('data-slot="checked-citation"');
    expect(html).toMatch(/>Garden notes<\/button>/);
  });

  it('styles with theme tokens and respects reduced motion', () => {
    const css = read('../packages/sprout/src/styles/chat-sources.css');
    expect(css).toContain('var(--sprout-primary)');
    expect(css).toContain('var(--sprout-muted)');
    expect(css).toContain('var(--sprout-line)');
    expect(css).toMatch(/prefers-reduced-motion: no-preference[\s\S]*transition/);
    expect(css).toContain('white-space: pre-wrap');
  });
});
