import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucidePlus } from '@ng-icons/lucide';
import { toast } from '@spartan-ng/brain/sonner';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogService } from '@spartan-ng/helm/dialog';
import { interpolate, translateGroup, TranslocoPipe } from '../../core/i18n';
import { LocaleService } from '../../core/locale';
import { ConfirmDialogService } from '../../shared/components/confirm-dialog';
import { DataTableComponent } from '../../shared/components/data-table/data-table.component';
import type {
  DataTableColumn,
  RowAction,
} from '../../shared/components/data-table/data-table.model';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { formatLocalizedDate } from '../../shared/date/date-format.util';
import { DepartmentsService } from '../../shared/lookups/departments.service';
import {
  EmployeeDialogComponent,
  type EmployeeDialogData,
} from './employee-dialog/employee-dialog.component';
import { type Employee, type EmployeeRow, toEmployeeRows } from './employee.model';
import { EmployeesStore } from './employees.store';

@Component({
  selector: 'app-employees-page',
  imports: [DataTableComponent, HlmButtonImports, NgIcon, PageHeaderComponent, TranslocoPipe],
  providers: [EmployeesStore, provideIcons({ lucidePlus })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header
      [title]="'employees.title' | transloco"
      [subtitle]="'employees.subtitle' | transloco"
    >
      <button hlmBtn type="button" (click)="openDialog(null)">
        <ng-icon name="lucidePlus" />
        {{ 'employees.actions.new' | transloco }}
      </button>
    </app-page-header>

    <app-data-table
      [label]="'employees.title' | transloco"
      [rows]="ready() ? rows() : null"
      [columns]="columns()"
      [rowId]="rowId"
      [actions]="rowActions()"
      [loading]="!ready()"
      (rowActivate)="openDialog($event)"
    />
  `,
})
export class EmployeesPageComponent {
  private readonly store = inject(EmployeesStore);
  private readonly departments = inject(DepartmentsService);
  private readonly locale = inject(LocaleService).locale;
  private readonly dialog = inject(HlmDialogService);
  private readonly confirm = inject(ConfirmDialogService);

  private readonly columnText = translateGroup<
    'firstName' | 'lastName' | 'email' | 'department' | 'hireDate'
  >('employees.columns');
  private readonly actionText = translateGroup<'edit' | 'delete' | 'cancel'>('common.actions');
  private readonly text = translateGroup<
    'deleteTitle' | 'deleteMessage' | 'created' | 'updated' | 'deleted' | 'deleteFailed'
  >('employees.messages');

  /** Rows wait for the lookup too, so the department column is never briefly empty. */
  protected readonly ready = computed(
    () => this.store.loaded() && this.departments.departments().length > 0,
  );
  protected readonly rows = computed(() =>
    toEmployeeRows(this.store.employees(), this.departments.nameById()),
  );

  protected readonly columns = computed<DataTableColumn<EmployeeRow>[]>(() => {
    const text = this.columnText();
    const locale = this.locale();
    return [
      { id: 'firstName', header: text.firstName, value: (e) => e.firstName },
      { id: 'lastName', header: text.lastName, value: (e) => e.lastName },
      { id: 'email', header: text.email, value: (e) => e.email },
      {
        id: 'department',
        header: text.department,
        // The foreign key is resolved into the row, so sort/search work on the name.
        value: (e) => e.departmentName,
        filter: {
          type: 'select',
          options: this.departments.departments().map((d) => ({ value: d.name, label: d.name })),
        },
      },
      {
        id: 'hireDate',
        header: text.hireDate,
        // Sorts on the raw ISO value; shown (and text-filtered) localized.
        value: (e) => e.hireDate,
        display: (e) => formatLocalizedDate(e.hireDate, locale, 'mediumDate'),
        cellClass: 'w-40',
      },
    ];
  });

  protected readonly rowActions = computed<RowAction<EmployeeRow>[]>(() => {
    const actions = this.actionText();
    return [
      { id: 'edit', label: actions.edit, icon: 'lucidePencil', run: (row) => this.openDialog(row) },
      {
        id: 'delete',
        label: actions.delete,
        icon: 'lucideTrash2',
        destructive: true,
        run: (row) => this.delete(row),
      },
    ];
  });

  protected readonly rowId = (employee: EmployeeRow) => employee.id;

  constructor() {
    void this.store.load().catch(() => undefined);
  }

  protected openDialog(employee: Employee | null): void {
    const data: EmployeeDialogData = {
      employee,
      save: async (input) => {
        if (employee) {
          await this.store.update(employee.id, input);
          toast.success(this.text().updated);
        } else {
          await this.store.create(input);
          toast.success(this.text().created);
        }
      },
    };
    this.dialog.open(EmployeeDialogComponent, { context: data, contentClass: 'sm:max-w-2xl' });
  }

  private async delete(employee: Employee): Promise<void> {
    const text = this.text();
    const confirmed = await this.confirm.ask({
      title: text.deleteTitle,
      message: interpolate(text.deleteMessage, {
        name: `${employee.firstName} ${employee.lastName}`,
      }),
      confirmLabel: this.actionText().delete,
      cancelLabel: this.actionText().cancel,
      destructive: true,
    });
    if (!confirmed) return;
    try {
      await this.store.remove(employee.id);
      toast.success(text.deleted);
    } catch {
      toast.error(text.deleteFailed);
    }
  }
}
