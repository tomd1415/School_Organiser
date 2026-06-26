import { describe, expect, it } from 'vitest';
import { resultsVisible } from '../src/services/assessmentResults';

// Phase 5 — the pure pupil-visibility gate. Results show only for a SUBMITTED attempt, and (unless instant)
// only once released. (Confirmed-only is enforced by the DB read; tested in the integration suite.)

describe('resultsVisible', () => {
  it('hides results for an unsubmitted / missing attempt', () => {
    expect(resultsVisible('instant', null, 'in_progress')).toBe(false);
    expect(resultsVisible('instant', null, null)).toBe(false);
    expect(resultsVisible('on_release', '2026-07-01T09:00:00Z', 'in_progress')).toBe(false);
  });

  it('on_release: held until released', () => {
    expect(resultsVisible('on_release', null, 'submitted')).toBe(false);
    expect(resultsVisible('on_release', '2026-07-01T09:00:00Z', 'submitted')).toBe(true);
  });

  it('instant: visible as soon as submitted', () => {
    expect(resultsVisible('instant', null, 'submitted')).toBe(true);
  });
});
