import { describe, it, expect } from 'vitest';
import { resolvePlannerDrop, resolvePlannerAct } from '../src/lib/plannerDrop';

// 15.2a — the planner gesture→op resolution, formerly untested inline DRAG_SCRIPT branching. Every
// gesture the page can produce is exercised here so the client logic is no longer untested.
const noDrag = { dragPlan: null, dragUnit: null, fromDate: null, fromTll: null };
const cell = (date: string | null, tll: string | null, isNone = false) => ({ date, tll, isNone });

describe('resolvePlannerDrop (drag → /planner/place op)', () => {
  it('tray lesson → empty slot is an insert', () => {
    const r = resolvePlannerDrop({ ...noDrag, dragPlan: '42' }, cell('2026-06-15', '10'));
    expect(r).toEqual({ op: 'insert', params: { plan: '42', date: '2026-06-15', tll: '10' } });
  });

  it('tray lesson → occupied slot is ALSO an insert (the cascade is resolved server-side)', () => {
    // The client doesn't know/decide cascade vs simple insert — it always sends insert; the route's
    // cascadeInsert pushes the occupant along. So an occupied target is the same op.
    const r = resolvePlannerDrop({ ...noDrag, dragPlan: '7' }, cell('2026-06-16', '11'));
    expect(r).toEqual({ op: 'insert', params: { plan: '7', date: '2026-06-16', tll: '11' } });
  });

  it('placed lesson dragged to another slot is a move (carries the source)', () => {
    const r = resolvePlannerDrop(
      { dragPlan: '99', dragUnit: null, fromDate: '2026-06-10', fromTll: '10' },
      cell('2026-06-17', '12'),
    );
    expect(r).toEqual({
      op: 'move',
      params: { plan: '99', date: '2026-06-17', tll: '12', fromDate: '2026-06-10', fromTll: '10' },
    });
  });

  it('whole-unit drag onto a slot is a unit lay-down (unit wins over any stray plan id)', () => {
    const r = resolvePlannerDrop({ dragPlan: null, dragUnit: '5', fromDate: null, fromTll: null }, cell('2026-06-15', '10'));
    expect(r).toEqual({ op: 'unit', params: { unit: '5', date: '2026-06-15', tll: '10' } });
  });

  it('a missing fromTll on a move is sent as an empty string (not "null")', () => {
    const r = resolvePlannerDrop({ dragPlan: '3', dragUnit: null, fromDate: '2026-06-10', fromTll: null }, cell('2026-06-17', '12'));
    expect(r?.params.fromTll).toBe('');
  });

  it('drop onto a .pl-none cell is a no-op', () => {
    expect(resolvePlannerDrop({ ...noDrag, dragPlan: '42' }, cell('2026-06-15', '10', true))).toBeNull();
  });

  it('drop with no drag payload is a no-op', () => {
    expect(resolvePlannerDrop(noDrag, cell('2026-06-15', '10'))).toBeNull();
  });

  it('drop onto a cell with no date/slot is a no-op', () => {
    expect(resolvePlannerDrop({ ...noDrag, dragPlan: '42' }, cell(null, null))).toBeNull();
  });

  it('treats empty-string drag attributes as absent (no-op)', () => {
    expect(resolvePlannerDrop({ dragPlan: '', dragUnit: '', fromDate: '', fromTll: '' }, cell('2026-06-15', '10'))).toBeNull();
  });
});

describe('resolvePlannerAct (in-cell ✕ / 🔓 / 🔒 button → op)', () => {
  it('✕ pull → pull op on the cell', () => {
    expect(resolvePlannerAct('pull', { date: '2026-06-15', tll: '10' })).toEqual({
      op: 'pull',
      params: { date: '2026-06-15', tll: '10' },
    });
  });

  it('🔓 lock and 🔒 unlock resolve to their ops', () => {
    expect(resolvePlannerAct('lock', { date: '2026-06-15', tll: '10' })?.op).toBe('lock');
    expect(resolvePlannerAct('unlock', { date: '2026-06-15', tll: '10' })?.op).toBe('unlock');
  });

  it('an unknown action is a no-op', () => {
    expect(resolvePlannerAct('explode', { date: '2026-06-15', tll: '10' })).toBeNull();
    expect(resolvePlannerAct(null, { date: '2026-06-15', tll: '10' })).toBeNull();
  });

  it('a cell with no date/slot is a no-op', () => {
    expect(resolvePlannerAct('pull', { date: null, tll: null })).toBeNull();
  });
});
