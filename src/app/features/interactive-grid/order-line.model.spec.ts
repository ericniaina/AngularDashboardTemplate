import {
  applyCellEdit,
  duplicateLines,
  lineErrors,
  type OrderLine,
  type Product,
  removeLines,
  sameLines,
  totals,
} from './order-line.model';

const products: Product[] = [
  { id: 'p-1', name: 'Laptop', listPrice: 1000 },
  { id: 'p-2', name: 'Mouse', listPrice: 25 },
];

const lines: OrderLine[] = [
  { id: 'a', productId: 'p-1', quantity: 2, unitPrice: 1000 },
  { id: 'b', productId: 'p-2', quantity: 3, unitPrice: 25 },
  { id: 'c', productId: 'p-2', quantity: 1, unitPrice: 20 },
];

describe('order line logic', () => {
  it('flags missing product, quantity < 1 or fractional, negative price', () => {
    expect(
      [...lineErrors({ id: 'x', productId: null, quantity: 0, unitPrice: -1 })].sort(),
    ).toEqual(['productId', 'quantity', 'unitPrice']);
    expect(lineErrors({ id: 'x', productId: 'p-1', quantity: 1.5, unitPrice: 0 })).toEqual(
      new Set(['quantity']),
    );
    expect(lineErrors(lines[0]!).size).toBe(0);
  });

  it('duplicates each selected line right below its source, with a new id', () => {
    let n = 0;
    const result = duplicateLines(lines, new Set(['a', 'c']), () => `new-${++n}`);
    expect(result.map((l) => l.id)).toEqual(['a', 'new-1', 'b', 'c', 'new-2']);
    expect(result[1]).toEqual({ ...lines[0], id: 'new-1' });
  });

  it('removes selected lines without mutating the input', () => {
    const result = removeLines(lines, new Set(['b']));
    expect(result.map((l) => l.id)).toEqual(['a', 'c']);
    expect(lines).toHaveLength(3);
  });

  it('picking a product pre-fills its list price', () => {
    const result = applyCellEdit(lines, 'c', 'productId', 'p-1', products);
    expect(result[2]).toEqual({ id: 'c', productId: 'p-1', quantity: 1, unitPrice: 1000 });
    expect(result[0]).toBe(lines[0]); // untouched rows keep their identity
  });

  it('number edits accept numbers and clear on empty input', () => {
    expect(applyCellEdit(lines, 'a', 'quantity', 5, products)[0]!.quantity).toBe(5);
    expect(applyCellEdit(lines, 'a', 'unitPrice', null, products)[0]!.unitPrice).toBeNull();
    expect(applyCellEdit(lines, 'a', 'quantity', 'abc', products)[0]!.quantity).toBeNull();
  });

  it('editing a value back to the original makes the lines equal again', () => {
    const edited = applyCellEdit(lines, 'a', 'quantity', 9, products);
    expect(sameLines(edited, lines)).toBe(false);
    expect(sameLines(applyCellEdit(edited, 'a', 'quantity', 2, products), lines)).toBe(true);
  });

  it('computes totals', () => {
    expect(totals(lines)).toEqual({ quantity: 6, amount: 2000 + 75 + 20 });
  });
});
