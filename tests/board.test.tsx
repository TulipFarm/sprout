import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import { Board, type BoardColumn, type BoardItem } from '../packages/sprout/src/components/board.js';
import * as sprout from '../packages/sprout/src/index.js';

const columns: BoardColumn[] = [
  { id: 'todo', title: 'To do' },
  { id: 'doing', title: 'Doing', limit: 1 },
];

const items: BoardItem[] = [
  { id: 'a', title: 'Alpha', columnId: 'todo', laneId: 'ana' },
  { id: 'b', title: 'Bravo', columnId: 'doing', laneId: 'ana' },
  { id: 'c', title: 'Charlie', columnId: 'doing', laneId: 'ben' },
];

const lanes = [
  { id: 'ana', title: 'Ana' },
  { id: 'ben', title: 'Ben' },
];

describe('Board', () => {
  it('is exported from the package root', () => {
    expect(sprout.Board).toBe(Board);
  });

  it('names the region and each cell list by column and lane', () => {
    const html = renderToString(<Board label="Team" columns={columns} lanes={lanes} items={items} />);
    expect(html).toContain('role="region" aria-label="Team"');
    expect(html).toContain('aria-label="To do, Ana, 1 cards"');
    expect(html).toContain('aria-label="Doing, Ben, 1 cards"');
    expect(html).toContain('aria-label="Ana, 2 cards"');
  });

  it('says Over limit in words when a column holds too many cards', () => {
    const html = renderToString(<Board columns={columns} lanes={lanes} items={items} />);
    expect(html).toContain('Over limit');
    expect(html).toContain('2 / 1');
    expect(html).toContain('data-over-limit="true"');
  });

  it('renders one row with no lane bars without lanes', () => {
    const html = renderToString(<Board columns={columns} items={items} />);
    expect(html).not.toContain('sprout-board-lane-bar');
    expect(html).toContain('aria-label="To do, 1 cards"');
    expect(html).toContain('data-fill');
  });

  it('shows add, rename, and toolbar controls only when their callbacks exist', () => {
    const plain = renderToString(<Board columns={columns} items={items} />);
    expect(plain).not.toContain('Add card');
    expect(plain).not.toContain('Add column');
    expect(plain).not.toContain('sprout-board-toolbar');
    expect(plain).not.toContain('Move To do');

    const full = renderToString(
      <Board
        columns={columns}
        items={items}
        onItemsChange={() => undefined}
        onColumnsChange={() => undefined}
        onItemAdd={() => undefined}
        onColumnAdd={() => undefined}
        searchable
      />,
    );
    expect(full).toContain('aria-label="Add card to To do"');
    expect(full).toContain('Add column');
    expect(full).toContain('aria-label="Search cards"');
    expect(full).toContain('aria-label="Move To do"');
    expect(full).toContain('3 cards');
  });

  it("renders the app's card body", () => {
    const html = renderToString(
      <Board columns={columns} items={items} renderBody={item => <em>{`${item.id}-body`}</em>} />,
    );
    expect(html).toContain('<em>a-body</em>');
  });

  it("renders the app's title content", () => {
    const html = renderToString(
      <Board columns={columns} items={items} renderTitle={item => <b>{`#${item.id} ${item.title}`}</b>} />,
    );
    expect(html).toContain(`<b>#a ${items[0]!.title}</b>`);
  });

  it("renders a whole custom card with the board's title and menu", () => {
    const html = renderToString(
      <Board
        columns={columns}
        items={items}
        onItemsChange={() => {}}
        renderCard={(item, parts) => (
          <article className="mine">
            {parts.title}
            {parts.menu}
            <i>{item.id}</i>
          </article>
        )}
      />,
    );
    expect(html).toContain('class="mine"');
    expect(html).toContain('data-custom');
    expect(html).toContain(`aria-label="Actions for ${items[0]!.title}"`);
    expect(html).not.toContain('sprout-board-card-head');
  });
});
