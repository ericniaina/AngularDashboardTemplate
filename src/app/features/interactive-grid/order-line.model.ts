export interface Product {
  id: string;
  name: string;
  listPrice: number;
}

export interface OrderLine {
  id: string;
  productId: string | null;
  quantity: number | null;
  unitPrice: number | null;
}

export type EditableField = 'productId' | 'quantity' | 'unitPrice';

// ------------------------------------------------------------------ pure row logic (unit-tested)

/** Which fields of a line are invalid: missing product, quantity < 1 (or not whole), negative price. */
export function lineErrors(line: OrderLine): Set<EditableField> {
  const errors = new Set<EditableField>();
  if (!line.productId) errors.add('productId');
  if (line.quantity === null || !Number.isInteger(line.quantity) || line.quantity < 1)
    errors.add('quantity');
  if (line.unitPrice === null || line.unitPrice < 0) errors.add('unitPrice');
  return errors;
}

export function lineAmount(line: OrderLine): number | null {
  return line.quantity !== null && line.unitPrice !== null ? line.quantity * line.unitPrice : null;
}

export function blankLine(id: string): OrderLine {
  return { id, productId: null, quantity: 1, unitPrice: null };
}

/** Clones each selected line with a new id, inserted right below its source. */
export function duplicateLines(
  lines: OrderLine[],
  ids: ReadonlySet<string>,
  newId: () => string,
): OrderLine[] {
  return lines.flatMap((line) => (ids.has(line.id) ? [line, { ...line, id: newId() }] : [line]));
}

export function removeLines(lines: OrderLine[], ids: ReadonlySet<string>): OrderLine[] {
  return lines.filter((line) => !ids.has(line.id));
}

/** A new array with one field changed. Picking a product pre-fills its list price. */
export function applyCellEdit(
  lines: OrderLine[],
  id: string,
  field: EditableField,
  value: unknown,
  products: readonly Product[],
): OrderLine[] {
  return lines.map((line) => {
    if (line.id !== id) return line;
    if (field === 'productId') {
      const product = products.find((p) => p.id === value);
      return {
        ...line,
        productId: product?.id ?? null,
        unitPrice: product ? product.listPrice : line.unitPrice,
      };
    }
    const number = value === null || value === '' || value === undefined ? null : Number(value);
    return { ...line, [field]: number !== null && Number.isNaN(number) ? null : number };
  });
}

/** Same lines, same order, same values. Editing a value back to the original makes it equal again. */
export function sameLines(a: readonly OrderLine[], b: readonly OrderLine[]): boolean {
  return (
    a.length === b.length &&
    a.every(
      (line, i) =>
        line.id === b[i]!.id &&
        line.productId === b[i]!.productId &&
        line.quantity === b[i]!.quantity &&
        line.unitPrice === b[i]!.unitPrice,
    )
  );
}

export function totals(lines: readonly OrderLine[]): { quantity: number; amount: number } {
  return lines.reduce(
    (sum, line) => ({
      quantity: sum.quantity + (line.quantity ?? 0),
      amount: sum.amount + (lineAmount(line) ?? 0),
    }),
    { quantity: 0, amount: 0 },
  );
}
