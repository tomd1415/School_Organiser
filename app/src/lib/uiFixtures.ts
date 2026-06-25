// Fixtures for the UI component gallery (/ui-gallery) — hand-built sample data so view functions can be
// rendered (and redesigned) in ISOLATION from the back-end: no DB, no live state. See
// docs/UI_SEPARATION_PLAN.md (Phase 1). Add a fixture here when you add a view worth previewing.
import type { NowState } from '../services/clock';
import type { LessonRow, PeriodRow } from '../services/timetable';
import type { CapturedItem } from '../services/captured';
import type { GroupOpt } from '../repos/tasks';
import type { NoteCard } from './notesView';
import type { UpcomingEvent } from '../services/event';
import type { TaskRow } from '../repos/tasks';
import type { OverseePageData } from './overseeView';
import { renderSubStep, type FocusVM } from './focusView';
import type { SubStep } from '../repos/tasks';
import type { SchemeHeader, UnitRow, PlanRow } from '../services/scheme';
import type { MapPageData } from './mapView';

// A few slides with varied content (list, table, blockquote) to prove the ONE deck renderer frames them
// the same on every surface (pupil / preview / presenter / board / cockpit).
export const SAMPLE_SLIDES_MD = `## Welcome to today's lesson
- We are learning about **sequences**
- Then we'll build a countdown timer on the micro:bit

## Key idea
> A sequence is steps in order — order matters in code.

| Step | What you do |
|------|-------------|
| 1 | Set a variable |
| 2 | Loop while it is > 0 |
| 3 | Show the number |

## Over to you
Open MakeCode and start your timer. Keep a screenshot of your finished work.
`;

// A worksheet in the real format (autofill name/date row, level sections, a question table, a checklist).
export const SAMPLE_WORKSHEET_MD = `# Sequences worksheet

| Name | Type your name here |
|------|---------------------|
| Date | Type the date here |

## Instructions
Type your answers in the boxes. Save as you go.

## 🟡 Core

| Question | Type your answer here |
|----------|----------------------|
| What does "sequence" mean in code? | |
| Why does the order of steps matter? | |

> Tip: read each step aloud before you answer.

## ✅ Success checklist
- [ ] I typed my name
- [ ] I answered every question
`;

const WEEKDAY = 2; // Tuesday

export const GALLERY_PERIODS: PeriodRow[] = [
  { weekday: WEEKDAY, slotOrder: 1, slotType: 'lesson', label: 'P1', lessonIndex: 0, start: '09:00', end: '10:00', teachable: true },
  { weekday: WEEKDAY, slotOrder: 2, slotType: 'lesson', label: 'P2', lessonIndex: 1, start: '10:00', end: '11:00', teachable: true },
  { weekday: WEEKDAY, slotOrder: 3, slotType: 'lesson', label: 'P3', lessonIndex: 2, start: '11:20', end: '12:20', teachable: true },
];

export const GALLERY_LESSONS: LessonRow[] = [
  { lessonId: 1, purpose: 'teaching', weekday: WEEKDAY, slotOrder: 1, isSelf: true, staffName: 'Me', groupName: '7A', courses: [{ name: 'Computing', colour: '#9a8fff' }] },
  { lessonId: 2, purpose: 'teaching', weekday: WEEKDAY, slotOrder: 2, isSelf: true, staffName: 'Me', groupName: '8B', courses: [{ name: 'Computing', colour: '#5eead4' }] },
  { lessonId: 3, purpose: 'teaching', weekday: WEEKDAY, slotOrder: 3, isSelf: true, staffName: 'Me', groupName: '11C', courses: [{ name: 'GCSE CS', colour: '#fbbf24' }] },
];

// Captured (SPEC §1): a spread of categories incl. a safeguarding-flagged item (withheld from AI).
export const GALLERY_GROUPS: GroupOpt[] = [{ id: 1, name: '7A' }, { id: 2, name: '9X' }];
export const GALLERY_CAPTURED: CapturedItem[] = [
  { id: 1, body: 'B14 projector being replaced over half term — book the trolley for week 3.', category: 'logistics', surfaceOn: '2026-10-27', addedAt: '24 Jun', groupId: null, groupName: null, safeguarding: false, interest: false, archived: false },
  { id: 2, body: 'PUPIL_4 found the recursion task much easier than expected — push them next time.', category: 'pupil', surfaceOn: null, addedAt: '24 Jun', groupId: 2, groupName: '9X', safeguarding: false, interest: true, archived: false },
  { id: 3, body: 'Mentioned something at the end of the lesson — logged for the register.', category: 'safeguarding', surfaceOn: null, addedAt: '23 Jun', groupId: 2, groupName: '9X', safeguarding: true, interest: false, archived: false },
  { id: 4, body: 'Idea: a binary-to-denary card game for the Year 8 starter.', category: 'curriculum', surfaceOn: '2026-09-02', addedAt: '20 Jun', groupId: null, groupName: null, safeguarding: false, interest: false, archived: false },
];
export const GALLERY_CAPTURED_COUNTS: Record<string, number> = { logistics: 1, pupil: 1, safeguarding: 1, curriculum: 1 };

// Notes knowledge base (SPEC §2): one of each link kind (course / group / pupil / general). Pupil shown as
// a PUPIL_n token — never a real name (privacy).
export const GALLERY_NOTES: NoteCard[] = [
  { id: 1, body: 'Recursion lands better with the Russian-doll demo than the factorial one — lead with that next time.', date: '2026-06-23', rev: 'r1', courseName: 'GCSE CS', groupName: null, pupilName: null, safeguarding: false },
  { id: 2, body: '9X respond well to mini-whiteboards for quick checks — keep a set in the room.', date: '2026-06-22', rev: 'r2', courseName: null, groupName: '9X', pupilName: null, safeguarding: false },
  { id: 3, body: 'Prefers a worked example before independent practice; struggles when it is flipped.', date: '2026-06-20', rev: 'r3', courseName: null, groupName: null, pupilName: 'PUPIL_4', safeguarding: false },
  { id: 4, body: 'Keep a spare set of USB-C cables in B14 — they always go missing.', date: '2026-06-18', rev: 'r4', courseName: null, groupName: null, pupilName: null, safeguarding: false },
];
export const GALLERY_NOTES_COUNTS: Record<string, number> = { course: 1, group: 1, pupil: 1, general: 1 };

// Events (SPEC §7): a fixed "today" so the how-soon grouping is deterministic in the gallery.
export const GALLERY_EVENTS_TODAY = '2026-06-23';
export const GALLERY_EVENTS: UpcomingEvent[] = [
  { id: 1, kind: 'report_deadline', title: 'Year 9 reports due', date: '2026-06-25', leadDays: 7, affectsAvailability: false, status: 'upcoming' },
  { id: 2, kind: 'meeting', title: 'Department meeting', date: '2026-06-24', leadDays: null, affectsAvailability: true, status: 'upcoming' },
  { id: 3, kind: 'trip', title: 'Bletchley Park trip', date: '2026-07-03', leadDays: 14, affectsAvailability: true, status: 'upcoming' },
  { id: 4, kind: 'parents_evening', title: "Year 11 parents' evening", date: '2026-07-15', leadDays: null, affectsAvailability: false, status: 'upcoming' },
  { id: 5, kind: 'other', title: 'Order new micro:bits', date: null, leadDays: null, affectsAvailability: false, status: 'upcoming' },
];

// Tasks (SPEC §4): variety across tones + states — an email inbox item, an urgent one, an interest one,
// and a done (struck) one.
export const GALLERY_TASKS: TaskRow[] = [
  { id: 1, title: 'Reply to parent about Y9 homework load', detail: '• from: a.parent@example.com\nCould we have a quick chat about the homework this term?\n(imported from the intake mailbox)', urgency: 'this_week', estimateMin: 10, cognitiveLoad: 'low', groupId: 2, context: null, status: 'inbox', interest: false, source: 'email' },
  { id: 2, title: 'Print the cover work for P3', detail: null, urgency: 'urgent_today', estimateMin: 5, cognitiveLoad: 'low', groupId: null, context: 'staffroom printer', status: 'triaged', interest: false, source: null },
  { id: 3, title: 'Plan the recursion lesson properly', detail: null, urgency: 'by_next_lesson', estimateMin: 45, cognitiveLoad: 'high', groupId: 2, context: null, status: 'triaged', interest: true, source: null },
  { id: 4, title: 'Tidy the shared resources folder', detail: null, urgency: 'someday', estimateMin: null, cognitiveLoad: null, groupId: null, context: null, status: 'done', interest: false, source: null },
];

// Oversee (SPEC §13): a day with a plan-missing row (red) + a resources-warning row, and a ready day.
export const GALLERY_OVERSEE: OverseePageData = {
  prevDate: '2026-06-15',
  nextDate: '2026-06-29',
  days: [
    { name: 'Mon', dateLabel: '23 Jun', isToday: true, rows: [
      { lessonId: 1, date: '2026-06-23', start: '09:00', end: '10:00', groupName: '8C', purpose: 'teaching', courseNames: ['Computing'], staffName: 'Mr Okafor (TA)', noPlan: true, needsEdit: false },
      { lessonId: 2, date: '2026-06-23', start: '11:20', end: '12:20', groupName: '7B', purpose: 'teaching', courseNames: ['Computing'], staffName: 'Ms Reed (cover)', noPlan: false, needsEdit: true },
    ] },
    { name: 'Wed', dateLabel: '25 Jun', isToday: false, rows: [
      { lessonId: 3, date: '2026-06-25', start: '13:30', end: '14:30', groupName: '9A', purpose: 'teaching', courseNames: ['GCSE CS'], staffName: 'Mr Okafor (TA)', noPlan: false, needsEdit: false },
    ] },
  ],
};

// Focus (SPEC §5): the picked task with a couple of steps, in a free-period window.
const GALLERY_FOCUS_STEPS: SubStep[] = [
  { id: 1, title: 'Mark the first ten books', done: true },
  { id: 2, title: 'Note who needs a nudge next lesson', done: false },
];
export const GALLERY_FOCUS: FocusVM = {
  mode: 'free_period',
  pollUrl: '/focus/inner?sig=gallery',
  picked: { id: 1, title: 'Mark 9X books before tomorrow', urgency: 'by_next_lesson', estimateMin: 25, cognitiveLoad: 'medium' },
  windowMinutes: 35,
  hidden: 4,
  subStepsHtml: GALLERY_FOCUS_STEPS.map(renderSubStep).join(''),
};

// Schemes (UI rebuild): a scheme header + units/plans so the meta header (real stats) and the Spine
// lens (units sidebar with planned% bars + lesson panels) render with no DB.
export const GALLERY_SCHEME_HEADER: SchemeHeader = {
  id: 31, courseId: 9, courseName: 'Y9 Computing', title: 'Y9 Networks & the Internet', version: 3, active: true, labels: 'Year 9, Networks',
};
export const GALLERY_SCHEME_UNITS: UnitRow[] = [
  { id: 1, title: 'How networks work', displayOrder: 0 },
  { id: 2, title: 'The Internet', displayOrder: 1 },
  { id: 3, title: 'Data & protocols', displayOrder: 2 },
];
const schemePlan = (id: number, unitId: number, title: string, order: number, planned: boolean): PlanRow => ({
  id, unitId, title, objectives: planned ? 'Pupils can…' : null, outline: planned ? '1. starter…' : null,
  durationMin: 50, displayOrder: order, kitNeeded: id % 2 ? 'micro:bit ×16' : null,
});
export const GALLERY_SCHEME_PLANS: PlanRow[] = [
  schemePlan(10, 1, 'LANs and WANs', 0, true),
  schemePlan(11, 1, 'Network topologies', 1, true),
  schemePlan(12, 1, 'Hardware: switches & routers', 2, false),
  schemePlan(13, 2, 'How the Internet is organised', 0, true),
  schemePlan(14, 2, 'DNS and IP addresses', 1, false),
  schemePlan(15, 3, 'Packets and protocols', 0, true),
];

// Curriculum map (SPEC §8): one slot's term-calendar timeline — past taught (green, stopping points),
// today (teal), future weeks (plain; an empty one dashed). Fixed dates so the gallery is deterministic.
export const GALLERY_MAP: MapPageData = {
  slots: [
    { lessonId: 4, groupCourseId: 9, groupName: '9X', courseId: 2, courseName: 'Computing', weekday: 2, periodLabel: 'P3' },
    { lessonId: 5, groupCourseId: 10, groupName: '8B', courseId: 2, courseName: 'Computing', weekday: 4, periodLabel: 'P1' },
  ],
  chosen: { lessonId: 4, groupCourseId: 9, groupName: '9X', courseId: 2, courseName: 'Computing', weekday: 2, periodLabel: 'P3' },
  entries: [
    { date: '2026-06-09', lessonPlanId: 71, planTitle: 'LANs and WANs', stoppingPoint: 'slide 8', adapted: false, kitNeeded: null },
    { date: '2026-06-16', lessonPlanId: 72, planTitle: 'Network topologies', stoppingPoint: 'the bus/star task', adapted: true, kitNeeded: null },
    { date: '2026-06-23', lessonPlanId: 73, planTitle: 'Packets & protocols', stoppingPoint: null, adapted: false, kitNeeded: '16× micro:bit' },
    { date: '2026-06-30', lessonPlanId: 74, planTitle: 'The TCP handshake', stoppingPoint: null, adapted: false, kitNeeded: null },
  ],
  futureDates: ['2026-06-30', '2026-07-07', '2026-07-14'],
  today: '2026-06-23',
  upcomingKit: [{ date: '2026-06-23', kit: '16× micro:bit' }],
  pastWeeks: 6,
  futureWeeks: 12,
  csrf: 'gallery',
};

// Now hero (UI rebuild): an in-lesson state so the hero showcases the period eyebrow + countdown + next.
export const GALLERY_NOW_HERO_STATE: NowState = {
  isoDate: '2026-06-23',
  weekday: WEEKDAY,
  minutes: 10 * 60 + 47,
  isSchoolDay: true,
  dayKind: 'school',
  current: { date: '2026-06-23', weekday: WEEKDAY, slotOrder: 3, slotType: 'lesson', label: 'Period 3', lessonIndex: 2, startMin: 10 * 60 + 5, endMin: 11 * 60 + 5 },
  minutesRemaining: 18,
  nextTeaching: { date: '2026-06-23', weekday: WEEKDAY, slotOrder: 4, slotType: 'lesson', label: 'Period 4', lessonIndex: 3, startMin: 11 * 60 + 25, endMin: 12 * 60 + 25 },
};
export const GALLERY_NOW_HERO_LESSON = { lessonId: 7, purpose: 'teaching', groupName: 'Year 9 Computing', roomName: 'B14', courses: [{ name: 'Networks', colour: null }] };
export const GALLERY_NOW_HERO_NEXT = { lessonId: 8, purpose: 'teaching', groupName: 'Free', roomName: null, courses: [] };

// "Now" = 10:05 → P1 done, P2 active, P3 next.
export const GALLERY_NOW_STATE: NowState = {
  isoDate: '2026-06-23',
  weekday: WEEKDAY,
  minutes: 10 * 60 + 5,
  isSchoolDay: true,
  dayKind: 'school',
  current: null,
  minutesRemaining: 55,
  nextTeaching: null,
};
