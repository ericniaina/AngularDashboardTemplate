import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { provideI18nTesting } from '../../../core/i18n/testing';
import { DataTableComponent } from './data-table.component';
import type { DataTableColumn } from './data-table.model';

// jsdom has no ResizeObserver (spartan's select measures its trigger with it).
globalThis.ResizeObserver ??= class {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
};

interface Item {
  id: string;
  name: string;
  size: number;
}

@Component({
  imports: [DataTableComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-data-table
      label="Items"
      [rows]="rows()"
      [columns]="columns"
      [rowId]="rowId"
      [pageSizes]="[2]"
      [selectable]="true"
      [(selected)]="selected"
      (rowActivate)="activated.set($event)"
    />
  `,
})
class HostComponent {
  readonly rows = signal<Item[] | null>([
    { id: 'a', name: 'Banana', size: 3 },
    { id: 'b', name: 'apple', size: 1 },
    { id: 'c', name: 'Cherry', size: 2 },
  ]);
  readonly columns: DataTableColumn<Item>[] = [
    { id: 'name', header: 'Name', value: (i) => i.name },
    { id: 'size', header: 'Size', value: (i) => i.size, filter: false },
  ];
  readonly rowId = (item: Item) => item.id;
  readonly selected = signal<readonly string[]>([]);
  readonly activated = signal<Item | null>(null);
}

describe('DataTableComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;
  const el = () => fixture.nativeElement as HTMLElement;
  const names = () =>
    [...el().querySelectorAll('tr[cdk-row] td:nth-child(2)')].map((td) => td.textContent!.trim());

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideI18nTesting()] });
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('pages the rows', async () => {
    expect(names()).toEqual(['Banana', 'apple']);
    (el().querySelector('[aria-label="common.table.nextPage"]') as HTMLButtonElement).click();
    await fixture.whenStable();
    expect(names()).toEqual(['Cherry']);
  });

  it('sorts when a header is clicked, and exposes aria-sort', async () => {
    const header = el().querySelector('th[aria-sort] button') as HTMLButtonElement;
    header.click();
    await fixture.whenStable();
    expect(names()).toEqual(['apple', 'Banana']);
    expect(header.closest('th')!.getAttribute('aria-sort')).toBe('ascending');
  });

  it('filters with the global search and goes back to page 1', async () => {
    (el().querySelector('[aria-label="common.table.nextPage"]') as HTMLButtonElement).click();
    await fixture.whenStable();
    const search = el().querySelector('input[type="search"]') as HTMLInputElement;
    search.value = 'APP';
    search.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(names()).toEqual(['apple']);
  });

  it('shows the empty state with a clear-filters action when nothing matches', async () => {
    const search = el().querySelector('input[type="search"]') as HTMLInputElement;
    search.value = 'zzz';
    search.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(el().textContent).toContain('common.table.noMatches');
    const clear = [...el().querySelectorAll('button')].find((b) =>
      b.textContent!.includes('common.table.clearFilters'),
    )!;
    clear.click();
    await fixture.whenStable();
    expect(names()).toEqual(['Banana', 'apple']);
  });

  it('selects rows by id and keeps the selection across new row arrays', async () => {
    const firstRowCheckbox = el().querySelector(
      'tr[cdk-row] button[role="checkbox"]',
    ) as HTMLElement;
    firstRowCheckbox.click();
    await fixture.whenStable();
    expect(host.selected()).toEqual(['a']);

    host.rows.update((rows) => rows!.map((r) => ({ ...r })));
    await fixture.whenStable();
    expect(el().querySelector('tr[cdk-row]')!.getAttribute('data-state')).toBe('selected');
  });

  it('emits rowActivate on double-click', async () => {
    el().querySelector('tr[cdk-row]')!.dispatchEvent(new MouseEvent('dblclick'));
    expect(host.activated()?.id).toBe('a');
  });
});
