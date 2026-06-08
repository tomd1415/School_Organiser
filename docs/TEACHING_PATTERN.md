# Teaching Pattern (reference)

A confirmed snapshot of the current teaching commitment, used to seed data and sanity-check the
[DATA_MODEL.md](DATA_MODEL.md). Next year's exact timetable is **not yet fixed** — this is the
*shape* that must carry over ([SPECIFICATION.md](SPECIFICATION.md) §5.14). Figures from the
teacher, 2026-06-07.

## Groups & lessons

| Key stage / year | Groups | Lessons/wk (each) | Course(s) in the slot | Teacher |
| --- | --- | --- | --- | --- |
| KS3 Year 7 | 3 | 2 | Teach Computing (1) + "Effective use of computers in school" (1, unwritten) | Me — **but 4 of the 6 Y7 lessons are taught by another teacher** |
| KS3 Year 8 | 3 | 2 | Teach Computing (1) + Effective use (1, unwritten) | Me |
| KS3 Year 9 | 3 | 2 | Teach Computing (1) + Effective use (1, unwritten) | Me |
| Year 10 | 1 | 3 | OCR GCSE CS (J277) — **+ 1 pupil on custom Sound Engineering** | Me |
| Year 11 | 2 | 3 | OCR GCSE CS (J277) | Me |
| Post-16 | 1 | 3 | **3 courses run simultaneously** (names TBD — OPEN_Q21) | Me |

**Totals: 30 timetabled lessons/week** (KS3 18 + Y10 3 + Y11 6 + P16 3). Of these, **4 Year 7
lessons are taught by another teacher** (I plan/oversee them), leaving ~26 taught by me.

> **Reconcile when the real timetable is entered.** 30 lessons would fill all 6×5 slots, yet you
> also want ~3 free periods. The likeliest reading is that the **4 other-teacher Year 7 slots are
> your non-teaching time**. We'll confirm against next year's actual timetable.

## Courses

| Course | Key stage | Qual / board | Where used | Status |
| --- | --- | --- | --- | --- |
| Teach Computing | KS3 (Y7–9) | — | one of two weekly KS3 lessons | Exists (NCCE Teach Computing) |
| "Effective use of computers in school" | KS3 (Y7–9) | — | the other weekly KS3 lesson | **UNWRITTEN — priority to author (AI help, SPEC §5.10/§5.14)** |
| OCR GCSE Computer Science | KS4 (Y10–11) | GCSE / OCR J277 | Y10 ×1, Y11 ×2 | Exists |
| Sound Engineering (custom) | KS4 (Y10) | Custom | 1 pupil in the Y10 group | Scheme TBD (OPEN_Q21) |
| Post-16 courses ×3 | KS5 | TBD | post-16 group | Names/levels TBD (OPEN_Q21) |

## Splits (more than one course in one slot)

- **Post-16**: three courses at once in the same room → three `occurrence_courses`, each with its
  own plan / resources / notes.
- **Year 10**: one pupil on Sound Engineering while the rest do OCR GCSE → a second course in the
  slot for that pupil.

These are the concrete cases behind DATA_MODEL `timetabled_lesson_courses` / `occurrence_courses`.

## Other teacher / non-specialist

- **4 Year 7 lessons** are taught by another teacher. Modelled as `timetabled_lessons` with a
  non-self `staff_id`; I prepare the plan + resources and keep oversight notes (SPEC §5.8, the
  "Lessons I oversee" view).

## Carry-over

All content above (courses, schemes, resources, notes) is **year-independent** and carries over;
only the groups and timetable for the year are re-entered (SPEC §5.14). *"I want this to continue
next year with everything carrying over."*

Open specifics live in [OPEN_QUESTIONS.md](OPEN_QUESTIONS.md): Q21 (post-16 trio + Sound
Engineering), Q22 (authoring the KS3 "Effective use" scheme).
