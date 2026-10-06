import { calendarDate, fromIsoDate, isIsoDate, toIsoDate } from './iso-date.util';

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

  it('keeps years below 100 as-is', () => {
    expect(calendarDate(99, 1, 1)?.getFullYear()).toBe(99);
  });
});
