import { calendarDate, fromIsoDate, isIsoDate, toIsoDate, toLocalIsoDate } from './iso-date.util';

// Assertions use calendar fields, never toISOString(), so they hold in every timezone.
describe('iso-date.util', () => {
  it('serializes local calendar fields', () => {
    expect(toIsoDate(new Date(2021, 2, 15))).toBe('2021-03-15');
    expect(toIsoDate(new Date(2026, 0, 1, 23, 59))).toBe('2026-01-01');
  });

  it('parses to local midnight on the same calendar day', () => {
    const date = fromIsoDate('2021-03-15')!;
    expect([date.getFullYear(), date.getMonth(), date.getDate(), date.getHours()]).toEqual([
      2021, 2, 15, 0,
    ]);
  });

  it('round-trips', () => {
    expect(toIsoDate(fromIsoDate('2024-02-29')!)).toBe('2024-02-29');
  });

  it('rejects impossible or malformed dates instead of rolling over', () => {
    expect(fromIsoDate('2026-02-30')).toBeNull();
    expect(fromIsoDate('2026-13-01')).toBeNull();
    expect(fromIsoDate('2026-4-9')).toBeNull();
    expect(fromIsoDate('09/04/2026')).toBeNull();
    expect(fromIsoDate('')).toBeNull();
    expect(fromIsoDate(null)).toBeNull();
    expect(isIsoDate('2023-02-29')).toBe(false);
    expect(isIsoDate('2024-02-29')).toBe(true);
  });

  it('gives the local calendar date of a timestamp, and passes ISO dates through', () => {
    const lateEvening = new Date(2026, 0, 15, 23, 30);
    // As UTC this may already be the 16th (or still the 15th); the local day is what users see.
    expect(toLocalIsoDate(lateEvening.toISOString())).toBe('2026-01-15');
    expect(toLocalIsoDate('2026-01-15')).toBe('2026-01-15');
    expect(toLocalIsoDate('not a date')).toBeNull();
    expect(toLocalIsoDate('')).toBeNull();
  });

  it('keeps years below 100 as-is', () => {
    expect(calendarDate(99, 1, 1)?.getFullYear()).toBe(99);
  });
});
