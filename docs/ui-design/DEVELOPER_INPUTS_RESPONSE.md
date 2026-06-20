# UI overhaul — developer inputs, answered

Response to [UI_OVERHAUL_DEVELOPER_INPUTS.md](UI_OVERHAUL_DEVELOPER_INPUTS.md). Filled in from the
codebase as of 2026-06-20. Section numbers mirror that checklist. Where an answer is a **product
decision only you can make**, it's tagged **[DECIDE]**.

---

## 0. Read this first — two facts that reframe the whole checklist

**(a) This is a single-developer project.** One owner (you); work lives on `main`; there are no
competing worktrees or merge windows. So the coordination/ownership machinery (§2.2, §3, most of §17)
collapses to "ask yourself." What still matters from those sections is the *list of recently-churned
shared files* (below) so a UI pass doesn't fight an in-flight change.

**(b) There is no view-model or template layer.** This is the single most important thing for the
overhaul. Pages are **HTML strings assembled inside route handlers**, with:

- one global shell — `app/src/lib/html.ts` `layout({title, body, authed, csrfToken})` (renders `<head>`,
  the rail via `lib/nav.ts`, the two hosted dialogs, the script tags);
- ~11 per-area **render helpers** (`app/src/lib/*View.ts` — `resourceView`, `schemeView`, `taskView`,
  `notesView`, `eventView`, `capturedView`, `recurringView`, `prepView`, `workBlockView`, …);
- everything else built inline in the handler (27 of 38 route modules call `layout()`; ~39 full-page
  renders; the rest return HTMX fragments as strings).

There is **no `src/views`, `src/templates` or component directory, and no typed per-page view model.**
So §6's core ask ("render typed view models rather than query DB structure") is *not currently met* —
it would itself be new work. The realistic seam: the handler **already computes all the data** (it
queries repos, resolves state, then string-builds HTML). That assembled data *is* the de-facto view
model — it's just untyped and interleaved with markup. The cheapest overhaul path is **extract a render
helper per page that takes an explicit object**, lifting the existing handler data into a typed shape as
you go, without changing the queries/services beneath. Don't expect ready-made typed contracts; expect
to *introduce* them page by page from handler-local data.

Stack facts the UI inherits: TypeScript / Fastify 5, **server-rendered HTML + vendored HTMX** (no SPA,
no client framework), Zod validation, `@fastify/csrf-protection`, sessions via signed cookies. Client
JS is two hand-written files: `public/app.js` (teacher) and `public/pupil.js` (pupil/TA), plus
`public/htmx.min.js` (vendored). CSS is one file: `public/styles.css` (already token-based — see §14).

---

## 1. §3 — Ownership & coordination

| Field | Answer |
|---|---|
| Active branches/worktrees | `main` only. No worktrees. |
| Owner per area | You, for all of it. |
| Files currently changing | None in flight by another dev. Recently churned on `main` (uncommitted between sessions): the marking modal (`routes/markModal.ts`, `markingPage.ts`), worksheet types (`lib/worksheetForm.ts`, `public/pupil.js`), `lib/html.ts` (added a second dialog host), `lib/nav.ts` (added Marking), `public/styles.css` (marking + worksheet + pedagogy blocks), the AI prompts, the resource-attribution quick win. |
| Merge order/dates | N/A (single branch). |
| Pending migrations/route changes | Migrations are sequential auto-run files (`app/migrations/NNNN_*.sql`); latest is `0055_resource_attribution.sql`. No route renames pending. |
| Known regressions | None open; full suite green (554 unit / 340 integration). The audit (`BUGREPORT.md`) is closed 50/50. |
| Feature flags available | Settings-keyed gates only (see §17) — there is **no new-shell flag yet** **[DECIDE]**. |
| Final vs provisional | "Rail & Stage" shell is the current, intended design (`lib/nav.ts` renders it; `docs/UX_FLOWS.md`). Treat it as the baseline to evolve, not a throwaway. |

**Shared files (get them right, they're load-bearing):** `lib/html.ts` (shell + both dialogs +
CSRF-header wiring), `lib/nav.ts` (the rail + the `g`+key jump map, single source of truth for nav),
`public/app.js` (HTMX lifecycle, unsaved-changes guard, note modal, marking arrows, worksheet tabs),
`public/styles.css` (all CSS, token-based). Changing a global status class, the `#note-modal` /
`#mark-modal` host ids, or the `data-*` contracts in app.js/pupil.js will break behaviour silently.

## 2. §4 — Route inventory (module-level)

295 routes across 38 register-modules. A full per-route table (12 fields × 295) isn't the useful
artifact; this module-level map is. Each module owns several literal + parameterised routes plus HTMX
fragments. "Page" = renders `layout()`; "fragments" = HTMX partials/actions.

| Module (file) | Proposed area | Primary page(s) | Roles | Gate | Render | Notes |
|---|---|---|---|---|---|---|
| `now.ts` | Today | `/` (Now) | teacher | auth | handler + cards | live poll `/now/clock`; "Needs me"; marking backlog |
| `focus.ts` | Today | `/focus` | teacher | auth | handler | 6 routes |
| `lesson.ts` | Teach | `/lesson?lesson&date`, `/lesson/oc/:id/*` | teacher, **TA** (deep-link), pupil-preview | auth (+ TA lockdown) | handler | **30 routes** — the in-lesson hub: notes, stopping point, adapt, resources, worksheet preview, pupil-work panel |
| `me.ts` | Pupil | `/me`, `/me/answer*` | **pupil** | requirePupil + `pupil_access_enabled` | `pupilLayout` | tabbed worksheets, autosave, Done, feedback |
| `pupilAuth.ts` | Pupil | `/pupil`, login | unauth→pupil | `pupil_access_enabled` | `pupilLayout` | class-code → name → PIN |
| `ta.ts` | TA | `/ta*` | **TA** | auth + lockdown | `taLayout` | read/feedback only |
| `markModal.ts` | Assess | `/lesson/oc/:id/pupil/:pid/mark` (dialog) | teacher | auth + `pupil_marks` | handler | the per-pupil marking modal (built 2026-06-20) |
| `markingPage.ts` | Assess | `/marking` | teacher | auth | `layout` | lessons-with-work list |
| `pupilWork.ts` | Assess | `/lesson/oc/:id/pupil-work` (fragment) | teacher | auth + `pupil_access` | handler | the work grid + scheme/derive/mark bar (21 routes) |
| `schemes.ts` | Plan | `/schemes` | teacher | auth | `schemeView` + handler | **40 routes** — author, version, adapt, convert-a-unit, spot-check |
| `planner.ts` | Plan | `/planner` | teacher | auth | handler | drag lay-down |
| `map.ts` | Plan | `/map` | teacher | auth | handler | curriculum map |
| `coverage.ts` | Plan | `/coverage` | teacher | auth | handler | spec-point coverage (12 routes) |
| `timetable.ts` | Plan/Today | `/timetable` | teacher | auth | handler | week grid |
| `concepts.ts` | Plan | `/concepts` | teacher | auth | handler | teaching-concepts library |
| `pedagogyPage.ts` | Plan | `/pedagogy` | teacher | auth | `layout` | NCCE principles (read-only) |
| `resources.ts` | Organise | `/resources`, `/resources/import` | teacher (+ TA limited) | auth | `resourceView` | store + bulk import (21 routes) |
| `notes.ts`, `noteCapture.ts` | Organise/Today | `/notes`, `#note-modal` | teacher | auth | `notesView` | plain + AI-routed capture |
| `tasks.ts`, `events.ts`, `captured.ts`, `recurring.ts`, `time.ts`, `timer.ts`, `prep.ts` | Organise / Today context | `/tasks` `/events` `/captured` `/recurring` `/time` | teacher | auth | `*View` helpers | daily-context items |
| `pupils.ts` | Organise (Advanced) | `/pupils` | teacher | auth | handler | roster, PINs, levels (15 routes) |
| `setup.ts`, `rollover.ts`, `welcome.ts` | Organise (Advanced)/Setup | `/setup`, `/setup/rollover`, `/welcome` | teacher (welcome = onboarding) | auth (welcome: pre-auth) | handler | **26+** setup routes; some operator-only **[DECIDE]** |
| `settingsPage.ts` | Organise (Advanced) | `/settings` | teacher | auth | handler | 23 routes; DPIA gates, experience toggle |
| `kit.ts` | Organise (Advanced) | `/kit` | teacher | auth | handler | inventory |
| `oversee.ts` | **[DECIDE] Teach or Organise** | `/oversee` | teacher | auth | handler | lessons another teacher delivers that you plan |
| `groupHistory.ts` | Teach (embed) | `/group/:id/history` | teacher | auth | handler | embedded in lesson/adapt |
| `safeguarding.ts` | **Safeguarding (global)** | `/safeguarding` | teacher | auth | handler | disclosure register — never hide behind a task area |
| `search.ts` | global | `/search` | teacher | auth | handler | global search |
| `auth/routes.ts` | global | `/login` `/logout` | unauth/teacher | — | handler | session |
| `health.ts` | infra | `/healthz` | — | — | — | probe |

Same-business-function, different presentation (the §4 "variants"): a lesson appears as the **teacher**
`/lesson`, the **TA** `/ta` view, the **pupil** `/me` view, a **board/preview** (`/lesson/pupil-view`,
`/lesson/print`), and a **print** (`/today/print`, `/lesson/print`, answer-pack). These share data but
must stay distinct presentations (§13) — do not derive one by hiding another's controls.

If you want a literal 295-row machine-readable inventory I can generate it from the route files; say so.

## 3. §4.1 — Task-area mapping (proposal)

Derived from `lib/nav.ts` `NAV_MODEL` (the current rail). Existing URLs stay stable; only grouping/labels
change.

| Existing | Proposed home | My call / **[DECIDE]** |
|---|---|---|
| Now, Focus | **Today** | Keep both as pages for now; Focus-as-a-Now-mode is a nice-to-have **[DECIDE]**. |
| Timetable | **Plan** (+ a Today entry) | Canonical = the week grid at `/timetable`; agenda is a view of the same data. **[DECIDE]** grid vs agenda default. |
| Marking, pupil work | **Assess** | `/marking` + the modal are the Assess home. In-lesson marking stays reachable from the lesson too (the grid). |
| Schemes, Map, Planner, Coverage, Concepts, Pedagogy | **Plan** | Terminology: keep scheme / unit / lesson plan / occurrence exact (§11). |
| Tasks, Recurring, Events, Captured, Time | **Organise**, surfaced in **Today** context | Daily shortcuts already live on Now ("Needs me"). |
| Notes, Resources, Concepts | **Organise** + contextual | Canonical browse = `/resources`, `/notes`. |
| Pupils, Setup, Kit, Settings | **Organise → Advanced** | Already `tier:'power'` in nav. Keep behind the experience toggle. |
| Oversee | **[DECIDE]** | It's "you plan, another teacher delivers" — Teach or Organise. |
| Safeguarding | **Persistent global** | Already pinned outside the groups in `renderRail()`; never task-area-hidden. |

## 4. §6 — View-model reality & §7 write contracts

See §0(b): no typed view models exist. Practical guidance:

- **Reads:** the handler has already resolved everything before it string-builds HTML — current lesson,
  effective room/cover (via `services/clock` + exceptions), marking status, levels, etc. Lift that into
  a typed object per page; **don't** re-query or recompute in the UI. The functions that already do the
  resolving (so the UI must NOT reimplement them, per §6's "do not independently calculate" list):
  `services/clock.ts` (lesson state, current year, school day), `repos/clock.ts` (effective lesson),
  marking status (`repos/marking.ts markSummaries`), pupil eligibility (`repos/pupilWork pupilCanAccessOc`,
  `me.ts pupilMayWriteOc`).
- **Writes / HTMX (§7):** every mutating route is `POST` and guarded by
  `{ preHandler: [requireAuth, app.csrfProtection] }`. CSRF travels as the `x-csrf-token` header — the
  two dialogs carry it via `hx-headers` on the `<dialog>`; full pages put `reply.generateCsrf()` into a
  `hx-headers` on the page `<section>` or a hidden `_csrf` field. **Failed writes do not return 200** —
  routes return real 4xx and HTMX is configured to swap error bodies; the unsaved-changes guard in
  `app.js` (`app:save-failed` / `unsavedOps`) tracks per-op success by a `data-save-id`/name key. Autosave
  fields already use stable keys (worksheet field keys like `t1.r1.c2`, now optionally `w{n}.`-prefixed)
  — reuse those as the §7 "stable operation id", not `value`.
- **Idempotency/concurrency:** the heavy paths are already transactional + advisory-locked (planner
  cascade `applyPlacements`, scheme versioning `nextSchemeSlot`, resource version append). The UI should
  surface conflicts, not manage them.

## 5. §8 — Permission matrix

Roles set in session as `role ∈ {teacher, ta, pupil}`; unauthenticated otherwise. Enforcement is
server-side (the UI omits/disables for affordance only).

| Capability | Unauth | Teacher (everyday) | Teacher (power) | TA | Pupil |
|---|---|---|---|---|---|
| Any teacher page | → `/login` | ✓ | ✓ (+ Advanced rail) | ✗ (own `/ta`) | ✗ |
| Advanced pages (Pupils/Setup/Kit/Settings/Time/Recurring/Concepts) | ✗ | hidden (rail folds them) | ✓ | ✗ | ✗ |
| Marking + work grid | ✗ | ✓ *iff* `pupil_access_enabled` **and** `pupil_marks_enabled` | same | read-only feedback | own results only, when released |
| Pupil portal `/me` | ✗ | (test pupil only) | same | ✗ | ✓ *iff* `pupil_access_enabled`, own current lesson |
| Safeguarding register | ✗ | ✓ | ✓ | ✗ | ✗ |
| Convert-unit / AI features | ✗ | ✓ *iff* AI key + feature on | same | ✗ | ✗ |
| Operator actions (backup/restore/deploy) | — | **not in-app** (shell scripts) | — | — | — |

Gates are settings (`pupil_access_enabled`, `pupil_marks_enabled`, `ai_enabled`, …) — see §17. TA is a
limited role (`auth/lockdown.ts isLimitedRole`) that strips destructive/edit affordances. Session:
idle-logout (Phase 10); a logged-out open tab/dialog gets 401 on the next action → the UI should send
to `/login` (don't silently swallow). "Information never for another role": pupil names + raw answers
must never appear in a pupil's own response for *another* pupil; marks only when released.

## 6. §9.3 — Marking state machine (built 2026-06-20, authoritative)

Per-answer mark lifecycle (`pupil_marks`, gated by `pupil_marks_enabled`):

| State | Meaning | Source |
|---|---|---|
| **unmarked** | no `pupil_marks` row for the answer | — |
| **suggested** | AI proposed a mark, unconfirmed | `marker='ai', status='suggested'` |
| **needs-review** | AI was unsure / safety gate flagged | `needs_review=true` |
| **checked / confirmed** | teacher accepted or set it | `status='confirmed'` (marker `ai`→accepted, or `teacher`→override) |
| **released** | visible to the pupil | `occurrence_courses.marks_released_at` set |

Transitions + contracts (all I built, so these are stable):

- **Set a mark** → `POST /lesson/oc/:id/pupil/:pid/mark/save` `{answerId, marks, total, ws}` → updates
  or creates a **teacher/confirmed** mark (`overrideMark`, else `writeMark`), returns the refreshed modal
  body into `#mark-modal-body`. Clamped `0…total`.
- **Confirm all** → `POST …/mark/confirm` confirms **only confident** suggestions —
  `confirmMarksForPupil` deliberately **leaves `needs_review` marks unconfirmed**. So "X/Y checked" can
  legitimately stay < Y after Confirm all (that's the signal, not a bug).
- **Confirm & next** → same route with `{next:<pid>}`; confirms current, returns the *next* pupil's body.
  On a roster with pupils who have no work, navigation still includes them (you can mark a blank).
- **Navigate** → `GET …/pupil/:pid/mark?ws=<i>`; `← →` arrow keys (app.js) drive prev/skip; the worksheet
  picker switches `ws`.
- **Score bounds:** out of the sum of mark-scheme point marks (Parson's = its own; code = open). Mark
  scheme is keyed to the worksheet resource **version** (`mark_schemes(resource_id, version_no)`).
- **AI-off presentation:** the modal still shows each question, its model answer and the pupil's answer,
  read-only, with a "turn on auto-marking" note — teacher can't record marks until the gate is on.
- **Release** is reversible (un-release) with a confirm; ticks-only to pupils by default
  (`showScores` setting). Pupil comment autosaves on `change`.
- Stable fragments to target: `#mark-modal-body` (modal), `#pw-<oc>` (grid). Tests:
  `tests/integration/markModal.int.test.ts`, `tests/integration/marking.int.test.ts`.

## 7. §9.1 / §10 — Lesson lifecycle & Now (key transitions)

- **Occurrence materialisation:** `findOrCreateOccurrence(lessonId, date)` creates the `lesson_occurrences`
  row + its `occurrence_courses` **on demand** (opening the lesson, laying a plan, the pupil/Now path).
  A *deactivated* group-course won't revive (`BUG-023`). Merely **printing/board-view uses read-only
  paths** (`findOccurrence`, no write) — viewing should not materialise. Confirm this invariant before a
  UI adds a prefetch that hits a write path.
- **Taught:** `lesson_occurrences.status ∈ {planned, taught, cancelled, cover}`; "taught" for counting =
  an `occurrence_course` with a `stopping_point`/`progress_step` (`countTaughtLessons`).
- **Exceptions** (free/cover/room-change/cancelled/holiday) resolve in `services/clock` + the exception
  repos; the handler hands the UI the **effective** lesson — don't recompute.
- **Now** assembles many sources in `now.ts` (current/next lesson, "Needs me" ranked items incl. marking
  backlog + safeguarding, day checklist, exceptions). It is the closest thing to a resolved daily
  view-model, but it's still handler-local, not a typed export. Live poll = `/now/clock?sig=…`; it must
  not steal focus or close a dialog (the poll already 204s when unchanged).

## 8. §5 — One worked per-page handoff (the marking modal)

```md
### Marking modal
- Route(s): GET /lesson/oc/:id/pupil/:pid/mark[?ws]; GET /lesson/oc/:id/mark (first pupil);
  POST …/mark/save; POST …/mark/confirm. Host dialog #mark-modal in lib/html.ts.
- Owner: you. Built 2026-06-20 (routes/markModal.ts).
- Primary user/task: teacher marks one pupil's worksheet on one screen, walks the class.
- Allowed roles: teacher; gated by pupil_marks_enabled (+ pupil_access_enabled).
- Entry points: work grid pupil name, /marking "Mark", Now "Needs me" marks row (markOpenAttrs()).
- Data/view-model type: NONE yet — buildModal() assembles roster (pupilWorkRows), worksheets
  (getLessonWorksheets), scheme (getScheme), answers, marks (marksForPupil) inline. Lift to a type.
- Write actions: save (override/writeMark), confirm (confirmMarksForPupil), comment (setComment).
- Feature gates: pupil_marks_enabled, pupil_access_enabled.
- Privacy: pupil names + raw answers are teacher-only; never sent to AI from here.
- Empty: no worksheet bound → message; pupil with no answers → "left blank" rows.
- Partial: suggested/needs-review badges; "X/Y checked" < total is valid.
- Disabled: AI-off → read-only model+pupil answers, no mark inputs.
- Success: refreshed #mark-modal-body; Confirm&next advances.
- Failure/retry: 4xx (not 200); inputs retained (server re-renders current state).
- Stale/concurrent: marks re-read each render; a pupil edit drops the stale mark (BUG-004).
- Keyboard/focus: ← → prev/next (skip typing); Esc closes (native dialog).
- Tests: markModal.int.test.ts (renders model+pupil+mark, save→confirmed).
- Must-not-change: confirm-all-skips-needs-review; CSRF header; #mark-modal-body target id.
- Open decisions: none outstanding.
```

I can produce the same for **Now**, **Lesson**, **Schemes/Plan**, **Pupil `/me`** on request — those are
the other high-complexity pages.

## 9. §16 — Testing support (all real, available now)

- Commands (from `app/`): `npm run typecheck` · `npm test` (unit, DB-free) · `npm run test:integration`
  (needs the dev DB up; **forces an empty AI key** so tests never call the API).
- **Stable fictional dataset = the test-data instance.** `instances/testdata/` (Docker; own DB on
  `localhost:5440`, app on **http://localhost:44370**, login **`testpass1`**), seeded by
  `src/seed/testData.ts`: 272 pupils, 13 classes, 7 schemes, taught history with marks/feedback, the new
  question types + a multi-worksheet lesson. Re-seed = one tsx command (see the seed header). **No real
  pupil data.** This is your "full school day" fixture for visual/interaction work.
- Roles to test: teacher (the password), pupil (class code `G<id>` → name → PIN, readable on the roster),
  a built-in **🧪 test pupil** (teacher-only) for previewing the pupil surface without a login.
- Drive state: the clock is real (today is the seed's anchor); term/timetable/exception states come from
  `term_dates` + the exception repos — seed or SQL to vary them. AI off = empty key (default in tests);
  AI on = the key you just added (a throwaway smoke script is the convention, self-cleaning).
- Accessibility tooling: there's a jsdom client-JS harness (`tests/appjsUnsaved.test.ts`) and the
  worksheet-render tests; no visual-regression baseline yet **[DECIDE]** (own it as part of the overhaul).

## 10. §17 — Feature flags & rollout

- Existing gates are **settings rows** read at request time: `pupil_access_enabled`, `pupil_marks_enabled`
  (+ their `*_dpia_ack`), `ai_enabled`/`ai_review_enabled`, `email_poll_enabled`, plus the in-memory
  **experience** toggle (`everyday`/`power`, `nav.ts setExperienceMode`) and the configurable Today pin
  set (`nav_daily`).
- **There is no new-shell flag.** **[DECIDE]:** add one (e.g. a `ui_shell` setting or a per-session
  preference) so the overhaul can ship behind it, with a way back to the current shell without losing
  work. Per-instance is simplest (single user); per-session is friendlier for A/B. Rollback = flip the
  setting; old markup/CSS deletes only after parity sign-off.

## 11. §14–15 — Accessibility & assets (from the code)

- **No external anything.** HTMX is vendored (`public/htmx.min.js`); the font is self-hosted **Atkinson
  Hyperlegible** (a deliberate SEND choice); no CDNs, analytics, icon services or remote images. Keep it
  that way (LAN-only, CSP-friendly).
- CSS is **already token-based** (`:root` in `styles.css`: `--bg/--card/--ink/--muted/--accent/--good/
  --warn/--danger/--line`, a type scale, `--radius`, `--tap: 44px`). The palette is "calm, WCAG-AA on
  white." **Dark mode is not implemented** — the target direction is "Option 2 dark", so dark is **new
  work** **[DECIDE]: default, opt-in, or follow-OS?** Preferences must apply before paint (no flash).
- Existing a11y surface to not regress: the accessibility toolbar + read-aloud (`pupil.js`), 44px tap
  targets, the `g`+letter jump map + command palette, ARIA on the custom widgets. **Custom controls that
  replace native HTML** (each needs a kept keyboard/focus contract): the worksheet **matching** drag,
  the new **Parson's** drag (▲▼/Alt-arrow fallback exists), the **choice/radio** groups, the **pane/
  worksheet tabs**, the native `<dialog>` modals (note + mark). The two `<dialog>`s use `showModal()` and
  native Esc — keep that, don't hand-roll overlays.
- Print: `/today/print`, `/lesson/print`, the answer-pack are real print routes — preserve them.

## 12. Open product decisions (consolidated — only you can answer)

1. New-shell **feature flag** + rollback path (§17).
2. **Dark mode** default/opt-in/OS (§15) and the accessibility target to certify against (§14).
3. **Oversee**'s home (Teach vs Organise) (§4.1).
4. Timetable canonical **grid vs agenda** (§4.1/§11).
5. Whether **Focus** stays a page or becomes a Now mode (§4.1).
6. Which **operator-only** setup actions must be visually demoted so they don't read as everyday teacher
   actions (§12).
7. **Visual-regression baseline** ownership (§16).
8. Whether to invest in **typed view models** up front or extract per page as you migrate (§0b/§6) — this
   is the biggest engineering call and it gates everything else.

## 13. §18 — Minimum packet status

| Item | Status |
|---|---|
| Domain + UI owner named | ✓ you (both) |
| Branch/commit + conflicts | ✓ `main`, none |
| Route/page inventory | ✓ module-level (§2); per-route on request |
| Per-page handoff template | ◑ one worked example (§8); rest on request |
| Typed read/view-model contract | ✗ **none exist** — see §0(b), the central gap |
| Typed write/HTMX contracts | ◑ pattern is uniform (§4) but per-route bodies are Zod-in-handler, not exported |
| Permission + privacy classification | ✓ (§5) + `SECURITY_AND_PRIVACY.md` |
| State-transition rules | ✓ marking (§6); lesson/Now (§7); others in plans |
| Fictional fixtures | ✓ the test-data instance (§9) |
| Regression tests identified | ✓ named per area (§6/§8/§9) |
| Open product questions recorded | ✓ (§12) |
| Feature-flag/rollback | ✗ **[DECIDE]** (§17) |
| Agreed editable-files list | ✓ §2.1 of the checklist holds; coordinate on the shared files in §1 |

**Bottom line:** static-prototype work can start immediately against the test-data instance. Before
production integration, the one real blocker is §0(b)/§12.8 — decide how view models get introduced,
because the overhaul's premise ("consume stable view models") isn't met by the current
HTML-in-handler code and that decision shapes everything else.
