// @vitest-environment jsdom
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef, useRef, useState } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { Badge } from '../packages/sprout/src/components/badge.js';
import { Button } from '../packages/sprout/src/components/button.js';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../packages/sprout/src/components/dropdown-menu.js';
import {
  RecordList,
  recordListDensityNames,
  recordListMaxValues,
  recordListStatusNames,
  type RecordListHandle,
  type RecordListProps,
} from '../packages/sprout/src/components/record-list.js';
import * as sprout from '../packages/sprout/src/index.js';

interface Ticket {
  id: string;
  title: string;
  status: string;
  owner: string;
  points: number;
}

const tickets: Ticket[] = [
  { id: 't1', title: 'Seed tray leaks', status: 'Open', owner: 'Ana', points: 3 },
  { id: 't2', title: 'Order compost', status: 'Done', owner: 'Ben', points: 1 },
  { id: 't3', title: 'Fix greenhouse vent', status: 'Blocked', owner: 'Cy', points: 5 },
];

function List({ items = tickets, ...props }: Partial<RecordListProps<Ticket>>) {
  return (
    <RecordList
      label="Tickets"
      items={items}
      values={ticket => [
        { label: 'Owner', value: ticket.owner },
        { label: 'Points', value: ticket.points },
      ]}
      badges={ticket => <Badge variant="secondary">{ticket.status}</Badge>}
      renderActions={ticket => (
        <>
          <Button variant="ghost" size="icon-sm" aria-label={`Edit ${ticket.title}`}>
            E
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button variant="ghost" size="icon-sm" aria-label={`More for ${ticket.title}`} />}
            >
              …
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem>Delete</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      )}
      {...props}
    />
  );
}

const rows = () => screen.getAllByRole('listitem');

const tick = () => new Promise(resolve => setTimeout(resolve));

describe('RecordList', () => {
  it('is exported from the package root with its names', () => {
    expect(sprout).toHaveProperty('RecordList', RecordList);
    expect(recordListStatusNames).toEqual(['ready', 'loading', 'error']);
    expect(recordListDensityNames).toEqual(['md', 'sm']);
    expect(recordListMaxValues).toBe(4);
  });

  it('renders on the server', () => {
    const html = renderToString(<List />);
    expect(html).toContain('data-slot="record-list"');
    expect(html).toContain('aria-label="Tickets, 3 rows"');
  });

  it('names the list with its label and row count, and each row with its title', () => {
    render(<List items={tickets.slice(0, 1)} />);
    const list = screen.getByRole('list', { name: 'Tickets, 1 row' });
    const row = within(list).getByRole('listitem', { name: 'Seed tray leaks' });
    expect(
      row
        .getAttribute('aria-describedby')!
        .split(' ')
        .map(id => document.getElementById(id)!.textContent)
        .join(' '),
    ).toBe('OwnerAnaPoints3 Open');
    expect(within(row).getByText('Ana').tagName).toBe('DD');
    expect(within(row).getByText('Owner').tagName).toBe('DT');
  });

  it('shows at most four values and puts full text on titles and values', () => {
    const long = 'A very long ticket title that does not fit on one line at all in a narrow list';
    render(
      <RecordList
        label="Tickets"
        items={[{ id: 'a', title: long }]}
        renderTitle={item => <strong>#{item.id}</strong>}
        values={() => [
          { label: 'One', value: 'First value' },
          { label: 'Two', value: 2 },
          { label: 'Three', value: <em>node</em>, text: 'Node text' },
          { label: 'Four', value: <em>bare</em> },
          { label: 'Five', value: 'Hidden' },
        ]}
      />,
    );
    expect(screen.getAllByRole('term').map(term => term.textContent)).toEqual(['One', 'Two', 'Three', 'Four']);
    expect(screen.queryByText('Hidden')).toBeNull();
    const row = rows()[0]!;
    expect(row.getAttribute('aria-label')).toBe(long);
    expect(row.querySelector('[data-slot="record-list-title"]')!.getAttribute('title')).toBe(long);
    expect(screen.getByText('#a')).toBeTruthy();
    const definitions = screen.getAllByRole('definition');
    expect(definitions.map(item => item.getAttribute('title'))).toEqual(['First value', '2', 'Node text', null]);
  });

  it('leaves out empty slots', () => {
    render(<RecordList label="Tickets" items={[{ id: 'a', title: 'Plain' }]} badges={() => null} />);
    const row = rows()[0]!;
    expect(row!.hasAttribute('aria-describedby')).toBe(false);
    expect(row.querySelector('[data-slot="record-list-values"]')).toBeNull();
    expect(row.querySelector('[data-slot="record-list-badges"]')).toBeNull();
    expect(row.querySelector('[data-slot="record-list-actions"]')).toBeNull();
    expect(document.querySelector('[data-slot="record-list-footer"]')).toBeNull();
    expect(row!.hasAttribute('data-openable')).toBe(false);
  });

  it('is one tab stop, and Tab reaches only the focused row actions', async () => {
    const user = userEvent.setup();
    render(
      <>
        <List />
        <button type="button">After</button>
      </>,
    );
    expect(rows().map(row => row.tabIndex)).toEqual([0, -1, -1]);
    expect(screen.getByRole('button', { name: 'Edit Order compost' })!.getAttribute('tabindex')).toBe('-1');
    await user.tab();
    expect(document.activeElement).toBe(rows()[0]);
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Edit Seed tray leaks' }));
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'More for Seed tray leaks' }));
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'After' }));
    await user.tab({ shift: true });
    await user.tab({ shift: true });
    await user.tab({ shift: true });
    expect(document.activeElement).toBe(rows()[0]);
  });

  it('moves with arrows, Home and End, and moves the action tab stops along', async () => {
    const user = userEvent.setup();
    render(<List />);
    await user.tab();
    await user.keyboard('{ArrowDown}');
    expect(document.activeElement).toBe(rows()[1]);
    expect(rows().map(row => row.tabIndex)).toEqual([-1, 0, -1]);
    expect(screen.getByRole('button', { name: 'Edit Order compost' }).tabIndex).toBe(0);
    expect(screen.getByRole('button', { name: 'Edit Seed tray leaks' })!.getAttribute('tabindex')).toBe('-1');
    await user.keyboard('{End}');
    expect(document.activeElement).toBe(rows()[2]);
    await user.keyboard('{ArrowDown}');
    expect(document.activeElement).toBe(rows()[2]);
    await user.keyboard('{Home}');
    expect(document.activeElement).toBe(rows()[0]);
    await user.keyboard('{ArrowUp}');
    expect(document.activeElement).toBe(rows()[0]);
    await user.keyboard('{Shift>}{ArrowDown}{/Shift}');
    expect(document.activeElement).toBe(rows()[0]);
    await user.tab();
    await user.keyboard('{ArrowDown}');
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Edit Seed tray leaks' }));
  });

  it('opens on Enter and on a row click, but not from actions or menus', async () => {
    const user = userEvent.setup();
    const onItemOpen = vi.fn();
    render(<List onItemOpen={onItemOpen} />);
    await user.tab();
    await user.keyboard('{ArrowDown}{Enter}');
    expect(onItemOpen).toHaveBeenLastCalledWith(tickets[1]);
    await user.click(screen.getByText('Fix greenhouse vent'));
    expect(onItemOpen).toHaveBeenLastCalledWith(tickets[2]);
    expect(rows()[2]!.getAttribute('tabindex')).toBe('0');
    onItemOpen.mockClear();
    await user.click(screen.getByRole('button', { name: 'Edit Seed tray leaks' }));
    await user.click(screen.getByRole('button', { name: 'More for Seed tray leaks' }));
    const item = await screen.findByRole('menuitem', { name: 'Delete' });
    await user.keyboard('{ArrowDown}');
    await user.click(item);
    expect(onItemOpen).not.toHaveBeenCalled();
    expect(rows()[0]!.getAttribute('tabindex')).toBe('0');
  });

  it('does not open while text is selected', () => {
    const onItemOpen = vi.fn();
    render(<List onItemOpen={onItemOpen} />);
    const selection = vi.spyOn(window, 'getSelection').mockReturnValue({ toString: () => 'Seed' } as Selection);
    fireEvent.click(screen.getByText('Seed tray leaks'));
    expect(onItemOpen).not.toHaveBeenCalled();
    selection.mockRestore();
  });

  it('keeps rows dimmed and busy while a page loads', () => {
    render(<List status="loading" />);
    const list = screen.getByRole('list', { name: 'Tickets, 3 rows' });
    expect(list!.getAttribute('aria-busy')).toBe('true');
    expect(screen.getByRole('status').textContent).toContain('Loading rows…');
  });

  it('shows five skeleton rows when loading with no rows', () => {
    render(<List items={[]} status="loading" />);
    expect(screen.queryByRole('list')).toBeNull();
    const status = screen.getByRole('status', { name: 'Loading rows' });
    expect(status.querySelectorAll('.sprout-record-list-skeleton-row')).toHaveLength(5);
  });

  it('shows the default empty state, a custom one, or text', () => {
    const { rerender } = render(<List items={[]} />);
    expect(screen.getByRole('heading', { name: 'No rows to show' })).toBeTruthy();
    rerender(<List items={[]} empty="No tickets yet." />);
    expect(screen.getByText('No tickets yet.').tagName).toBe('P');
    rerender(<List items={[]} empty={<div>Custom empty</div>} />);
    expect(screen.getByText('Custom empty')).toBeTruthy();
  });

  it('shows an error with retry instead of the rows', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    const { rerender } = render(<List status="error" error="The server did not answer." onRetry={onRetry} />);
    expect(screen.queryByRole('list')).toBeNull();
    expect(screen.getByRole('alert').textContent).toContain('Rows did not load');
    expect(screen.getByText('The server did not answer.')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledOnce();
    rerender(<List status="error" />);
    expect(screen.getByText('Something went wrong while loading the rows.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Try again' })).toBeNull();
  });

  it('renders the footer inside the panel', () => {
    render(<List footer={<nav aria-label="Ticket pages">Pages</nav>} density="sm" />);
    const footer = screen.getByRole('navigation', { name: 'Ticket pages' }).parentElement!;
    expect(footer!.getAttribute('data-slot')).toBe('record-list-footer');
    expect(footer.closest('[data-slot="record-list"]')!.getAttribute('data-density')).toBe('sm');
  });

  it('focusFirst focuses the first row, waiting while a page loads', async () => {
    const ref = createRef<RecordListHandle>();
    const { rerender } = render(<List ref={ref} />);
    act(() => rows()[2]!.focus());
    await act(async () => {
      ref.current!.focusFirst();
      await tick();
    });
    expect(document.activeElement).toBe(rows()[0]);
    act(() => rows()[2]!.focus());
    rerender(<List ref={ref} status="loading" />);
    await act(async () => {
      ref.current!.focusFirst();
      await tick();
    });
    expect(document.activeElement).toBe(rows()[2]);
    const next = [{ id: 'n1', title: 'Next page row', status: 'Open', owner: 'Di', points: 2 }];
    rerender(<List ref={ref} items={next} />);
    expect(document.activeElement).toBe(screen.getByRole('listitem', { name: 'Next page row' }));
  });

  it('focusFirst waits for a loading state set in the same click', async () => {
    const user = userEvent.setup();
    const next = [{ id: 'n1', title: 'Next page row', status: 'Open', owner: 'Di', points: 2 }];
    function Paged() {
      const ref = useRef<RecordListHandle>(null);
      const [loading, setLoading] = useState(false);
      const [items, setItems] = useState(tickets);
      return (
        <>
          <List ref={ref} items={items} status={loading ? 'loading' : 'ready'} />
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              ref.current!.focusFirst();
            }}
          >
            Next
          </button>
          <button
            type="button"
            onClick={() => {
              setItems(next);
              setLoading(false);
            }}
          >
            Loaded
          </button>
        </>
      );
    }
    render(<Paged />);
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await act(tick);
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Next' }));
    await user.click(screen.getByRole('button', { name: 'Loaded' }));
    expect(document.activeElement).toBe(screen.getByRole('listitem', { name: 'Next page row' }));
  });

  it('focusFirst falls back to the empty or error state', async () => {
    const ref = createRef<RecordListHandle>();
    const { rerender } = render(<List ref={ref} items={[]} />);
    await act(async () => {
      ref.current!.focusFirst();
      await tick();
    });
    expect(document.activeElement!.getAttribute('data-slot')).toBe('record-list-state');
    rerender(<List ref={ref} status="error" />);
    act(() => (document.activeElement as HTMLElement).blur());
    await act(async () => {
      ref.current!.focusFirst();
      await tick();
    });
    expect(document.activeElement!.getAttribute('data-slot')).toBe('record-list-state');
  });

  it('keeps the tab stop on the first row when the focused row leaves', () => {
    const { rerender } = render(<List />);
    act(() => rows()[1]!.focus());
    rerender(<List items={[tickets[0]!, tickets[2]!]} />);
    expect(rows().map(row => row.tabIndex)).toEqual([0, -1]);
  });

  it('demotes controls added later and restores their own tabindex', async () => {
    const { rerender } = render(
      <RecordList
        label="Tickets"
        items={tickets}
        renderActions={ticket => (ticket.id === 't2' ? <a href="#x">Link</a> : <span tabIndex={-1}>Static</span>)}
      />,
    );
    const link = screen.getByRole('link', { name: 'Link' });
    expect(link!.getAttribute('tabindex')).toBe('-1');
    rerender(
      <RecordList
        label="Tickets"
        items={tickets}
        renderActions={ticket => (
          <button type="button" tabIndex={ticket.id === 't3' ? 0 : undefined}>
            {ticket.title} action
          </button>
        )}
      />,
    );
    await act(async () => {});
    expect(screen.getByRole('button', { name: 'Fix greenhouse vent action' })!.getAttribute('tabindex')).toBe('-1');
    act(() => rows()[2]!.focus());
    expect(screen.getByRole('button', { name: 'Fix greenhouse vent action' })!.getAttribute('tabindex')).toBe('0');
    expect(screen.getByRole('button', { name: 'Seed tray leaks action' })!.getAttribute('tabindex')).toBe('-1');
  });
});
