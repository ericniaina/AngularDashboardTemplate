import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import type { Country, CountryInput } from './country.model';

/**
 * Countries CRUD state, scoped to the page (provided in its `providers`). Signals are replaced with
 * new arrays on every change, never mutated. HTTP errors propagate to the caller; 401/403 were
 * already handled by the interceptor.
 */
@Injectable()
export class CountriesStore {
  private readonly http = inject(HttpClient);

  private readonly _countries = signal<Country[]>([]);
  private readonly _loading = signal(false);
  private readonly _loaded = signal(false);

  readonly countries = this._countries.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly loaded = this._loaded.asReadonly();
  readonly codes = computed(() => this._countries().map((c) => c.code));

  async load(): Promise<void> {
    this._loading.set(true);
    try {
      this._countries.set(await firstValueFrom(this.http.get<Country[]>('/api/countries')));
      this._loaded.set(true);
    } finally {
      this._loading.set(false);
    }
  }

  async create(input: CountryInput): Promise<Country> {
    const created = await firstValueFrom(this.http.post<Country>('/api/countries', input));
    this._countries.update((list) => [...list, created]);
    return created;
  }

  async update(id: string, input: CountryInput): Promise<Country> {
    const updated = await firstValueFrom(this.http.put<Country>(`/api/countries/${id}`, input));
    this._countries.update((list) => list.map((c) => (c.id === id ? updated : c)));
    return updated;
  }

  async remove(id: string): Promise<void> {
    await firstValueFrom(this.http.delete<void>(`/api/countries/${id}`));
    this._countries.update((list) => list.filter((c) => c.id !== id));
  }
}
