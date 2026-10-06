import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import type { User } from '../../core/auth';
import { translateGroup, TranslocoPipe } from '../../core/i18n';
import { DataTableComponent } from '../../shared/components/data-table/data-table.component';
import type { DataTableColumn } from '../../shared/components/data-table/data-table.model';
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
      [label]="'admin.title' | transloco"
      [rows]="users.hasValue() ? users.value() : null"
      [columns]="columns()"
      [rowId]="rowId"
      [loading]="users.isLoading()"
    />
  `,
})
export class UsersPageComponent {
  protected readonly users = httpResource<User[]>(() => '/api/admin/users');

  private readonly columnText = translateGroup<'name' | 'email' | 'roles'>('admin.columns');
  private readonly roleText = translateGroup<string>('roles');

  protected readonly columns = computed<DataTableColumn<User>[]>(() => {
    const text = this.columnText();
    const roles = this.roleText();
    const roleLabels = (user: User) => user.roles.map((r) => roles[r] ?? r).join(', ');
    return [
      { id: 'name', header: text.name, value: (u) => u.name },
      { id: 'email', header: text.email, value: (u) => u.email },
      { id: 'roles', header: text.roles, value: roleLabels },
    ];
  });

  protected readonly rowId = (user: User) => user.id;
}
