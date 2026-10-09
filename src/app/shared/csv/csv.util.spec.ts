import { detectDelimiter, normalizeKey, parseCsv, parseDecimal } from './csv.util';

describe('parseCsv', () => {
  it('splits rows and cells, with CRLF or LF', () => {
    expect(parseCsv('a,b\r\n1,2\n3,4')).toEqual([
      ['a', 'b'],
      ['1', '2'],
      ['3', '4'],
    ]);
  });

  it('handles quoted cells, escaped quotes and line breaks inside quotes', () => {
    expect(parseCsv('name,note\n"Laptop 14""","a, b\nc"')).toEqual([
      ['name', 'note'],
      ['Laptop 14"', 'a, b\nc'],
    ]);
  });

  it('detects ; (Excel in French) and tab delimiters', () => {
    expect(detectDelimiter('product;quantity;unitPrice')).toBe(';');
    expect(detectDelimiter('product\tquantity')).toBe('\t');
    expect(detectDelimiter('"a;b",c')).toBe(',');
    expect(parseCsv('a;b\n"1,5";2')).toEqual([
      ['a', 'b'],
      ['1,5', '2'],
    ]);
  });

  it('strips a UTF-8 BOM and drops fully empty lines', () => {
    expect(parseCsv('﻿a,b\n\n , \n1,2\n')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });

  it('keeps empty cells', () => {
    expect(parseCsv('a,b,c\n1,,3')).toEqual([
      ['a', 'b', 'c'],
      ['1', '', '3'],
    ]);
  });
});

describe('parseDecimal', () => {
  it.each([
    ['1199', 1199],
    ['1199.5', 1199.5],
    ['1199,5', 1199.5],
    ['1 199,50', 1199.5],
    ['1 199,50', 1199.5],
    ['1,199.50', 1199.5],
    ['1.199,50', 1199.5],
    ['1,199', 1199],
    ['0,125', 0.125],
    ['-3', -3],
  ])('%s → %s', (text, expected) => {
    expect(parseDecimal(text)).toBe(expected);
  });

  it('returns null for anything that is not a number', () => {
    expect(parseDecimal('')).toBeNull();
    expect(parseDecimal('abc')).toBeNull();
    expect(parseDecimal('12 €')).toBeNull();
    expect(parseDecimal('.')).toBeNull();
  });
});

it('normalizeKey ignores case, accents and separators', () => {
  expect(normalizeKey(' Quantité ')).toBe('quantite');
  expect(normalizeKey('Unit price')).toBe('unitprice');
  expect(normalizeKey('Prix_unitaire')).toBe('prixunitaire');
});
