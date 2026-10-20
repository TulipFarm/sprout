import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import {
  Separator,
  SeparatorContent,
  SeparatorIcon,
  separatorOrientationNames,
  separatorToneNames,
  separatorVariantNames,
} from '../packages/sprout/src/components/separator.js';
import { Sidebar, SidebarProvider, SidebarSeparator } from '../packages/sprout/src/components/sidebar.js';
import * as sprout from '../packages/sprout/src/index.js';

describe('Separator', () => {
  it('is exported from the package root', () => {
    for (const name of [
      'Separator',
      'SeparatorIcon',
      'SeparatorContent',
      'SidebarSeparator',
      'separatorVariantNames',
      'separatorOrientationNames',
      'separatorToneNames',
    ]) {
      expect(sprout).toHaveProperty(name);
    }
    expect(separatorOrientationNames).toEqual(['horizontal', 'vertical']);
    expect(separatorToneNames).toEqual(['default', 'input']);
    expect(separatorVariantNames).toEqual(['line', 'fade', 'marker', 'marker-border']);
  });

  it('renders a horizontal Base UI separator by default', () => {
    const html = renderToString(<Separator />);
    expect(html).toContain('role="separator"');
    expect(html).toContain('aria-orientation="horizontal"');
    expect(html).toContain('data-orientation="horizontal"');
    expect(html).toContain('data-slot="separator"');
    expect(html).toContain('data-variant="line"');
    expect(html).toContain('data-tone="default"');
    expect(html).toContain('class="sprout-separator"');
  });

  it('supports every orientation and tone', () => {
    for (const orientation of separatorOrientationNames) {
      for (const tone of separatorToneNames) {
        const html = renderToString(<Separator orientation={orientation} tone={tone} />);
        expect(html).toContain(`aria-orientation="${orientation}"`);
        expect(html).toContain(`data-orientation="${orientation}"`);
        expect(html).toContain(`data-tone="${tone}"`);
      }
    }
  });

  it('merges string and state class names and passes props through', () => {
    const plain = renderToString(<Separator className="my-2" id="rows" data-x="1" />);
    expect(plain).toContain('class="sprout-separator my-2"');
    expect(plain).toContain('id="rows"');
    expect(plain).toContain('data-x="1"');
    const html = renderToString(
      <Separator orientation="vertical" className={({ orientation }) => `is-${orientation}`} role="none" />,
    );
    expect(html).toContain('class="sprout-separator is-vertical"');
    expect(html).toContain('role="none"');
  });

  it('swaps the element with render', () => {
    const html = renderToString(<Separator render={<hr />} />);
    expect(html).toMatch(/^<hr[^>]*class="sprout-separator"/);
  });

  it('renders a labeled separator with visible text and one announced line', () => {
    const html = renderToString(<Separator>or</Separator>);
    expect(html).toMatch(/^<div data-slot="separator" data-variant="label"/);
    expect(html).toContain('data-content="true"');
    expect(html.match(/role="separator"/g)).toHaveLength(1);
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain(
      '<span data-slot="separator-label-content" class="sprout-separator-label-content">or</span>',
    );
  });

  it('renders an icon and text between the lines of a labeled separator', () => {
    const html = renderToString(
      <Separator>
        <SeparatorIcon>
          <svg />
        </SeparatorIcon>
        Today
      </Separator>,
    );
    expect(html).toContain('data-variant="label"');
    expect(html).toContain(
      '<span data-slot="separator-label-content" class="sprout-separator-label-content"><span data-slot="separator-icon" aria-hidden="true" class="sprout-separator-icon"><svg></svg></span>Today</span>',
    );
    expect(html.match(/role="separator"/g)).toHaveLength(1);
  });

  it('renders a plain labeled separator without content', () => {
    const html = renderToString(<Separator className="py-2">{false}</Separator>);
    expect(html).toContain('data-content="false"');
    expect(html).toContain('sprout-separator-label py-2');
    expect(html).not.toContain('separator-label-content');
  });

  it('renders an inset sidebar separator', () => {
    const html = renderToString(
      <SidebarProvider>
        <Sidebar collapsible="none">
          <SidebarSeparator className="extra" />
        </Sidebar>
      </SidebarProvider>,
    );
    expect(html).toContain('data-sidebar="separator"');
    expect(html).toContain('class="sprout-separator sprout-sidebar-separator extra"');
    expect(html).toContain('role="separator"');
  });
});

describe('Separator fade', () => {
  it('renders a labeled horizontal Base UI separator', () => {
    const html = renderToString(<Separator variant="fade">Auto compacted</Separator>);
    expect(html).toMatch(/^<div[^>]*role="separator"/);
    expect(html).toContain('aria-label="Auto compacted"');
    expect(html).toContain('aria-orientation="horizontal"');
    expect(html).toContain('data-slot="separator"');
    expect(html).toContain('data-variant="fade"');
    expect(html).toContain('class="sprout-separator-fade"');
    expect(html.match(/role="separator"/g)).toHaveLength(1);
  });

  it('shows the label once to assistive tech and hides the shine copy', () => {
    const html = renderToString(<Separator variant="fade">Compacted</Separator>);
    expect(html).toContain(
      '<span class="sprout-separator-fade-label">Compacted</span><span aria-hidden="true" class="sprout-separator-fade-shine"><span class="sprout-separator-fade-label">Compacted</span></span>',
    );
  });

  it('renders both Cloud labels', () => {
    for (const label of ['Auto compacted', 'Compacted']) {
      const html = renderToString(<Separator variant="fade">{label}</Separator>);
      expect(html).toContain(`aria-label="${label}"`);
      expect(html).toContain(`>${label}</span>`);
    }
  });

  it('merges class names, passes props through, and supports render', () => {
    const html = renderToString(
      <Separator variant="fade" className="my-4" id="compaction" data-x="1">
        Compacted
      </Separator>,
    );
    expect(html).toContain('class="sprout-separator-fade my-4"');
    expect(html).toContain('id="compaction"');
    expect(html).toContain('data-x="1"');
    const state = renderToString(
      <Separator variant="fade" className={({ orientation }) => `is-${orientation}`}>
        Compacted
      </Separator>,
    );
    expect(state).toContain('class="sprout-separator-fade is-horizontal"');
    const li = renderToString(
      <Separator variant="fade" render={<li />}>
        Auto compacted
      </Separator>,
    );
    expect(li).toMatch(/^<li[^>]*class="sprout-separator-fade"/);
  });
});

describe('Separator marker', () => {
  it('renders the chat skill-use composition', () => {
    const html = renderToString(
      <Separator variant="marker">
        <SeparatorIcon>
          <svg />
        </SeparatorIcon>
        <SeparatorContent>Used skill Weekly report · 3f9a2c1b</SeparatorContent>
      </Separator>,
    );
    expect(html).toMatch(/^<div[^>]*class="sprout-separator-marker"/);
    expect(html).toContain('data-slot="separator"');
    expect(html).toContain('data-variant="marker"');
    expect(html).not.toContain('role="separator"');
    expect(html).toContain(
      '<span data-slot="separator-icon" aria-hidden="true" class="sprout-separator-icon"><svg></svg></span>',
    );
    expect(html).toContain(
      '<span data-slot="separator-content" class="sprout-separator-content">Used skill Weekly report · 3f9a2c1b</span>',
    );
  });

  it('renders both marker variants with their classes', () => {
    const classes = {
      marker: 'sprout-separator-marker',
      'marker-border': 'sprout-separator-marker sprout-separator-marker-border',
    } as const;
    for (const variant of ['marker', 'marker-border'] as const) {
      const html = renderToString(
        <Separator variant={variant}>
          <SeparatorContent>{variant} · Today</SeparatorContent>
        </Separator>,
      );
      expect(html).toContain(`data-variant="${variant}"`);
      expect(html).toContain(`class="${classes[variant]}"`);
    }
  });

  it('merges classes, passes props, and supports render', () => {
    const html = renderToString(
      <Separator variant="marker" className="my-4" id="day" data-x="1">
        <SeparatorIcon className="extra" />
        <SeparatorContent className="lead">Today</SeparatorContent>
      </Separator>,
    );
    expect(html).toContain('class="sprout-separator-marker my-4"');
    expect(html).toContain('id="day"');
    expect(html).toContain('data-x="1"');
    expect(html).toContain('class="sprout-separator-icon extra"');
    expect(html).toContain('class="sprout-separator-content lead"');
    const link = renderToString(
      <Separator variant="marker-border" render={<a href="/skills" />}>
        <SeparatorContent>Open skill</SeparatorContent>
      </Separator>,
    );
    expect(link).toMatch(/^<a href="\/skills"[^>]*class="sprout-separator-marker sprout-separator-marker-border"/);
  });
});
