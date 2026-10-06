import { fallbackFirstDay, firstDayOfWeek } from './week-info';

describe('firstDayOfWeek', () => {
  it('Monday in fr, Sunday in en (US)', () => {
    expect(firstDayOfWeek('fr')).toBe(1);
    expect(firstDayOfWeek('en')).toBe(0);
  });

  it('falls back to the region table when Intl has no week info', () => {
    expect(fallbackFirstDay('US')).toBe(0);
    expect(fallbackFirstDay('FR')).toBe(1);
    expect(fallbackFirstDay('EG')).toBe(6);
    expect(fallbackFirstDay(undefined)).toBe(1);
  });

  it('uses the fallback when Intl.Locale lacks getWeekInfo/weekInfo', () => {
    const proto = Intl.Locale.prototype as unknown as Record<string, unknown>;
    const getWeekInfo = Object.getOwnPropertyDescriptor(proto, 'getWeekInfo');
    const weekInfo = Object.getOwnPropertyDescriptor(proto, 'weekInfo');
    try {
      Object.defineProperty(proto, 'getWeekInfo', { value: undefined, configurable: true });
      Object.defineProperty(proto, 'weekInfo', { get: () => undefined, configurable: true });
      expect(firstDayOfWeek('en-US')).toBe(0);
      expect(firstDayOfWeek('fr-FR')).toBe(1);
    } finally {
      if (getWeekInfo) Object.defineProperty(proto, 'getWeekInfo', getWeekInfo);
      else delete proto['getWeekInfo'];
      if (weekInfo) Object.defineProperty(proto, 'weekInfo', weekInfo);
      else delete proto['weekInfo'];
    }
  });
});
