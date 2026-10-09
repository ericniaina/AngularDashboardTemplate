// Small, dependency-free CSV reading (RFC 4180 style) for in-browser imports.

export type CsvDelimiter = ',' | ';' | '\t';

/**
 * Splits CSV text into rows of cells. Handles quoted cells (`"a, b"`), escaped quotes (`""`),
 * line breaks inside quotes, CRLF/LF line endings and a leading UTF-8 BOM. Lines that are entirely
 * empty are dropped. The delimiter is detected from the first line unless given.
 */
export function parseCsv(text: string, delimiter?: CsvDelimiter): string[][] {
  const source = text.replace(/^﻿/, '');
  const sep = delimiter ?? detectDelimiter(source);
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  const endCell = () => {
    row.push(cell);
    cell = '';
  };
  const endRow = () => {
    endCell();
    if (row.some((value) => value.trim() !== '')) rows.push(row);
    row = [];
  };

  for (let i = 0; i < source.length; i++) {
    const char = source[i]!;
    if (inQuotes) {
      if (char === '"' && source[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        cell += char;
      }
    } else if (char === '"' && cell.trim() === '') {
      cell = '';
      inQuotes = true;
    } else if (char === sep) {
      endCell();
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && source[i + 1] === '\n') i++;
      endRow();
    } else {
      cell += char;
    }
  }
  if (cell !== '' || row.length > 0) endRow();
  return rows;
}

/** The most frequent of `;`, tab and `,` on the first line (outside quotes). Excel in French uses `;`. */
export function detectDelimiter(text: string): CsvDelimiter {
  const firstLine = (text.split(/\r?\n/, 1)[0] ?? '').replace(/"[^"]*"/g, '');
  const count = (char: string) => firstLine.split(char).length - 1;
  const candidates: CsvDelimiter[] = [';', '\t', ','];
  return candidates.reduce(
    (best, candidate) => (count(candidate) > count(best) ? candidate : best),
    ',',
  );
}

/**
 * A number typed by a person or exported by a spreadsheet, in any common format:
 * `1199`, `1199.5`, `1199,5`, `1 199,50`, `1,199.50`, `1.199,50`. `null` if it isn't a number.
 * The last `.` or `,` is the decimal separator; earlier ones and spaces are grouping.
 */
export function parseDecimal(text: string): number | null {
  const compact = text.trim().replace(/[\s  ']/g, '');
  if (!/^[+-]?[\d.,]+$/.test(compact) || !/\d/.test(compact)) return null;
  const lastSeparator = Math.max(compact.lastIndexOf('.'), compact.lastIndexOf(','));
  let normalized = compact;
  if (lastSeparator >= 0) {
    const integer = compact.slice(0, lastSeparator).replace(/[.,]/g, '');
    const fraction = compact.slice(lastSeparator + 1);
    // "1,199" / "1.199" with exactly 3 digits after a single separator is a thousands group.
    const single = (compact.match(/[.,]/g) ?? []).length === 1;
    normalized =
      single && fraction.length === 3 && !/^[+-]?0$/.test(integer)
        ? integer + fraction
        : `${integer}.${fraction}`;
  }
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

/** For matching headers and names: case-, accent- and spacing-insensitive. */
export function normalizeKey(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]/g, '');
}
