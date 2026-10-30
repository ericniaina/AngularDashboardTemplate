import { ChangeDetectionStrategy, Component, computed, inject, input, model } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCalendar } from '@ng-icons/lucide';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmPopoverImports } from '@spartan-ng/helm/popover';
import { HlmSelectImports } from '@spartan-ng/helm/select';
import { translateGroup, TranslocoPipe } from '../../../../core/i18n';
import { LocaleService } from '../../../../core/locale';
import { formatNumericDate } from '../../../date/date-format.util';
import { fromIsoDate } from '../../../date/iso-date.util';
import { DateFieldComponent } from '../../date-field/date-field.component';
import type { DateFilterValue, DateOperator } from '../data-table.model';

const OPERATORS: DateOperator[] = ['on', 'before', 'after'];
let nextId = 0;

/**
 * Filter cell of a `{ type: 'date' }` column: a compact button showing the filter ("After
 * 3/1/2026"), opening a popover with an operator and a date. The filter applies as soon as both
 * are set; clearing the date (or typing an invalid one) removes it.
 */
@Component({
  selector: 'app-date-filter',
  imports: [
    DateFieldComponent,
    HlmButtonImports,
    HlmFieldImports,
    HlmPopoverImports,
    HlmSelectImports,
    NgIcon,
    ReactiveFormsModule,
    TranslocoPipe,
  ],
  providers: [provideIcons({ lucideCalendar })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <hlm-popover align="start" sideOffset="5" (stateChanged)="onStateChange($event)">
      <button
        hlmPopoverTrigger
        hlmBtn
        variant="outline"
        size="sm"
        type="button"
        class="h-8 w-full min-w-36 justify-start font-normal"
        [attr.aria-label]="label() + ': ' + summary()"
        [title]="summary()"
      >
        <ng-icon name="lucideCalendar" class="text-muted-foreground" aria-hidden="true" />
        <span class="truncate" [class.text-muted-foreground]="!value()">{{ summary() }}</span>
      </button>

      <hlm-popover-content class="w-64" *hlmPopoverPortal="let ctx">
        <form class="grid gap-4" [formGroup]="form">
          <div hlmField>
            <label hlmFieldLabel [for]="uid + '-operator'">{{
              'common.table.dateFilter.condition' | transloco
            }}</label>
            <hlm-select formControlName="operator" [itemToString]="operatorLabel()">
              <hlm-select-trigger class="w-full" [buttonId]="uid + '-operator'">
                <hlm-select-value />
              </hlm-select-trigger>
              <hlm-select-content *hlmSelectPortal>
                @for (operator of operators; track operator) {
                  <hlm-select-item [value]="operator">{{
                    operatorLabel()(operator)
                  }}</hlm-select-item>
                }
              </hlm-select-content>
            </hlm-select>
          </div>
          <div hlmField>
            <label hlmFieldLabel [for]="uid + '-date'">{{
              'common.table.dateFilter.date' | transloco
            }}</label>
            <app-date-field formControlName="date" [inputId]="uid + '-date'" />
          </div>
        </form>
      </hlm-popover-content>
    </hlm-popover>
  `,
})
export class DateFilterComponent {
  private readonly locale = inject(LocaleService).locale;
  private readonly fb = inject(FormBuilder);
  private readonly text = translateGroup<'any' | DateOperator>('common.table.dateFilter');

  readonly value = model<DateFilterValue | null>(null);
  /** Accessible name of the button, e.g. "Filter Hire date" (already translated). */
  readonly label = input.required<string>();

  protected readonly uid = `app-date-filter-${nextId++}`;
  protected readonly operators = OPERATORS;
  protected readonly form = this.fb.group({
    operator: this.fb.nonNullable.control<DateOperator>('on'),
    date: this.fb.control<string | null>(null),
  });

  protected readonly summary = computed(() => {
    const value = this.value();
    const text = this.text();
    if (!value) return text.any;
    const date = fromIsoDate(value.date);
    return `${text[value.operator]} ${date ? formatNumericDate(date, this.locale()) : value.date}`;
  });

  protected readonly operatorLabel = computed(() => {
    const text = this.text();
    return (operator: DateOperator | null) => (operator ? text[operator] : '');
  });

  constructor() {
    this.form.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(({ operator, date }) =>
        this.value.set(operator && date ? { operator, date } : null),
      );
  }

  /** The popover starts from the current filter, which may have been cleared from outside. */
  protected onStateChange(state: string): void {
    if (state !== 'open') return;
    const value = this.value();
    this.form.reset(
      { operator: value?.operator ?? 'on', date: value?.date ?? null },
      { emitEvent: false },
    );
  }
}
