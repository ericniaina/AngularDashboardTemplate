import {
  activeCriteriaCount,
  type Country,
  countryFilterPredicate,
  EMPTY_COUNTRY_FILTER,
} from './country.model';

const country = (overrides: Partial<Country>): Country => ({
  id: '1',
  code: 'FR',
  name: 'France',
  region: 'europe',
  active: true,
  updatedAt: '2026-01-01T00:00:00Z',
  ...overrides,
});

describe('advanced country filter', () => {
  it('is absent (null) when nothing is filtered', () => {
    expect(countryFilterPredicate(EMPTY_COUNTRY_FILTER)).toBeNull();
    expect(activeCriteriaCount({ ...EMPTY_COUNTRY_FILTER, nameContains: '  ' })).toBe(0);
  });

  it('combines name, regions and status', () => {
    const filter = { nameContains: 'an', regions: ['europe' as const], status: 'active' as const };
    const pass = countryFilterPredicate(filter)!;
    expect(activeCriteriaCount(filter)).toBe(3);
    expect(pass(country({}))).toBe(true);
    expect(pass(country({ name: 'Italy' }))).toBe(false);
    expect(pass(country({ region: 'asia', name: 'Japan' }))).toBe(false);
    expect(pass(country({ active: false }))).toBe(false);
  });

  it('matches names case-insensitively', () => {
    const pass = countryFilterPredicate({ ...EMPTY_COUNTRY_FILTER, nameContains: 'FRA' })!;
    expect(pass(country({}))).toBe(true);
  });
});
