import { describe, expect, it } from 'vitest';
import { termProgress } from '../src/services/clock';
import type { TermDate } from '../src/services/clock';

// 2026-01-05 (Mon) … 2026-03-27 (Fri) = 12 weeks. Overlays (half-term) don't affect the count —
// the badge is "week of term", matching how schools number weeks.
const terms: TermDate[] = [
  { startDate: '2026-01-05', endDate: '2026-03-27', kind: 'term', name: 'Spring' },
  { startDate: '2026-02-16', endDate: '2026-02-20', kind: 'half_term', name: 'Half term' },
];

describe('termProgress (week-of-term badge on Now)', () => {
  it('first week', () => {
    expect(termProgress('2026-01-05', terms)).toEqual({ name: 'Spring', week: 1, weeksTotal: 12, weeksLeft: 11 });
    expect(termProgress('2026-01-09', terms)?.week).toBe(1); // Friday of week 1
  });

  it('mid-term and last week', () => {
    expect(termProgress('2026-02-23', terms)?.week).toBe(8);
    const last = termProgress('2026-03-27', terms);
    expect(last?.week).toBe(12);
    expect(last?.weeksLeft).toBe(0);
  });

  it('null outside term time (holidays between terms)', () => {
    expect(termProgress('2026-04-01', terms)).toBeNull();
  });

  it('half-term overlay does not hide the term (date still inside the term range)', () => {
    expect(termProgress('2026-02-17', terms)?.name).toBe('Spring');
  });
});
