"use client";

import {
  createParser,
  parseAsArrayOf,
  parseAsInteger,
  parseAsJson,
  parseAsString,
  useQueryStates,
} from "nuqs";
import type { ColumnFiltersState, SortingState } from "@tanstack/react-table";
import type { TableState } from "./table.js";

const parseAsSorting = createParser<SortingState>({
  parse: (value) =>
    value
      .split(",")
      .filter(Boolean)
      .map((part) => {
        const [id = "", dir] = part.split(".");
        return { id, desc: dir === "desc" };
      }),
  serialize: (sorting) =>
    sorting.map((s) => `${s.id}.${s.desc ? "desc" : "asc"}`).join(","),
});

const isFilters = (value: unknown): ColumnFiltersState | null =>
  Array.isArray(value) &&
  value.every(
    (f) => typeof f === "object" && f !== null && typeof f.id === "string",
  )
    ? (value as ColumnFiltersState)
    : null;

export interface TableUrlStateOptions {
  /** Prefixes every query key, for pages with more than one Table. */
  prefix?: string;
  /** Page size used when the URL has none. */
  pageSize?: number;
}

/**
 * Keeps a Table's View state (sort, filters, search, grouping, page) in the
 * URL with nuqs, so a shared link opens the same view. Spread the result into
 * `<Table {...useTableUrlState()} />`. Needs a nuqs adapter higher in the tree.
 */
export function useTableUrlState({
  prefix = "",
  pageSize = 10,
}: TableUrlStateOptions = {}) {
  const [query, setQuery] = useQueryStates(
    {
      sort: parseAsSorting.withDefault([]),
      filters: parseAsJson(isFilters).withDefault([]),
      q: parseAsString.withDefault(""),
      group: parseAsArrayOf(parseAsString).withDefault([]),
      page: parseAsInteger.withDefault(1),
      size: parseAsInteger.withDefault(pageSize),
    },
    {
      urlKeys: {
        sort: `${prefix}sort`,
        filters: `${prefix}filters`,
        q: `${prefix}q`,
        group: `${prefix}group`,
        page: `${prefix}page`,
        size: `${prefix}size`,
      },
    },
  );

  const state: Partial<TableState> = {
    sorting: query.sort,
    columnFilters: query.filters,
    globalFilter: query.q,
    grouping: query.group,
    pagination: {
      pageIndex: Math.max(0, query.page - 1),
      pageSize: query.size,
    },
  };

  const onStateChange = (next: TableState) =>
    void setQuery({
      sort: next.sorting.length ? next.sorting : null,
      filters: next.columnFilters.length ? next.columnFilters : null,
      q: next.globalFilter || null,
      group: next.grouping.length ? next.grouping : null,
      page: next.pagination.pageIndex ? next.pagination.pageIndex + 1 : null,
      size:
        next.pagination.pageSize === pageSize ? null : next.pagination.pageSize,
    });

  return { state, onStateChange };
}
