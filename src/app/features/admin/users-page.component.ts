import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import type { ColDef } from 'ag-grid-community';
import type { User } from '../../core/auth';
import { translateGroup, TranslocoPipe } from '../../core/i18n';
import { DataTableComponent } from '../../shared/components/data-table/data-table.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';

/** Admin-only, read-only list: an `httpResource` is enough, no store needed. */
@Component({
  selector: 'app-users-page',
  imports: [DataTableComponent, PageHeaderComponent, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header
      [title]="'admin.title' | transloco"
      [subtitle]="'admin.subtitle' | transloco"
    />
    <app-data-table
      [rowData]="users.hasValue() ? users.value() : null"
      [columnDefs]="columnDefs()"
      [getRowId]="getRowId"
      [loading]="users.isLoading()"
    />
  `,
})
export class UsersPageComponent {
  protected readonly users = httpResource<User[]>(() => '/api/admin/users');

  private readonly columnText = translateGroup<'name' | 'email' | 'roles'>('admin.columns');
  private readonly roleText = translateGroup<string>('roles');

  protected readonly columnDefs = computed<ColDef<User>[]>(() => {
    const text = this.columnText();
    const roles = this.roleText();
    const roleLabels = (list: string[] | undefined) =>
      (list ?? []).map((r) => roles[r] ?? r).join(', ');
    return [
      { field: 'name', headerName: text.name },
      { field: 'email', headerName: text.email, minWidth: 220 },
      {
        field: 'roles',
        headerName: text.roles,
        valueFormatter: (p) => roleLabels(p.value as string[]),
        filterValueGetter: (p) => roleLabels(p.data?.roles),
        getQuickFilterText: (p) => roleLabels(p.value as string[]),
      },
    ];
  });

  protected readonly getRowId = (p: { data: User }) => p.data.id;
}
