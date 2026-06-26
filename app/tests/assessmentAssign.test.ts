import { describe, expect, it } from 'vitest';
import { validateWindow } from '../src/services/assessmentAssign';

// Phase 2 — pure availability-window validation. Both bounds optional; close must be after open.

describe('validateWindow', () => {
  it('null/null is valid (available immediately, no close)', () => {
    expect(validateWindow(null, null)).toEqual({ ok: true, from: null, until: null });
    expect(validateWindow('', '')).toEqual({ ok: true, from: null, until: null });
  });

  it('normalises a valid range to ISO', () => {
    const r = validateWindow('2026-07-01T09:00', '2026-07-08T16:00');
    expect(r.ok).toBe(true);
    expect(r.from).toMatch(/^2026-07-01T/);
    expect(r.until).toMatch(/^2026-07-08T/);
  });

  it('treats a tz-less datetime-local value as UTC (round-trips exactly, no server-offset drift)', () => {
    // The repo renders the stored column back as a 'Z' string the view slices verbatim; parsing as UTC
    // makes the wall-clock survive a non-UTC server. 09:00 in → 09:00:00Z out (not shifted by an offset).
    expect(validateWindow('2026-07-01T09:00', null).from).toBe('2026-07-01T09:00:00.000Z');
    expect(validateWindow(null, '2026-07-08T16:30:00').until).toBe('2026-07-08T16:30:00.000Z');
    // an explicit-offset value is respected as given
    expect(validateWindow('2026-07-01T09:00:00Z', null).from).toBe('2026-07-01T09:00:00.000Z');
  });

  it('rejects close <= open', () => {
    expect(validateWindow('2026-07-08T16:00', '2026-07-01T09:00').ok).toBe(false);
    expect(validateWindow('2026-07-01T09:00', '2026-07-01T09:00').ok).toBe(false);
  });

  it('rejects an unparseable date', () => {
    expect(validateWindow('not-a-date', null).ok).toBe(false);
    expect(validateWindow(null, 'rubbish').ok).toBe(false);
  });

  it('allows an open-only or close-only window', () => {
    expect(validateWindow('2026-07-01T09:00', null).ok).toBe(true);
    expect(validateWindow(null, '2026-07-08T16:00').ok).toBe(true);
  });
});
