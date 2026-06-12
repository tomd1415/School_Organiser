# Phase 6 — Setup, September & new instances

> **Status (2026-06-12): built — 6.1–6.9 all landed** (year-scoping; /setup editors incl. the
> timetable grid; September rollover wizard; onboarding /welcome + password-in-settings with env
> override; /settings; exceptions; new-instance.sh; group history, year-browse + year export).
> Deviations from plan and the post-phase improvements list are in §12–§13.
> The ask (teacher, 2026-06-11): *editing lesson times and lesson details in-app; a completely new
> timetable every September with **nothing carried over** — except that **the teaching-group
> knowledge follows the class group**, whose name changes each year and whose pupils sometimes
> move; in the long run, **a fresh instance per teacher** (nothing needs to flow between
> instances) with an **onboarding wizard** so a new user can set everything up; plus anything else
> the project needs.*

Phases 1–5 assume the timetable is already there (it was seeded from code, from
TEACHING_PATTERN.md). Phase 6 makes the app **self-sufficient across time and across teachers**:
everything the seed hard-coded becomes editable in the app, September becomes a guided annual
event instead of a re-seed, the class-group record survives the rename, and a brand-new teacher
can go from empty database to teaching-from-the-app without touching SQL or `.env`.

---

## 0. What Phase 6 changes vs 1–5

- **Setup moves in-app.** Terms, day shapes, rooms, staff, courses, groups, pupils and the
  timetable grid get real editors (today: code-seeded, SQL-only changes).
- **The year becomes a first-class boundary.** A new academic year gets its own day shape, terms
  and timetable; the old year's record (occurrences, notes, stopping points, adaptations) stays
  attached to the old year, untouched and browsable.
- **Group knowledge survives September.** A class keeps its identity across the rename
  (7ARO → 8ARO) via a predecessor chain, so its teaching context carries forward and its history
  stays one click away — while pupils can still move between classes.
- **A new instance bootstraps itself.** First boot with an empty database opens an onboarding
  wizard; one teacher = one instance = one database, no cross-instance traffic.

What already fits this model and **doesn't change**: courses, schemes/units/master lessons,
resources, the kit list, the AI boundary, pupils (names-only roster), events, tasks, notes.

---

## 1. Build order (each slice a reviewable commit)

| # | Slice | Delivers | Size |
|---|---|---|---|
| **6.1** | **Year-scoping schema** — `period_definitions.academic_year_id`, `groups.predecessor_group_id`, current-year filters in clock/timetable repos; backfill migration | the foundation September stands on | M |
| **6.2** | **Setup area** (`/setup`) — tabs: *Year & terms*, *Day shape*, *Rooms & staff*, *Courses*, *Groups & pupils* — inline-autosave CRUD in the house style | "editing lesson times & details" (the non-grid half) | L |
| **6.3** | **Timetable editor** — the week grid in edit mode: click a slot → purpose / group / course(s) / room / staff | the grid half; replaces the seed forever | M |
| **6.4** | **September rollover wizard** — guided annual event: new year, terms, day shape, group move-ups + renames + leavers + new intake, pupil moves, group-course carry, empty timetable to fill | "a completely new timetable every September" | M |
| **6.5** | **Onboarding wizard** — first-boot flow on an empty DB: password → school & year → terms → day shape (template) → rooms → courses → groups (+ optional pupils, kit, AI key) → timetable → done | "a new user can set up everything" | L |
| **6.6** | **Settings page** — password change, school identity, AI key status / monthly cap / model picks, backup status | consolidates what's currently env-and-SQL | S |
| **6.7** | **Calendar exceptions** — cover, room change, cancelled lesson, off-timetable day, applied per date over the weekly pattern | absorbed from the old polish list; Septembers are not the only disruption | M |
| **6.8** | **New-instance packaging** — `new-instance.sh` (compose project per teacher: own DB volume, port, env), per-instance backups, update path in RUNBOOK | "a fresh instance for each teacher" | S |
| **6.9** | **History & archive** — read-only past-year browsing, a **group history view** across the predecessor chain, year export (JSON/CSV) | the record outlives the year | M |
| **6.10** | *(stretch)* MIS CSV import (pupils/groups from SIMS/Arbor exports), file-based **scheme export/import** (optional colleague sharing without instance-to-instance traffic), week-A/B support if ever needed | nice-to-haves once the core lands | L |

Order matters: 6.1 unblocks everything; 6.2 + 6.3 must exist before the wizards (6.4, 6.5) because
the wizards are *sequenced trips through the same editors*, not separate code paths.

---

## 2. Data model — migration `0013` (sketch)

```
period_definitions  + academic_year_id BIGINT REFERENCES academic_years(id)
                      -- backfill: all existing rows → the current year
                      -- ClockService/timetable repos filter to the current year

groups              + predecessor_group_id BIGINT REFERENCES groups(id)  -- the same class last year
                      -- groups stay year-scoped rows (as today); the chain carries identity.
                      -- "8ARO (2026/27)" → predecessor → "7ARO (2025/26)"

settings            + keys: 'school_name', 'auth_password_hash', 'setup_complete'
                      -- password: DB value used when present; APP_PASSWORD_HASH env wins if set
                      -- (existing instances keep working; the wizard writes the DB value)

lesson_exceptions   (NEW, 6.7)
  id, date DATE NOT NULL,
  timetabled_lesson_id BIGINT NULL REFERENCES timetabled_lessons(id), -- NULL = whole-day exception
  kind TEXT CHECK (kind IN ('cancelled','room_change','cover','off_timetable')),
  room_id BIGINT NULL REFERENCES rooms(id),       -- for room_change
  staff_id BIGINT NULL REFERENCES staff(id),      -- for cover
  note TEXT
```

**Why a predecessor chain rather than persistent group rows:** every existing FK (notes,
occurrences, enrolments, group_courses, adaptations) already points at year-scoped group rows, and
history must show the name *as it was* ("7ARO" on last year's notes, not "8ARO"). New rows each
year + a one-column chain keeps all history immutable, makes the rename trivial, and "knowledge
follows the group" becomes: copy forward what should carry (teaching context), and let views walk
the chain for the rest. No data rewrite, no rename-history table.

**Pupil movement** needs no new schema: `enrolments(pupil_id, group_id, active)` already models
membership per (year-scoped) group. Rollover creates the new year's enrolments; a mid-year move is
deactivate-one / add-one. The roster stays names-only — membership adds no new personal data
category (DPIA reviewed note required, see §8).

---

## 3. The September model — what carries, what doesn't

| | September outcome |
|---|---|
| **Rebuilt fresh** | terms & INSET, day shape (copied from last year by default, then edited), the timetable grid, group_courses (new rows for the new year's groups), occurrences (start empty) |
| **Persist untouched** | courses, schemes → units → master lessons, resources, kit list, settings, staff, rooms, pupils (roster), open tasks, future events |
| **Follow the class group** | group identity (predecessor chain), **per-class teaching context** (copied onto the new year's matching group_course, then editable), reachable history (notes, stopping points, what was covered — via the group-history view) |
| **Deliberately left behind** | **per-group lesson adaptations** — they describe how *last year's* delivery of a lesson went for that class; their lasting value has already flowed into the **master** via "suggest master improvement". They stay attached to the old year's group_courses as part of the record. |
| **Archived** | last year's groups (`active=false`), its timetabled lessons and period definitions (filtered out by year, never deleted) |

The Y11 leaver case falls out naturally: a group with no successor simply has no new-year row.

---

## 4. The September rollover wizard (6.4)

A guided checklist at `/setup/rollover`, runnable in stages from July onwards (each step saves;
nothing activates until the final confirmation):

1. **New year** — name ("2026/27"), start/end dates; term dates + INSET (entry or CSV paste).
2. **Day shape** — copy last year's period definitions, then edit (times do change).
3. **Groups move up** — every active group listed with a **suggested new name** (leading digit
   +1: 7ARO → 8ARO, editable), a *leaving* checkbox (Y11/Post-16), and an *add new group* row for
   the September intake. Creates the new rows with `predecessor_group_id` set.
4. **Pupils** — each persisting group's roster carried to its successor; per-pupil move/remove;
   new pupils added (or CSV-pasted, 6.10). Leavers' pupils flagged inactive.
5. **Courses per group** — last year's group_courses proposed for each successor (tick to keep);
   **per-class teaching context shown and copied** (editable — "this was true of them in July").
6. **Timetable** — the empty new-year grid opens in the 6.3 editor to fill from the school's
   published timetable.
7. **Go live** — flips `academic_years.is_current` on the first day (or immediately). The Now
   screen, map and clock switch year automatically; the old year becomes archive (6.9).

---

## 5. The onboarding wizard (6.5)

Triggered on first boot when `setup_complete` is unset (and no `APP_PASSWORD_HASH` env): `/welcome`,
a sequenced trip through the Setup editors with sensible defaults — every step skippable and
revisitable, progress saved:

1. **You & security** — teacher name, choose a password (hashed into `settings`; the wizard shows
   the backup advice line). Generates the session key if absent.
2. **School & year** — school name, academic year, term dates (template: standard 3-term English
   year, editable).
3. **Day shape** — pick a template ("5 lessons + form", "6 lessons", "build from scratch"), then
   adjust times in the day-shape editor.
4. **Rooms & staff** — your room(s); TAs/cover staff can wait.
5. **Courses** — names + colours (+ optional teaching context per course — the SEND default text
   offered as a starting point).
6. **Groups & pupils** — groups with year-group labels; optional pupil roster now or later
   (names-only privacy note shown, as on /pupils).
7. **Timetable** — the 6.3 grid editor, pre-filtered to teaching slots.
8. **Optional extras** — AI key + monthly cap (or "skip — the app works fully without AI"), kit
   list starter, backup destination check.
9. **Done** — lands on the Now screen with a "first week" checklist card.

The existing seed scripts survive only as dev fixtures (`npm run seed:dev`); production setup is
the wizard. **My instance is unaffected**: env password wins, `setup_complete` is backfilled true.

---

## 6. Per-teacher instances (6.8)

One teacher = one compose project = one database + resource store + backups. Nothing is shared and
nothing is transmitted between instances (decision: confirmed 2026-06-11).

- `scripts/new-instance.sh <name> <port>` — creates `instances/<name>/` with its own
  `docker-compose.yml` (distinct project name, volume, port), `.env` scaffold, and a cron-able
  backup entry. RUNBOOK gains an "instances" section (create / update-all / back-up-all).
- Updates: `git pull && ./update-instances.sh` rebuilds each instance image; migrations run on
  boot per instance, as today.
- *(6.10 stretch, explicitly optional)* file-based **scheme export/import** (a JSON of one scheme's
  units/lessons + linked resource files) so colleagues can hand each other a scheme on a USB stick
  without any instance-to-instance channel.

---

## 7. Also worth adding (the "long think" list)

Recommended, in rough order of value:

1. **Password change + AI controls UI (6.6)** — today both need SQL/env access; indefensible once
   other teachers have instances.
2. **Calendar exceptions (6.7)** — cover/room change/off-timetable day; the Now screen and map
   should reflect reality, not just the pattern. (Old polish item, now in scope.)
3. **Group history view (6.9)** — `/group/:id/history`: this class across years via the chain —
   coverage (bound lessons + stopping points), notes timeline, teaching-context evolution. This is
   the visible payoff of "knowledge follows the group".
4. **Year archive + export (6.9)** — read-only browsing of a past year (timetable, map, notes) and
   a one-click year export (JSON + CSVs) for personal record-keeping / leaving the school.
5. **MIS CSV import (6.10)** — schools already export class lists; pasting a CSV beats typing 12
   names × 10 groups in the wizard.
6. **Retention hooks** — the DPIA's retention row needs a mechanism: per-year archive plus an
   "anonymise pupils inactive > N years" action (replace display_name, keep the token).
7. **A "data health" panel on /settings** — last backup age, DB size, resource-store size, audit
   row count, current year sanity (terms cover today, exactly one is_current).
8. *(deferred to Phase 7 with the rest of polish)* global search, keyboard shortcuts, TA
   read-only login, IMAP intake, Teams integration.

---

## 8. Decisions & open questions

- **Decided (recommend):** predecessor chain over persistent group rows (§2 rationale); adaptations
  stay with their year (§3); password moves to `settings` with env override (§2); wizards reuse the
  Setup editors rather than duplicating forms (§1).
- **Open (product):** should the rollover *offer* to carry adaptations where the same scheme will
  be retaught to the *same* group (resit/Post-16 cases)? Default no; a per-group tick is cheap.
- **Open (product):** name-suggestion heuristic — leading-digit increment covers 7ARO→8ARO; what
  about Post-16 / non-numeric names? (Fallback: no suggestion, type the new name.)
- **Open (technical):** week A/B — the schema has `timetabled_lessons.week` but the clock assumes
  a single repeating week. Leave dormant unless the school adopts a fortnight (6.10).
- **Open (DPIA):** enrolments make pupil↔group membership explicit (it already exists in the
  schema, unused). Add a DPIA review note when 6.4/6.5 land — still names-only, no new category.

---

## 9. Test strategy

- **6.1 is the dangerous slice**: integration tests that the clock, Now, timetable, map and
  lay-down all filter to the current year (seed a second year in-test and assert zero bleed); the
  backfill migration is idempotent.
- Editors (6.2/6.3): route-level CRUD round-trips in the screens suite, matching the kit-page
  pattern; the timetable editor asserts the grid renders an editable slot and a save round-trips.
- Wizards (6.4/6.5): each step is its own POST (testable without a browser); one integration test
  walks the whole rollover against a seeded year and asserts the §3 carries/doesn't table
  literally (contexts copied, adaptations not, history intact, predecessor chain set).
- Auth change (6.6): env-wins / db-fallback / first-boot-forces-wizard each covered.
- No AI involvement anywhere in Phase 6 — no live verification needed.

---

## 10. Out of scope for Phase 6

- Multi-user on a single instance (auth model stays single-teacher; TA login remains Phase 7).
- Any instance-to-instance communication or central server (explicitly rejected).
- MIS *API* integration (CSV only).
- Editing past years' timetables (archive is read-only by design).

---

## 11. Recommended first slice

**6.1 (year-scoping) + the *Year & terms* and *Day shape* tabs of 6.2** — they make September 2026
survivable even if nothing else lands by then (terms + day shape + a hand-built timetable via 6.3
next). Then 6.3 → 6.4 in time for the real rollover, with 6.5/6.8 (onboarding + instances)
following before any colleague gets an instance.

---

## 12. After this phase — improvements & features to pick up next *(noted 2026-06-12, as built)*

Deliberately not in Phase 6; each is worth a slice of its own:

1. **Exceptions → clock integration.** Exceptions are display-level (banners on the lesson, ⚠ on
   the timetable/Now). Next: a cancelled lesson frees the work window (AvailabilityService), an
   off-timetable day suppresses the day's occurrences and bell tasks, cover changes the Now card.
2. **Onboarding accelerators.** Day-shape *templates* ("5 lessons + form", "6 lessons") instead of
   building Monday by hand; **MIS CSV import** for pupils/groups (SIMS/Arbor exports); a starter
   kit list; an optional sample-data mode for exploring before committing.
3. **Rollover extras.** Optional *carry adaptations* tick per group (resit/Post-16 classes
   retaught the same scheme); copy recurring INSET-day patterns; a one-click "create next year
   from this one" that chains year → terms → day shape → groups in a single action.
4. **Timetable editor conveniences.** Room double-booking warnings, drag-to-move between slots,
   a per-group "lessons this week" counter while filling the grid.
5. **Instance operations.** `update-instances.sh` (pull + rebuild each, one at a time), backup-age
   surfaced on /settings (read the backups directory), an in-app restore checklist.
6. **Archive depth.** Read-only Map for past years (slot picker filtered by year), notes browsing
   by year, per-class printable "year summary" sheet from the group-history page.
7. **Pupil page polish.** Show each pupil's current group chip (enrolments are now real data) and
   their group history via the chain.
8. **Retention mechanism.** The DPIA's retention row: an "anonymise pupils inactive > N years"
   action (replace display_name, keep ai_token) + a yearly prompt on /settings.
9. **Fortnight (week A/B) support** if the school ever adopts one — schema column exists, clock
   assumes a single week.
10. **Pupil-fillable worksheets** — investigated 2026-06-12
    ([PUPIL_WORKSHEET_FORMATS.md](PUPIL_WORKSHEET_FORMATS.md)): recommendation is in-app HTML
    worksheets once pupil logins exist (answers become data); DOCX stays the bridge until then.
11. **Earlier backlog still open:** Phase 4.6 remainder (captured auto-categorise, estimate
    calibration, current-interest), 4.8 semantic search, content-based unit conversion (5.9),
    cross-group compare (5.9), kit-per-lesson (5.9), and the Phase 7 polish list (global search,
    Teams, IMAP intake, TA login).

## 13. Build notes — where reality differed from the plan *(2026-06-12)*

- **Groups were already year-scoped** in the Phase 1 schema, so the predecessor chain dropped in
  exactly as designed (§2) with zero data rewriting; `bumpName` covers 7ARO→8ARO and Y7→Y8.
- **First year auto-becomes current** when it's the only one (onboarding friendliness).
- **Deletion guards as planned:** a period with timetabled lessons and a lesson with taught
  occurrences refuse to delete (🔒) — archive the year instead of rewriting the past.
- **Lay-down/map/shift clamp to the current year's end** so future planning never spills into a
  draft year's calendar.
- The onboarding wizard is a **checklist over the real Setup editors** (not separate forms), as
  decided in §8 — `/welcome` stays useful after setup as a health overview.
- Year export is a script (`npm run export-year`) rather than a UI button — fine for now; a
  /settings button belongs with the backup-age work (§12.5).
