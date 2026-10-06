import {
  compareValues,
  filterRows,
  nextSort,
  normalizeText,
  paginate,
  sortRows,
} from './data-table.logic';
import type { DataTableColumn } from './data-table.model';

interface Row {
  id: string;
  name: string;
  region: string;
  amount: number | null;
  date: string;
}

const regionLabels: Record<string, string> = { asia: 'Asie', europe: 'Europe' };

const columns: DataTableColumn<Row>[] = [
  { id: 'name', header: 'Name', value: (r) => r.name },
  {
    id: 'region',
    header: 'Region',
    value: (r) => r.region,
    display: (r) => regionLabels[r.region]!,
    filter: { type: 'select', options: [] },
  },
  { id: 'amount', header: 'Amount', value: (r) => r.amount },
  { id: 'date', header: 'Date', value: (r) => r.date, display: (r) => `shown ${r.date}` },
];

const rows: Row[] = [
  { id: '1', name: 'États-Unis', region: 'europe', amount: 10, date: '2024-03-01' },
  { id: '2', name: 'Japon', region: 'asia', amount: 2, date: '2023-12-31' },
  { id: '3', name: 'item 10', region: 'asia', amount: null, date: '2024-01-15' },
  { id: '4', name: 'item 9', region: 'europe', amount: 2, date: '2022-06-30' },
];

const ids = (list: Row[]) => list.map((r) => r.id);
const collator = new Intl.Collator('fr', { numeric: true, sensitivity: 'base' });
const noFilter = { search: '', columnFilters: {}, external: null };

describe('data table logic', () => {
  it('normalizes case and accents', () => {
    expect(normalizeText('  États ')).toBe('etats');
  });

  describe('filterRows', () => {
    it('searches the displayed text, accent- and case-insensitively', () => {
      expect(ids(filterRows(rows, columns, { ...noFilter, search: 'asie' }))).toEqual(['2', '3']);
      expect(ids(filterRows(rows, columns, { ...noFilter, search: 'etats' }))).toEqual(['1']);
      expect(ids(filterRows(rows, columns, { ...noFilter, search: 'shown 2022' }))).toEqual(['4']);
    });

    it('applies text and select column filters together', () => {
      const result = filterRows(rows, columns, {
        ...noFilter,
        columnFilters: { name: 'ITEM', region: 'europe' },
      });
      expect(ids(result)).toEqual(['4']);
    });

    it('ignores empty filters and applies the external predicate', () => {
      const result = filterRows(rows, columns, {
        search: '',
        columnFilters: { name: '' },
        external: (r) => r.amount === 2,
      });
      expect(ids(result)).toEqual(['2', '4']);
    });
  });

  describe('sortRows', () => {
    it('sorts strings with numeric collation', () => {
      const asc = sortRows(rows, columns, { columnId: 'name', direction: 'asc' }, collator);
      expect(asc.map((r) => r.name)).toEqual(['États-Unis', 'item 9', 'item 10', 'Japon']);
    });

    it('sorts numbers numerically, stable on ties, empty values last in both directions', () => {
      expect(
        ids(sortRows(rows, columns, { columnId: 'amount', direction: 'asc' }, collator)),
      ).toEqual(['2', '4', '1', '3']);
      expect(
        ids(sortRows(rows, columns, { columnId: 'amount', direction: 'desc' }, collator)),
      ).toEqual(['1', '2', '4', '3']);
    });

    it('sorts on the raw value, not the displayed text (ISO dates)', () => {
      expect(
        ids(sortRows(rows, columns, { columnId: 'date', direction: 'asc' }, collator)),
      ).toEqual(['4', '2', '3', '1']);
    });

    it('returns a copy when unsorted', () => {
      const result = sortRows(rows, columns, null, collator);
      expect(result).toEqual(rows);
      expect(result).not.toBe(rows);
    });
  });

  it('cycles the sort: none → asc → desc → none, restarting on another column', () => {
    const asc = nextSort(null, 'name');
    expect(asc).toEqual({ columnId: 'name', direction: 'asc' });
    const desc = nextSort(asc, 'name');
    expect(desc).toEqual({ columnId: 'name', direction: 'desc' });
    expect(nextSort(desc, 'name')).toBeNull();
    expect(nextSort(desc, 'amount')).toEqual({ columnId: 'amount', direction: 'asc' });
  });

  it('compares nulls last', () => {
    expect(compareValues(null, 1, collator)).toBeGreaterThan(0);
    expect(compareValues('', '', collator)).toBe(0);
  });

  describe('paginate', () => {
    const many = Array.from({ length: 25 }, (_, i) => i);

    it('slices a page and reports the range', () => {
      expect(paginate(many, 1, 10)).toMatchObject({
        rows: [10, 11, 12, 13, 14, 15, 16, 17, 18, 19],
        from: 11,
        to: 20,
        total: 25,
        pageCount: 3,
      });
    });

    it('clamps the page index to the last page', () => {
      expect(paginate(many, 9, 10)).toMatchObject({ pageIndex: 2, from: 21, to: 25 });
    });

    it('handles an empty list', () => {
      expect(paginate([], 0, 10)).toMatchObject({
        rows: [],
        pageIndex: 0,
        pageCount: 1,
        from: 0,
        to: 0,
        total: 0,
      });
    });
  });
});
