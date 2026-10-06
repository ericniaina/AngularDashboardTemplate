import { effect, inject, Injectable, untracked } from '@angular/core';
import { type BrnCalendarI18n, injectBrnCalendarI18n } from '@spartan-ng/brain/calendar';
import { type CalendarLabels, LocaleService } from './locale.service';
import { firstDayOfWeek } from './week-info';

/**
 * Keeps spartan's (global) calendar i18n in step with `LocaleService`: month/weekday names, header,
 * first day of week and navigation labels. Injected by the date field, so the calendar code stays
 * out of the initial bundle; kept out of `index.ts` for the same reason.
 */
@Injectable({ providedIn: 'root' })
export class CalendarLocaleSync {
  constructor() {
    const localeService = inject(LocaleService);
    const calendarI18n = injectBrnCalendarI18n();
    effect(() => {
      const config = buildCalendarI18n(localeService.locale(), localeService.calendarLabels());
      // use() reads the current config before writing it; untracked so this effect doesn't
      // depend on the signal it writes (which would loop forever).
      untracked(() => calendarI18n.use(config));
    });
  }
}

export function buildCalendarI18n(
  locale: string,
  labels: CalendarLabels,
): Partial<BrnCalendarI18n> {
  // 7 January 2024 is a Sunday, so index 0..6 maps to Sunday..Saturday.
  const weekday = (index: number, style: 'short' | 'long') =>
    new Intl.DateTimeFormat(locale, { weekday: style }).format(new Date(2024, 0, 7 + index));
  const month = (index: number, style: 'short' | 'long') =>
    new Intl.DateTimeFormat(locale, { month: style }).format(new Date(2024, index, 1));
  const capitalize = (text: string) => text.charAt(0).toLocaleUpperCase(locale) + text.slice(1);

  return {
    formatWeekdayName: (index) => capitalize(weekday(index, 'short')),
    labelWeekday: (index) => weekday(index, 'long'),
    formatHeader: (m, y) =>
      capitalize(
        new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(
          new Date(y, m, 1),
        ),
      ),
    formatMonth: (m) => capitalize(month(m, 'short')),
    formatYear: (y) => String(y),
    months: () =>
      Array.from({ length: 12 }, (_, i) => capitalize(month(i, 'short'))) as ReturnType<
        BrnCalendarI18n['months']
      >,
    firstDayOfWeek: () => firstDayOfWeek(locale),
    labelPrevious: () => labels.previousMonth,
    labelNext: () => labels.nextMonth,
  };
}
