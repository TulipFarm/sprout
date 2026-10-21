import { describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import {
  SampleBar,
  SampleIconTile,
  SampleList,
  SampleMark,
  SampleTable,
  SampleText,
  SampleWindow,
  type SampleColumn,
} from '../../packages/sprout/src/components/state-sample.js';
import { axeViolations, setTheme, settle, themes } from './support.js';

const Glyph = ({ size = 14 }: { size?: number }) => (
  <svg viewBox="0 0 16 16" width={size} height={size}>
    <rect x="3" y="3" width="10" height="10" rx="2" fill="currentColor" />
  </svg>
);

const columns: SampleColumn[] = [
  { label: 'Workflow', size: 'lg' },
  { label: 'Trigger' },
  { label: 'Status', size: 'sm' },
];

function Workflows() {
  return (
    <SampleWindow
      data-testid="workflows"
      icon={Glyph}
      trail={['Workspace', 'Automation', 'Workflows']}
      tabs={['All', 'Active', 'Paused']}
    >
      <SampleTable
        columns={columns}
        rows={[
          [<SampleBar width="lg" />, <SampleBar />, <SampleBar width="sm" />],
          [
            <SampleText tone="strong">Restock tulips</SampleText>,
            <SampleText tone="mono">cron 0 9 * * 1</SampleText>,
            <SampleText tone="link">Active</SampleText>,
          ],
        ]}
      />
    </SampleWindow>
  );
}

function Chats() {
  return (
    <SampleWindow data-testid="chats" icon={Glyph} trail={['Chats']}>
      <SampleList
        items={[
          {
            leading: <SampleIconTile icon={Glyph} />,
            title: 'Spring planting plan',
            detail: 'Updated 2 hours ago',
            trailing: <SampleMark tone="teal" />,
          },
          { title: 'Supplier sync' },
        ]}
      />
    </SampleWindow>
  );
}

const marks = (
  <div style={{ display: 'flex', gap: 8 }}>
    <SampleMark data-testid="red-sm" tone="red" />
    <SampleMark data-testid="red-md" tone="red" size="md" />
    <SampleMark data-testid="teal-sm" tone="teal" />
  </div>
);

const bars = (
  <div data-testid="track" style={{ display: 'grid', width: 300 }}>
    <SampleBar data-testid="bar-sm" width="sm" />
    <SampleBar data-testid="bar-md" width="md" />
    <SampleBar data-testid="bar-lg" width="lg" />
  </div>
);

function Gallery() {
  return (
    <div style={{ display: 'grid', gap: 16, padding: 16, maxWidth: 720 }}>
      <Workflows />
      <Chats />
      {marks}
      {bars}
    </div>
  );
}

const byTestId = (id: string) => page.getByTestId(id).element() as HTMLElement;
const all = (root: Element, selector: string) => [...root.querySelectorAll<HTMLElement>(selector)];

describe('StateSample in a real browser', () => {
  describe.each(themes)('%s %s', (theme, mode) => {
    it.each([390, 1440])('passes axe without overflow at %ipx', async width => {
      setTheme(theme, mode);
      await page.viewport(width, 1000);
      await render(<Gallery />);
      await settle();
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
      expect(await axeViolations()).toEqual([]);
    });
  });

  it('renders crumbs, tabs, headers, and optional list parts', async () => {
    await render(<Gallery />);
    const workflows = byTestId('workflows');
    const crumbs = all(workflows, '.sprout-state-sample-crumb');
    expect(crumbs).toHaveLength(3);
    expect(all(workflows, '.sprout-state-sample-crumb[data-current]').map(crumb => crumb.textContent)).toEqual([
      'Workflows',
    ]);
    const tabs = all(workflows, '.sprout-state-sample-tab');
    expect(tabs).toHaveLength(3);
    expect(tabs.map(tab => tab.hasAttribute('data-selected'))).toEqual([true, false, false]);
    expect(all(workflows, '.sprout-state-sample-head [data-size]').map(cell => cell.textContent)).toEqual([
      'Workflow',
      'Trigger',
      'Status',
    ]);
    expect(all(workflows, '[data-slot="state-sample-bar"]')).toHaveLength(3);

    const chats = byTestId('chats');
    expect(all(chats, '.sprout-state-sample-tab')).toHaveLength(0);
    expect(all(chats, '.sprout-state-sample-item')).toHaveLength(2);
    expect(all(chats, '.sprout-state-sample-leading')).toHaveLength(1);
    expect(all(chats, '.sprout-state-sample-trailing')).toHaveLength(1);
    expect(all(chats, '.sprout-state-sample-detail')).toHaveLength(1);
    expect(
      all(document.body, '[data-slot="state-sample"] [tabindex], [data-slot="state-sample"] :is(a, button, input)'),
    ).toHaveLength(0);
  });

  it('matches the Cloud geometry', async () => {
    await page.viewport(1440, 1000);
    await render(<Gallery />);
    await settle();
    const workflows = byTestId('workflows');
    const width = (selector: string) => workflows.querySelector(selector)!.getBoundingClientRect().width;
    expect(width('.sprout-state-sample-row [data-size="sm"]')).toBe(96);
    expect(
      width('.sprout-state-sample-row [data-size="lg"]') / width('.sprout-state-sample-row [data-size="md"]'),
    ).toBeCloseTo(1.6, 1);
    expect(byTestId('red-sm').getBoundingClientRect().width).toBe(14);
    expect(byTestId('red-md').getBoundingClientRect().width).toBe(28);
    const chats = byTestId('chats');
    expect(chats.querySelector('.sprout-state-sample-item')!.getBoundingClientRect().height).toBeGreaterThanOrEqual(56);
    const track = byTestId('track').getBoundingClientRect().width;
    for (const [name, ratio] of [
      ['sm', 1 / 3],
      ['md', 1 / 2],
      ['lg', 3 / 4],
    ] as const) {
      const bar = byTestId(`bar-${name}`).getBoundingClientRect();
      expect(bar.height).toBe(8);
      expect(bar.width / track).toBeCloseTo(ratio, 2);
    }
  });

  it('text tones resolve and marks change in dark mode', async () => {
    await render(<Gallery />);
    const probe = document.createElement('span');
    probe.style.color = 'var(--sprout-info)';
    document.body.append(probe);
    const info = getComputedStyle(probe).color;
    probe.remove();
    const tone = (name: string) =>
      getComputedStyle(document.querySelector(`[data-slot="state-sample-text"][data-tone="${name}"]`)!);
    expect(tone('link').color).toBe(info);
    expect(tone('strong').fontWeight).toBe('500');
    expect(tone('mono').fontFamily).toMatch(/mono/i);
    const light = getComputedStyle(byTestId('teal-sm')).backgroundImage;
    expect(light).toContain('linear-gradient');
    setTheme('neutral', 'dark');
    expect(getComputedStyle(byTestId('teal-sm')).backgroundImage).not.toBe(light);
  });

  it('long titles and crumbs truncate without widening the window', async () => {
    await page.viewport(390, 900);
    await render(
      <div style={{ padding: 16, width: 240 }}>
        <SampleWindow
          data-testid="narrow"
          icon={Glyph}
          trail={['Workspace', 'Quarterly supplier onboarding checklist for spring']}
        >
          <SampleList
            items={[
              {
                leading: <SampleIconTile icon={Glyph} />,
                title: 'Draft replies to recent customer emails about delayed orders',
                trailing: <SampleMark tone="green" />,
              },
            ]}
          />
        </SampleWindow>
      </div>,
    );
    await settle();
    const narrow = byTestId('narrow');
    const title = narrow.querySelector<HTMLElement>('.sprout-state-sample-title')!;
    expect(getComputedStyle(title).textOverflow).toBe('ellipsis');
    expect(title.scrollWidth).toBeGreaterThan(title.clientWidth);
    expect(narrow.scrollWidth).toBeLessThanOrEqual(narrow.clientWidth + 1);
    const crumb = narrow.querySelector<HTMLElement>('.sprout-state-sample-crumb[data-current]')!;
    expect(crumb.scrollWidth).toBeGreaterThan(crumb.clientWidth);
  });
});
