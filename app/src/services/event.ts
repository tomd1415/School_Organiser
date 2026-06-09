// EventService — events, deadlines, exams, the parental-contact log. Pure date
// helpers + "due soon" selection here; SQL in repos/events.ts.

export const EVENT_KINDS = [
  'parents_evening',
  'ehcp_review',
  'report_deadline',
  'exam',
  'data_drop',
  'inset',
  'trip',
  'open_evening',
  'meeting',
  'parent_contact',
  'other',
] as const;

export const EVENT_KIND_LABELS: Record<string, string> = {
  parents_evening: "Parents' evening",
  ehcp_review: 'EHCP review',
  report_deadline: 'Report deadline',
  exam: 'Exam',
  data_drop: 'Data drop',
  inset: 'INSET',
  trip: 'Trip',
  open_evening: 'Open evening',
  meeting: 'Meeting',
  parent_contact: 'Parent contact',
  other: 'Other',
};

export interface UpcomingEvent {
  id: number;
  kind: string;
  title: string;
  date: string | null; // YYYY-MM-DD
  leadDays: number | null;
  affectsAvailability: boolean;
  status: string;
}

/** Whole-day difference between two civil dates (positive = future). */
export function daysUntil(dateIso: string, todayIso: string): number {
  const a = new Date(`${dateIso}T00:00:00Z`).getTime();
  const b = new Date(`${todayIso}T00:00:00Z`).getTime();
  return Math.round((a - b) / 86_400_000);
}

/** Events worth surfacing now: within their lead time (default 7 days), incl. overdue. */
export function dueSoon(events: UpcomingEvent[], todayIso: string): UpcomingEvent[] {
  return events
    .filter((e) => e.date !== null && daysUntil(e.date, todayIso) <= (e.leadDays ?? 7))
    .sort((a, b) => daysUntil(a.date as string, todayIso) - daysUntil(b.date as string, todayIso));
}
