import {
  ChangeDetectionStrategy,
  Component,
  computed,
  forwardRef,
  inject,
  input,
  signal,
} from '@angular/core';
import {
  type AbstractControl,
  type ControlValueAccessor,
  NG_VALIDATORS,
  NG_VALUE_ACCESSOR,
  type ValidationErrors,
  type Validator,
} from '@angular/forms';
import { HlmDatePickerImports } from '@spartan-ng/helm/date-picker';
import { TranslocoPipe } from '../../../core/i18n';
import { LocaleService } from '../../../core/locale';
import { CalendarLocaleSync } from '../../../core/locale/calendar-locale';
import { formatNumericDate } from '../../date/date-format.util';
import { parseLocalizedDate } from '../../date/date-parse.util';
import { fromIsoDate, toIsoDate } from '../../date/iso-date.util';

let nextId = 0;

/**
 * The app's only date input: spartan's date picker (typed input + calendar), exposed to forms as an
 * ISO `yyyy-MM-dd` string. Forms hold `FormControl<string | null>`; the `Date` never leaves here.
 *
 * Errors: `invalidDate` (unparseable/impossible text), `minDate` / `maxDate` (ISO bounds).
 */
@Component({
  selector: 'app-date-field',
  imports: [HlmDatePickerImports, TranslocoPipe],
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => DateFieldComponent), multi: true },
    { provide: NG_VALIDATORS, useExisting: forwardRef(() => DateFieldComponent), multi: true },
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block', '(focusout)': 'onTouched()' },
  template: `
    <hlm-date-picker
      [date]="date()"
      [minDate]="minDate()"
      [maxDate]="maxDate()"
      [disabled]="disabled()"
      [formatDate]="format()"
      [autoCloseOnSelect]="true"
      (dateChange)="onDateChange($event)"
    >
      <hlm-date-picker-input
        [inputId]="inputId()"
        [parseDate]="parse()"
        [formatInputDate]="format()"
        [placeholder]="'common.date.placeholder' | transloco"
        [calendarAriaLabel]="'common.date.openCalendar' | transloco"
        [clearAriaLabel]="'common.date.clear' | transloco"
        showClear
      />
    </hlm-date-picker>
  `,
})
export class DateFieldComponent implements ControlValueAccessor, Validator {
  private readonly locale = inject(LocaleService).locale;

  constructor() {
    // Calendar month/weekday names and first day of week follow the locale.
    inject(CalendarLocaleSync);
  }

  /** Id of the text input, for `<label for>`. */
  readonly inputId = input(`app-date-field-${nextId++}`);
  readonly min = input<string | null>(null);
  readonly max = input<string | null>(null);

  protected readonly date = signal<Date | undefined>(undefined);
  protected readonly disabled = signal(false);
  protected readonly minDate = computed(() => fromIsoDate(this.min()) ?? undefined);
  protected readonly maxDate = computed(() => fromIsoDate(this.max()) ?? undefined);

  /** True while the input holds text that isn't a date; the value is then `null`. */
  private readonly invalidText = signal(false);
  private lastParse: 'valid' | 'invalid' | null = null;

  protected readonly format = computed(() => {
    const locale = this.locale();
    return (date: Date) => formatNumericDate(date, locale);
  });

  protected readonly parse = computed(() => {
    const locale = this.locale();
    return (text: string) => {
      const parsed = parseLocalizedDate(text, locale);
      this.lastParse = parsed ? 'valid' : 'invalid';
      return parsed;
    };
  });

  private onChange: (value: string | null) => void = () => {};
  protected onTouched: () => void = () => {};

  protected onDateChange(date: Date | null): void {
    // The picker reports `null` both for "cleared" and "couldn't parse"; only a parse that just
    // happened can tell them apart.
    this.invalidText.set(date === null && this.lastParse === 'invalid');
    this.lastParse = null;
    this.date.set(date ?? undefined);
    this.onChange(date ? toIsoDate(date) : null);
  }

  writeValue(value: string | null): void {
    this.date.set(fromIsoDate(value) ?? undefined);
    this.invalidText.set(false);
  }

  registerOnChange(fn: (value: string | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }

  validate(control: AbstractControl<string | null>): ValidationErrors | null {
    if (this.invalidText()) return { invalidDate: true };
    const value = control.value;
    if (!value) return null;
    const min = this.min();
    const max = this.max();
    // ISO strings compare correctly as plain strings.
    if (min && value < min) return { minDate: { min } };
    if (max && value > max) return { maxDate: { max } };
    return null;
  }
}
