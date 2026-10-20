import { useRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { Badge } from '../../packages/sprout/src/components/badge.js';
import { Button } from '../../packages/sprout/src/components/button.js';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../packages/sprout/src/components/dropdown-menu.js';
import {
  RecordList,
  type RecordListHandle,
  type RecordListProps,
} from '../../packages/sprout/src/components/record-list.js';
import { axeViolations, emulate, setTheme, settle, themes } from './support.js';

interface Ticket {
  id: string;
  title: string;
  status: string;
  owner: string;
  points: number;
}

const longTitle =
  'Fix the greenhouse vent motor that stops halfway open on cold mornings after the frost alert runs, then check the north and south bays, the seed room fans, and every sensor on the east wall';
const longValue = 'Greenhouse operations team, north site, weekend shift and holidays';

const tickets: Ticket[] = [
  { id: 't1', title: 'Seed tray leaks', status: 'Open', owner: 'Ana Ruiz', points: 3 },
  { id: 't2', title: longTitle, status: 'Blocked', owner: longValue, points: 11 },
  { id: 't3', title: 'Order compost', status: 'Done', owner: 'Ben Okafor', points: 1 },
];

function Tickets(props: Partial<RecordListProps<Ticket>>) {
  return (
    <RecordList
      label="Tickets"
      items={tickets}
      values={ticket => [
        { label: 'Owner', value: ticket.owner },
        { label: 'Points', value: ticket.points },
      ]}
      badges={ticket => (
        <>
          <Badge variant="info">{ticket.status}</Badge>
          <Badge variant="warning">High</Badge>
        </>
      )}
      renderActions={ticket => (
        <>
          <Button variant="ghost" size="icon-sm" aria-label={`Edit ${ticket.id}`}>
            E
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button variant="ghost" size="icon-sm" aria-label={`More for ${ticket.id}`} />}
            >
              …
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>History</DropdownMenuItem>
              <DropdownMenuItem>Delete</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      )}
      {...props}
    />
  );
}

function colorOf(token: string) {
  const probe = document.createElement('span');
  probe.style.color = `var(${token})`;
  document.body.append(probe);
  const value = getComputedStyle(probe).color;
  probe.remove();
  return value;
}

const root = () => document.querySelector<HTMLElement>('[data-slot="record-list"]')!;
const rows = () => [...document.querySelectorAll<HTMLElement>('[data-slot="record-list-item"]')];
const part = (row: HTMLElement, name: string) => row.querySelector<HTMLElement>(`[data-slot="record-list-${name}"]`)!;

describe('RecordList in a real browser', () => {
  it.each(themes)('%s %s passes axe and paints one bordered panel with hairlines', async (theme, mode) => {
    setTheme(theme, mode);
    const screen = await render(<Tickets onItemOpen={() => {}} footer={<p>Page 1 of 3</p>} />);
    await settle();
    const style = getComputedStyle(root());
    expect(style.backgroundColor).toBe(colorOf('--sprout-surface'));
    expect(style.borderTopColor).toBe(colorOf('--sprout-line'));
    expect(getComputedStyle(rows()[0]!).borderBottomColor).toBe(colorOf('--sprout-line'));
    expect(getComputedStyle(rows()[2]!).borderBottomWidth).toBe('0px');
    const value = rows()[0]!.querySelector('dt')!;
    expect(getComputedStyle(value).color).toBe(colorOf('--sprout-muted'));
    expect(getComputedStyle(value.nextElementSibling!).color).toBe(colorOf('--sprout-text'));
    expect(await axeViolations(screen.container)).toEqual([]);
  });

  it('reads each row as its title with values and badges as the description', async () => {
    const screen = await render(<Tickets />);
    const list = screen.getByRole('list', { name: 'Tickets, 3 rows' });
    await expect.element(list).toBeVisible();
    const row = screen.getByRole('listitem', { name: 'Seed tray leaks' });
    await expect.element(row).toHaveAccessibleDescription('Owner Ana Ruiz Points 3 Open High');
  });

  it('puts badges and actions on the right at 1440px and truncates long text', async () => {
    await page.viewport(1440, 900);
    await render(<Tickets />);
    const row = rows()[1]!;
    const title = part(row, 'title');
    const badges = part(row, 'badges');
    const actions = part(row, 'actions');
    expect(title.getBoundingClientRect().height).toBe(20);
    expect(title.scrollWidth).toBeGreaterThan(title.clientWidth);
    expect(title.title).toBe(longTitle);
    expect(badges.getBoundingClientRect().left).toBeGreaterThan(title.getBoundingClientRect().right);
    expect(actions.getBoundingClientRect().left).toBeGreaterThan(badges.getBoundingClientRect().right);
    const owner = row.querySelector('dd')!;
    expect(owner.title).toBe(longValue);
    expect(owner.scrollWidth).toBeGreaterThan(owner.clientWidth);
    expect(owner.parentElement!.getBoundingClientRect().width).toBeLessThanOrEqual(256);
    expect(getComputedStyle(owner).fontVariantNumeric).toBe('tabular-nums');
  });

  it('moves badges under the values at 390px while actions stay top right', async () => {
    await page.viewport(390, 844);
    await render(<Tickets />);
    const row = rows()[1]!;
    const title = part(row, 'title');
    const values = part(row, 'values');
    const badges = part(row, 'badges');
    const actions = part(row, 'actions');
    expect(badges.getBoundingClientRect().top).toBeGreaterThanOrEqual(values.getBoundingClientRect().bottom);
    expect(Math.abs(badges.getBoundingClientRect().left - title.getBoundingClientRect().left)).toBeLessThan(1);
    expect(actions.getBoundingClientRect().top).toBeLessThan(values.getBoundingClientRect().top);
    expect(actions.getBoundingClientRect().right).toBeGreaterThan(row.getBoundingClientRect().right - 20);
    expect(title.getBoundingClientRect().height).toBe(40);
    expect(title.scrollHeight).toBeGreaterThan(title.clientHeight);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
  });

  it('shows hover and an inset focus ring on rows', async () => {
    await render(<Tickets onItemOpen={() => {}} />);
    const row = rows()[0]!;
    await userEvent.hover(part(row, 'title'));
    await expect.poll(() => getComputedStyle(row).backgroundColor).toBe(colorOf('--sprout-hover'));
    expect(getComputedStyle(row).cursor).toBe('pointer');
    await userEvent.tab();
    expect(document.activeElement).toBe(row);
    const style = getComputedStyle(row);
    expect(style.outlineStyle).toBe('solid');
    expect(Number.parseFloat(style.outlineOffset)).toBeLessThan(0);
  });

  it('walks rows and actions by keyboard, and a menu returns focus to its trigger', async () => {
    const onItemOpen = vi.fn();
    const screen = await render(
      <>
        <Tickets onItemOpen={onItemOpen} />
        <button type="button">After</button>
      </>,
    );
    await userEvent.tab();
    await userEvent.keyboard('{ArrowDown}');
    await expect.element(screen.getByRole('listitem', { name: longTitle })).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    expect(onItemOpen).toHaveBeenLastCalledWith(tickets[1]);
    await userEvent.tab();
    await expect.element(screen.getByRole('button', { name: 'Edit t2' })).toHaveFocus();
    await userEvent.tab();
    const more = screen.getByRole('button', { name: 'More for t2' });
    await expect.element(more).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    await expect.element(screen.getByRole('menu')).toBeVisible();
    await userEvent.keyboard('{ArrowDown}');
    await userEvent.keyboard('{Escape}');
    await expect.element(more).toHaveFocus();
    expect(onItemOpen).toHaveBeenCalledOnce();
    await userEvent.tab();
    await expect.element(screen.getByRole('button', { name: 'After' })).toHaveFocus();
    await userEvent.tab({ shift: true });
    await expect.element(more).toHaveFocus();
  });

  it('opens on a row click but not on an action or menu item', async () => {
    const onItemOpen = vi.fn();
    const screen = await render(<Tickets onItemOpen={onItemOpen} />);
    await screen.getByText('Order compost').click();
    expect(onItemOpen).toHaveBeenLastCalledWith(tickets[2]);
    await screen.getByRole('button', { name: 'Edit t1' }).click();
    await screen.getByRole('button', { name: 'More for t1' }).click();
    await screen.getByRole('menuitem', { name: 'History' }).click();
    expect(onItemOpen).toHaveBeenCalledOnce();
    expect(rows()[0]!.tabIndex).toBe(0);
  });

  it('dims rows while a page loads, then focusFirst lands on the new first row', async () => {
    const next = [{ id: 'n1', title: 'Next page row', status: 'Open', owner: 'Di', points: 2 }];
    function Paged() {
      const ref = useRef<RecordListHandle>(null);
      const [loading, setLoading] = useState(false);
      const [items, setItems] = useState(tickets);
      return (
        <Tickets
          ref={ref}
          items={items}
          status={loading ? 'loading' : 'ready'}
          footer={
            <>
              <button
                type="button"
                onClick={() => {
                  setLoading(true);
                  ref.current?.focusFirst();
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
          }
        />
      );
    }
    const screen = await render(<Paged />);
    await screen.getByRole('button', { name: 'Next' }).click();
    const list = screen.getByRole('list');
    await expect.element(list).toHaveAttribute('aria-busy', 'true');
    await settle();
    expect(Number(getComputedStyle(list.element()).opacity)).toBeLessThan(1);
    await expect.element(screen.getByRole('status')).toHaveTextContent('Loading rows…');
    await screen.getByRole('button', { name: 'Loaded' }).click();
    await expect.element(screen.getByRole('listitem', { name: 'Next page row' })).toHaveFocus();
  });

  it('shows skeleton rows, empty, and error with retry', async () => {
    const onRetry = vi.fn();
    const screen = await render(<Tickets items={[]} status="loading" />);
    await expect.element(screen.getByRole('status', { name: 'Loading rows' })).toBeVisible();
    expect(document.querySelectorAll('.sprout-record-list-skeleton-row')).toHaveLength(5);
    await screen.rerender(<Tickets items={[]} />);
    await expect.element(screen.getByRole('heading', { name: 'No rows to show' })).toBeVisible();
    await screen.rerender(<Tickets status="error" onRetry={onRetry} />);
    await expect.element(screen.getByRole('heading', { name: 'Rows did not load' })).toBeVisible();
    expect(screen.container.querySelector('[role="alert"]')?.textContent).toContain('Rows did not load');
    await screen.getByRole('button', { name: 'Try again' }).click();
    expect(onRetry).toHaveBeenCalledOnce();
    expect(await axeViolations(screen.container)).toEqual([]);
  });

  it('animates rows only when motion is allowed', async () => {
    await render(<Tickets />);
    expect(getComputedStyle(rows()[0]!).animationName).toBe('sprout-record-list-in');
    expect(getComputedStyle(rows()[0]!).transitionProperty).toBe('background-color');
    await emulate({ reducedMotion: true });
    expect(getComputedStyle(rows()[0]!).animationName).toBe('none');
    expect(getComputedStyle(rows()[0]!).transitionDuration).toBe('0s');
  });
});
