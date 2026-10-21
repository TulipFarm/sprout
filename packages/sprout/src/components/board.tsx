'use client';

import {
  memo,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from 'react';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  pointerWithin,
  rectIntersection,
  useDroppable,
  useSensor,
  useSensors,
  type Announcements,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type DropAnimation,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  defaultAnimateLayoutChanges,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  type AnimateLayoutChanges,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { defaultRangeExtractor, useVirtualizer, type Range } from '@tanstack/react-virtual';
import { ChevronDown } from 'reicon-react/icons/ChevronDown';
import { ChevronRight } from 'reicon-react/icons/ChevronRight';
import { MoreH } from 'reicon-react/icons/MoreH';
import { Plus } from 'reicon-react/icons/Plus';
import { Reorder } from 'reicon-react/icons/Reorder';
import { cn } from '../internal/classes.js';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './alert-dialog.js';
import { Badge, type BadgeVariant } from './badge.js';
import { Button } from './button.js';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './dropdown-menu.js';
import { Input } from './input.js';
import { SearchField } from './search-field.js';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select.js';
import { Skeleton } from './skeleton.js';

/** `loading` shows skeleton cards, `error` a message with Try again, `unavailable` a message only. */
export type BoardColumnStatus = 'loading' | 'error' | 'unavailable';

export interface BoardColumn {
  id: string;
  title: string;
  /** Most cards the column should hold. Over it, the header says so in words. */
  limit?: number | undefined;
  /** All cards in the column, such as a count from the server. Defaults to the cards in `items`. */
  total?: number | undefined;
  /** Leave out when the cards are ready. The other columns are not affected. */
  status?: BoardColumnStatus | undefined;
  /** Message for the `error` or `unavailable` status. */
  error?: ReactNode;
  /** Draws the title inside a Badge of this variant. */
  tone?: BadgeVariant | undefined;
}

export interface BoardLane {
  id: string;
  title: string;
}

export interface BoardItem {
  id: string;
  columnId: string;
  /** Needed when the board has `lanes`. Cards in an unknown lane are not shown. */
  laneId?: string | undefined;
  title: string;
}

export interface BoardLaneBy {
  /** Text before the select. Defaults to "Lanes by". */
  label?: string | undefined;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}

export interface BoardNewItem {
  title: string;
  columnId: string;
  laneId: string | undefined;
}

export interface BoardColumnText {
  /** Shown in a ready column with no cards. Defaults to "No cards". */
  empty?: ReactNode;
  /** Visible text of the Show all button. Defaults to "Show all N". Its accessible name still ends with the column title. */
  showAll?: ((total: number, column: BoardColumn) => ReactNode) | undefined;
}

export interface BoardCardParts {
  /** The title, or the rename field while the card is renamed. */
  title: ReactNode;
  /** The actions menu button. Null when the card has no menu. */
  menu: ReactNode;
}

export interface BoardProps<T extends BoardItem> {
  columns: BoardColumn[];
  /** Cards in each cell show in the order they have here. */
  items: T[];
  /** Swimlanes across every column. Leave out for a plain board. */
  lanes?: BoardLane[] | undefined;
  /** Gets the whole new list after a move, rename, or column delete. Without it cards do not drag or rename. */
  onItemsChange?: ((items: T[]) => void) | undefined;
  /** Gets the new columns after a reorder, rename, or delete. Without it columns are fixed. */
  onColumnsChange?: ((columns: BoardColumn[]) => void) | undefined;
  /** Shows "Add card" in every cell. The app makes the card and its id. */
  onItemAdd?: ((item: BoardNewItem) => void) | undefined;
  /** Shows "Add column" after the last column. */
  onColumnAdd?: ((title: string) => void) | undefined;
  /** Shows "Try again" on a column with `status: 'error'`. Load that column again here. */
  onColumnRetry?: ((column: BoardColumn) => void) | undefined;
  /** Shows "Show all N" at the foot of a column whose `total` is more than its cards in `items`. */
  onColumnShowAll?: ((column: BoardColumn) => void) | undefined;
  /** Replaces the column texts, such as "No rows" or "Show all 40 in table". */
  columnText?: BoardColumnText | undefined;
  /** Click or Enter on a card. Open your own Sheet or Dialog here. */
  onItemOpen?: ((item: T) => void) | undefined;
  /** Card body under the title: badges, people, dates. */
  renderBody?: ((item: T) => ReactNode) | undefined;
  /** Title content, such as an icon or key before the text. Screen readers still use `item.title`. */
  renderTitle?: ((item: T) => ReactNode) | undefined;
  /**
   * The whole inside of a card, with no default frame. Place `parts.title` and
   * `parts.menu` so rename and actions keep working. The board still owns
   * drag, focus, keys, click, and selection.
   */
  renderCard?: ((item: T, parts: BoardCardParts) => ReactNode) | undefined;
  /** `DropdownMenuItem`s for the card's actions menu. */
  itemActions?: ((item: T) => ReactNode) | undefined;
  /** Adds a search field that filters cards by title. */
  searchable?: boolean | undefined;
  /** Extra text search matches, such as a description or assignee. */
  searchText?: ((item: T) => string) | undefined;
  /** Adds a "Lanes by" select. The app regroups `lanes` and `laneId`. */
  laneBy?: BoardLaneBy | undefined;
  /** Accessible name of the board. Defaults to "Board". */
  label?: string | undefined;
  className?: string | undefined;
}

type Cell = { laneId: string; columnId: string };
type DragData = { type: 'card'; id: string } | { type: 'column'; id: string } | { type: 'cell'; cell: Cell };

const CARD = 'card:';
const COLUMN = 'column:';
const cellKey = (laneId: string, columnId: string) => `${laneId}\u0000${columnId}`;
const dataOf = (value: unknown) => value as DragData | undefined;

const dndAccessibility = {
  container: typeof document === 'undefined' ? undefined : document.body,
};

const keyboardCodes = {
  start: ['Space'],
  cancel: ['Escape'],
  end: ['Space'],
};

// dnd-kit only animates neighbors while the moved card is still in their list,
// so cards in a cell the dragged card just left would jump without this.
const animateLayoutChanges: AnimateLayoutChanges = args => defaultAnimateLayoutChanges({ ...args, wasDragging: true });

const dropAnimation: DropAnimation = {
  duration: 160,
  easing: 'cubic-bezier(0.2, 0, 0, 1)',
};
const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Touch goes to TouchSensor, which waits for a press so a swipe still scrolls.
class NoTouchPointerSensor extends PointerSensor {
  static override activators = [
    {
      eventName: 'onPointerDown' as const,
      handler: ({ nativeEvent }: { nativeEvent: PointerEvent }) =>
        nativeEvent.pointerType !== 'touch' && nativeEvent.isPrimary && nativeEvent.button === 0,
    },
  ];
}

const sameList = <T,>(a: T[] | undefined, b: T[]) =>
  a !== undefined && a.length === b.length && a.every((x, i) => x === b[i]);

const collide: CollisionDetection = args => {
  const type = dataOf(args.active.data.current)?.type;
  const droppableContainers = args.droppableContainers.filter(container =>
    type === 'column'
      ? dataOf(container.data.current)?.type === 'column'
      : dataOf(container.data.current)?.type !== 'column',
  );
  const scoped = { ...args, droppableContainers };
  if (type === 'column') return closestCenter(scoped);
  const pointer = pointerWithin(scoped);
  const hits = pointer.length ? pointer : rectIntersection(scoped);
  const card = hits.find(hit => dataOf(droppableContainers.find(c => c.id === hit.id)?.data.current)?.type === 'card');
  return card ? [card] : hits.slice(0, 1);
};

/** Moves `ids` into `to`, before `beforeId`, or to the end of that cell. */
function place<T extends BoardItem>(
  list: T[],
  ids: string[],
  to: Cell,
  beforeId: string | null,
  laneOf: (item: T) => string,
  withLanes: boolean,
): T[] {
  const moving = new Set(ids);
  const moved = ids.flatMap(id => {
    const item = list.find(i => i.id === id);
    if (!item) return [];
    return [
      {
        ...item,
        columnId: to.columnId,
        ...(withLanes ? { laneId: to.laneId } : {}),
      },
    ];
  });
  const rest = list.filter(item => !moving.has(item.id));
  let at = beforeId === null ? -1 : rest.findIndex(i => i.id === beforeId);
  if (at === -1) {
    at = rest.length;
    for (let i = rest.length - 1; i >= 0; i--) {
      const item = rest[i]!;
      if (item.columnId === to.columnId && laneOf(item) === to.laneId) {
        at = i + 1;
        break;
      }
    }
  }
  rest.splice(at, 0, ...moved);
  return rest;
}

/**
 * A Kanban board. Columns run across, optional lanes run down, and cards sit
 * in the cell where they meet. Cards drag to any cell, columns drag by their
 * header, and titles rename in place. Lanes and the cards in each cell are
 * virtualized, so thousands of cards stay fast.
 */
export function Board<T extends BoardItem>({
  columns,
  items,
  lanes,
  onItemsChange,
  onColumnsChange,
  onItemAdd,
  onColumnAdd,
  onColumnRetry,
  onColumnShowAll,
  columnText,
  onItemOpen,
  renderBody,
  renderTitle,
  renderCard,
  itemActions,
  searchable,
  searchText,
  laneBy,
  label = 'Board',
  className,
}: BoardProps<T>) {
  const dndId = useId();
  const withLanes = lanes !== undefined;
  const laneList = useMemo<BoardLane[]>(() => lanes ?? [{ id: '', title: label }], [lanes, label]);
  const laneOf = (item: T) => (withLanes ? (item.laneId ?? '') : '');

  const [draft, setDraft] = useState<T[] | null>(null);
  const draftRef = useRef<T[] | null>(null);
  const setDraftBoth = (next: T[] | null) => {
    draftRef.current = next;
    setDraft(next);
  };
  const shown = draft ?? items;

  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [anchor, setAnchor] = useState<string | null>(null);
  const [collapsedColumns, setCollapsedColumns] = useState<Set<string>>(() => new Set());
  const [collapsedLanes, setCollapsedLanes] = useState<Set<string>>(() => new Set());
  const [active, setActive] = useState<DragData | null>(null);
  const [extras, setExtras] = useState<string[]>([]);
  const [laneLock, setLaneLock] = useState<Map<string, number> | null>(null);
  const movedRef = useRef(false);

  const needle = query.trim().toLowerCase();
  const matches = (item: T) =>
    !needle ||
    item.title.toLowerCase().includes(needle) ||
    (searchText?.(item).toLowerCase().includes(needle) ?? false);

  // Unchanged cells keep their array, so memoized cells skip re-rendering mid-drag.
  const cellsRef = useRef(new Map<string, T[]>());
  const cells = useMemo(() => {
    const map = new Map<string, T[]>();
    for (const item of shown) {
      if (!matches(item)) continue;
      const key = cellKey(laneOf(item), item.columnId);
      const list = map.get(key);
      if (list) list.push(item);
      else map.set(key, [item]);
    }
    for (const [key, list] of map) {
      const before = cellsRef.current.get(key);
      if (sameList(before, list)) map.set(key, before!);
    }
    cellsRef.current = map;
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shown, needle, searchText, withLanes]);

  const columnTotals = useMemo(() => {
    const totals = new Map<string, number>();
    for (const item of shown) totals.set(item.columnId, (totals.get(item.columnId) ?? 0) + 1);
    return totals;
  }, [shown]);

  const laneTotals = (laneId: string) =>
    columns.reduce((sum, column) => sum + (cells.get(cellKey(laneId, column.id))?.length ?? 0), 0);
  const visibleCount = [...cells.values()].reduce((s, l) => s + l.length, 0);

  const findItem = (id: string) => (draftRef.current ?? items).find(item => item.id === id);
  const cellOf = (item: T): Cell => ({
    laneId: laneOf(item),
    columnId: item.columnId,
  });
  const cellName = (cell: Cell) => {
    const column = columns.find(c => c.id === cell.columnId)?.title ?? '';
    const lane = laneList.find(l => l.id === cell.laneId)?.title;
    return withLanes && lane ? `${column}, ${lane}` : column;
  };

  const sensors = useSensors(
    useSensor(NoTouchPointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
      keyboardCodes,
    }),
  );

  const onDragStart = ({ active: a }: DragStartEvent) => {
    const data = dataOf(a.data.current);
    if (!data) return;
    setActive(data);
    if (data.type !== 'card') return;
    // Lanes may grow but not shrink mid-drag, so the lane under the pointer
    // does not move away when a card leaves it.
    setLaneLock(new Map(laneVirtualizer.getVirtualItems().map(row => [laneList[row.index]?.id ?? '', row.size])));
    const others = selected.has(data.id)
      ? shown.filter(item => selected.has(item.id) && item.id !== data.id).map(item => item.id)
      : [];
    if (!selected.has(data.id)) setSelected(new Set());
    setExtras(others);
    const hidden = new Set(others);
    setDraftBoth(items.filter(item => !hidden.has(item.id)));
  };

  const onDragOver = ({ active: a, over }: DragOverEvent) => {
    const data = dataOf(a.data.current);
    const target = dataOf(over?.data.current);
    if (data?.type !== 'card' || !over || !target || movedRef.current) return;
    const list = draftRef.current;
    const item = findItem(data.id);
    if (!list || !item) return;
    let to: Cell;
    let beforeId: string | null = null;
    if (target.type === 'card') {
      if (target.id === data.id) return;
      const overItem = findItem(target.id);
      if (!overItem) return;
      to = cellOf(overItem);
      const siblings = cells.get(cellKey(to.laneId, to.columnId)) ?? [];
      const translated = a.rect.current.translated;
      const below = translated !== null && translated.top > over.rect.top + over.rect.height / 2;
      const index = siblings.findIndex(s => s.id === target.id);
      beforeId = below ? (siblings[index + 1]?.id ?? null) : target.id;
    } else if (target.type === 'cell') {
      to = target.cell;
    } else return;
    const from = cellOf(item);
    if (from.laneId === to.laneId && from.columnId === to.columnId) return;
    movedRef.current = true;
    requestAnimationFrame(() => {
      movedRef.current = false;
    });
    setDraftBoth(place(list, [data.id], to, beforeId, laneOf, withLanes));
  };

  const finish = () => {
    setDraftBoth(null);
    setLaneLock(null);
    setActive(null);
    setExtras([]);
  };

  const onDragEnd = ({ active: a, over }: DragEndEvent) => {
    const data = dataOf(a.data.current);
    const target = dataOf(over?.data.current);
    if (data?.type === 'column') {
      if (target?.type === 'column' && target.id !== data.id && onColumnsChange) {
        const ids = columns.map(c => c.id);
        onColumnsChange(arrayMove(columns, ids.indexOf(data.id), ids.indexOf(target.id)));
      }
      return finish();
    }
    let list = draftRef.current;
    const item = data?.type === 'card' ? findItem(data.id) : undefined;
    if (!list || !item || data?.type !== 'card') return finish();
    const cell = cellOf(item);
    const siblings = cells.get(cellKey(cell.laneId, cell.columnId)) ?? [];
    if (target?.type === 'card' && target.id !== data.id) {
      const ids = siblings.map(s => s.id);
      const from = ids.indexOf(data.id);
      const to = ids.indexOf(target.id);
      if (from !== -1 && to !== -1) {
        const order = arrayMove(ids, from, to);
        list = place(list, [data.id], cell, order[to + 1] ?? null, laneOf, withLanes);
      }
    }
    if (extras.length) {
      list = [...list, ...items.filter(i => extras.includes(i.id))];
      const after = list.indexOf(list.find(i => i.id === data.id)!) + 1;
      list = place(list, extras, cell, list[after]?.id ?? null, laneOf, withLanes);
      const next = list[list.findIndex(i => i.id === extras.at(-1)) + 1];
      if (next && cellKey(laneOf(next), next.columnId) !== cellKey(cell.laneId, cell.columnId))
        list = place(list, extras, cell, null, laneOf, withLanes);
    }
    const changed = list.some((i, index) => i !== items[index]) || list.length !== items.length;
    finish();
    if (changed) onItemsChange?.(list);
  };

  const announcements: Announcements = {
    onDragStart: ({ active: a }) => {
      const data = dataOf(a.data.current);
      if (data?.type === 'column') return `Picked up column ${columns.find(c => c.id === data.id)?.title}.`;
      const item = data?.type === 'card' ? findItem(data.id) : undefined;
      return item ? `Picked up card ${item.title}.` : undefined;
    },
    onDragOver: ({ active: a, over }) => {
      const data = dataOf(a.data.current);
      if (!over) return undefined;
      if (data?.type === 'column') {
        const target = dataOf(over.data.current);
        return target?.type === 'column' ? `Over column ${columns.find(c => c.id === target.id)?.title}.` : undefined;
      }
      const item = data?.type === 'card' ? findItem(data.id) : undefined;
      return item ? `Card ${item.title} is in ${cellName(cellOf(item))}.` : undefined;
    },
    onDragEnd: ({ active: a }) => {
      const data = dataOf(a.data.current);
      if (data?.type === 'column') return 'Column dropped.';
      const item = data?.type === 'card' ? findItem(data.id) : undefined;
      return item ? `Card ${item.title} dropped in ${cellName(cellOf(item))}.` : undefined;
    },
    onDragCancel: () => 'Move cancelled. The card went back.',
  };

  const select = (item: T, event: MouseEvent) => {
    const next = new Set(selected);
    if (event.shiftKey && anchor) {
      const flat = laneList.flatMap(lane => columns.flatMap(c => cells.get(cellKey(lane.id, c.id)) ?? []));
      const from = flat.findIndex(i => i.id === anchor);
      const to = flat.findIndex(i => i.id === item.id);
      if (from !== -1 && to !== -1)
        for (const i of flat.slice(Math.min(from, to), Math.max(from, to) + 1)) next.add(i.id);
    } else if (next.has(item.id)) next.delete(item.id);
    else next.add(item.id);
    setSelected(next);
    setAnchor(item.id);
  };

  const rename = (item: T, title: string) => onItemsChange?.(items.map(i => (i.id === item.id ? { ...i, title } : i)));
  const renameColumn = (column: BoardColumn, title: string) =>
    onColumnsChange?.(columns.map(c => (c.id === column.id ? { ...c, title } : c)));
  const deleteColumn = (column: BoardColumn) => {
    onColumnsChange?.(columns.filter(c => c.id !== column.id));
    if (items.some(i => i.columnId === column.id)) onItemsChange?.(items.filter(i => i.columnId !== column.id));
  };
  const latest = useRef({ select, rename });
  useLayoutEffect(() => {
    latest.current = { select, rename };
  });
  const onSelect = useCallback((item: T, event: MouseEvent) => latest.current.select(item, event), []);
  const onRename = useCallback((item: T, title: string) => latest.current.rename(item, title), []);
  const toggle = (set: Set<string>, id: string) => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  };

  const viewportRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [bodyTop, setBodyTop] = useState(0);
  useLayoutEffect(() => {
    setBodyTop(bodyRef.current?.offsetTop ?? 0);
  });
  // Writes data attributes directly so scrolling never re-renders the board.
  useEffect(() => {
    const viewport = viewportRef.current;
    const frame = viewport?.parentElement;
    if (!viewport || !frame) return;
    const update = () => {
      const { scrollLeft, scrollWidth, clientWidth } = viewport;
      frame.toggleAttribute('data-more-start', scrollLeft > 1);
      frame.toggleAttribute('data-more-end', scrollLeft + clientWidth < scrollWidth - 1);
    };
    update();
    viewport.addEventListener('scroll', update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(viewport);
    if (viewport.firstElementChild) observer.observe(viewport.firstElementChild);
    return () => {
      viewport.removeEventListener('scroll', update);
      observer.disconnect();
    };
  }, []);
  const activeLane =
    active?.type === 'card'
      ? laneList.findIndex(l => {
          const item = findItem(active.id);
          return item ? l.id === laneOf(item) : false;
        })
      : -1;
  const laneVirtualizer = useVirtualizer({
    count: withLanes ? laneList.length : 0,
    getScrollElement: () => viewportRef.current,
    estimateSize: () => 140,
    overscan: 2,
    scrollMargin: bodyTop,
    initialRect: { width: 0, height: 720 },
    getItemKey: index => laneList[index]?.id ?? index,
    rangeExtractor: (range: Range) => {
      const indexes = defaultRangeExtractor(range);
      return activeLane !== -1 && !indexes.includes(activeLane)
        ? [...indexes, activeLane].sort((a, b) => a - b)
        : indexes;
    },
  });

  // Lanes sit in normal flow after one spacer, so a lane that grows pushes the
  // ones below it in the same frame. The dragged card's lane, kept rendered
  // outside the range, is placed on its own.
  const laneRows = laneVirtualizer.getVirtualItems().map((row, i, rows) => ({
    ...row,
    pinned:
      rows.length > 1 &&
      row.index === activeLane &&
      rows[i - 1]?.index !== row.index - 1 &&
      rows[i + 1]?.index !== row.index + 1,
  }));
  const firstFlow = laneRows.find(row => !row.pinned);

  const onBoardKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && selected.size && !active) setSelected(new Set());
  };

  const activeItem = active?.type === 'card' ? findItem(active.id) : undefined;
  const activeColumn = active?.type === 'column' ? columns.find(c => c.id === active.id) : undefined;

  const columnTemplate = columns
    .map(c => (collapsedColumns.has(c.id) ? 'var(--sprout-board-collapsed-width)' : 'var(--sprout-board-column-width)'))
    .join(' ');
  const gridStyle = {
    gridTemplateColumns: `${columnTemplate}${onColumnAdd ? ' var(--sprout-board-column-width)' : ''}`,
  };

  const loadedIn = (column: BoardColumn) => columnTotals.get(column.id) ?? 0;
  const showAllCount = (column: BoardColumn) =>
    onColumnShowAll &&
    !column.status &&
    !collapsedColumns.has(column.id) &&
    column.total !== undefined &&
    column.total > loadedIn(column)
      ? column.total
      : undefined;
  // With lanes, a column's message and "Show all" show once, under its header
  // and at the board foot, instead of in every lane.
  const laneNotices = withLanes && columns.some(c => c.status === 'error' || c.status === 'unavailable');
  const laneFoot = withLanes && columns.some(c => showAllCount(c) !== undefined);

  const renderRow = (lane: BoardLane) => (
    <div className="sprout-board-row" style={gridStyle}>
      {columns.map(column => (
        <BoardCell
          key={column.id}
          laneId={lane.id}
          column={column}
          name={cellName({ laneId: lane.id, columnId: column.id })}
          items={cells.get(cellKey(lane.id, column.id)) ?? []}
          collapsed={collapsedColumns.has(column.id)}
          fill={!withLanes}
          empty={
            !column.status && !column.total && loadedIn(column) === 0 ? (columnText?.empty ?? 'No cards') : undefined
          }
          showAll={withLanes ? undefined : showAllCount(column)}
          onShowAll={!withLanes && showAllCount(column) !== undefined ? onColumnShowAll : undefined}
          showAllText={columnText?.showAll}
          onRetry={!withLanes && column.status === 'error' ? onColumnRetry : undefined}
          activeId={active?.type === 'card' ? active.id : null}
          movable={!!onItemsChange && !needle}
          selected={selected}
          onSelect={onItemsChange ? onSelect : undefined}
          onRename={onItemsChange ? onRename : undefined}
          onItemAdd={onItemAdd}
          onItemOpen={onItemOpen}
          look={look}
        />
      ))}
    </div>
  );

  const look = useMemo<CardLook<T>>(
    () => ({ renderBody, renderTitle, renderCard, itemActions }),
    [renderBody, renderTitle, renderCard, itemActions],
  );

  const toolbar = searchable || laneBy || selected.size > 0;
  return (
    <div data-slot="board" className={cn('sprout-board', className)} onKeyDown={onBoardKeyDown}>
      {toolbar && (
        <div className="sprout-board-toolbar" data-slot="board-toolbar">
          {searchable && (
            <SearchField label="Search cards" value={query} onChange={setQuery} className="sprout-board-search" />
          )}
          {laneBy && (
            <span className="sprout-board-lane-by">
              <span>{laneBy.label ?? 'Lanes by'}</span>
              <Select
                value={laneBy.value}
                onValueChange={value => {
                  if (typeof value === 'string') laneBy.onChange(value);
                }}
              >
                <SelectTrigger size="sm" aria-label={laneBy.label ?? 'Lanes by'}>
                  <SelectValue>{laneBy.options.find(o => o.value === laneBy.value)?.label}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {laneBy.options.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </span>
          )}
          <span className="sprout-board-status" role="status">
            {selected.size > 0 ? (
              <>
                {selected.size} selected
                <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
                  Clear
                </Button>
              </>
            ) : needle ? (
              visibleCount ? (
                `${visibleCount.toLocaleString('en-US')} of ${items.length.toLocaleString('en-US')} cards`
              ) : (
                `No cards match “${query.trim()}”`
              )
            ) : (
              `${items.length.toLocaleString('en-US')} cards`
            )}
          </span>
        </div>
      )}
      <DndContext
        id={dndId}
        sensors={sensors}
        accessibility={{ ...dndAccessibility, announcements }}
        collisionDetection={collide}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
        onDragCancel={finish}
      >
        <div className="sprout-board-frame">
          <div
            ref={viewportRef}
            role="region"
            aria-label={label}
            className="sprout-board-viewport"
            data-lanes={withLanes || undefined}
          >
            <div className="sprout-board-canvas">
              <div className="sprout-board-header" style={gridStyle}>
                <SortableContext items={columns.map(c => COLUMN + c.id)} strategy={horizontalListSortingStrategy}>
                  {columns.map(column => (
                    <BoardColumnHeader
                      key={column.id}
                      column={column}
                      loaded={loadedIn(column)}
                      collapsed={collapsedColumns.has(column.id)}
                      onCollapse={() => setCollapsedColumns(s => toggle(s, column.id))}
                      onRename={onColumnsChange ? renameColumn : undefined}
                      onDelete={onColumnsChange ? deleteColumn : undefined}
                    />
                  ))}
                </SortableContext>
                {onColumnAdd && <AddColumn onAdd={onColumnAdd} />}
                {laneNotices &&
                  columns.map(column => (
                    <div key={`notice:${column.id}`} className="sprout-board-column-notice">
                      {!collapsedColumns.has(column.id) && <ColumnNotice column={column} onRetry={onColumnRetry} />}
                    </div>
                  ))}
              </div>
              {withLanes ? (
                <div ref={bodyRef} className="sprout-board-lanes" style={{ height: laneVirtualizer.getTotalSize() }}>
                  {laneRows.map(row => {
                    const lane = laneList[row.index];
                    if (!lane) return null;
                    const collapsed = collapsedLanes.has(lane.id);
                    const count = laneTotals(lane.id);
                    return (
                      <section
                        key={row.key}
                        ref={laneVirtualizer.measureElement}
                        data-index={row.index}
                        aria-label={`${lane.title}, ${count} cards`}
                        className="sprout-board-lane"
                        data-collapsed={collapsed || undefined}
                        data-pinned={row.pinned || undefined}
                        style={{
                          ...(row.pinned
                            ? { top: row.start - bodyTop }
                            : row === firstFlow
                              ? { marginTop: row.start - bodyTop }
                              : {}),
                          minHeight: laneLock?.get(lane.id),
                        }}
                      >
                        <div className="sprout-board-lane-bar">
                          <button
                            type="button"
                            className="sprout-board-lane-toggle"
                            aria-expanded={!collapsed}
                            onClick={() => setCollapsedLanes(s => toggle(s, lane.id))}
                          >
                            {collapsed ? <ChevronRight aria-hidden="true" /> : <ChevronDown aria-hidden="true" />}
                            <span className="sprout-board-lane-title">{lane.title}</span>
                            <span className="sprout-board-count">{count}</span>
                          </button>
                        </div>
                        {!collapsed && renderRow(lane)}
                      </section>
                    );
                  })}
                </div>
              ) : (
                <div ref={bodyRef} className="sprout-board-single">
                  {laneList[0] && renderRow(laneList[0])}
                </div>
              )}
              {laneFoot && onColumnShowAll && (
                <div className="sprout-board-foot" style={gridStyle}>
                  {columns.map(column => {
                    const count = showAllCount(column);
                    return (
                      <div key={column.id}>
                        {count !== undefined && (
                          <ShowAll
                            column={column}
                            count={count}
                            onShowAll={onColumnShowAll}
                            text={columnText?.showAll}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
        <DragOverlay dropAnimation={reducedMotion() ? null : dropAnimation}>
          {activeItem ? (
            <div className="sprout-board-overlay">
              <CardFace item={activeItem} look={look} />
              {extras.length > 0 && (
                <Badge variant="default" className="sprout-board-overlay-count">
                  {extras.length + 1} cards
                </Badge>
              )}
            </div>
          ) : activeColumn ? (
            <div className="sprout-board-column-header sprout-board-overlay">
              <span className="sprout-board-column-title" data-tone={activeColumn.tone ? '' : undefined}>
                <ColumnTitle column={activeColumn} />
              </span>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

interface CardLook<T extends BoardItem> {
  renderBody: ((item: T) => ReactNode) | undefined;
  renderTitle: ((item: T) => ReactNode) | undefined;
  renderCard: ((item: T, parts: BoardCardParts) => ReactNode) | undefined;
  itemActions: ((item: T) => ReactNode) | undefined;
}

const cardTitle = <T extends BoardItem>(item: T, look: CardLook<T>) => (
  <span className="sprout-board-card-title">{look.renderTitle ? look.renderTitle(item) : item.title}</span>
);

function cardInside<T extends BoardItem>(item: T, look: CardLook<T>, parts: BoardCardParts, bodyId?: string) {
  if (look.renderCard) return look.renderCard(item, parts);
  const body = look.renderBody?.(item);
  return (
    <>
      <div className="sprout-board-card-head">
        {parts.title}
        {parts.menu}
      </div>
      {body != null && (
        <div id={bodyId} className="sprout-board-card-body">
          {body}
        </div>
      )}
    </>
  );
}

function CardFace<T extends BoardItem>({ item, look }: { item: T; look: CardLook<T> }) {
  return (
    <div className="sprout-board-card" data-overlay="" data-custom={look.renderCard ? '' : undefined}>
      {cardInside(item, look, { title: cardTitle(item, look), menu: null })}
    </div>
  );
}

interface BoardCellProps<T extends BoardItem> {
  laneId: string;
  column: BoardColumn;
  name: string;
  items: T[];
  collapsed: boolean;
  fill: boolean;
  /** Hint for a ready column with no cards. Undefined otherwise. */
  empty: ReactNode;
  showAll: number | undefined;
  onShowAll: ((column: BoardColumn) => void) | undefined;
  showAllText: BoardColumnText['showAll'];
  onRetry: ((column: BoardColumn) => void) | undefined;
  activeId: string | null;
  movable: boolean;
  selected: Set<string>;
  onSelect: ((item: T, event: MouseEvent) => void) | undefined;
  onRename: ((item: T, title: string) => void) | undefined;
  onItemAdd: ((item: BoardNewItem) => void) | undefined;
  onItemOpen: ((item: T) => void) | undefined;
  look: CardLook<T>;
}

const BoardCell = memo(function BoardCell<T extends BoardItem>({
  laneId,
  column,
  name,
  items,
  collapsed,
  fill,
  empty,
  showAll,
  onShowAll,
  showAllText,
  onRetry,
  activeId,
  movable,
  selected,
  onSelect,
  onRename,
  onItemAdd,
  onItemOpen,
  look,
}: BoardCellProps<T>) {
  const columnId = column.id;
  const status = column.status;
  const cell = useMemo(() => ({ laneId, columnId }), [laneId, columnId]);
  const drop = useDroppable({
    id: `cell:${cellKey(cell.laneId, cell.columnId)}`,
    data: { type: 'cell', cell } satisfies DragData,
    disabled: status !== undefined,
  });
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeIndex = activeId ? items.findIndex(i => i.id === activeId) : -1;
  const virtualizer = useVirtualizer({
    count: collapsed ? 0 : items.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 60,
    gap: 4,
    overscan: 6,
    initialRect: { width: 0, height: 480 },
    getItemKey: index => items[index]?.id ?? index,
    rangeExtractor: (range: Range) => {
      const indexes = defaultRangeExtractor(range);
      return activeIndex !== -1 && !indexes.includes(activeIndex)
        ? [...indexes, activeIndex].sort((a, b) => a - b)
        : indexes;
    },
  });
  const [adding, setAdding] = useState(false);

  if (collapsed)
    return (
      <div
        ref={drop.setNodeRef}
        className="sprout-board-cell"
        data-collapsed=""
        data-over={drop.isOver || undefined}
        aria-label={`${name}, ${items.length} cards, collapsed`}
        role="group"
      >
        <span className="sprout-board-count">{items.length || ''}</span>
      </div>
    );

  return (
    <div
      ref={drop.setNodeRef}
      className="sprout-board-cell"
      data-fill={fill || undefined}
      data-over={drop.isOver || undefined}
      data-status={status}
    >
      {fill && <ColumnNotice column={column} onRetry={onRetry} />}
      <div ref={scrollRef} className="sprout-board-cell-scroll">
        <SortableContext items={items.map(i => CARD + i.id)} strategy={verticalListSortingStrategy}>
          <div
            role="list"
            aria-label={`${name}, ${items.length} cards`}
            aria-busy={status === 'loading' || undefined}
            className="sprout-board-cards"
            style={{ height: virtualizer.getTotalSize() }}
          >
            {virtualizer.getVirtualItems().map(row => {
              const item = items[row.index];
              if (!item) return null;
              return (
                <div
                  key={row.key}
                  ref={virtualizer.measureElement}
                  data-index={row.index}
                  role="listitem"
                  className="sprout-board-card-slot"
                  style={{ top: row.start }}
                >
                  <BoardCard
                    item={item}
                    movable={movable}
                    selected={selected.has(item.id)}
                    onSelect={onSelect}
                    onRename={onRename}
                    onOpen={onItemOpen}
                    look={look}
                  />
                </div>
              );
            })}
          </div>
        </SortableContext>
        {status === 'loading' && items.length === 0 && (
          <div className="sprout-board-skeletons" aria-hidden="true">
            {Array.from({ length: fill ? 3 : 2 }, (_, index) => (
              <div key={index} className="sprout-board-skeleton-card">
                <Skeleton />
                <Skeleton />
              </div>
            ))}
          </div>
        )}
        {empty !== undefined && items.length === 0 && <p className="sprout-board-empty">{empty}</p>}
      </div>
      {showAll !== undefined && onShowAll && (
        <ShowAll column={column} count={showAll} onShowAll={onShowAll} text={showAllText} />
      )}
      {onItemAdd &&
        !status &&
        (adding ? (
          <InlineText
            label={`New card in ${name}`}
            placeholder="Card title"
            initial=""
            keepOpen
            onCommit={title =>
              onItemAdd({
                title,
                columnId: cell.columnId,
                laneId: fill ? undefined : cell.laneId,
              })
            }
            onClose={() => setAdding(false)}
          />
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="sprout-board-add"
            onClick={() => setAdding(true)}
            aria-label={`Add card to ${name}`}
          >
            <Plus aria-hidden="true" data-icon="inline-start" />
            Add card
          </Button>
        ))}
    </div>
  );
}) as <T extends BoardItem>(props: BoardCellProps<T>) => ReactNode;

interface BoardCardProps<T extends BoardItem> {
  item: T;
  movable: boolean;
  selected: boolean;
  onSelect: ((item: T, event: MouseEvent) => void) | undefined;
  onRename: ((item: T, title: string) => void) | undefined;
  onOpen: ((item: T) => void) | undefined;
  look: CardLook<T>;
}

const BoardCard = memo(function BoardCard<T extends BoardItem>({
  item,
  movable,
  selected,
  onSelect,
  onRename,
  onOpen,
  look,
}: BoardCardProps<T>) {
  const [editing, setEditing] = useState(false);
  const sortable = useSortable({
    id: CARD + item.id,
    data: { type: 'card', id: item.id } satisfies DragData,
    disabled: !movable || editing,
    animateLayoutChanges,
  });
  const bodyId = useId();
  const actions = look.itemActions?.(item);
  const describe = !look.renderCard && !!look.renderBody;

  const onClick = (event: MouseEvent) => {
    if (onSelect && (event.metaKey || event.ctrlKey || event.shiftKey)) {
      event.preventDefault();
      onSelect(item, event);
      return;
    }
    onOpen?.(item);
  };
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.target !== event.currentTarget) return;
    if (event.key === 'Enter' && onOpen) {
      event.preventDefault();
      onOpen(item);
    } else if (event.key === 'F2' && onRename) {
      event.preventDefault();
      setEditing(true);
    }
  };

  return (
    <div
      ref={sortable.setNodeRef}
      {...sortable.attributes}
      {...sortable.listeners}
      aria-disabled={undefined}
      role="group"
      aria-roledescription={movable ? 'draggable card' : 'card'}
      aria-label={item.title}
      aria-describedby={describe ? bodyId : undefined}
      tabIndex={0}
      className="sprout-board-card"
      data-selected={selected || undefined}
      data-dragging={sortable.isDragging || undefined}
      data-openable={onOpen ? '' : undefined}
      data-custom={look.renderCard ? '' : undefined}
      style={{
        transform: CSS.Translate.toString(sortable.transform),
        transition: sortable.transition,
      }}
      onClick={editing ? undefined : onClick}
      onDoubleClick={onRename && !onOpen && !editing ? () => setEditing(true) : undefined}
      onKeyDown={event => {
        onKeyDown(event);
        // Space in the menu button or title must not pick the card up.
        if (event.target === event.currentTarget && !event.defaultPrevented) sortable.listeners?.onKeyDown?.(event);
      }}
    >
      {cardInside(
        item,
        look,
        {
          title:
            editing && onRename ? (
              <InlineText
                label="Card title"
                initial={item.title}
                onCommit={title => onRename(item, title)}
                onClose={() => setEditing(false)}
              />
            ) : (
              cardTitle(item, look)
            ),
          menu:
            (actions != null || onRename) && !editing ? (
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      className="sprout-board-card-menu"
                      aria-label={`Actions for ${item.title}`}
                      onClick={event => event.stopPropagation()}
                      onPointerDown={event => event.stopPropagation()}
                    />
                  }
                >
                  <MoreH aria-hidden="true" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {onRename && <DropdownMenuItem onClick={() => setEditing(true)}>Rename</DropdownMenuItem>}
                  {onRename && actions != null && <DropdownMenuSeparator />}
                  {actions}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null,
        },
        bodyId,
      )}
    </div>
  );
}) as <T extends BoardItem>(props: BoardCardProps<T>) => ReactNode;

interface BoardColumnHeaderProps {
  column: BoardColumn;
  /** Cards of this column in `items`. */
  loaded: number;
  collapsed: boolean;
  onCollapse: () => void;
  onRename: ((column: BoardColumn, title: string) => void) | undefined;
  onDelete: ((column: BoardColumn) => void) | undefined;
}

const statusWords: Record<BoardColumnStatus, string> = {
  loading: 'loading',
  error: 'couldn’t load',
  unavailable: 'unavailable',
};

function BoardColumnHeader({ column, loaded, collapsed, onCollapse, onRename, onDelete }: BoardColumnHeaderProps) {
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const sortable = useSortable({
    id: COLUMN + column.id,
    data: { type: 'column', id: column.id } satisfies DragData,
    disabled: !onRename || editing,
  });
  const total = column.total ?? loaded;
  // Without a `total`, the loaded count means nothing until the column is ready.
  const counted = column.total !== undefined || !column.status;
  const over = counted && column.limit !== undefined && total > column.limit;
  const count =
    column.limit !== undefined ? `${formatCount(total)} / ${formatCount(column.limit)}` : formatCount(total);
  const label = [
    column.title,
    counted && `${formatCount(total)} cards`,
    counted && total > loaded && !column.status && `${loaded} shown`,
    column.status && statusWords[column.status],
    over && 'over limit',
  ]
    .filter(Boolean)
    .join(', ');
  const toggleButton = (
    <button
      type="button"
      className="sprout-board-column-toggle"
      aria-expanded={!collapsed}
      aria-label={`${collapsed ? 'Expand' : 'Collapse'} ${column.title}`}
      onClick={onCollapse}
    >
      {collapsed ? <ChevronRight aria-hidden="true" /> : <ChevronDown aria-hidden="true" />}
    </button>
  );

  return (
    <div
      ref={sortable.setNodeRef}
      {...sortable.listeners}
      role="group"
      aria-label={label}
      aria-busy={column.status === 'loading' || undefined}
      className="sprout-board-column-header"
      data-collapsed={collapsed || undefined}
      data-over-limit={over || undefined}
      data-dragging={sortable.isDragging || undefined}
      style={{
        transform: CSS.Translate.toString(sortable.transform),
        transition: sortable.transition,
      }}
    >
      {collapsed && toggleButton}
      {editing && onRename ? (
        <InlineText
          label="Column title"
          initial={column.title}
          onCommit={title => onRename(column, title)}
          onClose={() => setEditing(false)}
        />
      ) : onRename && !collapsed ? (
        <button
          type="button"
          className="sprout-board-column-title"
          data-editable=""
          onClick={() => setEditing(true)}
          aria-label={`Rename ${column.title}`}
          data-tone={column.tone ? '' : undefined}
        >
          <ColumnTitle column={column} />
        </button>
      ) : (
        <span className="sprout-board-column-title" data-tone={column.tone && !collapsed ? '' : undefined}>
          {collapsed ? column.title : <ColumnTitle column={column} />}
        </span>
      )}
      {!editing && counted && (
        <span className="sprout-board-count" aria-hidden="true">
          {count}
        </span>
      )}
      <span role="status" className="sprout-board-sr-only">
        {column.status === 'loading' ? `Loading cards in ${column.title}…` : ''}
      </span>
      {over && !collapsed && !editing && (
        <Badge variant="warning" className="sprout-board-limit">
          Over limit
        </Badge>
      )}
      {!collapsed && !editing && (
        <span className="sprout-board-column-tools">
          {toggleButton}
          {onRename && (
            <>
              <button
                type="button"
                ref={sortable.setActivatorNodeRef}
                {...sortable.attributes}
                className="sprout-board-grip"
                aria-label={`Move ${column.title}`}
              >
                <Reorder aria-hidden="true" />
              </button>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      aria-label={`${column.title} column actions`}
                      onPointerDown={event => event.stopPropagation()}
                    />
                  }
                >
                  <MoreH aria-hidden="true" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setEditing(true)}>Rename</DropdownMenuItem>
                  <DropdownMenuItem onClick={onCollapse}>Collapse</DropdownMenuItem>
                  {onDelete && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem variant="destructive" onClick={() => setConfirming(true)}>
                        Delete column…
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </span>
      )}
      {onDelete && (
        <AlertDialog open={confirming} onOpenChange={setConfirming}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete “{column.title}”?</AlertDialogTitle>
              <AlertDialogDescription>
                {total
                  ? `Its ${total} ${total === 1 ? 'card is' : 'cards are'} deleted too. This can’t be undone.`
                  : 'The column is empty. This can’t be undone.'}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep column</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                onClick={() => {
                  setConfirming(false);
                  onDelete(column);
                }}
              >
                Delete column
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}

const formatCount = (count: number) => count.toLocaleString('en-US');

function ColumnTitle({ column }: { column: BoardColumn }) {
  if (!column.tone) return column.title;
  return (
    <Badge variant={column.tone} className="sprout-board-column-badge">
      <span>{column.title}</span>
    </Badge>
  );
}

/** The error or unavailable message of a column. Nothing for other states. */
function ColumnNotice({
  column,
  onRetry,
}: {
  column: BoardColumn;
  onRetry: ((column: BoardColumn) => void) | undefined;
}) {
  if (column.status === 'error')
    return (
      <div className="sprout-board-notice" data-kind="error">
        <p role="alert">{column.error ?? 'Couldn’t load this column.'}</p>
        {onRetry && (
          <Button
            variant="outline"
            size="sm"
            aria-label={`Try again to load ${column.title}`}
            onClick={() => onRetry(column)}
          >
            Try again
          </Button>
        )}
      </div>
    );
  if (column.status === 'unavailable')
    return (
      <p className="sprout-board-notice" data-kind="unavailable">
        {column.error ?? 'Cards are unavailable.'}
      </p>
    );
  return null;
}

function ShowAll({
  column,
  count,
  onShowAll,
  text,
}: {
  column: BoardColumn;
  count: number;
  onShowAll: (column: BoardColumn) => void;
  text: BoardColumnText['showAll'];
}) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className="sprout-board-show-all"
      aria-label={text ? undefined : `Show all ${formatCount(count)} in ${column.title}`}
      onClick={() => onShowAll(column)}
    >
      {text ? (
        <>
          {text(count, column)}
          <span className="sprout-board-sr-only">, {column.title}</span>
        </>
      ) : (
        `Show all ${formatCount(count)}`
      )}
    </Button>
  );
}

function AddColumn({ onAdd }: { onAdd: (title: string) => void }) {
  const [adding, setAdding] = useState(false);
  return (
    <div className="sprout-board-add-column">
      {adding ? (
        <InlineText
          label="New column"
          placeholder="Column title"
          initial=""
          onCommit={onAdd}
          onClose={() => setAdding(false)}
        />
      ) : (
        <Button variant="ghost" size="sm" onClick={() => setAdding(true)}>
          <Plus aria-hidden="true" data-icon="inline-start" />
          Add column
        </Button>
      )}
    </div>
  );
}

/** Enter saves, Escape cancels, blur saves. With `keepOpen` it clears after each save. */
function InlineText({
  label,
  placeholder,
  initial,
  keepOpen,
  onCommit,
  onClose,
}: {
  label: string;
  placeholder?: string;
  initial: string;
  keepOpen?: boolean;
  onCommit: (value: string) => void;
  onClose: () => void;
}) {
  const [value, setValue] = useState(initial);
  const ref = useRef<HTMLInputElement>(null);
  const done = useRef(false);
  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);
  const commit = (close: boolean) => {
    const text = value.trim();
    if (text && text !== initial) onCommit(text);
    if (close || !keepOpen) {
      done.current = true;
      onClose();
    } else setValue('');
  };
  return (
    <Input
      ref={ref}
      aria-label={label}
      placeholder={placeholder}
      value={value}
      className="sprout-board-inline-input"
      onChange={event => setValue(event.currentTarget.value)}
      onPointerDown={event => event.stopPropagation()}
      onClick={event => event.stopPropagation()}
      onKeyDown={event => {
        event.stopPropagation();
        if (event.key === 'Enter') {
          event.preventDefault();
          commit(false);
        } else if (event.key === 'Escape') {
          event.preventDefault();
          done.current = true;
          onClose();
        }
      }}
      onBlur={() => {
        if (!done.current) commit(true);
      }}
    />
  );
}
