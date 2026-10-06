/** A raw cell value: what sorting compares (ISO date strings and numbers sort correctly as-is). */
export type CellValue = string | number | boolean | null | undefined;

export interface SelectFilterOption {
  /** Compared with `String(column.value(row))`. */
  value: string;
  /** Already translated. */
  label: string;
}

export type ColumnFilter = { type: 'text' } | { type: 'select'; options: SelectFilterOption[] };

/**
 * A column of `<app-data-table>`. Features describe columns with this library-neutral shape;
 * only the shared table knows how they are rendered.
 */
export interface DataTableColumn<T> {
  /** Unique within the table; also the key of an `appCell` template and of `footer`. */
  id: string;
  /** Already translated. */
  header: string;
  /** Raw value, used for sorting and select filters. */
  value: (row: T) => CellValue;
  /**
   * The text users see (translated / localized). Text filters and the global search match this,
   * so users filter on what they read. Defaults to `String(value)`.
   */
  display?: (row: T) => string;
  /** Default `true`. */
  sortable?: boolean;
  /** Default `{ type: 'text' }`; `false` = no filter cell. */
  filter?: ColumnFilter | false;
  /** Numbers and amounts align to the end. */
  align?: 'start' | 'end';
  /** Extra Tailwind classes for the column's cells (e.g. a width: `w-24`). */
  cellClass?: string;
}

export interface SortState {
  columnId: string;
  direction: 'asc' | 'desc';
}

export interface RowAction<T> {
  id: string;
  /** Already translated. */
  label: string;
  icon: 'lucidePencil' | 'lucideTrash2' | 'lucideEye' | 'lucideCopy';
  destructive?: boolean;
  run: (row: T) => void;
}
