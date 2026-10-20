import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import {
  ViewSwitcher,
  viewSwitcherTabId,
  type ViewSwitcherView,
} from '../packages/sprout/src/components/view-switcher.js';
import * as sprout from '../packages/sprout/src/index.js';

const Icon = ({ size }: { size?: number }) => <svg data-size={size} />;

const views: ViewSwitcherView[] = [
  { id: 'table', label: 'Table', icon: Icon },
  { id: 'list', label: 'List', icon: Icon, closable: true },
];

const noop = () => {};

describe('ViewSwitcher', () => {
  it('is exported from the package root', () => {
    expect(sprout).toHaveProperty('ViewSwitcher', ViewSwitcher);
    expect(sprout).toHaveProperty('viewSwitcherTabId', viewSwitcherTabId);
  });

  it('renders a named tablist with one tab per view, in order', () => {
    const html = renderToString(<ViewSwitcher views={views} value="list" onValueChange={noop} panelId="records" />);
    expect(html).toContain('data-slot="view-switcher"');
    expect(html).toMatch(/role="tablist"[^>]*aria-label="Views"|aria-label="Views"[^>]*role="tablist"/);
    const tabs = [...html.matchAll(/<button[^>]*role="tab"[^>]*>/g)].map(match => match[0]);
    expect(tabs).toHaveLength(2);
    expect(tabs[0]).toContain('id="records-tab-table"');
    expect(tabs[0]).toContain('aria-controls="records"');
    expect(tabs[0]).toContain('aria-selected="false"');
    expect(tabs[1]).toContain('aria-selected="true"');
    expect(html).toContain('data-size="14"');
    expect(html.indexOf('>Table<')).toBeLessThan(html.indexOf('>List<'));
  });

  it('builds tab ids from the panel id', () => {
    expect(viewSwitcherTabId('records', 'board')).toBe('records-tab-board');
  });

  it('shows close controls only for closable views when onClose is passed', () => {
    const without = renderToString(<ViewSwitcher views={views} value="table" onValueChange={noop} />);
    expect(without).not.toContain('view-switcher-close');
    expect(without).not.toContain('aria-keyshortcuts');
    const html = renderToString(<ViewSwitcher views={views} value="table" onValueChange={noop} onClose={noop} />);
    expect(html.match(/data-slot="view-switcher-close"/g)).toHaveLength(1);
    expect(html).toContain('aria-keyshortcuts="Delete"');
    expect(html).toContain('title="Close List"');
  });

  it('shows Add view only with options, and the actions slot only with actions', () => {
    const bare = renderToString(<ViewSwitcher views={views} value="table" onValueChange={noop} />);
    expect(bare).not.toContain('view-switcher-add');
    expect(bare).not.toContain('view-switcher-actions');
    const html = renderToString(
      <ViewSwitcher
        views={views}
        value="table"
        onValueChange={noop}
        options={[{ id: 'chart', label: 'Chart', icon: Icon, description: 'Totals by group.' }]}
        addLabel="New view"
        label="Order views"
        actions={<button type="button">Share</button>}
      />,
    );
    expect(html).toContain('aria-haspopup="menu"');
    expect(html).toContain('New view');
    expect(html).toContain('aria-label="Order views"');
    expect(html).toContain('<button type="button">Share</button>');
  });

  it('marks no tab active when the value is not in views', () => {
    const html = renderToString(<ViewSwitcher views={views} value="chart" onValueChange={noop} />);
    expect(html).not.toContain('aria-selected="true"');
  });
});
