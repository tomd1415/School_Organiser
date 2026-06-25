// Fixtures for the UI component gallery (/ui-gallery) — hand-built sample data so view functions can be
// rendered (and redesigned) in ISOLATION from the back-end: no DB, no live state. See
// docs/UI_SEPARATION_PLAN.md (Phase 1). Add a fixture here when you add a view worth previewing.
import type { NowState } from '../services/clock';
import type { LessonRow, PeriodRow } from '../services/timetable';
import type { CapturedItem } from '../services/captured';
import type { GroupOpt } from '../repos/tasks';
import type { NoteCard } from './notesView';
import type { UpcomingEvent } from '../services/event';

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
