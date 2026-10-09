import { HttpErrorResponse } from '@angular/common/http';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  Injector,
  signal,
} from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideCopy,
  lucideDownload,
  lucidePlus,
  lucideSave,
  lucideTrash2,
  lucideTriangleAlert,
  lucideUndo2,
  lucideUpload,
} from '@ng-icons/lucide';
import { toast } from '@spartan-ng/brain/sonner';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmSelectImports } from '@spartan-ng/helm/select';
import { HlmSpinnerImports } from '@spartan-ng/helm/spinner';
import { interpolate, translateGroup, TranslocoPipe } from '../../core/i18n';
import { LocaleService } from '../../core/locale';
import { ConfirmDialogService } from '../../shared/components/confirm-dialog';
import { DataTableCellDirective } from '../../shared/components/data-table/data-table-cell.directive';
import { DataTableComponent } from '../../shared/components/data-table/data-table.component';
import type { DataTableColumn } from '../../shared/components/data-table/data-table.model';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { type EditableField, lineAmount, type OrderLine } from './order-line.model';
import { readOrderLinesCsv, SAMPLE_CSV } from './order-lines-csv';
import { OrderLinesStore } from './order-lines.store';
import type { HasUnsavedChanges } from './unsaved-changes.guard';

const CURRENCY = 'EUR';
/** CSV imports above this size are refused before being read. */
const MAX_IMPORT_BYTES = 1024 * 1024;

/**
 * Editable lines: the cells are form controls bound to the store. The table only renders
 * `store.lines()`; every edit goes to `store.edit()`, which produces a new array.
 */
@Component({
  selector: 'app-order-lines-page',
  imports: [
    DataTableCellDirective,
    DataTableComponent,
    HlmButtonImports,
    HlmInputImports,
    HlmSelectImports,
    HlmSpinnerImports,
    NgIcon,
    PageHeaderComponent,
    TranslocoPipe,
  ],
  providers: [
    OrderLinesStore,
    provideIcons({
      lucideCopy,
      lucideDownload,
      lucidePlus,
      lucideSave,
      lucideTrash2,
      lucideTriangleAlert,
      lucideUndo2,
      lucideUpload,
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
  private readonly injector = inject(Injector);

  protected readonly columnText = translateGroup<
    'product' | 'quantity' | 'unitPrice' | 'amount' | 'total'
  >('orders.columns');
  private readonly text = translateGroup<
    'saved' | 'saveFailed' | 'leaveTitle' | 'leaveMessage' | 'leave' | 'stay' | 'invalidLines'
  >('orders.messages');

  private readonly importText = translateGroup<
    | 'imported'
    | 'importedWithIssues'
    | 'importEmpty'
    | 'importMissingColumns'
    | 'importTooManyRows'
    | 'importTooLarge'
    | 'importFailed'
  >('orders.import');

  protected readonly selectedIds = signal<readonly string[]>([]);

  protected readonly productName = (id: string | null) =>
    this.store.products().find((p) => p.id === id)?.name ?? '';

  private readonly money = computed(() => {
    const format = new Intl.NumberFormat(this.locale(), { style: 'currency', currency: CURRENCY });
    return (value: number | null) => (value === null ? '' : format.format(value));
  });

  protected readonly columns = computed<DataTableColumn<OrderLine>[]>(() => {
    const text = this.columnText();
    const money = this.money();
    // Editing a row must not move it: no sorting or column filters on this table.
    const fixed = { sortable: false, filter: false } as const;
    return [
      {
        ...fixed,
        id: 'product',
        header: text.product,
        value: (l) => this.productName(l.productId),
        cellClass: 'min-w-56',
      },
      {
        ...fixed,
        id: 'quantity',
        header: text.quantity,
        value: (l) => l.quantity,
        align: 'end',
        cellClass: 'w-32',
      },
      {
        ...fixed,
        id: 'unitPrice',
        header: text.unitPrice,
        value: (l) => l.unitPrice,
        align: 'end',
        cellClass: 'w-40',
      },
      {
        ...fixed,
        id: 'amount',
        header: text.amount,
        value: (l) => lineAmount(l),
        display: (l) => money(lineAmount(l)),
        align: 'end',
        cellClass: 'w-40',
      },
    ];
  });

  protected readonly footer = computed(() => {
    const totals = this.store.totals();
    return {
      product: this.columnText().total,
      quantity: new Intl.NumberFormat(this.locale()).format(totals.quantity),
      amount: this.money()(totals.amount),
    };
  });

  protected readonly invalidMessage = computed(() =>
    interpolate(this.text().invalidLines, { count: this.store.invalidCount() }),
  );

  protected readonly rowId = (line: OrderLine) => line.id;

  constructor() {
    void this.store.load().catch(() => undefined);
  }

  protected hasError(line: OrderLine, field: EditableField): boolean {
    return this.store.errorsById().get(line.id)?.has(field) ?? false;
  }

  protected edit(line: OrderLine, field: EditableField, value: unknown): void {
    this.store.edit(line.id, field, value);
  }

  protected productControlId(line: OrderLine): string {
    return `order-line-product-${line.id}`;
  }

  protected addLine(): void {
    const id = this.store.addLine();
    // Once the new row is rendered, put the focus on its product picker.
    afterNextRender(
      () => {
        const trigger = document.getElementById(`order-line-product-${id}`);
        trigger?.scrollIntoView({ block: 'nearest' });
        trigger?.focus();
      },
      { injector: this.injector },
    );
  }

  /**
   * CSV import, entirely in the browser: the file is read and parsed here and each row becomes a
   * new line through the store, exactly like "Add line" with values. Nothing is sent to the server;
   * the lines join the unsaved changes and go out with the page's single "Save".
   */
  protected async importCsv(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = ''; // so choosing the same file again still triggers (change)
    if (!file) return;

    const text = this.importText();
    if (file.size > MAX_IMPORT_BYTES) {
      toast.error(text.importTooLarge);
      return;
    }
    let content: string;
    try {
      content = await file.text();
    } catch {
      toast.error(text.importFailed);
      return;
    }

    const result = readOrderLinesCsv(content, this.store.products());
    if (!result.ok) {
      if (result.error === 'empty') toast.error(text.importEmpty);
      else if (result.error === 'tooManyRows')
        toast.error(interpolate(text.importTooManyRows, { max: result.max }));
      else
        toast.error(interpolate(text.importMissingColumns, { columns: result.missing.join(', ') }));
      return;
    }

    const ids = this.store.addLines(result.lines);
    const errors = this.store.errorsById();
    const invalid = ids.filter((id) => (errors.get(id)?.size ?? 0) > 0).length;
    if (invalid > 0) {
      toast.warning(interpolate(text.importedWithIssues, { count: ids.length, invalid }));
    } else {
      toast.success(interpolate(text.imported, { count: ids.length }));
    }
    // Bring the first imported line into view.
    afterNextRender(
      () =>
        document
          .getElementById(`order-line-product-${ids[0]}`)
          ?.scrollIntoView({ block: 'nearest' }),
      { injector: this.injector },
    );
  }

  /** The expected format, generated in memory (no file on the server). */
  protected downloadSample(): void {
    const url = URL.createObjectURL(new Blob([SAMPLE_CSV], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'order-lines-sample.csv';
    link.click();
    URL.revokeObjectURL(url);
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
    this.selectedIds.set([]);
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
