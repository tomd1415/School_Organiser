// SchemeService — the pure shape of a scheme of work: units (ordered) each with
// lesson plans (ordered). SQL lives in repos/schemes.ts.

export interface PlanRow {
  id: number;
  unitId: number | null;
  title: string;
  objectives: string | null;
  outline: string | null;
  durationMin: number | null;
  displayOrder: number;
}

export interface UnitRow {
  id: number;
  title: string;
  displayOrder: number;
}

export interface UnitWithPlans extends UnitRow {
  plans: PlanRow[];
}

export interface SchemeHeader {
  id: number;
  courseId: number;
  courseName: string;
  title: string;
  version: number;
  active: boolean;
}

const byOrder = <T extends { displayOrder: number; id: number }>(a: T, b: T) => a.displayOrder - b.displayOrder || a.id - b.id;

/** Group plans under their units, both in display order. */
export function buildSchemeTree(units: UnitRow[], plans: PlanRow[]): UnitWithPlans[] {
  const byUnit = new Map<number, PlanRow[]>();
  for (const p of plans) {
    if (p.unitId == null) continue;
    const arr = byUnit.get(p.unitId) ?? [];
    arr.push(p);
    byUnit.set(p.unitId, arr);
  }
  for (const arr of byUnit.values()) arr.sort(byOrder);
  return [...units].sort(byOrder).map((u) => ({ ...u, plans: (byUnit.get(u.id) ?? []).slice().sort(byOrder) }));
}
