// Captured info ("things I've been told") — reuses the notes table (kind='captured').
// Manual category now; AI categorisation + entity extraction in Phase 4. Safeguarding
// items are highlighted + flagged here; the never-to-AI enforcement is the Phase-4 wrapper.

export const CAPTURED_CATEGORIES = ['pupil', 'logistics', 'admin', 'curriculum', 'cpd', 'safeguarding', 'other'] as const;

export const CATEGORY_LABELS: Record<string, string> = {
  pupil: 'Pupil',
  logistics: 'Logistics/room',
  admin: 'Admin/deadline',
  curriculum: 'Curriculum',
  cpd: 'CPD',
  safeguarding: 'Safeguarding',
  other: 'Other',
};

export interface CapturedItem {
  id: number;
  body: string;
  category: string | null;
  surfaceOn: string | null; // YYYY-MM-DD
  addedAt?: string; // "DD Mon" — when captured (optional: literal constructions may omit it)
  groupId: number | null;
  groupName: string | null;
  safeguarding: boolean;
  interest: boolean;
  archived: boolean;
}

/** Should this item resurface today — its surface date has arrived, or it concerns a class taught today. */
export function isResurfacing(item: CapturedItem, todayIso: string, todayGroupIds: number[]): boolean {
  if (item.archived) return false;
  if (item.surfaceOn && item.surfaceOn <= todayIso) return true;
  if (item.groupId != null && todayGroupIds.includes(item.groupId)) return true;
  return false;
}

export function resurfacing(items: CapturedItem[], todayIso: string, todayGroupIds: number[]): CapturedItem[] {
  return items.filter((i) => isResurfacing(i, todayIso, todayGroupIds));
}
