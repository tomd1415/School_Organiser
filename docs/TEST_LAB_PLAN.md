# Test Lab — plan

**Status:** Phase 1 (isolation core) + Phase 2 (launcher + sandbox cockpit + teardown) BUILT and verified
(2026-06-23). Decisions taken: two-tab UX (no split-screen); AI cockpit buttons confirm-gated in lab mode.
Phase 3 (single-monitor split view) intentionally skipped. Researched + adversarially reviewed via a
multi-agent pass; this doc folds in the corrections the review found.

## Goal (from the teacher)

A dedicated **Test Lab** section where you **select a lesson** and **run it as if real** from both the
**teacher's** and a **pupil's** point of view — including **writing answers on the worksheet** and the
**teacher & pupil screens working together** (slide move / lock) — **without affecting the rest of the
site**.

## What already exists (reuse, don't rebuild)

The "force-live + test pupil" flow already does almost all of the *behaviour*:

- **`/dev/force-live`** ([lesson.ts](../app/src/routes/lesson.ts)) — a teacher-only launcher that opens any
  timetabled lesson's live cockpit at any date (clock-decoupled). Writes nothing itself.
- **Test pupil overlay** — `POST /test-pupil/open` ([me.ts](../app/src/routes/me.ts)) sets session keys
  (`testPupilId/testLessonId/testDate/testLevel`) on the teacher's own session (a login-free *overlay*,
  role stays `teacher`). `ensureTestPupil()` ([pupils.ts](../app/src/repos/pupils.ts)) find-or-creates one
  fictitious `is_test` pupil, already excluded from `listPupils`/`listRoster` (the AI redaction roster) and
  enrolled in nothing.
- **Convergence** — both `/me` and the cockpit resolve the occurrence via
  `findOccurrence ?? findOrCreateOccurrence` + `getOccurrenceCourses`, so they land on the same
  `occurrence_courses.id`. That's what makes slide-sync (SSE) and marking line up between the two screens.
- **Slide-sync** end-to-end (`/lesson/oc/:id/slide` + `/slide-lock` → broadcast → `/me/slide-stream`),
  worksheet rendering, the marking modal, the progress tracker — all reusable verbatim.

### The problem it has today (why we need Test Lab)

Running a lesson this way **does affect real data**. The flow materialises a **real** `lesson_occurrences`
+ `occurrence_courses` row (no test marker — indistinguishable from a genuine live lesson), and when you
fill the worksheet / tap Done / leave feedback as the test pupil it writes **real** `pupil_answers`,
`pupil_done`, `pupil_lesson_feedback`, and (with `on_done` auto-marking) `pupil_marks` rows. Crucially,
**every occurrence-keyed aggregate** (`answersForMarking`, `classAnswers`, `markStatsByField`,
`marksBacklog`, `classFeedback`, …) keys purely on `occurrence_course_id` with **no `is_test` filter** — so
test answers on a real class's occurrence pollute that class's marking, AI class-summary, and stats. The
test pupil is hidden from rosters only because it's enrolled in nothing; the rows physically exist.

## Recommended approach — partition occurrences by `is_test`

**One isolating invariant:** a new `lesson_occurrences.is_test` flag, set **only** by the Test Lab path.

- Change the unique key on `lesson_occurrences` from `(timetabled_lesson_id, date)` to
  `(timetabled_lesson_id, date, is_test)`, and give `findOrCreateOccurrence(lessonId, date, isTest=false)`.
- A Test Lab run is on the **real** lesson and **real** date you pick (so worksheets/slides/clock/period
  times resolve identically and "last time" history stays meaningful) — but is a **separate**
  `lesson_occurrences` row, hence a **separate `occurrence_course_id`**, from the one real pupils use.

**Why it can't leak (by construction, not by a filter):** real pupils and the real cockpit call
`findOrCreateOccurrence`/`findOccurrence` with the default `isTest=false`
([me.ts:173](../app/src/routes/me.ts), [lesson.ts:583](../app/src/routes/lesson.ts)) — they **always**
resolve the `is_test=false` row. The Test Lab path is the **only** caller passing `isTest=true`. So a test
write lands on a `occurrence_course_id` no real read can reach *by id*. Slide-sync keys its channel map by
oc id, so a test slide move can **never** move a real connected pupil's deck (this even *fixes* a latent
risk in today's force-live flow).

### ⚠️ The correction the adversarial review found (load-bearing)

The "by id" guarantee only covers reads that select **by `occurrence_course_id`**. Many reads select **by
`group_course_id` / slot / date** and would silently pick up the test occurrence. The review enumerated
**~20** such paths (vs the ~9 the first draft guessed). **Every query that JOINs/FROMs `lesson_occurrences`
or `occurrence_courses` must get `AND NOT o.is_test`.** Found with:

```
grep -rn "JOIN lesson_occurrences\|FROM lesson_occurrences\|JOIN occurrence_courses\|FROM occurrence_courses" app/src
```

The dangerous ones (reachable in *normal* Test Lab use, because the cockpit progress tracker writes
`stopping_point`/`progress_step` on the test oc):

- **`getLastStoppingPoints`** ([occurrence.ts:113](../app/src/repos/occurrence.ts)) — test stopping point
  would show as the real cockpit's "last time → resume".
- **`recentGroupHistory` / `recentPaceSamples`** ([adaptations.ts](../app/src/repos/adaptations.ts)) and
  **`pastLessonsForClass` / `ocClassAndDate`** ([retrieval.ts](../app/src/repos/retrieval.ts)) — feed the
  **AI adapt + teaching-context** and spaced-retrieval recap for the real class.
- **delivery schedules** ([delivery.ts](../app/src/repos/delivery.ts)) — phantom planned lesson on the real
  slot in the planner/map.
- **`setup.ts`** `occurrenceCount` / `deleteLesson` guard / deactivate-course reconcile — a leftover test
  occurrence inflates the timetable view and **blocks deleting/editing the real slot**.
- plus `curriculumHistory.ts`, `groupHistory.ts`, `lessonReadiness.ts`, `cover.ts`, `resources.ts`,
  `pupilProgress.ts`.

**Mitigation:** grep every occurrence read and guard it; add a **CI grep-guard** + a marker comment on the
column so a future occurrence-keyed read can't regress un-guarded. Pupil-facing reads (`pupilWorkRows`,
`pupilCanAccessOc`, the marking modal) need **no** change — they JOIN `enrolments` and the test pupil is
enrolled in nothing.

`onPupilDone` ([markingQueue.ts](../app/src/services/markingQueue.ts)) also gets an early
`if (await occurrenceCourseIsTest(oc)) return;` so a test "Done" never even writes a mark-job row.

## Teardown (one-click + automatic)

`wipeTestOccurrences()` (new `repos/testLab.ts`): `DELETE FROM lesson_occurrences WHERE is_test` —
`ON DELETE CASCADE` clears `occurrence_courses` → `pupil_answers`/`pupil_marks`/`pupil_done`/
`pupil_lesson_feedback`/`occurrence_prep`/`resource_links`. Before the cascade, clear the **RESTRICT** FKs
(no cascade) — the review pinned these to exactly three: **`notes.occurrence_id`**, **`tasks.occurrence_id`**,
**`time_entries.occurrence_id`** — plus `DELETE FROM marking_queue WHERE occurrence_course_id IN (…)`, and
tombstone the worksheet screenshots under `pupil-work/<oc>/<testPupilId>/` (reuse `enqueueFileDeletion`).
The fictitious pupil row is permanent and reused; only its work-on-test-occurrences is wiped.

Three triggers: **manual** `POST /test-lab/reset`; **on new run** (wipe prior test occurrences first); and a
**boot + periodic reaper**. ⚠️ Reaper must be **`created_at`-based** (`WHERE is_test AND created_at < now() -
interval '1 day'`), **not** `date`-based — Test Lab allows far-future dates that a date-based reaper would
never catch.

## Routes & UX

- **`GET /test-lab`** — rebrand of `/dev/force-live`: lesson list + date picker, each row → cockpit with a
  `lab=1` marker; a "Reset Test Lab (wipe N runs)" button. Keep `/dev/force-live` as a redirect alias.
- **`POST /test-lab/reset`** → `wipeTestOccurrences()`.
- The cockpit (`/lesson?…&lab=1`) and `/test-pupil/open` thread `isTest=true` into occurrence resolution.
  Everything else (`/me`, `/me/answer`, `/me/slide-stream`, slide routes) is **unchanged** — it just
  operates on the test oc.
- **Two-tab UX (works on two monitors / alt-tab):** open the cockpit in tab A, "🧪 Test as pupil" opens
  `/me` in tab B; both share the test oc → live slide-sync + lock + end-to-end marking, all sandboxed.
- **Single-monitor split view (optional polish):** `GET /test-lab/run` = two same-origin iframes (cockpit
  left, pupil right) under a persistent "🧪 TEST LAB — sandbox" banner; shares the session/overlay → same
  test oc → live SSE with zero new wiring. (Verify no global `X-Frame-Options: DENY`/`frame-ancestors`.)

## Privacy (CLAUDE.md / DPIA) — unchanged guarantees

The only actor is the fictitious `is_test` pupil (no real child's data), already excluded from the AI
redaction roster. Any AI a teacher triggers still routes through the one wrapper (withhold → redact →
egress assert). `on_done` marking is a no-op for a test oc (guarded + short-circuited), so a normal run
fires **no** billed AI call. Tests keep `NODE_ENV=test` + empty `ANTHROPIC_API_KEY`.

## Decision needed: cockpit AI buttons in lab mode

The cockpit's **adapt-lesson / regenerate-resources** buttons mutate **shared upstream** rows
(`lesson_adaptations`, `resource_versions`, `resource_links`) keyed on the **group_course/plan, not the
occurrence** — so `wipeTestOccurrences()` **cannot** roll them back. Recommend **hiding them in lab mode**
(or a confirm gate). You may want to *test* them — your call.

## Phasing

1. **Isolation core (ship first, no UX change):** migration `0062` (column + 3-col unique key),
   `findOrCreateOccurrence`/`findOccurrence` `isTest` param, **all** occurrence-read guards + CI grep-guard,
   `onPupilDone` short-circuit, integration test proving a test run is absent from every real aggregate.
   *After this, even today's force-live stops polluting once it passes `isTest=true`.*
2. **Launcher + teardown:** `/test-lab` rebrand + `lab=1` threading, `wipeTestOccurrences()` +
   `/test-lab/reset` + reaper, settings link reword. Two-tab UX works here.
3. **Single-monitor split view (optional):** `/test-lab/run` split-iframe + cockpit sandbox banner.

## Implementation details to settle (I can decide these; listed for completeness)

- Exact name of the existing inline `UNIQUE (timetabled_lesson_id, date)` constraint to DROP in `0062`
  (auto-named `lesson_occurrences_timetabled_lesson_id_date_key`).
- Guard style per read: shared `NOT IN (test ocs)` subquery vs `AND NOT o.is_test` on reads that already
  JOIN `lesson_occurrences` vs call-site gate. (Lean: `AND NOT o.is_test` where a JOIN exists.)
- Full FK sweep confirmed: RESTRICT FKs to clear = `notes`, `tasks`, `time_entries` (others cascade or FK
  elsewhere).

## Tests

- Integration: start a test run on a real lesson+date that *also* has a real occurrence; write a test
  answer + Done; assert test oc id ≠ real oc id and the test answer is **absent** from every real-aggregate
  read + `countTaughtLessons`; then `/test-lab/reset` and assert rows/screenshots gone, counts back to
  baseline. FK teardown test (note on a test occurrence). Migration test (same slot holds both
  `is_test` false/true, distinct + idempotent). CI grep-guard for new un-guarded occurrence reads.
