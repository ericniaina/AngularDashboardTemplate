// Parsing what a user typed into a date field. Locale-aware on purpose (day/month order), unlike
// iso-date.util, which is the wire format. The result is a local `Date` or `null`.
import { calendarDate, fromIsoDate } from './iso-date.util';

type Part = 'day' | 'month' | 'year';

/** Order of day/month/year in the locale's numeric date format, e.g. ['month','day','year'] for en-US. */
export function numericDateOrder(locale: string): Part[] {
  const parts = new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  })
    .formatToParts(new Date(2000, 10, 22))
    .map((p) => p.type)
    .filter((t): t is Part => t === 'day' || t === 'month' || t === 'year');
  return parts.length === 3 ? parts : ['day', 'month', 'year'];
}

/**
 * `09/04/2026` → 9 April in `fr`, September 4 in `en`. ISO `2026-04-09` is accepted in every locale.
 * Separators `/`, `.`, `-` and spaces are accepted; a 2-digit year is read in a ±50 year window.
 * Impossible dates (31/02/2026) return `null` instead of rolling over.
 */
export function parseLocalizedDate(text: string, locale: string): Date | null {
  const value = text.trim();
  if (!value) return null;

  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(value)) {
    const [y, m, d] = value.split('-');
    return fromIsoDate(`${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`);
  }

  const tokens = value.split(/[\s./-]+/);
  if (tokens.length !== 3 || tokens.some((t) => !/^\d+$/.test(t))) return null;

  const order = numericDateOrder(locale);
  const fields: Partial<Record<Part, number>> = {};
  order.forEach((part, i) => (fields[part] = Number(tokens[i])));
  const yearToken = tokens[order.indexOf('year')];

  let year = fields.year!;
  if (yearToken.length <= 2) year = expandTwoDigitYear(year);
  else if (yearToken.length !== 4) return null;

  return calendarDate(year, fields.month!, fields.day!);
}

function expandTwoDigitYear(yy: number, now = new Date()): number {
  const century = Math.floor(now.getFullYear() / 100) * 100;
  const candidate = century + yy;
  return candidate > now.getFullYear() + 50 ? candidate - 100 : candidate;
}
