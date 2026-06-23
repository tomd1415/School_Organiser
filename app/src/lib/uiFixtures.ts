// Fixtures for the UI component gallery (/ui-gallery) — hand-built sample data so view functions can be
// rendered (and redesigned) in ISOLATION from the back-end: no DB, no live state. See
// docs/UI_SEPARATION_PLAN.md (Phase 1). Add a fixture here when you add a view worth previewing.
import type { NowState } from '../services/clock';
import type { LessonRow, PeriodRow } from '../services/timetable';

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
