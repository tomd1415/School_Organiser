import { describe, it, expect } from 'vitest';
import { parseSpecPoints } from '../src/lib/specImport';

describe('parseSpecPoints (idea 10)', () => {
  it('splits a leading statement code from the title', () => {
    expect(parseSpecPoints('1.1.1 The purpose of the CPU')).toEqual([{ code: '1.1.1', title: 'The purpose of the CPU' }]);
    expect(parseSpecPoints('3a Boolean logic')).toEqual([{ code: '3a', title: 'Boolean logic' }]);
  });

  it('uncoded lines use the whole line as code AND title (so re-import upserts, not duplicates)', () => {
    expect(parseSpecPoints('Networks and the internet')).toEqual([{ code: 'Networks and the internet', title: 'Networks and the internet' }]);
  });

  it('strips bullets/indent, drops blank lines, and dedupes by code within a paste', () => {
    const r = parseSpecPoints('  • 1.1 Systems architecture\n\n- 1.1 a duplicate\n1.2 Memory');
    expect(r).toEqual([
      { code: '1.1', title: 'Systems architecture' },
      { code: '1.2', title: 'Memory' },
    ]);
  });

  it('tolerates a delimiter after the code (1.1.2) Von Neumann)', () => {
    expect(parseSpecPoints('1.1.2) Von Neumann architecture')[0]).toEqual({ code: '1.1.2', title: 'Von Neumann architecture' });
  });

  it('returns nothing for empty input', () => {
    expect(parseSpecPoints('')).toEqual([]);
    expect(parseSpecPoints('   \n\n')).toEqual([]);
  });
});
