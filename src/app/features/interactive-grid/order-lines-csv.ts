// CSV → new order lines, in memory. Pure (unit-tested): no HTTP, no store; the page hands the
// result to `OrderLinesStore.addLines()`, and saving stays the page's single "Save".
import { normalizeKey, parseCsv, parseDecimal } from '../../shared/csv/csv.util';
import type { OrderLine, Product } from './order-line.model';

export type OrderLineValues = Omit<OrderLine, 'id'>;
type Field = 'product' | 'quantity' | 'unitPrice';

/** Accepted header names (compared with `normalizeKey`, so case, accents and spaces don't matter). */
const HEADER_ALIASES: Record<Field, string[]> = {
  product: ['product', 'productid', 'productname', 'produit', 'article'],
  quantity: ['quantity', 'qty', 'quantite', 'qte'],
  unitPrice: ['unitprice', 'price', 'prixunitaire', 'prix', 'pu'],
};
const REQUIRED: Field[] = ['product', 'quantity'];

/** Above this, the file is refused rather than freezing the page. */
export const MAX_IMPORT_ROWS = 1000;

export type CsvImportResult =
  | { ok: true; lines: OrderLineValues[] }
  | { ok: false; error: 'empty' }
  | { ok: false; error: 'tooManyRows'; max: number }
  | { ok: false; error: 'missingColumns'; missing: Field[] };

/**
 * Reads a CSV whose first row is a header: `product;quantity;unitPrice` (any order, `,` `;` or tab,
 * English or French names). Each data row becomes the values of one new line:
 *
 * - `product`: a product id or name (case/accent-insensitive); unknown → `null`, which the grid's
 *   validation then flags like any line missing a product.
 * - `quantity` / `unitPrice`: numbers in `1199.5`, `1 199,50`… formats; unreadable → `null`.
 * - `unitPrice` is optional: empty or absent → the product's list price, as when picking it by hand.
 *
 * Nothing is dropped or "fixed" silently except fully empty rows: invalid values stay visible.
 */
export function readOrderLinesCsv(text: string, products: readonly Product[]): CsvImportResult {
  const rows = parseCsv(text);
  if (rows.length < 2) return { ok: false, error: 'empty' };
  if (rows.length - 1 > MAX_IMPORT_ROWS)
    return { ok: false, error: 'tooManyRows', max: MAX_IMPORT_ROWS };

  const header = rows[0]!.map(normalizeKey);
  const columnOf = (field: Field) =>
    header.findIndex((name) => HEADER_ALIASES[field].includes(name));
  const columns = {
    product: columnOf('product'),
    quantity: columnOf('quantity'),
    unitPrice: columnOf('unitPrice'),
  };
  const missing = REQUIRED.filter((field) => columns[field] < 0);
  if (missing.length) return { ok: false, error: 'missingColumns', missing };

  const byId = new Map(products.map((p) => [p.id, p]));
  const byName = new Map(products.map((p) => [normalizeKey(p.name), p]));
  const findProduct = (cell: string) =>
    byId.get(cell.trim()) ?? byName.get(normalizeKey(cell)) ?? null;
  const cellAt = (row: string[], index: number) => (index >= 0 ? (row[index] ?? '').trim() : '');

  const lines = rows.slice(1).map((row): OrderLineValues => {
    const product = findProduct(cellAt(row, columns.product));
    const quantityText = cellAt(row, columns.quantity);
    const priceText = cellAt(row, columns.unitPrice);
    return {
      productId: product?.id ?? null,
      quantity: quantityText === '' ? null : parseDecimal(quantityText),
      unitPrice: priceText === '' ? (product?.listPrice ?? null) : parseDecimal(priceText),
    };
  });
  return { ok: true, lines };
}

/** The sample offered for download: the expected header and two lines. */
export const SAMPLE_CSV = 'product;quantity;unitPrice\r\nDocking station;2;189\r\nMouse;10;\r\n';
