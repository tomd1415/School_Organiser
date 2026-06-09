// TimetableService — assemble the weekly grid from period definitions + the
// recurring timetabled lessons. Pure (takes rows, returns a grid); the repo does
// the SQL. Single repeating week, so the grid is the same every week; the route
// overlays the actual dates.

export interface PeriodRow {
  weekday: number;
  slotOrder: number;
  slotType: string;
  label: string;
  lessonIndex: number | null;
  start: string; // "HH:MM"
  end: string; // "HH:MM"
  teachable: boolean;
}

export interface CourseRef {
  name: string;
  colour: string | null;
}

export interface LessonRow {
  lessonId: number;
  purpose: string;
  weekday: number;
  slotOrder: number;
  isSelf: boolean;
  staffName: string;
  groupName: string | null;
  courses: CourseRef[];
}

export interface GridLesson {
  lessonId: number;
  purpose: string;
  isSelf: boolean;
  staffName: string;
  groupName: string | null;
  courses: CourseRef[];
}

export interface GridCell {
  weekday: number;
  slotType: string; // this weekday's slot type (e.g. briefing vs before_school)
  periodLabel: string; // "Briefing" / "Prep" / "Lesson 1" / "Break" …
  lessons: GridLesson[]; // self lesson + any overseen lessons, usually 0–2
}

export interface GridRow {
  slotOrder: number;
  start: string;
  end: string;
  teachable: boolean;
  kind: string; // representative slot type for the row
  label: string; // left-column label (e.g. "L1", "Break")
  cells: GridCell[]; // Monday … Friday
}

export interface WeekGrid {
  weekdays: number[];
  rows: GridRow[];
}

const WEEKDAYS = [1, 2, 3, 4, 5];

export interface OverseenLesson {
  lessonId: number;
  weekday: number;
  start: string;
  end: string;
  periodLabel: string;
  groupName: string | null;
  staffName: string;
  purpose: string;
  courses: CourseRef[];
}

// The lessons the teacher supervises but does not teach (isSelf === false), enriched with
// their period time/label and ordered by weekday then start time. Pure — the route overlays
// real dates onto the weekday. See [[buildWeekGrid]] for the full grid.
export function buildOverseenWeek(periods: PeriodRow[], lessons: LessonRow[]): OverseenLesson[] {
  const periodAt = new Map<string, PeriodRow>();
  for (const p of periods) periodAt.set(`${p.weekday}:${p.slotOrder}`, p);

  const out: OverseenLesson[] = [];
  for (const l of lessons) {
    if (l.isSelf) continue;
    const p = periodAt.get(`${l.weekday}:${l.slotOrder}`);
    out.push({
      lessonId: l.lessonId,
      weekday: l.weekday,
      start: p?.start ?? '',
      end: p?.end ?? '',
      periodLabel: p?.label ?? '',
      groupName: l.groupName,
      staffName: l.staffName,
      purpose: l.purpose,
      courses: l.courses,
    });
  }
  out.sort((a, b) => a.weekday - b.weekday || a.start.localeCompare(b.start));
  return out;
}

function rowLabel(slotType: string, lessonIndex: number | null): string {
  switch (slotType) {
    case 'lesson':
      return lessonIndex ? `L${lessonIndex}` : 'Lesson';
    case 'before_school':
    case 'briefing':
      return 'Before';
    case 'form_am':
      return 'Form';
    case 'break':
      return 'Break';
    case 'lunch':
      return 'Lunch';
    case 'after_school':
      return 'After';
    default:
      return slotType;
  }
}

export function buildWeekGrid(periods: PeriodRow[], lessons: LessonRow[]): WeekGrid {
  const periodAt = new Map<string, PeriodRow>();
  const slotOrders = new Set<number>();
  for (const p of periods) {
    periodAt.set(`${p.weekday}:${p.slotOrder}`, p);
    slotOrders.add(p.slotOrder);
  }

  const lessonsAt = new Map<string, GridLesson[]>();
  for (const l of lessons) {
    const key = `${l.weekday}:${l.slotOrder}`;
    const arr = lessonsAt.get(key) ?? [];
    arr.push({
      lessonId: l.lessonId,
      purpose: l.purpose,
      isSelf: l.isSelf,
      staffName: l.staffName,
      groupName: l.groupName,
      courses: l.courses,
    });
    lessonsAt.set(key, arr);
  }
  // Within a cell, show my own lesson first, then overseen ones by group name.
  for (const arr of lessonsAt.values()) {
    arr.sort((a, b) =>
      a.isSelf === b.isSelf ? (a.groupName ?? '').localeCompare(b.groupName ?? '') : a.isSelf ? -1 : 1,
    );
  }

  const rows: GridRow[] = [];
  for (const slotOrder of [...slotOrders].sort((a, b) => a - b)) {
    // Representative period for the row's time/label (times match across weekdays;
    // only slot 1's type differs, which the per-cell slotType captures).
    const rep =
      periodAt.get(`1:${slotOrder}`) ??
      WEEKDAYS.map((w) => periodAt.get(`${w}:${slotOrder}`)).find((p): p is PeriodRow => p !== undefined);
    if (!rep) continue;

    const cells: GridCell[] = WEEKDAYS.map((w) => {
      const p = periodAt.get(`${w}:${slotOrder}`);
      return {
        weekday: w,
        slotType: p?.slotType ?? rep.slotType,
        periodLabel: p?.label ?? rep.label,
        lessons: lessonsAt.get(`${w}:${slotOrder}`) ?? [],
      };
    });

    rows.push({
      slotOrder,
      start: rep.start,
      end: rep.end,
      teachable: rep.teachable,
      kind: rep.slotType,
      label: rowLabel(rep.slotType, rep.lessonIndex),
      cells,
    });
  }

  return { weekdays: WEEKDAYS, rows };
}
