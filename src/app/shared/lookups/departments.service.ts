import { httpResource } from '@angular/common/http';
import { computed, Injectable } from '@angular/core';

export interface Department {
  id: string;
  name: string;
}

/** Department lookup, loaded once and shared by the employees page and the onboarding wizard. */
@Injectable({ providedIn: 'root' })
export class DepartmentsService {
  private readonly resource = httpResource<Department[]>(() => '/api/departments');

  readonly departments = computed(() => (this.resource.hasValue() ? this.resource.value() : []));
  readonly isLoading = this.resource.isLoading;
  readonly nameById = computed(() => new Map(this.departments().map((d) => [d.id, d.name])));
}
