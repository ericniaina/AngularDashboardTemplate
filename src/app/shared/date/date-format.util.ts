// Display formatting only. The one implementation behind the `localizedDate` pipe (templates) and
// grid `valueFormatter`s (plain functions). Its output is never sent to the backend.
import { formatDate } from '@angular/common';
import { fromIsoDate } from './iso-date.util';

/**
 * Angular date format names (`mediumDate`, `short`, …), `dayMonth` (a locale-ordered "9 Apr" /
 * "Apr 9", which Angular has no name for), or a custom pattern.
 */
export type DateFormat =
  'shortDate' | 'mediumDate' | 'longDate' | 'short' | 'medium' | 'dayMonth' | (string & {});

/**
 * Formats an ISO date (`yyyy-MM-dd`), an ISO timestamp or a `Date` for display in `locale`.
 * Returns '' for empty or unparseable values rather than throwing inside a template or grid cell.
 */
export function formatLocalizedDate(
  value: string | Date | null | undefined,
  locale: string,
  format: DateFormat = 'mediumDate',
): string {
  if (value === null || value === undefined || value === '') return '';
  try {
    if (format === 'dayMonth') {
      // A date-only ISO string is a local calendar date; `new Date('yyyy-MM-dd')` would read it as UTC.
      const date = typeof value === 'string' ? (fromIsoDate(value) ?? new Date(value)) : value;
      if (Number.isNaN(date.getTime())) return '';
      return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' }).format(date);
    }
    // Angular reads `yyyy-MM-dd` as a local date, so there is no UTC day shift.
    return formatDate(value, format, locale);
  } catch {
    return '';
  }
}

/** The numeric format a user types and reads in a date field: `4/9/2026` (en), `09/04/2026` (fr). */
export function formatNumericDate(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).format(date);
}
