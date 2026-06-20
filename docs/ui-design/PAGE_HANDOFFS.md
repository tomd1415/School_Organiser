# Per-page handoffs

Completed handoff templates (per [UI_OVERHAUL_DEVELOPER_INPUTS.md §5](UI_OVERHAUL_DEVELOPER_INPUTS.md))
for the four highest-complexity journeys, to sit beside the Marking one already in
[DEVELOPER_INPUTS_RESPONSE.md §8](DEVELOPER_INPUTS_RESPONSE.md). Reminder (response §0b): **none of these
has a typed view model yet** — the handler assembles the data inline; "Data/view-model" lists the
functions that produce it, which the UI must consume rather than re-derive. Routes for each are in
[ROUTE_INVENTORY.md](ROUTE_INVENTORY.md); shared contracts in [CONTRACTS_TO_PRESERVE.md](CONTRACTS_TO_PRESERVE.md).

---

## Now (`/`)

```md
- Route(s): GET / (page, role-landing for teacher); GET /now/clock?sig= (live strip fragment).
- Owner: you. File: routes/now.ts.
- Primary user/task: teacher — at any moment, see what I'm teaching now, what's next, and what needs me
  before the bell. The daily home.
- Allowed roles: teacher.
- Entry points/deep links: app root; rail "Now" (g h). No params.
- Data/view-model type: NONE typed. now.ts assembles: resolveNowLessons (services/clock.resolveNow +
  repos/clock.getSelfLessonAt) → current/next lesson; nowExceptions → effective free/cover/room; the
  current card (renderCurrentCard: courses, last stopping points, notes, follow-ups); the next card;
  needsMeRows (repos/marking.marksBacklog + bell tasks + due events + captured heads incl. safeguarding,
  ranked); the start/end-of-day checklist; the earned "experience" nudge.
- Read dependencies: services/clock (lesson state, term, current academic year, school-day) — DO NOT
  recompute these in the UI; repos/clock; repos/marking; tasks/events/captured repos.
- Write actions: bell-task done (POST /tasks/:id/done); stopping point + notes on the current card
  (POST /occurrence-course/:id/stopping, /notes, /followups/:id/toggle); day-checklist toggle
  (POST /day-checklist/:id/toggle). "marks" needs-me rows OPEN THE MARKING MODAL (markOpenAttrs →
  /lesson/oc/:id/mark), they don't mutate here.
- Feature gates/settings: marks backlog only when pupil_marks_enabled; pupil-work counts when
  pupil_access_enabled; the experience nudge only in 'everyday' until dismissed.
- Privacy classification: live pupil-work counts are AGGREGATE only (safe to show). Safeguarding items
  appear in "Needs me", ranked top — teacher-only, never hidden behind a task area.
- Empty states: no timetable / no term / no current academic year → "No school today / the next teaching
  slot is shown above" + a setup pointer. No needs-me → "Nothing needs you before the bell. ✓".
- Partial/incomplete: secondary regions (AI summary, day checklist) are collapsed/HTMX-loaded.
- Disabled/permission: the marks region is simply absent when its gate is off.
- Success: the now-strip + current/next cards render; the 30s poll keeps the strip current.
- Failure/retry: handler try/catch → a calm "Something went wrong" card (never a stack).
- Stale/concurrent: GET /now/clock?sig= returns 204 when unchanged (no swap, no focus steal); on a
  day/lesson rollover the poll STOPS and shows "the lesson has changed — refresh".
- Slow/background: the strip poll is the only background refresh; everything else is first-render.
- Long-content: "Needs me" caps to 6 with "+N more"; ranked by severity then time.
- Keyboard/focus: g+letter jump map; n = note; the poll MUST NOT steal focus or close a dialog.
- Existing tests: tests/integration/clock.int.test.ts; the Now exception suppression tests.
- Known defects/pending: none open.
- Behavior that must not change: the 204 no-change poll; aggregate-only pupil counts; safeguarding
  always visible; clock/term/year resolved server-side.
```

## In-lesson hub (`/lesson`)

```md
- Route(s): GET /lesson?lesson=<timetabledLessonId>&date=<YYYY-MM-DD> (page) + ~29 sub-routes (plan bind,
  progress/stopping, adapt [+AI], generate-resources [AI], retrieval-starter, worksheet-preview,
  pupil-view [board], exception free/cover/room, cover-pack, print). See ROUTE_INVENTORY (module=lesson).
- Owner: you. File: routes/lesson.ts (30 routes — the densest module).
- Primary user/task: teacher runs the live (or any) lesson — see the bound plan, "last time" resume
  point, adapt it for THIS class, open its resources/worksheet, and watch the pupil-work panel.
- Allowed roles: teacher; TA via a deep-link (read + feedback only, lockdown role); /lesson/pupil-view is
  the board/projector view.
- Entry points/deep links: Now current/next link; timetable; marking; all carry ?lesson&date (stable).
- Data/view-model type: NONE typed. findOrCreateOccurrence(lesson,date) → getOccurrenceHeader (period,
  room, staff, group, isSelf) + getOccurrenceCourses (per-course plan title/objectives/outline/kit,
  stopping_point, progress_step); getLastStoppingPoints ("last time"); occurrence notes + follow-ups;
  getLessonWorksheets; adaptation status (getAdaptation).
- Read dependencies: services/clock + exceptions (the EFFECTIVE lesson after free/cover/room — DO NOT
  recompute); repos/occurrence; services/worksheet; repos/adaptations.
- Write actions: bind plan (POST /occurrence-course/:id/plan); set progress/stopping
  (/occurrence-course/:id/progress, /notes /occurrence-course/:id/stopping); adapt for class
  (/lesson/adapt/:gc/:lp [+ /ai]); generate the resource set (/lesson/adapt/:gc/:lp/resources-ai);
  retrieval starter; cover pack; record an exception (/lesson/exception); notes/follow-ups.
- Feature gates/settings: AI actions need an ANTHROPIC_API_KEY + the feature on; the pupil-work panel
  needs pupil_access_enabled (+ marks for the mark bar).
- Privacy classification: pupil work is teacher-facing; ALL AI actions go through the one wrapper
  (roster names → tokens, safeguarding withheld, audited) — the UI must route feature inputs through it,
  never a raw model call. Teaching/class context is cohort-level prose, never names a pupil.
- Empty states: no plan bound → "generate or lay a plan"; no worksheet → preview shows "none yet".
- Partial/incomplete: adapt/resources/marking load as HTMX regions; AI buttons disable in-flight.
- Disabled/permission: AI buttons explain when AI is off; TA sees a read/feedback subset.
- Success: the lesson card + resume point + resources render; an adapt swaps the plan region.
- Failure/retry: AI failures degrade to a message (no partial write); 4xx on bad refs.
- Stale/concurrent: the pupil-work panel polls with a sig (204 unchanged); adaptations are per-class.
- Slow/background: AI calls are the slow path — they show a disabled/✨-busy state; the pupil-work poll
  is the only passive refresh.
- Long-content: outlines/notes can be long — they're prose blocks; the board view (pupil-view) is the
  presentation surface.
- Keyboard/focus: standard; the print/board routes are separate presentations.
- Existing tests: occurrence.int.test.ts, taExceptions.int.test.ts, reviewFixes.int.test.ts,
  delivery.int.test.ts.
- Known defects/pending: none open.
- Behavior that must not change: **opening /lesson MATERIALISES the occurrence** (findOrCreateOccurrence)
  — printing/board use read-only paths and must NOT materialise; the AI redaction wrapper; stopping-point
  = resume machinery; the effective-exception resolution.
```

## Schemes of work (`/schemes`)

```md
- Route(s): GET /schemes (page, tabbed per course) + ~39 (author [AI], new version, activate, adapt,
  convert-unit panel/search/convert, spot-check [AI], teaching-context, plan-field edit, coverage). See
  ROUTE_INVENTORY (module=schemes, 40 routes).
- Owner: you. File: routes/schemes.ts.
- Primary user/task: teacher authors and manages the scheme of work per course, converts downloaded
  Teach Computing units into their own lessons, and keeps exactly one live version.
- Allowed roles: teacher.
- Entry points/deep links: rail "Schemes" (g s); the 📘 pedagogy link; course tab = ?course / :id.
- Data/view-model type: NONE typed. listCourses; getScheme + listAllSchemes; listUnits +
  listPlansForScheme (rendered via lib/schemeView.ts); getCourseTeachingContext; spec points/coverage;
  for convert: convertUnit.unitCandidates / lessonStructure over the resource store.
- Read dependencies: repos/schemes, services/scheme, services/convertUnit, repos/resources, coverage.
- Write actions: author whole scheme (POST /schemes/course/:id/author — AI → materialiseScheme, atomic);
  new draft version (/schemes/:id/version — clone); make a version live (/schemes/:id/activate); edit a
  plan field (updatePlanField); set teaching context; convert a downloaded unit
  (/schemes/course/:id/convert — AI reads the unit's extracted text); spot-check a random lesson (AI).
- Feature gates/settings: AI features (key + on); the advisory reviewer (off by default).
- Privacy classification: teaching context is COHORT-LEVEL PROSE ONLY — never names/describes a pupil
  (enforced); keep that framing in any context editor. AI authoring uses the wrapper.
- Empty states: no courses → setup pointer; a course with no scheme → "author one"; convert with no
  downloaded units present → "import a unit first" (links to /resources/import).
- Partial/incomplete: a course's first scheme goes LIVE; later ones land as DRAFT (badges) for you to
  activate — so authoring never silently replaces what's teaching.
- Disabled/permission: AI buttons disabled/explained when AI off.
- Success: the scheme tree (units → lessons) renders; activate flips the live badge.
- Failure/retry: AI author/convert failures leave NO partial scheme (one transaction).
- Stale/concurrent: version create + activate are advisory-locked per course (migration 0051) so two
  edits can't produce two/zero active schemes — surface conflicts, don't manage them.
- Slow/background: AI author/convert are the slow paths (✨-busy/disabled).
- Long-content: a scheme can be many units × many lessons — schemeView already groups them.
- Keyboard/focus: standard.
- Existing tests: authorScheme.int.test.ts; the scheme-invariant tests (one-active/unique-version).
- Known defects/pending: none open.
- Behavior that must not change: the one-active-scheme-per-course + unique-(course,version) invariants
  and the transactional activation; convert reads the resource store + the AI wrapper.
```

## Pupil workspace (`/me`)

```md
- Route(s): GET /me (page, pupilLayout); POST /me/answer?oc&key (autosave a field); /me/answer-image
  (screenshot); /me/done; /me/feedback; /me/remember (stay-signed-in); GET /pupil-image (serve a pasted
  shot). Login at /pupil (pupilAuth). See ROUTE_INVENTORY (modules me, pupilAuth).
- Owner: you. File: routes/me.ts (separate pupil presentation — do NOT derive it by hiding teacher UI).
- Primary user/task: a pupil does today's lesson — their level-sliced worksheet(s), autosaving, mark
  Done, leave a one-tap feedback face.
- Allowed roles: PUPIL (session role 'pupil'); plus the teacher's 🧪 test pupil for previewing.
- Entry points/deep links: /pupil (class code → tap your name → PIN) → /me; or a remembered device.
- Data/view-model type: NONE typed. me.ts assembles per current-lesson section: getPupilLevel;
  getLessonWorksheets (→ TABS, each with its keyPrefix); getAnswers; isDone; feedback; slides
  (getLessonSlidesMarkdown); a results card when marks are released. renderWorksheet slices to the
  pupil's level (shared + their level only) and is UNLABELLED (the level name/colour is never shown).
- Read dependencies: services/worksheet, repos/pupilWork, lib/worksheetForm, repos/marking (released only).
- Write actions: autosave a field (POST /me/answer?oc=&key= — saveAnswer; the key carries the worksheet
  prefix wN.; provenance resolved by worksheetForKey); paste image (/me/answer-image); Done (/me/done);
  feedback faces (/me/feedback); remember device (/me/remember).
- Feature gates/settings: pupil_access_enabled is the MASTER switch — /me redirects/403s when off (the
  test pupil bypasses). marks shown only when released (showScores: ticks-only by default).
- Privacy classification: HIGH. A real pupil may write ONLY to their SESSION group's CURRENT, non-
  cancelled lesson and a key that's on the worksheet (pupilMayWriteOc, BUG-030). A pupil must NEVER see
  another pupil's name, answers or marks. Names never go to AI.
- Empty states: "Nothing set for this lesson yet" when no worksheet is bound.
- Partial/incomplete: the "X of Y done" chip (pupil.js) updates live; tabs let several worksheets be in
  progress; a Parson's counts done once arranged (is-ordered).
- Disabled/permission: outside a writable lesson the fields are inert; access-off → not reachable.
- Success: per-field "saving… → saved ✓" (OOB swap savedTick); Done ✓ + feedback confirm.
- Failure/retry: autosave failure shows "could not save — try again" on that field + beforeunload guard;
  a 4xx is NOT reported as success.
- Stale/concurrent: changing a previously-marked answer drops its stale mark server-side (BUG-004).
- Slow/background: none — pupil saves are immediate; no polling on the pupil surface.
- Long-content: reading-age content, short chunks for Support; the slides pane is the long surface
  (two-pane on wide screens, a tab toggle on narrow).
- Keyboard/focus: read-aloud toolbar (data-speak); matching/parsons have keyboard fallbacks; 44px tap
  targets; the level slice stays unlabelled.
- Existing tests: testPupil.int.test.ts, pupilWork.int.test.ts, pupilRevoke.int.test.ts,
  screenshotPaste.int.test.ts.
- Known defects/pending: none open.
- Behavior that must not change: the write-eligibility predicate (pupilMayWriteOc); never expose another
  pupil's data; the unlabelled level slicing; the autosave key + provenance; marks-only-when-released.
```

---

These four plus the Marking handoff (response §8) cover the journeys with the most state and the
strictest privacy/safeguarding rules. The remaining pages (Organise items, Setup, Settings) are
lower-risk CRUD over the `lib/*View.ts` helpers — a UI dev can lift their template from these.
