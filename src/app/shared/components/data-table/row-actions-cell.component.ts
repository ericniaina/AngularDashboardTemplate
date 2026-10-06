import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideCopy,
  lucideEllipsis,
  lucideEye,
  lucidePencil,
  lucideTrash2,
} from '@ng-icons/lucide';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDropdownMenuImports } from '@spartan-ng/helm/dropdown-menu';
import type { ICellRendererAngularComp } from 'ag-grid-angular';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';

export interface RowAction<T> {
  id: string;
  /** Already translated. */
  label: string;
  icon: 'lucidePencil' | 'lucideTrash2' | 'lucideEye' | 'lucideCopy';
  destructive?: boolean;
  run: (row: T) => void;
}

interface RowActionsParams<T> {
  actions: RowAction<T>[];
  menuLabel: string;
}

/** The "⋯" menu at the end of a grid row. Built with `rowActionsColumn()`. */
@Component({
  selector: 'app-row-actions-cell',
  imports: [HlmButtonImports, HlmDropdownMenuImports, NgIcon],
  providers: [provideIcons({ lucideCopy, lucideEllipsis, lucideEye, lucidePencil, lucideTrash2 })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      hlmBtn
      variant="ghost"
      size="icon-sm"
      [hlmDropdownMenuTrigger]="menu"
      align="end"
      [attr.aria-label]="menuLabel()"
    >
      <ng-icon name="lucideEllipsis" />
    </button>
    <ng-template #menu>
      <hlm-dropdown-menu class="w-44">
        @for (action of actions(); track action.id) {
          <button
            hlmDropdownMenuItem
            [class.text-destructive]="action.destructive"
            (triggered)="action.run(row()!)"
          >
            <ng-icon [name]="action.icon" />
            {{ action.label }}
          </button>
        }
      </hlm-dropdown-menu>
    </ng-template>
  `,
})
export class RowActionsCellComponent<T> implements ICellRendererAngularComp {
  protected readonly row = signal<T | undefined>(undefined);
  protected readonly actions = signal<RowAction<T>[]>([]);
  protected readonly menuLabel = signal('');

  agInit(params: ICellRendererParams<T> & RowActionsParams<T>): void {
    this.refresh(params);
  }

  refresh(params: ICellRendererParams<T> & RowActionsParams<T>): boolean {
    this.row.set(params.data);
    this.actions.set(params.actions);
    this.menuLabel.set(params.menuLabel);
    return true;
  }
}

export function rowActionsColumn<T>(actions: RowAction<T>[], menuLabel: string): ColDef<T> {
  return {
    colId: 'actions',
    headerName: '',
    cellRenderer: RowActionsCellComponent,
    cellRendererParams: { actions, menuLabel } satisfies RowActionsParams<T>,
    cellClass: 'flex items-center justify-center',
    width: 64,
    maxWidth: 64,
    minWidth: 64,
    flex: 0,
    pinned: 'right',
    sortable: false,
    filter: false,
    floatingFilter: false,
    resizable: false,
    suppressMovable: true,
    suppressHeaderMenuButton: true,
  };
}
