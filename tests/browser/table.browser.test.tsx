import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { Button } from '../../packages/sprout/src/components/button.js';
import { Table, type TableColumn } from '../../packages/sprout/src/components/table.js';
import { axeViolations, emulate, setTheme, settle, themes } from './support.js';

type Order = {
  id: string;
  customer: string;
  crop: string;
  region: string;
  boxes: number;
  seats: number;
};

const orders: Order[] = [
  ['Lisse Bulb Co.', 'Tulip', 'West', 12, 4],
  ['Keukenhof Growers', 'Daffodil', 'North', 8, 6],
  ['Hillegom Seeds', 'Tulip', 'South', 15, 8],
  ['Amsterdam Florals', 'Hyacinth', 'North', 3, 1],
].map(([customer, crop, region, boxes, seats], i) => ({
  id: `o${i}`,
  customer: customer as string,
  crop: crop as string,
  region: region as string,
  boxes: boxes as number,
  seats: seats as number,
}));

const orderColumns: TableColumn<Order>[] = [
  { key: 'customer', header: 'Customer', sort: true, edit: 'text' },
  { key: 'crop', header: 'Crop' },
  { key: 'region', header: 'Region' },
  { key: 'boxes', header: 'Boxes', align: 'right', sort: true },
  {
    key: 'seats',
    header: 'Seats',
    align: 'right',
    edit: 'number',
    pin: 'right',
  },
];

function Grid() {
  return (
    <Table
      variant="grid"
      aria-label="Customers"
      data={orders}
      columns={orderColumns}
      getRowId={row => row.id}
      rowLabel={row => row.customer}
      selectable
      onRowSave={() => undefined}
      actions={row => (
        <Button variant="ghost" size="icon-sm" aria-label={`More for ${row.customer}`}>
          …
        </Button>
      )}
    />
  );
}

function Layout() {
  return (
    <Table
      variant="grid"
      aria-label="Orders layout"
      data={orders}
      columns={orderColumns.map(c =>
        c.key === 'customer' ? { ...c, pin: 'left', width: 200 } : { ...c, pin: undefined, width: 130 },
      )}
      getRowId={row => row.id}
      rowLabel={row => row.customer}
      selectable
      resizable
      reorderable
    />
  );
}

type Bed = { id: string; label: string; crop: string };

function Beds() {
  const [beds, setBeds] = useState<Bed[]>(() =>
    Array.from({ length: 300 }, (_, i) => ({
      id: `bed-${i + 1}`,
      label: `Bed ${i + 1}`,
      crop: ['Tulip', 'Daffodil'][i % 2]!,
    })),
  );
  return (
    <Table
      variant="grid"
      aria-label="Beds"
      data={beds}
      getRowId={row => row.id}
      rowLabel={row => row.label}
      virtual
      onRowReorder={(from, to) =>
        setBeds(all => {
          const next = [...all];
          next.splice(to, 0, ...next.splice(from, 1));
          return next;
        })
      }
      columns={[
        { key: 'label', header: 'Bed' },
        { key: 'crop', header: 'Crop' },
      ]}
    />
  );
}

function Stacked() {
  return (
    <Table
      aria-label="Folders"
      narrow="stack"
      data={[
        { id: 'a', name: 'Supplier contracts', owner: 'Mara', files: 3 },
        { id: 'b', name: 'Field photos', owner: 'Joost', files: 18 },
      ]}
      getRowId={row => row.id}
      rowLabel={row => row.name}
      columns={[
        { key: 'name', header: 'Name' },
        { key: 'owner', header: 'Owner' },
        { key: 'files', header: 'Files', align: 'right' },
      ]}
    />
  );
}

function backgroundOf(token: string) {
  const probe = document.createElement('span');
  probe.style.backgroundColor = `var(${token})`;
  document.body.append(probe);
  const value = getComputedStyle(probe).backgroundColor;
  probe.remove();
  return value;
}

const rect = (node: Element) => node.getBoundingClientRect();
const headers = (root: Element) =>
  [...root.querySelectorAll('thead th:not([data-selection])')].map(th => th.textContent!.trim());

// dnd-kit attaches its keydown listener in a task after pickup.
async function keyboardDrag(handle: HTMLElement, key: string) {
  handle.focus();
  await userEvent.keyboard(' ');
  await new Promise(resolve => setTimeout(resolve, 50));
  await userEvent.keyboard(`{${key}}`);
  await new Promise(resolve => setTimeout(resolve, 50));
  await userEvent.keyboard(' ');
}

describe('Table in a real browser', () => {
  it.each(themes)('%s %s passes axe and draws the container with the input line', async (theme, mode) => {
    setTheme(theme, mode);
    await emulate({ reducedMotion: true });
    const screen = await render(
      <div style={{ display: 'grid', gap: 24, padding: 16 }}>
        <Grid />
        <Stacked />
      </div>,
    );
    await settle();
    const container = screen.container.querySelector('[data-slot="table-container"]')!;
    expect(getComputedStyle(container).borderTopColor).toBe(backgroundOf('--sprout-input'));
    expect(await axeViolations(screen.container)).toEqual([]);
  });

  it('a selected row takes the subtle primary background', async () => {
    await emulate({ reducedMotion: true });
    const screen = await render(<Grid />);
    await screen.getByRole('checkbox', { name: 'Select Lisse Bulb Co.' }).click();
    const row = screen.container.querySelector('tr[data-state="selected"]')!;
    expect(getComputedStyle(row).backgroundColor).toBe(backgroundOf('--sprout-primary-subtle'));
  });

  it('keyboard resizing changes the drawn column width', async () => {
    await page.viewport(1280, 900);
    // Narrower than the summed widths, so the table sits at its minimum width.
    const screen = await render(
      <div style={{ width: 600 }}>
        <Layout />
      </div>,
    );
    const resizer = screen.getByRole('separator', {
      name: 'Resize Crop column',
    });
    await expect.element(resizer).toHaveAttribute('aria-valuenow', '130');
    const crop = screen.container.querySelector('th[data-column-id="crop"]')!;
    const before = rect(crop).width;
    resizer.element().focus();
    await userEvent.keyboard('{ArrowRight}{Shift>}{ArrowRight}{/Shift}');
    await expect.element(resizer).toHaveAttribute('aria-valuenow', '180');
    expect(rect(crop).width - before).toBeCloseTo(50, 0);
  });

  it('columns and rows reorder by keyboard drag', async () => {
    await page.viewport(1280, 900);
    const screen = await render(
      <>
        <Layout />
        <Beds />
      </>,
    );
    const layout = screen.getByRole('table', { name: 'Orders layout' }).element();
    expect(headers(layout).slice(0, 3)).toEqual(['Customer', 'Crop', 'Region']);
    await keyboardDrag(screen.getByRole('button', { name: 'Move Crop column' }).element(), 'ArrowRight');
    await expect.poll(() => headers(layout).slice(0, 3)).toEqual(['Customer', 'Region', 'Crop']);

    const beds = screen.getByRole('table', { name: 'Beds' }).element();
    const firstTwo = () =>
      [...beds.querySelectorAll('tbody tr')]
        .map(tr => tr.textContent!)
        .filter(Boolean)
        .slice(0, 2);
    await keyboardDrag(screen.getByRole('button', { name: 'Move Bed 1', exact: true }).element(), 'ArrowDown');
    await expect.poll(firstTwo).toEqual([expect.stringContaining('Bed 2'), expect.stringContaining('Bed 1')]);
  });

  it('pinned columns stick next to the checkbox and actions columns', async () => {
    await page.viewport(390, 900);
    await emulate({ reducedMotion: true });
    const screen = await render(
      <div style={{ display: 'grid', gap: 24 }}>
        <Grid />
        <Layout />
      </div>,
    );
    const grid = screen.getByRole('table', { name: 'Customers' }).element();
    const gridRow = grid.querySelector('tbody tr')!;
    await expect
      .poll(() =>
        Math.round(
          rect(gridRow.querySelector('td[data-sticky-end]')!).left -
            rect(gridRow.querySelector('td[data-label="Seats"]')!).right,
        ),
      )
      .toBe(0);

    const layout = screen.getByRole('table', { name: 'Orders layout' }).element();
    const viewport = layout.closest<HTMLElement>('[data-slot=scroll-area-viewport]')!;
    viewport.scrollTo({ left: viewport.scrollWidth });
    await expect.poll(() => viewport.scrollLeft).toBeGreaterThan(0);
    const row = layout.querySelector('tbody tr')!;
    const selection = row.querySelector('td[data-selection]')!;
    expect(getComputedStyle(selection).position).toBe('sticky');
    await expect.poll(() => Math.round(rect(selection).left - rect(viewport).left)).toBe(0);
    await expect
      .poll(() => Math.round(rect(row.querySelector('td[data-label="Customer"]')!).left - rect(selection).right))
      .toBe(0);
  });

  it('virtual rows draw only part of 300 rows', async () => {
    const screen = await render(<Beds />);
    const table = screen.getByRole('table', { name: 'Beds' });
    await expect.element(table).toHaveAttribute('aria-rowcount', '301');
    await expect.poll(() => table.element().querySelectorAll('tbody tr').length).toBeGreaterThan(5);
    expect(table.element().querySelectorAll('tbody tr').length).toBeLessThan(100);
  });

  it('stack layout turns rows into labelled cards at phone width', async () => {
    await page.viewport(390, 900);
    await emulate({ reducedMotion: true });
    const screen = await render(<Stacked />);
    const table = screen.getByRole('table', { name: 'Folders' }).element();
    expect(getComputedStyle(table.querySelector('tbody')!).display).toBe('block');
    expect(getComputedStyle(table.querySelector('thead')!).position).toBe('absolute');
    const owner = table.querySelector('td[data-label="Owner"]')!;
    expect(owner).toBeVisible();
    expect(getComputedStyle(owner, '::before').content).toBe('"Owner"');
    await settle();
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
  });
});
