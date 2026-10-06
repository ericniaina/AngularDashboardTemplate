import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideCopy,
  lucidePlus,
  lucideSave,
  lucideTrash2,
  lucideTriangleAlert,
  lucideUndo2,
} from '@ng-icons/lucide';
import { toast } from '@spartan-ng/brain/sonner';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmSpinnerImports } from '@spartan-ng/helm/spinner';
import type {
  CellClassParams,
  CellEditRequestEvent,
  ColDef,
  GridApi,
  GridOptions,
} from 'ag-grid-community';
import { interpolate, translateGroup, TranslocoPipe } from '../../core/i18n';
import { LocaleService } from '../../core/locale';
import { ConfirmDialogService } from '../../shared/components/confirm-dialog';
import { DataTableComponent } from '../../shared/components/data-table/data-table.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import {
  type EditableField,
  lineAmount,
  type OrderLineRow,
  TOTALS_ROW_ID,
} from './order-line.model';
import { OrderLinesStore } from './order-lines.store';
import type { HasUnsavedChanges } from './unsaved-changes.guard';

const CURRENCY = 'EUR';

@Component({
  selector: 'app-order-lines-page',
  imports: [
    DataTableComponent,
    HlmButtonImports,
    HlmSpinnerImports,
    NgIcon,
    PageHeaderComponent,
    TranslocoPipe,
  ],
  providers: [
    OrderLinesStore,
    provideIcons({
      lucideCopy,
      lucidePlus,
      lucideSave,
      lucideTrash2,
      lucideTriangleAlert,
      lucideUndo2,
    }),
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './order-lines-page.component.html',
  host: { '(window:beforeunload)': 'onBeforeUnload($event)' },
})
export class OrderLinesPageComponent implements HasUnsavedChanges {
  protected readonly store = inject(OrderLinesStore);
  private readonly locale = inject(LocaleService).locale;
  private readonly confirm = inject(ConfirmDialogService);

  private readonly columnText = translateGroup<
    'product' | 'quantity' | 'unitPrice' | 'amount' | 'total'
  >('orders.columns');
  private readonly text = translateGroup<
    'saved' | 'saveFailed' | 'leaveTitle' | 'leaveMessage' | 'leave' | 'stay' | 'invalidLines'
  >('orders.messages');

  private api: GridApi<OrderLineRow> | null = null;
  protected readonly selectedIds = signal<string[]>([]);

  protected readonly rows = computed<OrderLineRow[]>(() =>
    this.store.lines().map((line) => ({ ...line, amount: lineAmount(line) })),
  );
  protected readonly pinnedTotals = computed<OrderLineRow[]>(() => {
    const totals = this.store.totals();
    return [
      {
        id: TOTALS_ROW_ID,
        productId: null,
        quantity: totals.quantity,
        unitPrice: null,
        amount: totals.amount,
        isTotal: true,
      },
    ];
  });
  protected readonly invalidMessage = computed(() =>
    interpolate(this.text().invalidLines, { count: this.store.invalidCount() }),
  );

  protected readonly gridOptions: GridOptions<OrderLineRow> = {
    readOnlyEdit: true,
    rowSelection: { mode: 'multiRow', checkboxes: (p) => !p.node.rowPinned, headerCheckbox: true },
    singleClickEdit: true,
    stopEditingWhenCellsLoseFocus: true,
  };

  protected readonly columnDefs = computed<ColDef<OrderLineRow>[]>(() => {
    const text = this.columnText();
    const locale = this.locale();
    const products = this.store.products();
    const productName = (id: string | null) => products.find((p) => p.id === id)?.name ?? '';
    const currency = new Intl.NumberFormat(locale, { style: 'currency', currency: CURRENCY });
    const number = new Intl.NumberFormat(locale);
    const money = (value: unknown) => (typeof value === 'number' ? currency.format(value) : '');
    const errors = this.store.errorsById();
    const invalid = (field: EditableField) => (p: CellClassParams<OrderLineRow>) =>
      !!p.data && !p.data.isTotal && (errors.get(p.data.id)?.has(field) ?? false);
    const editable = (p: { node: { rowPinned?: unknown } }) => !p.node.rowPinned;

    return [
      {
        field: 'productId',
        headerName: text.product,
        minWidth: 200,
        editable,
        cellEditor: 'agSelectCellEditor',
        cellEditorParams: { values: products.map((p) => p.id) },
        valueFormatter: (p) =>
          p.data?.isTotal ? text.total : productName(p.value as string | null),
        filterValueGetter: (p) => productName(p.data?.productId ?? null),
        getQuickFilterText: (p) => productName(p.value as string | null),
        cellClassRules: { 'cell-invalid': invalid('productId') },
      },
      {
        field: 'quantity',
        headerName: text.quantity,
        maxWidth: 160,
        type: 'rightAligned',
        editable,
        cellDataType: 'number',
        cellEditor: 'agNumberCellEditor',
        cellEditorParams: { min: 1, precision: 0 },
        valueFormatter: (p) => (typeof p.value === 'number' ? number.format(p.value) : ''),
        cellClassRules: { 'cell-invalid': invalid('quantity') },
      },
      {
        field: 'unitPrice',
        headerName: text.unitPrice,
        maxWidth: 180,
        type: 'rightAligned',
        editable,
        cellDataType: 'number',
        cellEditor: 'agNumberCellEditor',
        cellEditorParams: { min: 0, precision: 2 },
        valueFormatter: (p) => money(p.value),
        cellClassRules: { 'cell-invalid': invalid('unitPrice') },
      },
      {
        field: 'amount',
        headerName: text.amount,
        maxWidth: 200,
        type: 'rightAligned',
        cellDataType: 'number',
        valueFormatter: (p) => money(p.value),
      },
    ];
  });

  protected readonly getRowId = (p: { data: OrderLineRow }) => p.data.id;

  constructor() {
    void this.store.load().catch(() => undefined);
  }

  protected onGridReady(api: GridApi<OrderLineRow>): void {
    this.api = api;
  }

  protected onCellEditRequest(event: CellEditRequestEvent<OrderLineRow>): void {
    const field = event.colDef.field as EditableField;
    if (event.data) this.store.edit(event.data.id, field, event.newValue);
  }

  protected onSelectionChanged(rows: OrderLineRow[]): void {
    this.selectedIds.set(rows.filter((row) => !row.isTotal).map((row) => row.id));
  }

  protected addLine(): void {
    const id = this.store.addLine();
    // Wait for the grid to render the new row, then open its product cell.
    setTimeout(() => {
      const node = this.api?.getRowNode(id);
      if (!this.api || node?.rowIndex == null) return;
      this.api.ensureIndexVisible(node.rowIndex);
      this.api.startEditingCell({ rowIndex: node.rowIndex, colKey: 'productId' });
    });
  }

  protected duplicate(): void {
    this.store.duplicate(this.selectedIds());
  }

  protected remove(): void {
    this.store.remove(this.selectedIds());
    this.selectedIds.set([]);
  }

  protected discard(): void {
    this.store.discard();
  }

  protected async save(): Promise<void> {
    try {
      await this.store.save();
      toast.success(this.text().saved);
    } catch (error) {
      if (!(error instanceof HttpErrorResponse && (error.status === 401 || error.status === 403))) {
        toast.error(this.text().saveFailed);
      }
    }
  }

  canDeactivate(): boolean | Promise<boolean> {
    if (!this.store.dirty()) return true;
    const text = this.text();
    return this.confirm.ask({
      title: text.leaveTitle,
      message: text.leaveMessage,
      confirmLabel: text.leave,
      cancelLabel: text.stay,
      destructive: true,
    });
  }

  protected onBeforeUnload(event: BeforeUnloadEvent): void {
    if (this.store.dirty()) event.preventDefault();
  }
}
