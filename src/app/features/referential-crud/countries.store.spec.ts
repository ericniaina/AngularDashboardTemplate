import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { CountriesStore } from './countries.store';
import type { Country } from './country.model';

const france: Country = {
  id: '1',
  code: 'FR',
  name: 'France',
  region: 'europe',
  active: true,
  updatedAt: '',
};
const spain: Country = {
  id: '2',
  code: 'ES',
  name: 'Spain',
  region: 'europe',
  active: true,
  updatedAt: '',
};

describe('CountriesStore', () => {
  let store: CountriesStore;
  let http: HttpTestingController;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [CountriesStore, provideHttpClient(), provideHttpClientTesting()],
    });
    store = TestBed.inject(CountriesStore);
    http = TestBed.inject(HttpTestingController);

    const loaded = store.load();
    expect(store.loading()).toBe(true);
    http.expectOne('/api/countries').flush([france]);
    await loaded;
  });

  afterEach(() => http.verify());

  it('loads', () => {
    expect(store.countries()).toEqual([france]);
    expect(store.loaded()).toBe(true);
    expect(store.loading()).toBe(false);
    expect(store.codes()).toEqual(['FR']);
  });

  it('create appends with a new array', async () => {
    const before = store.countries();
    const created = store.create({ code: 'ES', name: 'Spain', region: 'europe', active: true });
    http.expectOne({ method: 'POST', url: '/api/countries' }).flush(spain);
    await created;
    expect(store.countries()).toEqual([france, spain]);
    expect(store.countries()).not.toBe(before);
  });

  it('update replaces the row', async () => {
    const updated = store.update('1', {
      code: 'FR',
      name: 'République française',
      region: 'europe',
      active: true,
    });
    http
      .expectOne({ method: 'PUT', url: '/api/countries/1' })
      .flush({ ...france, name: 'République française' });
    await updated;
    expect(store.countries()[0]!.name).toBe('République française');
  });

  it('a 409 propagates and leaves the state unchanged', async () => {
    const created = store.create({ code: 'FR', name: 'Again', region: 'europe', active: true });
    http
      .expectOne('/api/countries')
      .flush({ error: 'duplicateCode' }, { status: 409, statusText: 'Conflict' });
    await expect(created).rejects.toMatchObject({ status: 409 });
    expect(store.countries()).toEqual([france]);
  });

  it('remove drops the row', async () => {
    const removed = store.remove('1');
    http.expectOne({ method: 'DELETE', url: '/api/countries/1' }).flush(null);
    await removed;
    expect(store.countries()).toEqual([]);
  });
});
