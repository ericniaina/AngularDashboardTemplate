/** 0 = Sunday … 6 = Saturday (the calendar's convention). */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/** Regions whose week starts on Sunday or Saturday; everything else starts on Monday. */
const SUNDAY_REGIONS = new Set([
  'US',
  'CA',
  'MX',
  'BR',
  'JP',
  'KR',
  'CN',
  'TW',
  'HK',
  'IN',
  'IL',
  'PH',
  'ZA',
  'AU',
  'SA',
  'PE',
  'CO',
  'VE',
]);
const SATURDAY_REGIONS = new Set([
  'AE',
  'AF',
  'BH',
  'DZ',
  'EG',
  'IQ',
  'IR',
  'JO',
  'KW',
  'LY',
  'OM',
  'QA',
  'SY',
]);

interface WeekInfo {
  firstDay: number; // 1 = Monday … 7 = Sunday
}

type LocaleWithWeekInfo = Intl.Locale & { getWeekInfo?: () => WeekInfo; weekInfo?: WeekInfo };

/** First day of week for a locale: `Intl.Locale` week info when available, else the table above. */
export function firstDayOfWeek(locale: string): Weekday {
  let intlLocale: LocaleWithWeekInfo;
  try {
    intlLocale = new Intl.Locale(locale).maximize() as LocaleWithWeekInfo;
  } catch {
    return 1;
  }

  const info = intlLocale.getWeekInfo?.() ?? intlLocale.weekInfo;
  if (info?.firstDay) return (info.firstDay % 7) as Weekday;

  return fallbackFirstDay(intlLocale.region);
}

export function fallbackFirstDay(region: string | undefined): Weekday {
  if (region && SUNDAY_REGIONS.has(region)) return 0;
  if (region && SATURDAY_REGIONS.has(region)) return 6;
  return 1;
}
