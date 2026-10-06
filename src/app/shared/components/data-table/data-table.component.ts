import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { AG_GRID_LOCALE_EN, AG_GRID_LOCALE_FR } from '@ag-grid-community/locale';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideSearch } from '@ng-icons/lucide';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { AgGridAngular } from 'ag-grid-angular';
import {
  type CellEditRequestEvent,
  CellStyleModule,
  ClientSideRowModelModule,
  type ColDef,
  ColumnAutoSizeModule,
  DateFilterModule,
  EventApiModule,
  ExternalFilterModule,
  type GetRowIdFunc,
  type GridApi,
  type GridOptions,
  type GridReadyEvent,
  type IRowNode,
  LocaleModule,
  ModuleRegistry,
  NumberEditorModule,
  NumberFilterModule,
  PaginationModule,
  PinnedRowModule,
  QuickFilterModule,
  RenderApiModule,
  RowApiModule,
  RowSelectionModule,
  RowStyleModule,
  ScrollApiModule,
  SelectEditorModule,
  TextEditorModule,
  TextFilterModule,
  ValidationModule,
} from 'ag-grid-community';
import { LocaleService } from '../../../core/locale';
import { TranslocoPipe } from '../../../core/i18n';
import { RecreateOnDirective } from '../../directives/recreate-on.directive';
import { dataTableTheme } from './data-table.theme';

// Community modules only. Anything Enterprise (row grouping, Excel export…) needs a license.
ModuleRegistry.registerModules([
  CellStyleModule,
  ClientSideRowModelModule,
  ColumnAutoSizeModule,
  DateFilterModule,
  EventApiModule,
  ExternalFilterModule,
  LocaleModule,
  NumberEditorModule,
  NumberFilterModule,
  PaginationModule,
  PinnedRowModule,
  QuickFilterModule,
  RenderApiModule,
  RowApiModule,
  RowSelectionModule,
  RowStyleModule,
  ScrollApiModule,
  SelectEditorModule,
  TextEditorModule,
  TextFilterModule,
  ...(ngDevMode ? [ValidationModule] : []),
]);

const LOCALE_TEXT: Record<string, Record<string, string>> = {
  en: AG_GRID_LOCALE_EN,
  fr: AG_GRID_LOCALE_FR,
};

/**
 * The house grid: AG Grid Community with floating column filters, sorting, a global quick filter,
 * pagination and an optional external filter, themed from the app's CSS variables.
 */
@Component({
  selector: 'app-data-table',
  imports: [AgGridAngular, HlmInputImports, NgIcon, RecreateOnDirective, TranslocoPipe],
  providers: [provideIcons({ lucideSearch })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './data-table.component.html',
  host: { class: 'flex flex-col gap-4' },
})
export class DataTableComponent<T> {
  private readonly locale = inject(LocaleService).locale;

  readonly rowData = input.required<T[] | null>();
  readonly columnDefs = input.required<ColDef<T>[]>();
  readonly getRowId = input.required<GetRowIdFunc<T>>();
  /** Extra filtering on top of the column filters and quick filter (AG Grid external filter). */
  readonly externalFilter = input<((row: T) => boolean) | null>(null);
  readonly loading = input(false);
  readonly quickFilter = input(true);
  readonly pagination = input(true);
  readonly pageSize = input(10);
  /** Fixed height (CSS length); omitted = the grid grows with its rows. */
  readonly height = input<string | null>(null);
  readonly pinnedBottomRowData = input<T[] | undefined>(undefined);
  /** Static options applied when the grid is created (e.g. `readOnlyEdit`, `rowSelection`). */
  readonly options = input<GridOptions<T>>({});

  readonly gridReady = output<GridApi<T>>();
  readonly rowDoubleClicked = output<T>();
  readonly cellEditRequest = output<CellEditRequestEvent<T>>();
  readonly selectionChanged = output<T[]>();

  protected readonly theme = dataTableTheme;
  protected readonly search = signal('');
  protected readonly localeKey = computed(() => this.locale());
  protected readonly localeText = computed(() => LOCALE_TEXT[this.locale()] ?? AG_GRID_LOCALE_EN);
  private readonly api = signal<GridApi<T> | null>(null);

  protected readonly defaultColDef: ColDef<T> = {
    sortable: true,
    filter: true,
    floatingFilter: true,
    resizable: true,
    flex: 1,
    minWidth: 110,
  };

  protected readonly isExternalFilterPresent = () => this.externalFilter() !== null;
  protected readonly doesExternalFilterPass = (node: IRowNode<T>) =>
    node.data ? (this.externalFilter()?.(node.data) ?? true) : true;

  constructor() {
    // The external filter is a function the grid can't observe: tell it to re-run.
    effect(() => {
      this.externalFilter();
      this.api()?.onFilterChanged();
    });
  }

  protected onGridReady(event: GridReadyEvent<T>): void {
    this.api.set(event.api);
    this.gridReady.emit(event.api);
  }

  /** The grid is re-created on locale change; drop the stale API until the new one is ready. */
  protected onGridDestroyed(): void {
    this.api.set(null);
  }

  protected onSelectionChanged(): void {
    this.selectionChanged.emit(this.api()?.getSelectedRows() ?? []);
  }
}
