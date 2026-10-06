import { Injectable, signal } from '@angular/core';

/** The display locale when nothing else sets one (e.g. if i18n is removed). */
export const DEFAULT_LOCALE = 'en';

export interface CalendarLabels {
  previousMonth: string;
  nextMonth: string;
}

/**
 * The display locale for dates and numbers. The i18n layer calls `setLocale()` on language change;
 * everything that formats reads `locale()`. Display only: stored values stay ISO.
 */
@Injectable({ providedIn: 'root' })
export class LocaleService {
  private readonly _locale = signal(DEFAULT_LOCALE);
  readonly locale = this._locale.asReadonly();

  /** Translated ARIA labels for the calendar's navigation buttons (see calendar-locale.ts). */
  private readonly _calendarLabels = signal<CalendarLabels>({
    previousMonth: 'Go to the previous month',
    nextMonth: 'Go to the next month',
  });
  readonly calendarLabels = this._calendarLabels.asReadonly();

  setLocale(locale: string): void {
    this._locale.set(locale);
  }

  setCalendarLabels(labels: CalendarLabels): void {
    this._calendarLabels.set(labels);
  }
}
