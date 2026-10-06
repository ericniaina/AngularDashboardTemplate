import { Directive, inject, input, TemplateRef } from '@angular/core';

export interface DataTableCellContext<T> {
  $implicit: T;
}

/**
 * A custom cell for one column, declared inside `<app-data-table>`:
 *
 *   <ng-template appCell="quantity" [appCellRows]="rows()" let-row>…</ng-template>
 *
 * `appCellRows` only types `row` in the template (pass the same array as the table's `rows`).
 * Without a template, the column shows its `display` text.
 */
@Directive({ selector: 'ng-template[appCell]' })
export class DataTableCellDirective<T> {
  readonly columnId = input.required<string>({ alias: 'appCell' });
  readonly rows = input<readonly T[] | null>(null, { alias: 'appCellRows' });
  readonly template = inject<TemplateRef<DataTableCellContext<T>>>(TemplateRef);

  static ngTemplateContextGuard<T>(
    _dir: DataTableCellDirective<T>,
    ctx: unknown,
  ): ctx is DataTableCellContext<T> {
    return true;
  }
}
