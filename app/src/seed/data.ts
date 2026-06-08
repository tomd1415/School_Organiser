// The real teaching week (docs/TEACHING_PATTERN.md), as typed data. This is the
// single source of truth for both the DB seed (run.ts) and the ClockService
// tests, so they cannot drift. Re-entered each September (academic-year rollover).

export const TZ = 'Europe/London';

export interface PeriodSeed {
  weekday: number;
  slotOrder: number;
  slotType: string;
  label: string;
  lessonIndex: number | null;
  start: string; // "HH:MM"
  end: string; // "HH:MM"
  teachable: boolean;
}

/** The fixed weekday shape (08:30 → 15:30+). Slot 1 differs: briefing Mon/Wed/Thu, prep Tue/Fri. */
export function buildPeriodDefinitions(): PeriodSeed[] {
  const out: PeriodSeed[] = [];
  for (let weekday = 1; weekday <= 5; weekday++) {
    const earlyPrep = weekday === 2 || weekday === 5;
    let order = 1;
    const push = (
      slotType: string,
      label: string,
      lessonIndex: number | null,
      start: string,
      end: string,
      teachable: boolean,
    ) => out.push({ weekday, slotOrder: order++, slotType, label, lessonIndex, start, end, teachable });

    push(earlyPrep ? 'before_school' : 'briefing', earlyPrep ? 'Prep' : 'Briefing', null, '08:30', '08:50', false);
    push('form_am', 'Morning form', null, '08:50', '09:10', false);
    push('lesson', 'Lesson 1', 1, '09:10', '10:00', true);
    push('lesson', 'Lesson 2', 2, '10:00', '10:50', true);
    push('break', 'Break', null, '10:50', '11:05', false);
    push('lesson', 'Lesson 3', 3, '11:05', '11:55', true);
    push('lesson', 'Lesson 4', 4, '11:55', '12:45', true);
    push('lunch', 'Lunch', null, '12:45', '13:50', false);
    push('lesson', 'Lesson 5', 5, '13:50', '14:40', true);
    push('lesson', 'Lesson 6', 6, '14:40', '15:30', true);
    push('after_school', 'After school', null, '15:30', '17:00', false);
  }
  return out;
}

export interface AcademicYearSeed {
  name: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
}

export const ACADEMIC_YEARS: AcademicYearSeed[] = [
  { name: '2025/26', startDate: '2025-09-01', endDate: '2026-07-20', isCurrent: true },
  { name: '2026/27', startDate: '2026-09-01', endDate: '2027-07-21', isCurrent: false },
];

export interface TermDateSeed {
  year: string;
  name: string;
  start: string;
  end: string;
  kind: 'term' | 'half_term' | 'holiday' | 'inset';
}

export const TERM_DATES: TermDateSeed[] = [
  // 2025/26 — only the remainder needed for immediate use. Start of the current
  // half-term is assumed 2026-06-01 (covers all queries from "now" onward).
  { year: '2025/26', name: 'Summer term (remainder)', start: '2026-06-01', end: '2026-07-17', kind: 'term' },
  { year: '2025/26', name: 'Summer INSET', start: '2026-07-20', end: '2026-07-20', kind: 'inset' },
  { year: '2025/26', name: 'Summer holiday', start: '2026-07-21', end: '2026-08-31', kind: 'holiday' },
  // 2026/27 — full year (confirmed 2026-06-08).
  { year: '2026/27', name: 'Autumn term', start: '2026-09-01', end: '2026-12-18', kind: 'term' },
  { year: '2026/27', name: 'Autumn INSET', start: '2026-09-01', end: '2026-09-01', kind: 'inset' },
  { year: '2026/27', name: 'Autumn half term', start: '2026-10-26', end: '2026-10-30', kind: 'half_term' },
  { year: '2026/27', name: 'Christmas holiday', start: '2026-12-21', end: '2027-01-01', kind: 'holiday' },
  { year: '2026/27', name: 'Spring term', start: '2027-01-04', end: '2027-03-25', kind: 'term' },
  { year: '2026/27', name: 'Spring INSET', start: '2027-01-04', end: '2027-01-04', kind: 'inset' },
  { year: '2026/27', name: 'Spring half term', start: '2027-02-15', end: '2027-02-19', kind: 'half_term' },
  { year: '2026/27', name: 'Easter holiday', start: '2027-03-29', end: '2027-04-09', kind: 'holiday' },
  { year: '2026/27', name: 'Summer term', start: '2027-04-12', end: '2027-07-21', kind: 'term' },
  { year: '2026/27', name: 'Early May bank holiday', start: '2027-05-03', end: '2027-05-03', kind: 'holiday' },
  { year: '2026/27', name: 'Summer half term', start: '2027-05-31', end: '2027-06-04', kind: 'half_term' },
];

export const ROOMS = ['U1'];

export interface StaffSeed {
  name: string;
  role: 'self' | 'ta' | 'teacher' | 'cover';
  isSelf: boolean;
}

export const STAFF: StaffSeed[] = [
  { name: 'Me', role: 'self', isSelf: true },
  { name: 'Other teacher', role: 'teacher', isSelf: false },
];

// Course name constants — referenced by COURSES and the grid below.
export const CURRIC = 'Computing Curriculum';
export const SKILLS = 'Computer Skills';
export const GCSE = 'OCR J277 GCSE Computer Science';
export const SOUND = 'Year 10 Sound Engineering';
export const BCS = 'BCS Thinking Like a Coder';
export const AIMS = 'AIMS Robotics';
export const VI = 'Using Computers for VI Pupils';

export interface CourseSeed {
  name: string;
  keyStage: string;
  qualification?: string;
  examBoard?: string;
  colour: string;
}

export const COURSES: CourseSeed[] = [
  { name: CURRIC, keyStage: 'KS3', colour: '#3b82f6' },
  { name: SKILLS, keyStage: 'KS3', colour: '#06b6d4' },
  { name: GCSE, keyStage: 'KS4', qualification: 'GCSE', examBoard: 'OCR', colour: '#8b5cf6' },
  { name: SOUND, keyStage: 'KS4', qualification: 'custom', colour: '#f59e0b' },
  { name: BCS, keyStage: 'KS5', colour: '#ec4899' },
  { name: AIMS, keyStage: 'KS5', colour: '#10b981' },
  { name: VI, keyStage: 'KS5', colour: '#ef4444' },
];

export interface GroupSeed {
  name: string;
  yearGroup: string;
}

export const GROUPS: GroupSeed[] = [
  { name: '7ARO', yearGroup: 'Y7' },
  { name: '7RAL', yearGroup: 'Y7' },
  { name: '7JMI', yearGroup: 'Y7' },
  { name: '8PFA', yearGroup: 'Y8' },
  { name: '8SJO', yearGroup: 'Y8' },
  { name: '8MDU', yearGroup: 'Y8' },
  { name: '9TDU', yearGroup: 'Y9' },
  { name: '9EME', yearGroup: 'Y9' },
  { name: '9SCL', yearGroup: 'Y9' },
  { name: 'Y10 GCSE CS', yearGroup: 'Y10' },
  { name: 'Y11 GCSE CS Gp1', yearGroup: 'Y11' },
  { name: 'Y11 GCSE CS Gp2', yearGroup: 'Y11' },
  { name: 'Post-16 Computing', yearGroup: 'Post-16' },
];

export type Cell =
  | { kind: 'teach'; group: string; courses: string[] }
  | { kind: 'free' }
  | { kind: 'form'; group: string };

// Each row is Lesson 1..6 for that weekday (1=Mon … 5=Fri). docs/TEACHING_PATTERN.md.
export const GRID: Record<number, Cell[]> = {
  1: [
    { kind: 'teach', group: '8PFA', courses: [CURRIC] },
    { kind: 'teach', group: '9TDU', courses: [CURRIC] },
    { kind: 'teach', group: '8SJO', courses: [CURRIC] },
    { kind: 'teach', group: '9EME', courses: [CURRIC] },
    { kind: 'teach', group: 'Y10 GCSE CS', courses: [GCSE, SOUND] },
    { kind: 'teach', group: '8MDU', courses: [CURRIC] },
  ],
  2: [
    { kind: 'teach', group: '7ARO', courses: [CURRIC] },
    { kind: 'teach', group: '9SCL', courses: [CURRIC] },
    { kind: 'teach', group: 'Y11 GCSE CS Gp2', courses: [GCSE] },
    { kind: 'free' },
    { kind: 'teach', group: '8PFA', courses: [SKILLS] },
    { kind: 'teach', group: '7RAL', courses: [CURRIC] },
  ],
  3: [
    { kind: 'teach', group: 'Post-16 Computing', courses: [BCS, AIMS, VI] },
    { kind: 'teach', group: 'Post-16 Computing', courses: [BCS, AIMS, VI] },
    { kind: 'teach', group: '9TDU', courses: [SKILLS] },
    { kind: 'teach', group: 'Y10 GCSE CS', courses: [GCSE, SOUND] },
    { kind: 'form', group: '9TDU' },
    { kind: 'teach', group: 'Y11 GCSE CS Gp1', courses: [GCSE] },
  ],
  4: [
    { kind: 'free' },
    { kind: 'teach', group: '8SJO', courses: [SKILLS] },
    { kind: 'teach', group: 'Y11 GCSE CS Gp2', courses: [GCSE] },
    { kind: 'free' },
    { kind: 'teach', group: 'Y10 GCSE CS', courses: [GCSE, SOUND] },
    { kind: 'teach', group: 'Post-16 Computing', courses: [BCS, AIMS, VI] },
  ],
  5: [
    { kind: 'teach', group: 'Y11 GCSE CS Gp2', courses: [GCSE] },
    { kind: 'teach', group: '9SCL', courses: [SKILLS] },
    { kind: 'teach', group: 'Y11 GCSE CS Gp1', courses: [GCSE] },
    { kind: 'teach', group: 'Y11 GCSE CS Gp1', courses: [GCSE] },
    { kind: 'teach', group: '8MDU', courses: [SKILLS] },
    { kind: 'teach', group: '9EME', courses: [SKILLS] },
  ],
};

export interface OverseenSeed {
  weekday: number;
  lessonIndex: number;
  group: string;
  course: string;
}

// Lessons another teacher delivers in parallel, that I plan/oversee (non-self staff).
// Two slots known so far; 7JMI Skills + 7RAL Skills to follow.
export const OVERSEEN: OverseenSeed[] = [
  { weekday: 3, lessonIndex: 3, group: '7ARO', course: SKILLS },
  { weekday: 5, lessonIndex: 3, group: '7JMI', course: CURRIC },
];

export const SETTINGS = {
  default_arrival: '08:15',
  default_leave: '19:00',
  target_leave: '18:00',
};

// Expected row counts after a clean seed — asserted by run.ts and the integrity test.
export const EXPECTED = {
  academicYears: 2,
  currentYears: 1,
  termDates: 14,
  periods: 55, // 11 slots × 5 weekdays
  courses: 7,
  groups: 13,
  groupCourses: 23,
  timetabledLessons: 47, // 30 lesson-period (self) + 5 form_am + 5 break + 5 lunch + 2 overseen
  selfLessonSlots: 30, // self rows sitting in a lesson period
  teaching: 28, // 26 self + 2 overseen
  free: 3,
  lessonCourses: 37, // 35 self course-links + 2 overseen
};
