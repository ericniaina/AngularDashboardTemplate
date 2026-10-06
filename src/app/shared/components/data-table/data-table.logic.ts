// The table's data pipeline as pure functions: filter → sort → paginate. Unit-tested; the
// component only wires these to signals.
import type { CellValue, DataTableColumn, SortState } from './data-table.model';

/** Case- and accent-insensitive, so "asie" matches "Asie" and "etats" matches "États". */
export function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase()
    .trim();
}

export function displayText<T>(column: DataTableColumn<T>, row: T): string {
  if (column.display) return column.display(row);
  const value = column.value(row);
  return value === null || value === undefined ? '' : String(value);
}

export interface FilterState<T> {
  /** Global search across every column's displayed text. */
  search: string;
  /** Column id → text (text filter) or option value (select filter); '' = no filter. */
  columnFilters: Record<string, string>;
  /** Extra predicate (the "advanced filter"); `null` = none. */
  external: ((row: T) => boolean) | null;
}

export function filterRows<T>(
  rows: readonly T[],
  columns: readonly DataTableColumn<T>[],
  state: FilterState<T>,
): T[] {
  const search = normalizeText(state.search);
  const active = columns
    .map((column) => ({ column, needle: state.columnFilters[column.id] ?? '' }))
    .filter(({ column, needle }) => needle !== '' && column.filter !== false);

  return rows.filter((row) => {
    if (state.external && !state.external(row)) return false;
    if (search && !columns.some((c) => normalizeText(displayText(c, row)).includes(search))) {
      return false;
    }
    return active.every(({ column, needle }) =>
      column.filter && column.filter.type === 'select'
        ? String(column.value(row) ?? '') === needle
        : normalizeText(displayText(column, row)).includes(normalizeText(needle)),
    );
  });
}

/** Nulls last; numbers numerically; strings with the locale's collation (numeric-aware). */
export function compareValues(a: CellValue, b: CellValue, collator: Intl.Collator): number {
  const aEmpty = a === null || a === undefined || a === '';
  const bEmpty = b === null || b === undefined || b === '';
  if (aEmpty || bEmpty) return aEmpty === bEmpty ? 0 : aEmpty ? 1 : -1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  if (typeof a === 'boolean' && typeof b === 'boolean') return Number(b) - Number(a);
  return collator.compare(String(a), String(b));
}

/** Stable sort on the column's raw value; empty values stay last in both directions. */
export function sortRows<T>(
  rows: readonly T[],
  columns: readonly DataTableColumn<T>[],
  sort: SortState | null,
  collator: Intl.Collator,
): T[] {
  const column = sort && columns.find((c) => c.id === sort.columnId);
  if (!sort || !column) return [...rows];
  const factor = sort.direction === 'asc' ? 1 : -1;
  return rows
    .map((row, index) => ({ row, index, value: column.value(row) }))
    .sort((x, y) => {
      const xEmpty = x.value === null || x.value === undefined || x.value === '';
      const yEmpty = y.value === null || y.value === undefined || y.value === '';
      if (xEmpty !== yEmpty) return xEmpty ? 1 : -1;
      return compareValues(x.value, y.value, collator) * factor || x.index - y.index;
    })
    .map(({ row }) => row);
}

/** Header click cycle: none → ascending → descending → none. */
export function nextSort(current: SortState | null, columnId: string): SortState | null {
  if (!current || current.columnId !== columnId) return { columnId, direction: 'asc' };
  return current.direction === 'asc' ? { columnId, direction: 'desc' } : null;
}

export interface Page<T> {
  rows: T[];
  /** Clamped to the last page. */
  pageIndex: number;
  pageCount: number;
  /** 1-based, for "1–10 of 15"; 0 when empty. */
  from: number;
  to: number;
  total: number;
}

export function paginate<T>(rows: readonly T[], pageIndex: number, pageSize: number): Page<T> {
  const total = rows.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const index = Math.min(Math.max(0, pageIndex), pageCount - 1);
  const start = index * pageSize;
  const pageRows = rows.slice(start, start + pageSize);
  return {
    rows: pageRows,
    pageIndex: index,
    pageCount,
    from: total === 0 ? 0 : start + 1,
    to: start + pageRows.length,
    total,
  };
}
