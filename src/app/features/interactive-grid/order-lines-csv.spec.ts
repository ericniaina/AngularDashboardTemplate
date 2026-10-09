import type { Product } from './order-line.model';
import { MAX_IMPORT_ROWS, readOrderLinesCsv, SAMPLE_CSV } from './order-lines-csv';

const products: Product[] = [
  { id: 'p-1', name: 'Laptop 14"', listPrice: 1199 },
  { id: 'p-3', name: 'Docking station', listPrice: 189 },
  { id: 'p-5', name: 'Mouse', listPrice: 39 },
];

describe('readOrderLinesCsv', () => {
  it('reads the sample file', () => {
    expect(readOrderLinesCsv(SAMPLE_CSV, products)).toEqual({
      ok: true,
      lines: [
        { productId: 'p-3', quantity: 2, unitPrice: 189 },
        { productId: 'p-5', quantity: 10, unitPrice: 39 },
      ],
    });
  });

  it('matches products by id or by name, case- and accent-insensitively', () => {
    const csv = 'product,quantity\np-1,1\n  docking STATION ,2';
    const result = readOrderLinesCsv(csv, products);
    expect(result.ok && result.lines.map((l) => l.productId)).toEqual(['p-1', 'p-3']);
  });

  it('accepts French headers, any column order and decimal commas', () => {
    const csv = 'Prix unitaire;Quantité;Produit\n"1 150,50";3;Mouse';
    expect(readOrderLinesCsv(csv, products)).toEqual({
      ok: true,
      lines: [{ productId: 'p-5', quantity: 3, unitPrice: 1150.5 }],
    });
  });

  it('defaults the unit price to the list price when empty or absent', () => {
    const result = readOrderLinesCsv('product,quantity\nMouse,4', products);
    expect(result.ok && result.lines[0]!.unitPrice).toBe(39);
  });

  it('keeps unknown products and unreadable numbers as null, for the grid to flag', () => {
    const csv = 'product;quantity;unitPrice\nKeyboard;two;\nMouse;1;free';
    expect(readOrderLinesCsv(csv, products)).toEqual({
      ok: true,
      lines: [
        { productId: null, quantity: null, unitPrice: null },
        { productId: 'p-5', quantity: 1, unitPrice: null },
      ],
    });
  });

  it('refuses a file without data rows', () => {
    expect(readOrderLinesCsv('product;quantity\n', products)).toEqual({
      ok: false,
      error: 'empty',
    });
    expect(readOrderLinesCsv('', products)).toEqual({ ok: false, error: 'empty' });
  });

  it('refuses a file without the required columns', () => {
    expect(readOrderLinesCsv('name;amount\nMouse;2', products)).toEqual({
      ok: false,
      error: 'missingColumns',
      missing: ['product', 'quantity'],
    });
  });

  it('refuses files above the row limit', () => {
    const csv = 'product;quantity\n' + 'Mouse;1\n'.repeat(MAX_IMPORT_ROWS + 1);
    expect(readOrderLinesCsv(csv, products)).toEqual({
      ok: false,
      error: 'tooManyRows',
      max: MAX_IMPORT_ROWS,
    });
  });
});
