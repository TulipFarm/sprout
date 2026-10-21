import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import { PageActions, PageChromeContext, PageHeader } from '../packages/sprout/src/components/page-header.js';

describe('PageHeader', () => {
  it('renders an h1 title with description and wrapping actions', () => {
    const html = renderToString(
      <PageHeader
        title="Files"
        description="Find, open, and organize workspace files."
        actions={<button type="button">Upload</button>}
      />,
    );
    expect(html).toMatch(/<header data-slot="page-header" class="sprout-page-header"/);
    expect(html).toMatch(
      /<h1 data-slot="page-title" data-placement="page" class="sprout-page-header-title">Files<\/h1>/,
    );
    expect(html).toContain('data-slot="page-description"');
    expect(html).toContain('Find, open, and organize workspace files.');
    expect(html).toMatch(/data-slot="page-actions" data-placement="page"[^>]*><button/);
    expect(html).not.toContain('Breadcrumb');
  });

  it('omits description and actions when not given', () => {
    const html = renderToString(<PageHeader title="Usage" />);
    expect(html).not.toContain('page-description');
    expect(html).not.toContain('page-actions');
    expect(html).not.toContain('page-back');
  });

  it('supports rich titles, ids, refs, and programmatic focus', () => {
    const html = renderToString(
      <PageHeader title={<span>Garden notes</span>} titleId="governance-heading" titleRef={() => {}} focusable />,
    );
    expect(html).toMatch(/<h1 id="governance-heading" tabindex="-1"[^>]*><span>Garden notes<\/span><\/h1>/);
    expect(renderToString(<PageHeader title="Skills" />)).not.toContain('tabindex');
  });

  it('renders the back link as a real link with a hideable label', () => {
    const html = renderToString(
      <PageHeader title="Import skill" back={{ label: 'Back to skills', link: <a href="/skills" /> }} />,
    );
    expect(html).toMatch(/<a href="\/skills"[^>]*data-slot="page-back"/);
    expect(html).toContain('sprout-button-variant-ghost');
    expect(html).toContain('sprout-button-size-sm');
    expect(html).not.toContain('role="button"');
    expect(html).toMatch(/<svg[^>]*data-icon="inline-start"[^>]*aria-hidden="true"/);
    expect(html).toContain('<span class="sprout-page-header-back-label">Back to skills</span>');
    expect(html.indexOf('page-back')).toBeLessThan(html.indexOf('<h1'));
  });

  it('renders the title as the current breadcrumb step under a parent', () => {
    const html = renderToString(
      <PageHeader
        title="Customer accounts"
        parent={{ label: 'Tables', link: <a href="/tables" /> }}
        back={{ label: 'Back to tables', link: <a href="/tables" /> }}
        actions={<button type="button">Change fields in chat</button>}
      />,
    );
    expect(html).toMatch(/<nav aria-label="Breadcrumb" data-slot="page-breadcrumb"/);
    expect(html).toMatch(
      /<a href="\/tables" data-slot="page-breadcrumb-link" class="sprout-page-header-breadcrumb-link">Tables<\/a>/,
    );
    expect(html).toMatch(/<li role="presentation" aria-hidden="true"/);
    expect(html).toMatch(/<li aria-current="page"[^>]*><h1[^>]*>Customer accounts<\/h1><\/li>/);
    expect(html).toContain('page-back');
    expect(html).toContain('Change fields in chat');
  });

  it('stays in the page unless both header slots exist', () => {
    const html = renderToString(
      <PageChromeContext value={{ title: null, actions: null }}>
        <PageHeader title="Chats" description="Most recent first." />
      </PageChromeContext>,
    );
    expect(html).toContain('data-placement="page"');
    expect(html).toContain('data-slot="page-header"');
  });

  it('merges className', () => {
    expect(renderToString(<PageHeader title="Models" className="mb-6" />)).toContain('class="sprout-page-header mb-6"');
  });
});

describe('PageActions', () => {
  it('renders right-aligned in the page without a header bar', () => {
    const html = renderToString(
      <PageActions>
        <button type="button">New team</button>
      </PageActions>,
    );
    expect(html).toMatch(
      /<div data-slot="page-actions" data-placement="inline" class="sprout-page-header-actions"><button/,
    );
  });
});
