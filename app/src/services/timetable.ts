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
  present: boolean; // false when this weekday has no period in this time band (renders blank)
  slotType: string; // this weekday's slot type (e.g. briefing vs before_school)
  periodLabel: string; // "Briefing" / "Prep" / "Lesson 1" / "Break" …
  lessons: GridLesson[]; // self lesson + any overseen lessons, usually 0–2
}

export interface GridRow {
  slotOrder: number;
  start: string;
  end: string;
  minutes: number; // the band's duration, so the row height can scale to the time it takes
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

function toMin(hhmm: string): number {
  const [h, m] = hhmm.split(':');
  return (Number(h) || 0) * 60 + (Number(m) || 0);
}

export function buildWeekGrid(periods: PeriodRow[], lessons: LessonRow[]): WeekGrid {
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

  // Rows are TIME BANDS — the distinct start times across the week, in chronological order. A period
  // lands in the band matching its start time; a weekday with nothing at that time gets an empty cell.
  // This keeps days with different shapes (e.g. a briefing only some mornings) aligned by the clock
  // rather than by slot order, which previously smeared such periods across the whole week.
  const byDayStart = new Map<string, PeriodRow>(); // `${weekday}:${start}` → period
  const starts = new Set<string>();
  for (const p of periods) {
    byDayStart.set(`${p.weekday}:${p.start}`, p);
    starts.add(p.start);
  }

  const rows: GridRow[] = [];
  for (const start of [...starts].sort()) {
    const present = WEEKDAYS.map((w) => byDayStart.get(`${w}:${start}`));
    const rep = present.find((p): p is PeriodRow => p !== undefined);
    if (!rep) continue;

    const cells: GridCell[] = WEEKDAYS.map((w, i) => {
      const p = present[i];
      return p
        ? { weekday: w, present: true, slotType: p.slotType, periodLabel: p.label, lessons: lessonsAt.get(`${w}:${p.slotOrder}`) ?? [] }
        : { weekday: w, present: false, slotType: '', periodLabel: '', lessons: [] };
    });

    rows.push({
      slotOrder: rep.slotOrder,
      start: rep.start,
      end: rep.end,
      minutes: Math.max(1, toMin(rep.end) - toMin(rep.start)),
      teachable: present.some((p) => p?.teachable === true),
      kind: rep.slotType,
      label: rowLabel(rep.slotType, rep.lessonIndex),
      cells,
    });
  }

  return { weekdays: WEEKDAYS, rows };
}
