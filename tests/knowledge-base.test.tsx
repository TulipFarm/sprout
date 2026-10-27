import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import * as sprout from '../packages/sprout/src/index.js';
import {
  KnowledgeBase,
  KnowledgeBaseActivity,
  KnowledgeBaseDiagram,
  KnowledgeBaseFooter,
  KnowledgeBaseHeader,
  KnowledgeBaseSources,
  KnowledgeBaseSummary,
  knowledgeBaseStateNames,
  type KnowledgeBaseSource,
} from '../packages/sprout/src/components/knowledge-base.js';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

const source = (
  id: string,
  status: KnowledgeBaseSource['status'],
  extra: Partial<KnowledgeBaseSource> = {},
): KnowledgeBaseSource => ({ id, name: id, status, ...extra });

const render = (sources: readonly KnowledgeBaseSource[], parts = <KnowledgeBaseSummary />) =>
  renderToString(<KnowledgeBase sources={sources}>{parts}</KnowledgeBase>).replaceAll('<!-- -->', '');

describe('KnowledgeBase', () => {
  it('is exported from the package root, subpath, CSS entry, and docs nav', () => {
    expect(sprout.KnowledgeBase).toBe(KnowledgeBase);
    expect(sprout.KnowledgeBaseActivity).toBe(KnowledgeBaseActivity);
    expect(sprout.KnowledgeBaseDiagram).toBe(KnowledgeBaseDiagram);
    expect(sprout.KnowledgeBaseSources).toBe(KnowledgeBaseSources);
    expect(sprout.knowledgeBaseStateNames).toBe(knowledgeBaseStateNames);
    const manifest = JSON.parse(read('../packages/sprout/package.json'));
    expect(manifest.exports['./knowledge-base']).toEqual({
      types: './dist/components/knowledge-base.d.ts',
      import: './dist/components/knowledge-base.js',
    });
    expect(read('../packages/sprout/src/styles/index.css')).toContain("@import './knowledge-base.css';");
    expect(read('../apps/docs/src/data/nav.ts')).toMatch(/component\(\s*'Knowledge Base'/);
  });

  it('works out the summary title from the sources', () => {
    expect(render([source('Slack', 'available')])).toContain('Nothing indexed yet');
    expect(render([source('Slack', 'syncing'), source('Docs', 'queued')])).toContain('Indexing 2 sources');
    expect(render([source('Slack', 'error'), source('Docs', 'connected')])).toContain('Slack stopped syncing');
    expect(render([source('Slack', 'connected'), source('Docs', 'available')])).toContain('1 source connected');
    const ready = render([source('Slack', 'connected', { chunks: 1200 }), source('Docs', 'paused', { chunks: 34 })]);
    expect(ready).toContain('Knowledge base is ready');
    expect(ready).toContain('Answers search 1,234 chunks across 2 sources');
    expect(render([source('Slack', 'error')], <KnowledgeBaseSummary title="Custom" />)).toContain('>Custom</p>');
  });

  it('names the panel by its header', () => {
    const html = render([], <KnowledgeBaseHeader subtitle="Support bot" headingLevel={3} />);
    const id = html.match(/aria-labelledby="([^"]+)"/)![1];
    expect(html).toContain(`<h3 id="${id}"`);
    expect(html).toContain('Knowledge base<span class="sprout-knowledge-base-subtitle">Support bot</span>');
  });

  it('counts linked sources, chunks, and health in the footer', () => {
    const footer = <KnowledgeBaseFooter />;
    expect(render([source('Slack', 'connected', { chunks: 1 }), source('Docs', 'available')], footer)).toMatch(
      /1 source<\/span>.*1 chunk<\/span>.*In sync/,
    );
    expect(render([source('Slack', 'syncing'), source('Docs', 'error')], footer)).toContain('1 syncing');
    expect(render([source('Slack', 'connected'), source('Docs', 'error')], footer)).toContain(
      '<span data-tone="danger">1 failed</span>',
    );
    expect(render([source('Slack', 'connected'), source('Docs', 'paused')], footer)).toContain('1 paused');
    expect(render([source('Slack', 'available')], footer)).toContain('Not searchable');
  });

  it('labels the activity readout by state', () => {
    const activity = <KnowledgeBaseActivity />;
    const indexing = render([source('Slack', 'syncing', { chunks: 10 }), source('Docs', 'connected')], activity);
    expect(indexing).toContain('data-tone="syncing"');
    expect(indexing).toContain('>Indexing</span><span>10 chunks</span>');
    expect(indexing).toContain('2 sources');
    expect(render([source('Slack', 'error')], activity)).toContain('Needs attention');
    const live = render([source('Slack', 'connected', { chunks: 5, newChunks: 3 })], activity);
    expect(live).toContain('>Live<');
    expect(live).toContain('+3 new');
    const empty = render([source('Slack', 'available')], activity);
    expect(empty).toContain('>Nothing indexed<');
    expect(empty).not.toContain('chunk');
  });
});

describe('KnowledgeBaseSources', () => {
  it('renders nothing without sources', () => {
    expect(render([], <KnowledgeBaseSources />)).not.toContain('<ul');
  });

  it('makes Connect a link with connectHref, or a button with onConnect', () => {
    const slack = source('Slack', 'available', { brand: 'slack' });
    const link = render(
      [slack],
      <KnowledgeBaseSources connectHref={item => `/integrations/${item.id}`} onConnect={() => {}} />,
    );
    expect(link).toMatch(/<a[^>]*href="\/integrations\/Slack"[^>]*aria-label="Connect Slack"/);
    expect(link).not.toContain('<button');
    const button = render([slack], <KnowledgeBaseSources onConnect={() => {}} />);
    expect(button).toMatch(/<button[^>]*aria-label="Connect Slack"/);
    expect(render([slack], <KnowledgeBaseSources />)).toContain('Not connected');
  });

  it('shows the error in place of the detail, with Retry', () => {
    const html = render(
      [source('Drive', 'error', { detail: 'All files', error: 'Access was revoked.' })],
      <KnowledgeBaseSources onRetry={() => {}} />,
    );
    expect(html).toContain('title="Access was revoked."');
    expect(html).not.toContain('All files');
    expect(html).toContain('aria-label="Retry Drive"');
    expect(html).toContain('Failed');
  });

  it('shows chunks added by the latest sync, and percent while syncing', () => {
    const html = render(
      [
        source('Slack', 'connected', { chunks: 2048, newChunks: 128 }),
        source('Docs', 'syncing', { progress: 42.4, chunks: 9 }),
      ],
      <KnowledgeBaseSources />,
    );
    expect(html).toContain('<span class="sprout-knowledge-base-source-new">+128 new</span>2,048 chunks');
    expect(html).toContain('>42%</span>');
    expect(html).not.toContain('9 chunks');
  });

  it("colours lines with the brand's colour, a hue without a brand, or the color override", () => {
    const html = render(
      [
        source('Confluence', 'connected', { brand: 'confluence' }),
        source('Notes', 'connected'),
        source('Slack', 'connected', { brand: 'slack', color: 'rebeccapurple' }),
      ],
      <KnowledgeBaseSources />,
    );
    const hues = [...html.matchAll(/--sprout-knowledge-base-hue:([^"]+)"/g)].map(match => match[1]);
    expect(hues[0]).toContain('color-mix(in oklab, #1868DB');
    expect(hues[1]).toBe('var(--sprout-sky)');
    expect(hues[2]).toBe('rebeccapurple');
  });
});

describe('KnowledgeBaseDiagram', () => {
  it('is hidden from screen readers and floats children over the stage', () => {
    const html = render(
      [source('Slack', 'connected', { brand: 'slack' })],
      <KnowledgeBaseDiagram mark={<circle data-mark="" r={4} />}>
        <KnowledgeBaseActivity />
      </KnowledgeBaseDiagram>,
    );
    expect(html).toMatch(/<svg[^>]*aria-hidden="true"/);
    expect(html).toMatch(/sprout-knowledge-base-diagram-overlay"><div data-slot="knowledge-base-activity"/);
    expect(html).toContain('data-mark=""');
    expect(html).not.toContain('sprout-knowledge-base-doc');
  });

  it('shows empty slots without sources, and the document outline without a mark', () => {
    const html = render([], <KnowledgeBaseDiagram />);
    expect(html.match(/data-status="placeholder"/g)).toHaveLength(4);
    expect(html).toContain('sprout-knowledge-base-doc');
  });

  it('collapses sources past six into a "+N" satellite, keeping busy ones in view', () => {
    const many = [
      ...Array.from({ length: 6 }, (_, index) => source(`Done ${index}`, 'connected', { chunks: 10 })),
      source('Jira', 'syncing', { progress: 40 }),
      source('Notion', 'error', { progress: 20 }),
    ];
    const html = render(many, <KnowledgeBaseDiagram />);
    expect(html).toContain('>+3</text>');
    expect(html).toContain('data-status="syncing"');
    expect(html).toContain('data-status="error"');
  });

  it('dashes failed and paused lines, and gives unbranded sources a dot', () => {
    const html = render(
      [source('Docs', 'error', { progress: 50 }), source('Wiki', 'paused', { chunks: 4 }), source('Files', 'queued')],
      <KnowledgeBaseDiagram />,
    );
    expect(html).toContain('stroke-dasharray:3 2.5');
    expect(html).toContain('stroke-dasharray:0.01 2.6');
    expect(html).toContain('sprout-knowledge-base-satellite-dot');
  });
});

describe('KnowledgeBase parts', () => {
  it('throw outside <KnowledgeBase>', () => {
    expect(() => renderToString(<KnowledgeBaseFooter />)).toThrow(
      'KnowledgeBaseFooter must be used inside <KnowledgeBase>.',
    );
  });

  it('render their actions', () => {
    const html = render(
      [source('Slack', 'connected')],
      <>
        <KnowledgeBaseHeader>
          <button type="button">Close</button>
        </KnowledgeBaseHeader>
        <KnowledgeBaseSummary>
          <button type="button">Upload</button>
        </KnowledgeBaseSummary>
        <KnowledgeBaseFooter>
          <button type="button">Reset</button>
        </KnowledgeBaseFooter>
      </>,
    );
    expect(html).toContain('sprout-knowledge-base-header-actions"><button type="button">Close');
    expect(html).toContain('sprout-knowledge-base-summary-actions"><button type="button">Upload');
    expect(html).toContain('sprout-knowledge-base-footer-actions"><button type="button">Reset');
  });
});
