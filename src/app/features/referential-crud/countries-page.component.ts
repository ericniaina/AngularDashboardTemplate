import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideFilter, lucideLock, lucidePlus, lucideRotateCcw } from '@ng-icons/lucide';
import { toast } from '@spartan-ng/brain/sonner';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmDialogService } from '@spartan-ng/helm/dialog';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HlmRadioGroupImports } from '@spartan-ng/helm/radio-group';
import { HlmSelectImports } from '@spartan-ng/helm/select';
import { ACCESS, AuthService } from '../../core/auth';
import { interpolate, translateGroup, TranslocoPipe } from '../../core/i18n';
import { ConfirmDialogService } from '../../shared/components/confirm-dialog';
import { DataTableComponent } from '../../shared/components/data-table/data-table.component';
import type {
  DataTableColumn,
  RowAction,
} from '../../shared/components/data-table/data-table.model';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { CountriesStore } from './countries.store';
import {
  CountryDialogComponent,
  type CountryDialogData,
} from './country-dialog/country-dialog.component';
import {
  activeCriteriaCount,
  type Country,
  type CountryFilter,
  countryFilterPredicate,
  EMPTY_COUNTRY_FILTER,
  type Region,
  REGIONS,
  type StatusFilter,
} from './country.model';

@Component({
  selector: 'app-countries-page',
  imports: [
    DataTableComponent,
    HlmBadgeImports,
    HlmButtonImports,
    HlmCardImports,
    HlmFieldImports,
    HlmInputImports,
    HlmLabelImports,
    HlmRadioGroupImports,
    HlmSelectImports,
    NgIcon,
    PageHeaderComponent,
    ReactiveFormsModule,
    TranslocoPipe,
  ],
  providers: [
    CountriesStore,
    provideIcons({ lucideFilter, lucideLock, lucidePlus, lucideRotateCcw }),
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './countries-page.component.html',
})
export class CountriesPageComponent {
  protected readonly store = inject(CountriesStore);
  private readonly auth = inject(AuthService);
  private readonly dialog = inject(HlmDialogService);
  private readonly confirm = inject(ConfirmDialogService);
  private readonly fb = inject(FormBuilder);

  protected readonly canWrite = computed(() => this.auth.hasAnyRole(ACCESS.referentialWrite));

  private readonly columnText = translateGroup<'code' | 'name' | 'region' | 'status'>(
    'countries.columns',
  );
  private readonly statusText = translateGroup<'active' | 'inactive'>('common.status');
  protected readonly regionText = translateGroup<Region>('common.regions');
  private readonly actionText = translateGroup<'edit' | 'delete' | 'view' | 'cancel'>(
    'common.actions',
  );
  private readonly text = translateGroup<
    'deleteTitle' | 'deleteMessage' | 'created' | 'updated' | 'deleted' | 'deleteFailed'
  >('countries.messages');

  // Advanced filter (the table's external filter)
  protected readonly regions = REGIONS;
  protected readonly statuses: StatusFilter[] = ['all', 'active', 'inactive'];
  protected readonly filtersOpen = signal(false);
  protected readonly filterForm = this.fb.nonNullable.group({
    nameContains: '',
    regions: this.fb.nonNullable.control<Region[]>([]),
    status: this.fb.nonNullable.control<StatusFilter>('all'),
  });
  private readonly filter = toSignal(this.filterForm.valueChanges, {
    initialValue: EMPTY_COUNTRY_FILTER as Partial<CountryFilter>,
  });
  private readonly effectiveFilter = computed<CountryFilter>(() => ({
    ...EMPTY_COUNTRY_FILTER,
    ...this.filter(),
  }));
  protected readonly activeFilterCount = computed(() =>
    activeCriteriaCount(this.effectiveFilter()),
  );
  protected readonly externalFilter = computed(() =>
    countryFilterPredicate(this.effectiveFilter()),
  );
  protected readonly regionLabel = (region: Region) => this.regionText()[region];

  protected readonly columns = computed<DataTableColumn<Country>[]>(() => {
    const text = this.columnText();
    const regions = this.regionText();
    const status = this.statusText();
    const statusLabel = (active: boolean) => (active ? status.active : status.inactive);
    return [
      { id: 'code', header: text.code, value: (c) => c.code, cellClass: 'w-28' },
      { id: 'name', header: text.name, value: (c) => c.name },
      {
        id: 'region',
        header: text.region,
        value: (c) => c.region,
        // Shown, sorted-by-search and filtered on the translated name users see.
        display: (c) => regions[c.region],
        filter: { type: 'select', options: REGIONS.map((r) => ({ value: r, label: regions[r] })) },
      },
      {
        id: 'status',
        header: text.status,
        value: (c) => (c.active ? 'active' : 'inactive'),
        display: (c) => statusLabel(c.active),
        filter: {
          type: 'select',
          options: [
            { value: 'active', label: status.active },
            { value: 'inactive', label: status.inactive },
          ],
        },
        cellClass: 'w-40',
      },
    ];
  });

  /** Writers edit/delete; readers get a View entry, so the dialog is reachable without a mouse. */
  protected readonly rowActions = computed<RowAction<Country>[]>(() => {
    const actions = this.actionText();
    return this.canWrite()
      ? [
          {
            id: 'edit',
            label: actions.edit,
            icon: 'lucidePencil',
            run: (row) => this.openDialog(row),
          },
          {
            id: 'delete',
            label: actions.delete,
            icon: 'lucideTrash2',
            destructive: true,
            run: (row) => this.delete(row),
          },
        ]
      : [
          {
            id: 'view',
            label: actions.view,
            icon: 'lucideEye',
            run: (row) => this.openDialog(row),
          },
        ];
  });

  protected readonly rowId = (country: Country) => country.id;

  constructor() {
    void this.store.load().catch(() => undefined);
  }

  protected resetFilters(): void {
    this.filterForm.reset();
  }

  protected openDialog(country: Country | null): void {
    const readOnly = !this.canWrite();
    const data: CountryDialogData = {
      country,
      readOnly,
      existingCodes: this.store.codes,
      save: async (input) => {
        if (country) {
          await this.store.update(country.id, input);
          toast.success(this.text().updated);
        } else {
          await this.store.create(input);
          toast.success(this.text().created);
        }
      },
    };
    this.dialog.open(CountryDialogComponent, { context: data, contentClass: 'sm:max-w-lg' });
  }

  private async delete(country: Country): Promise<void> {
    const text = this.text();
    const confirmed = await this.confirm.ask({
      title: text.deleteTitle,
      message: interpolate(text.deleteMessage, { name: country.name }),
      confirmLabel: this.actionText().delete,
      cancelLabel: this.actionText().cancel,
      destructive: true,
    });
    if (!confirmed) return;
    try {
      await this.store.remove(country.id);
      toast.success(text.deleted);
    } catch {
      toast.error(text.deleteFailed);
    }
  }
}
