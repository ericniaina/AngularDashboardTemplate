import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import {
  applyCellEdit,
  blankLine,
  duplicateLines,
  type EditableField,
  lineErrors,
  type OrderLine,
  type Product,
  removeLines,
  sameLines,
  totals,
} from './order-line.model';

/**
 * The source of truth for the editable table. The table only renders `lines()`; every edit, add,
 * duplicate, removal or CSV import comes here and produces a new array. Nothing is sent until
 * `save()`.
 */
@Injectable()
export class OrderLinesStore {
  private readonly http = inject(HttpClient);

  private readonly _lines = signal<OrderLine[]>([]);
  private readonly _saved = signal<OrderLine[]>([]);
  private readonly _products = signal<Product[]>([]);
  private readonly _loading = signal(false);
  private readonly _loaded = signal(false);
  private readonly _saving = signal(false);

  readonly lines = this._lines.asReadonly();
  readonly products = this._products.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly loaded = this._loaded.asReadonly();
  readonly saving = this._saving.asReadonly();

  readonly dirty = computed(() => !sameLines(this._lines(), this._saved()));
  readonly errorsById = computed(
    () => new Map(this._lines().map((line) => [line.id, lineErrors(line)])),
  );
  readonly invalidCount = computed(
    () => [...this.errorsById().values()].filter((e) => e.size > 0).length,
  );
  readonly totals = computed(() => totals(this._lines()));
  readonly canSave = computed(() => this.dirty() && this.invalidCount() === 0 && !this._saving());

  async load(): Promise<void> {
    this._loading.set(true);
    try {
      const [products, lines] = await Promise.all([
        firstValueFrom(this.http.get<Product[]>('/api/products')),
        firstValueFrom(this.http.get<OrderLine[]>('/api/order-lines')),
      ]);
      this._products.set(products);
      this._lines.set(lines);
      this._saved.set(lines);
      this._loaded.set(true);
    } finally {
      this._loading.set(false);
    }
  }

  /** Appends a blank line and returns its id (so the page can open its product cell). */
  addLine(): string {
    const line = blankLine(newLineId());
    this._lines.update((lines) => [...lines, line]);
    return line.id;
  }

  /** Appends lines with the given values (e.g. from a CSV import) and returns their new ids. */
  addLines(values: readonly Omit<OrderLine, 'id'>[]): string[] {
    const added = values.map((v) => ({ id: newLineId(), ...v }));
    this._lines.update((lines) => [...lines, ...added]);
    return added.map((line) => line.id);
  }

  duplicate(ids: readonly string[]): void {
    this._lines.update((lines) => duplicateLines(lines, new Set(ids), newLineId));
  }

  remove(ids: readonly string[]): void {
    this._lines.update((lines) => removeLines(lines, new Set(ids)));
  }

  edit(id: string, field: EditableField, value: unknown): void {
    this._lines.update((lines) => applyCellEdit(lines, id, field, value, this._products()));
  }

  discard(): void {
    this._lines.set(this._saved());
  }

  async save(): Promise<void> {
    this._saving.set(true);
    try {
      const saved = await firstValueFrom(
        this.http.put<OrderLine[]>('/api/order-lines', this._lines()),
      );
      this._saved.set(saved);
      this._lines.set(saved);
    } finally {
      this._saving.set(false);
    }
  }
}

function newLineId(): string {
  return `l-${crypto.randomUUID()}`;
}
