import { describe, it, expect } from 'vitest';
import { buildSchemeTree, type PlanRow, type UnitRow } from '../src/services/scheme';
import { renderPlan } from '../src/lib/schemeView';

const units: UnitRow[] = [
  { id: 2, title: 'B', displayOrder: 1 },
  { id: 1, title: 'A', displayOrder: 0 },
];
const plan = (id: number, unitId: number | null, title: string, displayOrder: number): PlanRow => ({
  id,
  unitId,
  title,
  objectives: null,
  outline: null,
  durationMin: null,
  displayOrder,
});
const plans: PlanRow[] = [plan(10, 1, 'A2', 1), plan(11, 1, 'A1', 0), plan(12, 2, 'B1', 0), plan(13, null, 'orphan', 0)];

describe('buildSchemeTree', () => {
  const tree = buildSchemeTree(units, plans);

  it('orders units by display order', () => {
    expect(tree.map((u) => u.title)).toEqual(['A', 'B']);
  });

  it('groups + orders plans under their unit', () => {
    expect(tree[0]?.plans.map((p) => p.title)).toEqual(['A1', 'A2']);
    expect(tree[1]?.plans.map((p) => p.title)).toEqual(['B1']);
  });

  it('drops plans with no unit', () => {
    expect(tree.flatMap((u) => u.plans).some((p) => p.title === 'orphan')).toBe(false);
  });
});

describe('renderPlan — Schemes card reuses the pupil preview (13.2)', () => {
  const p: PlanRow = { id: 42, unitId: 1, title: 'Binary', objectives: 'O', outline: 'L', durationMin: 50, displayOrder: 0, kitNeeded: null };
  const html = renderPlan(p, { open: true });

  it('offers "open as pupil" in a NEW TAB, in master mode (no class id)', () => {
    expect(html).toContain('/lesson/pupil-view?master=1&amp;lp=42');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener"');
    expect(html).not.toContain('gc='); // master lesson has no class context
  });

  it('offers a read-only live lesson preview in a new tab', () => {
    expect(html).toContain('/lesson/preview?plan=42');
    expect(html).toContain('Preview live lesson');
    expect(html).toContain('without creating a lesson occurrence');
  });
});
