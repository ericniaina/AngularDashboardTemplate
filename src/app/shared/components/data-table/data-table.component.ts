import { CdkTableModule } from '@angular/cdk/table';
import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChildren,
  inject,
  input,
  linkedSignal,
  model,
  output,
  signal,
  type TemplateRef,
} from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideArrowDown,
  lucideArrowUp,
  lucideChevronLeft,
  lucideChevronRight,
  lucideChevronsLeft,
  lucideChevronsRight,
  lucideChevronsUpDown,
  lucideCopy,
  lucideEllipsis,
  lucideEye,
  lucideInbox,
  lucidePencil,
  lucideSearch,
  lucideSearchX,
  lucideTrash2,
} from '@ng-icons/lucide';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCheckboxImports } from '@spartan-ng/helm/checkbox';
import { HlmDropdownMenuImports } from '@spartan-ng/helm/dropdown-menu';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmSelectImports } from '@spartan-ng/helm/select';
import { HlmSkeletonImports } from '@spartan-ng/helm/skeleton';
import { HlmTableImports } from '@spartan-ng/helm/table';
import { translateGroup, TranslocoPipe } from '../../../core/i18n';
import { LocaleService } from '../../../core/locale';
import { type DataTableCellContext, DataTableCellDirective } from './data-table-cell.directive';
import { displayText, filterRows, nextSort, paginate, sortRows } from './data-table.logic';
import type { DataTableColumn, RowAction, SortState } from './data-table.model';

const SELECT_COLUMN = '__select';
const ACTIONS_COLUMN = '__actions';
const filterColumnId = (id: string) => `__filter_${id}`;
let nextId = 0;

/**
 * The house table: Angular CDK table + spartan table styling, with sortable headers, a filter row,
 * a global search, pagination, optional row selection, row actions, custom cells (`appCell`
 * templates), a footer row, and loading/empty states. Client-side data only.
 */
@Component({
  selector: 'app-data-table',
  imports: [
    CdkTableModule,
    HlmButtonImports,
    HlmCheckboxImports,
    HlmDropdownMenuImports,
    HlmInputImports,
    HlmSelectImports,
    HlmSkeletonImports,
    HlmTableImports,
    NgIcon,
    NgTemplateOutlet,
    TranslocoPipe,
  ],
  providers: [
    provideIcons({
      lucideArrowDown,
      lucideArrowUp,
      lucideChevronLeft,
      lucideChevronRight,
      lucideChevronsLeft,
      lucideChevronsRight,
      lucideChevronsUpDown,
      lucideCopy,
      lucideEllipsis,
      lucideEye,
      lucideInbox,
      lucidePencil,
      lucideSearch,
      lucideSearchX,
      lucideTrash2,
    }),
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './data-table.component.html',
  host: { class: 'flex flex-col gap-4' },
})
export class DataTableComponent<T> {
  private readonly locale = inject(LocaleService).locale;

  /** `null` = not loaded yet (skeleton rows while `loading`). */
  readonly rows = input.required<readonly T[] | null>();
  readonly columns = input.required<DataTableColumn<T>[]>();
  readonly rowId = input.required<(row: T) => string>();
  /** Accessible name of the table (already translated). */
  readonly label = input.required<string>();
  /** Extra filtering on top of the column filters and the search (the "advanced filter"). */
  readonly externalFilter = input<((row: T) => boolean) | null>(null);
  readonly loading = input(false);
  /** Global search input above the table. */
  readonly search = input(true);
  /** Filter row under the headers. */
  readonly filters = input(true);
  readonly pagination = input(true);
  readonly pageSizes = input<number[]>([10, 20, 50]);
  /** Fixed height (CSS length) with a sticky header and footer; omitted = grows with its rows. */
  readonly height = input<string | null>(null);
  /** Row menu ("⋯") in a last column; `null`/empty = no menu. */
  readonly actions = input<RowAction<T>[] | null>(null);
  /** Checkbox selection; bind `[(selected)]` to get the selected row ids. */
  readonly selectable = input(false);
  readonly selected = model<readonly string[]>([]);
  /** Footer row: column id → text (e.g. totals). */
  readonly footer = input<Record<string, string> | null>(null);

  /** Double-click on a row (open/edit). Keyboard users get the same through the row menu. */
  readonly rowActivate = output<T>();

  private readonly cellTemplates = contentChildren(DataTableCellDirective);

  // State
  protected readonly searchText = signal('');
  protected readonly columnFilters = signal<Record<string, string>>({});
  protected readonly sort = signal<SortState | null>(null);
  protected readonly pageSize = linkedSignal(() => this.pageSizes()[0] ?? 10);
  /** Back to the first page whenever what's shown changes. */
  protected readonly pageIndex = linkedSignal({
    source: () => [
      this.searchText(),
      this.columnFilters(),
      this.externalFilter(),
      this.sort(),
      this.pageSize(),
    ],
    computation: () => 0,
  });

  // Pipeline: filter → sort → paginate
  private readonly collator = computed(
    () => new Intl.Collator(this.locale(), { numeric: true, sensitivity: 'base' }),
  );
  protected readonly filteredRows = computed(() =>
    filterRows(this.rows() ?? [], this.columns(), {
      search: this.searchText(),
      columnFilters: this.columnFilters(),
      external: this.externalFilter(),
    }),
  );
  private readonly sortedRows = computed(() =>
    sortRows(this.filteredRows(), this.columns(), this.sort(), this.collator()),
  );
  protected readonly page = computed(() =>
    this.pagination()
      ? paginate(this.sortedRows(), this.pageIndex(), this.pageSize())
      : paginate(this.sortedRows(), 0, Math.max(1, this.sortedRows().length)),
  );

  protected readonly isFiltered = computed(
    () =>
      this.searchText().trim() !== '' ||
      Object.values(this.columnFilters()).some((v) => v !== '') ||
      this.externalFilter() !== null,
  );
  protected readonly showSkeleton = computed(
    () => this.rows() === null || (this.loading() && !this.rows()?.length),
  );

  // Columns as the CDK table sees them
  protected readonly hasActions = computed(() => (this.actions()?.length ?? 0) > 0);
  protected readonly displayedColumns = computed(() => [
    ...(this.selectable() ? [SELECT_COLUMN] : []),
    ...this.columns().map((c) => c.id),
    ...(this.hasActions() ? [ACTIONS_COLUMN] : []),
  ]);
  protected readonly showFilterRow = computed(
    () => this.filters() && this.columns().some((c) => c.filter !== false),
  );
  protected readonly filterRowColumns = computed(() => this.displayedColumns().map(filterColumnId));
  protected readonly columnCount = computed(() => this.displayedColumns().length);

  protected readonly templates = computed(() => {
    const map = new Map<string, TemplateRef<DataTableCellContext<T>>>();
    for (const cell of this.cellTemplates()) {
      map.set(cell.columnId(), cell.template as TemplateRef<DataTableCellContext<T>>);
    }
    return map;
  });

  // Selection (by row id, so it survives new row arrays)
  private readonly selectedSet = computed(() => new Set(this.selected()));
  protected readonly allFilteredSelected = computed(() => {
    const rows = this.filteredRows();
    const ids = this.selectedSet();
    return rows.length > 0 && rows.every((row) => ids.has(this.rowId()(row)));
  });
  protected readonly someFilteredSelected = computed(
    () =>
      !this.allFilteredSelected() &&
      this.filteredRows().some((row) => this.selectedSet().has(this.rowId()(row))),
  );

  protected readonly uid = `data-table-${nextId++}`;
  protected readonly selectColumn = SELECT_COLUMN;
  protected readonly actionsColumn = ACTIONS_COLUMN;
  protected readonly filterColumnId = filterColumnId;
  protected readonly displayText = displayText;
  protected readonly trackBy = (_: number, row: T) => this.rowId()(row);

  protected isSelected(row: T): boolean {
    return this.selectedSet().has(this.rowId()(row));
  }

  protected toggleRow(row: T, checked: boolean): void {
    const id = this.rowId()(row);
    this.selected.update((ids) => (checked ? [...ids, id] : ids.filter((x) => x !== id)));
  }

  protected toggleAll(checked: boolean): void {
    const visible = this.filteredRows().map((row) => this.rowId()(row));
    this.selected.update((ids) =>
      checked ? [...new Set([...ids, ...visible])] : ids.filter((id) => !visible.includes(id)),
    );
  }

  protected toggleSort(column: DataTableColumn<T>): void {
    if (column.sortable === false) return;
    this.sort.update((current) => nextSort(current, column.id));
  }

  protected ariaSort(column: DataTableColumn<T>): 'ascending' | 'descending' | 'none' | null {
    if (column.sortable === false) return null;
    const sort = this.sort();
    if (sort?.columnId !== column.id) return 'none';
    return sort.direction === 'asc' ? 'ascending' : 'descending';
  }

  protected setColumnFilter(columnId: string, value: string): void {
    this.columnFilters.update((filters) => ({ ...filters, [columnId]: value }));
  }

  protected clearFilters(): void {
    this.searchText.set('');
    this.columnFilters.set({});
  }

  protected goTo(pageIndex: number): void {
    this.pageIndex.set(pageIndex);
  }

  protected setPageSize(size: number | null): void {
    if (size) this.pageSize.set(size);
  }

  protected readonly pageSizeLabel = (size: number) => String(size);

  private readonly text = translateGroup<'all'>('common.table');
  /** Select filters: option value → label ('' = "All"), one stable function per column. */
  protected readonly filterLabels = computed(() => {
    const all = this.text().all;
    const map = new Map<string, (value: string | null) => string>();
    for (const column of this.columns()) {
      if (column.filter && column.filter.type === 'select') {
        const labels = new Map(column.filter.options.map((o) => [o.value, o.label]));
        map.set(column.id, (value) => (value ? (labels.get(value) ?? value) : all));
      }
    }
    return map;
  });
}
