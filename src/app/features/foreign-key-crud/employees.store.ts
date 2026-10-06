import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import type { Employee, EmployeeInput } from './employee.model';

/** Employees CRUD state, scoped to the page. New arrays on every change, never mutated. */
@Injectable()
export class EmployeesStore {
  private readonly http = inject(HttpClient);

  private readonly _employees = signal<Employee[]>([]);
  private readonly _loading = signal(false);
  private readonly _loaded = signal(false);

  readonly employees = this._employees.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly loaded = this._loaded.asReadonly();

  async load(): Promise<void> {
    this._loading.set(true);
    try {
      this._employees.set(await firstValueFrom(this.http.get<Employee[]>('/api/employees')));
      this._loaded.set(true);
    } finally {
      this._loading.set(false);
    }
  }

  async create(input: EmployeeInput): Promise<void> {
    const created = await firstValueFrom(this.http.post<Employee>('/api/employees', input));
    this._employees.update((list) => [...list, created]);
  }

  async update(id: string, input: EmployeeInput): Promise<void> {
    const updated = await firstValueFrom(this.http.put<Employee>(`/api/employees/${id}`, input));
    this._employees.update((list) => list.map((e) => (e.id === id ? updated : e)));
  }

  async remove(id: string): Promise<void> {
    await firstValueFrom(this.http.delete<void>(`/api/employees/${id}`));
    this._employees.update((list) => list.filter((e) => e.id !== id));
  }
}
