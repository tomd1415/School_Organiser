import { describe, it, expect } from 'vitest';
import { parseCsv } from '../src/lib/csv';

describe('parseCsv (10.26)', () => {
  it('parses quoted fields with commas, escaped quotes, and CRLF', () => {
    const r = parseCsv('Name,Class\r\n"Smith, Alex",8B\n"He said ""hi""",9A\n');
    expect(r).toEqual([
      ['Name', 'Class'],
      ['Smith, Alex', '8B'],
      ['He said "hi"', '9A'],
    ]);
  });
  it('drops fully-blank rows but keeps partial ones', () => {
    expect(parseCsv('a,b\n\n \nc,d')).toEqual([['a', 'b'], ['c', 'd']]);
  });
  it('handles a trailing field with no newline', () => {
    expect(parseCsv('x,y')).toEqual([['x', 'y']]);
  });
});
