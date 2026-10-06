import { registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';
import { formatLocalizedDate, formatNumericDate } from './date-format.util';

registerLocaleData(localeFr);

describe('formatLocalizedDate', () => {
  it('formats an ISO date in the given locale, on the same calendar day', () => {
    expect(formatLocalizedDate('2021-03-15', 'en')).toBe('Mar 15, 2021');
    expect(formatLocalizedDate('2021-03-15', 'fr')).toBe('15 mars 2021');
  });

  it('supports the dayMonth format', () => {
    expect(formatLocalizedDate('2026-04-09', 'en', 'dayMonth')).toBe('Apr 9');
    expect(formatLocalizedDate('2026-04-09', 'fr', 'dayMonth')).toBe('9 avr.');
  });

  it('returns an empty string for empty or invalid values', () => {
    expect(formatLocalizedDate(null, 'en')).toBe('');
    expect(formatLocalizedDate('', 'en')).toBe('');
    expect(formatLocalizedDate('not a date', 'en')).toBe('');
  });
});

describe('formatNumericDate', () => {
  it('uses the locale order and a 4-digit year', () => {
    expect(formatNumericDate(new Date(2026, 3, 9), 'en')).toBe('4/9/2026');
    expect(formatNumericDate(new Date(2026, 3, 9), 'fr')).toBe('09/04/2026');
  });
});
