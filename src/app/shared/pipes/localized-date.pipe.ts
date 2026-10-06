import { inject, Pipe, type PipeTransform } from '@angular/core';
import { LocaleService } from '../../core/locale';
import { type DateFormat, formatLocalizedDate } from '../date/date-format.util';

/**
 * Template wrapper around `formatLocalizedDate()`. Impure so it re-renders when the locale signal
 * changes; the work per call is a single `formatDate`.
 */
@Pipe({ name: 'localizedDate', pure: false })
export class LocalizedDatePipe implements PipeTransform {
  private readonly localeService = inject(LocaleService);

  transform(value: string | Date | null | undefined, format: DateFormat = 'mediumDate'): string {
    return formatLocalizedDate(value, this.localeService.locale(), format);
  }
}
