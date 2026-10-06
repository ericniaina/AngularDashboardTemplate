// ISO `yyyy-MM-dd` serialization. Locale-independent on purpose: this is the wire/model format.
// Never use `toISOString()` here - it converts to UTC and shifts the day east of Greenwich.

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

const pad = (n: number, width = 2) => String(n).padStart(width, '0');

/** A local calendar date → `yyyy-MM-dd`. */
export function toIsoDate(date: Date): string {
  return `${pad(date.getFullYear(), 4)}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** `yyyy-MM-dd` → local midnight `Date`, or `null` for anything that isn't a real calendar date. */
export function fromIsoDate(value: string | null | undefined): Date | null {
  const match = value ? ISO_DATE.exec(value) : null;
  if (!match) return null;
  return calendarDate(Number(match[1]), Number(match[2]), Number(match[3]));
}

export function isIsoDate(value: unknown): value is string {
  return typeof value === 'string' && fromIsoDate(value) !== null;
}

export function todayIso(): string {
  return toIsoDate(new Date());
}

/** Builds a local date from calendar fields; `null` if they would roll over (31 Feb, month 13…). */
export function calendarDate(year: number, month: number, day: number): Date | null {
  const date = new Date(year, month - 1, day);
  // new Date(y, m, d) maps years 0-99 to 1900-1999; setFullYear keeps the real year.
  date.setFullYear(year);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
    ? date
    : null;
}
