export const REGIONS = ['africa', 'americas', 'asia', 'europe', 'oceania'] as const;
export type Region = (typeof REGIONS)[number];

export interface Country {
  id: string;
  code: string;
  name: string;
  region: Region;
  active: boolean;
  updatedAt: string;
}

export type CountryInput = Pick<Country, 'code' | 'name' | 'region' | 'active'>;

export type StatusFilter = 'all' | 'active' | 'inactive';

/** The advanced filter panel's criteria (applied through the grid's external filter). */
export interface CountryFilter {
  nameContains: string;
  regions: Region[];
  status: StatusFilter;
}

export const EMPTY_COUNTRY_FILTER: CountryFilter = { nameContains: '', regions: [], status: 'all' };

/** Number of criteria that actually filter something (for the toggle's badge). */
export function activeCriteriaCount(filter: CountryFilter): number {
  return [
    filter.nameContains.trim() !== '',
    filter.regions.length > 0,
    filter.status !== 'all',
  ].filter(Boolean).length;
}

/** `null` when nothing is filtered, so the grid can skip the external filter entirely. */
export function countryFilterPredicate(
  filter: CountryFilter,
): ((country: Country) => boolean) | null {
  if (activeCriteriaCount(filter) === 0) return null;
  const needle = filter.nameContains.trim().toLocaleLowerCase();
  return (country) =>
    (!needle || country.name.toLocaleLowerCase().includes(needle)) &&
    (filter.regions.length === 0 || filter.regions.includes(country.region)) &&
    (filter.status === 'all' || country.active === (filter.status === 'active'));
}
