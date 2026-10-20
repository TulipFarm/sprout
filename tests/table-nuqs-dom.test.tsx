// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { withNuqsTestingAdapter } from '../packages/sprout/node_modules/nuqs/dist/adapters/testing.js';
import { useTableUrlState } from '../packages/sprout/src/components/table-nuqs.js';
import type { TableState } from '../packages/sprout/src/components/table.js';

const base: TableState = {
  sorting: [],
  columnFilters: [],
  globalFilter: '',
  grouping: [],
  expanded: true,
  pagination: { pageIndex: 0, pageSize: 10 },
  columnSizing: {},
  columnOrder: [],
  columnPinning: {},
  columnVisibility: {},
};

describe('useTableUrlState', () => {
  it('reads the View state from the URL', () => {
    const { result } = renderHook(() => useTableUrlState({ prefix: 't_' }), {
      wrapper: withNuqsTestingAdapter({
        searchParams:
          '?t_sort=name.asc,size.desc,&t_filters=[{"id":"status","value":["open"]}]&t_q=al&t_group=status&t_page=3&t_size=25',
      }),
    });
    expect(result.current.state).toEqual({
      sorting: [
        { id: 'name', desc: false },
        { id: 'size', desc: true },
      ],
      columnFilters: [{ id: 'status', value: ['open'] }],
      globalFilter: 'al',
      grouping: ['status'],
      pagination: { pageIndex: 2, pageSize: 25 },
    });
  });

  it('ignores bad filters and writes changes back', async () => {
    const onUrlUpdate = vi.fn();
    const { result } = renderHook(() => useTableUrlState(), {
      wrapper: withNuqsTestingAdapter({
        searchParams: '?filters=[{"nope":1}]',
        onUrlUpdate,
        rateLimitFactor: 0,
      }),
    });
    expect(result.current.state.columnFilters).toEqual([]);
    expect(result.current.state.pagination).toEqual({
      pageIndex: 0,
      pageSize: 10,
    });

    await act(async () =>
      result.current.onStateChange({
        ...base,
        sorting: [{ id: 'name', desc: true }],
        columnFilters: [{ id: 'size', value: [1, 2] }],
        globalFilter: 'x',
        grouping: ['status'],
        pagination: { pageIndex: 1, pageSize: 20 },
      }),
    );
    await vi.waitFor(() => expect(onUrlUpdate).toHaveBeenCalled());
    const search = onUrlUpdate.mock.lastCall![0].searchParams as URLSearchParams;
    expect(search.get('sort')).toBe('name.desc');
    expect(search.get('q')).toBe('x');
    expect(search.get('group')).toBe('status');
    expect(search.get('page')).toBe('2');
    expect(search.get('size')).toBe('20');

    await act(async () => result.current.onStateChange(base));
    await vi.waitFor(() => expect(onUrlUpdate).toHaveBeenCalledTimes(2));
    expect(onUrlUpdate.mock.lastCall![0].queryString).toBe('');
  });
});
