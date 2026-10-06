import { numericDateOrder, parseLocalizedDate } from './date-parse.util';

const fields = (date: Date | null) =>
  date ? [date.getFullYear(), date.getMonth() + 1, date.getDate()] : null;

describe('parseLocalizedDate', () => {
  it('reads day/month order from the locale', () => {
    expect(numericDateOrder('fr')).toEqual(['day', 'month', 'year']);
    expect(numericDateOrder('en')).toEqual(['month', 'day', 'year']);
  });

  it('reads 09/04/2026 as 9 April in fr and September 4 in en', () => {
    expect(fields(parseLocalizedDate('09/04/2026', 'fr'))).toEqual([2026, 4, 9]);
    expect(fields(parseLocalizedDate('09/04/2026', 'en'))).toEqual([2026, 9, 4]);
  });

  it('accepts ISO input in every locale', () => {
    expect(fields(parseLocalizedDate('2026-04-09', 'fr'))).toEqual([2026, 4, 9]);
    expect(fields(parseLocalizedDate('2026-4-9', 'en'))).toEqual([2026, 4, 9]);
  });

  it('accepts other separators and single digits', () => {
    expect(fields(parseLocalizedDate('9.4.2026', 'fr'))).toEqual([2026, 4, 9]);
    expect(fields(parseLocalizedDate(' 4-9-2026 ', 'en'))).toEqual([2026, 4, 9]);
  });

  it('expands two-digit years', () => {
    expect(fields(parseLocalizedDate('09/04/26', 'fr'))?.[0]).toBe(2026);
  });

  it('returns null for impossible dates and garbage', () => {
    expect(parseLocalizedDate('31/02/2026', 'fr')).toBeNull();
    expect(parseLocalizedDate('13/13/2026', 'en')).toBeNull();
    expect(parseLocalizedDate('tomorrow', 'en')).toBeNull();
    expect(parseLocalizedDate('09/04', 'fr')).toBeNull();
    expect(parseLocalizedDate('09/04/202', 'fr')).toBeNull();
    expect(parseLocalizedDate('', 'fr')).toBeNull();
  });
});
