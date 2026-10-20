import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { Button } from '../../packages/sprout/src/components/button.js';
import {
  ViewSwitcher,
  viewSwitcherTabId,
  type ViewSwitcherOption,
  type ViewSwitcherView,
} from '../../packages/sprout/src/components/view-switcher.js';
import { axeViolations, emulate, setTheme, settle, themes } from './support.js';

const glyph = (path: string) =>
  function Glyph({ size = 16 }: { size?: number }) {
    return (
      <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor">
        <path d={path} />
      </svg>
    );
  };
const Grid = glyph('M2 2h12v12H2zM2 6h12M6 2v12');
const List = glyph('M2 4h12M2 8h12M2 12h12');
const Kanban = glyph('M2 2h3v12H2zM7 2h3v8H7zM12 2h2v5h-2z');
const ChartBar = glyph('M3 14V8M8 14V3M13 14v-5');
const Roadmap = glyph('M2 4h7M5 8h8M3 12h6');

const options: ViewSwitcherOption[] = [
  { id: 'table', label: 'Table', icon: Grid, description: 'Rows and columns you can edit.' },
  { id: 'list', label: 'List', icon: List, description: 'One item per row for quick reading.', closable: true },
  {
    id: 'board',
    label: 'Board',
    icon: Kanban,
    description: 'Cards in lanes by stage.',
    unavailable: 'Needs a single-select field.',
    closable: true,
  },
  { id: 'chart', label: 'Chart', icon: ChartBar, description: 'Totals and counts by group.', closable: true },
  { id: 'timeline', label: 'Timeline', icon: Roadmap, description: 'Rows placed on dates.', closable: true },
];

const pick = (...ids: string[]): ViewSwitcherView[] =>
  ids.map(id => {
    const { description: _description, unavailable: _unavailable, ...view } = options.find(option => option.id === id)!;
    return view;
  });

function Harness({
  initial = ['table', 'list', 'chart'],
  start = 'table',
  menu = options,
  closable = true,
  onAdd,
  actions,
  width,
}: {
  initial?: string[];
  start?: string;
  menu?: ViewSwitcherOption[] | null;
  closable?: boolean;
  onAdd?: (id: string) => void;
  actions?: React.ReactNode;
  width?: number;
}) {
  const [ids, setIds] = useState(initial);
  const [value, setValue] = useState(start);
  const views = pick(...ids);
  return (
    <div style={{ width }}>
      <ViewSwitcher
        views={views}
        value={value}
        onValueChange={setValue}
        options={menu ?? undefined}
        panelId="records"
        actions={actions}
        onAdd={id => {
          onAdd?.(id);
          if (!ids.includes(id)) setIds([...ids, id]);
          setValue(id);
        }}
        onClose={
          closable
            ? id => {
                const index = ids.indexOf(id);
                const next = ids.filter(other => other !== id);
                setIds(next);
                if (id === value) setValue(next[index] ?? next[index - 1] ?? next[0]!);
              }
            : undefined
        }
      />
      <div role="tabpanel" id="records" aria-labelledby={viewSwitcherTabId('records', value)} tabIndex={0}>
        {value} panel
      </div>
    </div>
  );
}

const list = () => page.getByRole('tablist', { name: 'Views' });
const tab = (name: string) => page.getByRole('tab', { name });
const indicator = () => document.querySelector<HTMLElement>('.sprout-view-switcher-indicator')!;

describe('ViewSwitcher in a real browser', () => {
  it.each(themes)('%s %s passes axe with the bar and the open menu', async (theme, mode) => {
    setTheme(theme, mode);
    const screen = await render(<Harness actions={<Button variant="outline">Share</Button>} />);
    await settle();
    expect(await axeViolations(screen.container)).toEqual([]);
    await userEvent.click(page.getByRole('button', { name: 'Add view' }));
    await expect.element(page.getByRole('menu')).toBeVisible();
    await settle();
    expect(await axeViolations()).toEqual([]);
    await userEvent.keyboard('{Escape}');
  });

  it('is a tablist whose tabs point at the app panel', async () => {
    await render(<Harness />);
    await expect.element(list()).toBeVisible();
    await expect.element(tab('Table')).toHaveAttribute('aria-selected', 'true');
    await expect.element(tab('Table')).toHaveAttribute('aria-controls', 'records');
    await expect.element(tab('Table')).toHaveAttribute('id', 'records-tab-table');
    await expect.element(page.getByRole('tabpanel', { name: 'Table' })).toHaveTextContent('table panel');
    await expect.element(tab('List')).toHaveAttribute('aria-keyshortcuts', 'Delete');
    await expect.element(tab('Table')).not.toHaveAttribute('aria-keyshortcuts');
  });

  it('moves and activates with arrows, Home and End', async () => {
    await render(<Harness />);
    await userEvent.tab();
    await expect.element(tab('Table')).toHaveFocus();
    await userEvent.keyboard('{ArrowRight}');
    await expect.element(tab('List')).toHaveFocus();
    await expect.element(tab('List')).toHaveAttribute('aria-selected', 'true');
    await expect.element(page.getByRole('tabpanel')).toHaveTextContent('list panel');
    await userEvent.keyboard('{End}');
    await expect.element(tab('Chart')).toHaveAttribute('aria-selected', 'true');
    await userEvent.keyboard('{Home}');
    await expect.element(tab('Table')).toHaveAttribute('aria-selected', 'true');
    await userEvent.keyboard('{ArrowLeft}');
    await expect.element(tab('Table')).toHaveFocus();
    await userEvent.tab();
    await expect.element(page.getByRole('button', { name: 'Add view' })).toHaveFocus();
  });

  it('Delete closes a closable tab and moves focus to a neighbour', async () => {
    await render(<Harness start="list" />);
    await userEvent.tab();
    await expect.element(tab('List')).toHaveFocus();
    await userEvent.keyboard('{Delete}');
    await expect.element(tab('List')).not.toBeInTheDocument();
    await expect.element(tab('Chart')).toHaveFocus();
    await expect.element(tab('Chart')).toHaveAttribute('aria-selected', 'true');
    await userEvent.keyboard('{Delete}');
    await expect.element(tab('Table')).toHaveFocus();
    await userEvent.keyboard('{Delete}');
    await expect.element(tab('Table')).toBeInTheDocument();
    await expect.element(tab('Table')).toHaveFocus();
  });

  it('shows close only when the app passes onClose', async () => {
    await render(<Harness closable={false} />);
    expect(document.querySelector('[data-slot="view-switcher-close"]')).toBeNull();
    await expect.element(tab('List')).not.toHaveAttribute('aria-keyshortcuts');
    await userEvent.tab();
    await userEvent.keyboard('{ArrowRight}{Delete}');
    await expect.element(tab('List')).toBeInTheDocument();
  });

  it('the close control appears on hover and closes without choosing the tab', async () => {
    await render(<Harness />);
    const close = () => tab('Chart').element().querySelector<HTMLElement>('[data-slot="view-switcher-close"]')!;
    expect(getComputedStyle(close()).opacity).toBe('0');
    await userEvent.hover(tab('Chart'));
    await settle();
    expect(getComputedStyle(close()).opacity).toBe('1');
    await userEvent.click(page.elementLocator(close()));
    await expect.element(tab('Chart')).not.toBeInTheDocument();
    await expect.element(tab('Table')).toHaveAttribute('aria-selected', 'true');
  });

  it('opens the menu with every option in reading order', async () => {
    const onAdd = vi.fn();
    await render(<Harness onAdd={onAdd} />);
    const trigger = page.getByRole('button', { name: 'Add view' });
    await userEvent.click(trigger);
    const menu = page.getByRole('menu');
    await expect.element(menu).toBeVisible();
    const items = page.getByRole('menuitem').elements();
    expect(items.map(item => item.getAttribute('aria-labelledby') && item.textContent)).toHaveLength(5);
    await expect
      .element(page.getByRole('menuitem', { name: 'Table' }))
      .toHaveAccessibleDescription('Already open. Rows and columns you can edit.');
    await expect
      .element(page.getByRole('menuitem', { name: 'Timeline' }))
      .toHaveAccessibleDescription('Rows placed on dates.');
    const board = page.getByRole('menuitem', { name: 'Board' });
    await expect.element(board).toHaveAttribute('aria-disabled', 'true');
    await expect.element(board).toHaveAccessibleDescription('Needs a single-select field.');
    await userEvent.keyboard('{ArrowDown}');
    await expect.element(page.getByRole('menuitem', { name: 'Table' })).toHaveFocus();
    await userEvent.keyboard('{ArrowDown}{ArrowDown}');
    await expect.element(board).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    expect(onAdd).not.toHaveBeenCalled();
    await userEvent.keyboard('{ArrowDown}{ArrowDown}');
    await expect.element(page.getByRole('menuitem', { name: 'Timeline' })).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    expect(onAdd).toHaveBeenCalledWith('timeline');
    await expect.element(menu).not.toBeInTheDocument();
    await expect.element(tab('Timeline')).toHaveAttribute('aria-selected', 'true');
  });

  it('Escape closes the menu and returns focus to Add view', async () => {
    await render(<Harness />);
    const trigger = page.getByRole('button', { name: 'Add view' });
    await userEvent.click(trigger);
    await expect.element(page.getByRole('menu')).toBeVisible();
    await userEvent.keyboard('{Escape}');
    await expect.element(page.getByRole('menu')).not.toBeInTheDocument();
    await expect.element(trigger).toHaveFocus();
  });

  it('clicking an open option calls onAdd so the app can switch to it', async () => {
    const onAdd = vi.fn();
    await render(<Harness onAdd={onAdd} />);
    await userEvent.click(page.getByRole('button', { name: 'Add view' }));
    await userEvent.click(page.getByRole('menuitem', { name: 'Chart' }));
    expect(onAdd).toHaveBeenCalledWith('chart');
    await expect.element(tab('Chart')).toHaveAttribute('aria-selected', 'true');
    expect(page.getByRole('tab').elements()).toHaveLength(3);
  });

  it('hides Add view when there are no options', async () => {
    await render(<Harness menu={null} />);
    await expect.element(page.getByRole('button', { name: 'Add view' })).not.toBeInTheDocument();
  });

  it('lays the menu in two columns, and one column on a phone', async () => {
    await page.viewport(1280, 900);
    await render(<Harness />);
    await userEvent.click(page.getByRole('button', { name: 'Add view' }));
    await settle();
    const columns = () =>
      getComputedStyle(document.querySelector('.sprout-view-switcher-options')!).gridTemplateColumns.split(' ').length;
    expect(columns()).toBe(2);
    await userEvent.keyboard('{Escape}');
    await page.viewport(390, 844);
    await userEvent.click(page.getByRole('button', { name: 'Add view' }));
    await settle();
    expect(columns()).toBe(1);
    const menu = page.getByRole('menu').element().getBoundingClientRect();
    expect(menu.right).toBeLessThanOrEqual(390);
    await userEvent.keyboard('{Escape}');
  });

  it('scrolls the tabs at 390px, keeps the active tab in view and Add view pinned', async () => {
    await page.viewport(390, 844);
    await render(
      <Harness
        width={390}
        initial={['table', 'list', 'board', 'chart', 'timeline']}
        actions={<Button variant="outline">Share</Button>}
      />,
    );
    await settle();
    const strip = list().element() as HTMLElement;
    expect(strip.scrollWidth).toBeGreaterThan(strip.clientWidth);
    expect(strip.hasAttribute('data-overflow-end')).toBe(true);
    expect(strip.hasAttribute('data-overflow-start')).toBe(false);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
    const add = page.getByRole('button', { name: 'Add view' }).element().getBoundingClientRect();
    expect(add.right).toBeLessThanOrEqual(390);
    await userEvent.tab();
    await userEvent.keyboard('{End}');
    await settle();
    const bounds = strip.getBoundingClientRect();
    const active = tab('Timeline').element().getBoundingClientRect();
    expect(active.right).toBeLessThanOrEqual(bounds.right + 0.5);
    expect(active.left).toBeGreaterThanOrEqual(bounds.left);
    expect(strip.hasAttribute('data-overflow-start')).toBe(true);
    expect(page.getByRole('button', { name: 'Add view' }).element().getBoundingClientRect().right).toBeLessThanOrEqual(
      390,
    );
  });

  it('slides the underline only when motion is allowed', async () => {
    await render(<Harness />);
    await settle();
    expect(getComputedStyle(indicator()).height).toBe('2px');
    expect(getComputedStyle(indicator()).transitionProperty).toContain('left');
    const before = indicator().getBoundingClientRect();
    const first = tab('Table').element().getBoundingClientRect();
    expect(Math.abs(before.left - first.left)).toBeLessThan(1);
    expect(Math.abs(before.width - first.width)).toBeLessThan(1);
    await userEvent.click(tab('Chart'));
    await settle();
    const moved = indicator().getBoundingClientRect();
    const chart = tab('Chart').element().getBoundingClientRect();
    expect(Math.abs(moved.left - chart.left)).toBeLessThan(1);
    await emulate({ reducedMotion: true });
    expect(getComputedStyle(indicator()).transitionDuration).toBe('0s');
  });
});
