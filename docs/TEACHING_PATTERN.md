# Teaching Pattern (reference)

The **actual** teaching commitment, used to seed data and sanity-check the
[DATA_MODEL.md](DATA_MODEL.md). The timetable is a **single week, static for the academic year**;
the whole timetable changes each September → academic-year rollover
([SPECIFICATION.md](SPECIFICATION.md) §5.14). All lessons are in **room U1 (Computing Room)**
(possibly more than one room in some future years). Confirmed by the teacher, 2026-06-08.

Group naming: `<year><FORM>` — e.g. `8PFA` = Year 8, form PFA. The number is the year group.

## Weekly timetable

Periods: L1 09:10 · L2 10:00 · *break 10:50* · L3 11:05 · L4 11:55 · *lunch 12:45* · L5 13:50 ·
L6 14:40–15:30.

| Period | Monday | Tuesday | Wednesday | Thursday | Friday |
| --- | --- | --- | --- | --- | --- |
| L1 | 8PFA Curriculum | 7ARO Curriculum | Post-16 (×3) ¹ | **Free** | Y11 GCSE CS Gp2 |
| L2 | 9TDU Curriculum | 9SCL Curriculum | Post-16 (×3) ¹ | 8SJO Skills | 9SCL Skills |
| L3 | 8SJO Curriculum | Y11 GCSE CS Gp2 | 9TDU Skills | Y11 GCSE CS Gp2 | Y11 GCSE CS Gp1 ² |
| L4 | 9EME Curriculum | **Free** | Y10 GCSE CS ³ | **Free** | Y11 GCSE CS Gp1 ² |
| L5 | Y10 GCSE CS ³ | 8PFA Skills | 9TDU Extended Form | Y10 GCSE CS ³ | 8MDU Skills |
| L6 | 8MDU Curriculum | 7RAL Curriculum | Y11 GCSE CS Gp1 | Post-16 (×3) ¹ | 9EME Skills |

¹ Post-16 is a **double on Wednesday (L1–L2)** and a single on Thursday L6 — three courses run
simultaneously (split). ² Year 11 GCSE CS Group 1 is a **double on Friday (L3–L4)**.
³ Year 10 GCSE CS includes **one pupil on the Sound Engineering course** (split).

Totals: 27 teaching/form periods + **3 free periods (Tue L4, Thu L1, Thu L4)** = 30.

## Courses

| Course | Stage | Qual / board | Status |
| --- | --- | --- | --- |
| **Computing Curriculum** (Teach Computing) | KS3 | — | exists; one of two weekly KS3 lessons |
| **Computer Skills** (the "effective use of computers in school" scheme) | KS3 | — | **being written** — structure + some lessons first, build as you go (Q22) |
| **OCR GCSE Computer Science** (J277) | KS4 | GCSE / OCR | Y10 ×1, Y11 Group 1, Y11 Group 2 |
| **Year 10 Sound Engineering** (custom) | KS4 | custom | **being built**; 1 pupil in the Y10 GCSE slot |
| **Post-16 Computing** — 3 at once | KS5 | mixed | **BCS "Thinking Like a Coder"**, **AIMS Robotics**, **Using Computers for VI pupils** |
| *9TDU Extended Form Time* | — | — | the teacher's form group (tutor time) |

## Groups

- **Year 7:** 7ARO, 7RAL, 7JMI — *see "Other-teacher lessons"* (Year 7 Skills, and all of 7JMI,
  are taught by another teacher).
- **Year 8:** 8PFA, 8SJO, 8MDU.
- **Year 9:** 9TDU *(the teacher's form group)*, 9EME, 9SCL.
- **Year 10:** one GCSE CS group (+1 Sound Engineering pupil).
- **Year 11:** GCSE CS **Group 1**, **Group 2**.
- **Post-16:** one group (three courses simultaneously).

## Non-teaching commitments

| When | What |
| --- | --- |
| Daily 08:50–09:10 | Morning form (with 9TDU) |
| Mon/Wed/Thu 08:30–08:50 | Briefing |
| Tue/Fri 08:30–08:50 | Prep / free |
| **Every break** 10:50–11:05 | **Computing Club** (open room) |
| **Every lunch** 13:00–13:30 | **Computing Club** |
| **Wednesdays** | **Enter taxi numbers** into the system (duty; time TBC) |
| Tue after school 15:30–17:00 | TTRPG club |
| Wed 17:00–20:00 (fortnightly) | Staff TTRPG |
| Thu 15:45–16:45 (sometimes →17:45) | Staff meeting |
| Fri after school 15:30–17:00 | Computing Club |

Break and lunch are **not** work windows (club running). Work windows = the 3 free periods +
before/after school. Leave ~19:00 most days (Tue 17:30; Wed 20:00 on staff-TTRPG weeks).

## Splits (more than one course in one slot)

- **Post-16** (Wed L1–L2, Thu L6): three courses at once → three `occurrence_courses`.
- **Year 10 GCSE CS** (Mon L5, Wed L4, Thu L5): one pupil on Sound Engineering alongside OCR GCSE.

## Other-teacher lessons (I plan / oversee)

- **7JMI** — both Computing Curriculum *and* Computer Skills (not in my timetable).
- **7ARO** — Computer Skills (I teach 7ARO Computing Curriculum, Tue L1).
- **7RAL** — Computer Skills (I teach 7RAL Computing Curriculum, Tue L6).

Modelled as `timetabled_lessons` with a non-self `staff_id`; I prepare the plan + resources and
keep oversight notes (SPEC §5.8, the "Lessons I oversee" view).

## Carry-over

Content (courses, schemes, resources, notes) is year-independent and carries over; the timetable
and groups are re-entered each September (SPEC §5.14).
