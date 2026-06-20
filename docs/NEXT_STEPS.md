# Next steps

A living checklist of the follow-ups suggested while building the setup/deploy and cover/free work
(2026-06-18). Phase-level direction lives in [ROADMAP.md](ROADMAP.md); shipped detail in
[../CHANGELOG.md](../CHANGELOG.md); the longer-horizon idea backlog (Wave 6+) is in
[FUTURE_WAVES.md](FUTURE_WAVES.md). Items are ticked here as they land.

## ★ Feature request — "Stages" & strands (raised 2026-06-20)

A new progression model to build. The teacher's words:

> "Stages" are descriptions of skills and knowledge that the pupils are working towards. They need to
> be ticked off when I have evidence that the pupils meet **all** the criteria for that stage. Each
> stage has the same several **strands** as well.

What this implies (to confirm with the teacher before building):

- **Strands** — a small, fixed set of skill areas, the **same across every stage**. Defined once
  (school- or course-wide). e.g. for Computing maybe *Algorithms · Programming · Data · Hardware ·
  Online safety* (TBC by the teacher).
- **Stages** — an ordered ladder (Stage 1 → N) the pupil climbs. Each stage names, **per strand**, the
  criteria (skills/knowledge descriptors) the pupil must evidence.
- Core grid is **Stage × Strand → descriptor(s)**; a stage is "achieved" for a pupil only when **every
  strand's criteria for that stage** are evidenced and ticked.
- **Per-pupil tracking** — the teacher ticks criteria off as evidence appears. A pupil's current stage
  (per strand, and overall) rolls up from the ticks.
- Likely surfaces: a stages editor (strands + per-stage descriptors), a per-pupil progression view, a
  class heat-map. Consider links from the new **marking modal** ("this answer is evidence for Stage 2 ·
  Programming") so marking and progression reinforce each other.

Open questions for the teacher: are stages course-specific or whole-school? Is a stage all-or-nothing,
or can strands advance independently (Stage 3 Programming but Stage 2 Data)? What counts as "evidence" —
a manual tick, or auto-suggested from marks/levels? → capture answers, then write a PHASE plan.

## ★ External resources — Teach Computing & CAS (investigated 2026-06-20)

Full findings: [EXTERNAL_RESOURCES.md](EXTERNAL_RESOURCES.md). Outcome: **Teach Computing is already
integrated** (OGL v3.0; the `/resources/import` + `/schemes/.../convert` pipeline does exactly this);
**CAS is a reference source, not a pipeline** (mixed member licensing, no API). Follow-ons:

- [ ] **Auto-attribution on imported resources** — a `source_attribution` field + a standard OGL credit
  line for Teach Computing imports ("Contains material from the NCCE Teach Computing Curriculum, OGL
  v3.0"). Keeps OGL reuse clean. *(small)*
- [ ] **Finish the KS4/GCSE import** — units 9–16 still "to do" in [RESOURCE_INGEST.md](RESOURCE_INGEST.md).
- [ ] **External reference link on lessons/units** — a URL + note field so a CAS (or any) resource can be
  linked from a lesson without copying it (licence-safe). *(small)*
- [ ] **Optional: TCC scheme templates** — seed the Teach Computing unit/lesson *titles + spec mapping*
  (structure only) as pick-and-go scheme skeletons. *(medium)*

## A. Get it live on the Proxmox box (operator actions)

- [ ] **Deploy the new features** — in the container: `cd /opt/school-organiser && git pull && cd app
  && docker compose --profile proxy up -d --build`. Ships Model-day, one-click pupil move, free/cover
  exceptions, and the Groups-tab roll-up. Migration `0044` auto-runs on boot.
- [ ] **First-year setup** — Setup → Academic years → add `2026/27` → Make current; load
  [`../app/scripts/blank-week.sql`](../app/scripts/blank-week.sql) ([DEPLOYMENT.md §6](../DEPLOYMENT.md)),
  then enter classes, fan the day out with **Model day**, and move pupils.

## B. Deploy-flow polish

- [x] **`scripts/upgrade.sh`** — in-container `git pull` + rebuild + status, with a host-snapshot
  reminder ([DEPLOYMENT.md §12](../DEPLOYMENT.md)). (2026-06-18)
- [x] **Align `proxmox-lxc.sh` self-usage strings** to the bare `proxmox-lxc.sh` bootstrap form. (2026-06-18)
- [x] **Document the locked-down-PC cert fix** (Caddy root CA, or plain-HTTP toggle) in the DEPLOYMENT
  troubleshooting table. (2026-06-18)

## C. Feature follow-ons

- [x] **"Roll classes up from a previous year" button on the Groups tab** — surfaces the existing
  rollover transfer from where you rename/move pupils. (2026-06-18)
- [x] **Free/cover badges on the week timetable grid** — per-slot, reusing `describeException`. (2026-06-18)
- [x] **Exceptions → availability engine** — per-lesson free/cover now adjust the `/time` work-window
  planner; whole-day off-timetable stays display-only (see sub-plan below). (2026-06-18)

## D. Hygiene

- [x] **CHANGELOG entries** for the session's features ([../CHANGELOG.md](../CHANGELOG.md)). (2026-06-18)

---

## Sub-plan — C8: exceptions into the availability engine

Dated exceptions were display-only. The real "free-time finder" is `computeWindows`
([../app/src/services/availability.ts](../app/src/services/availability.ts)), consumed only by the
**/time** work-window planner ([../app/src/routes/time.ts](../app/src/routes/time.ts)); its slots come
from `getDaySlots` ([../app/src/repos/workBlocks.ts](../app/src/repos/workBlocks.ts)) — the recurring
pattern, by weekday. Plan:

1. **Identity.** Add `lessonId` to `AvailSlot` and return it from `getDaySlots` (the self lesson at
   that slot), so per-date exceptions (keyed by `timetabled_lesson_id`) can match a slot.
2. **Effect.** New pure `applyExceptions(slots, effectFor)` in the availability service: a
   `free`/`cancelled` slot → effective `purpose='free'` (becomes a work window); a `cover` slot →
   `purpose='cover'` (occupied). `isWorkWindow` excludes `'cover'`.
3. **Scope.** Per-lesson exceptions only — **whole-day `off_timetable` is NOT applied to availability**
   (you may be off-site on a trip); it stays display-only. The pattern remains the source of truth for
   unexceptional days.
4. **Wire.** `/time` fetches the date's exceptions, builds `effectFor` from `byLesson` (ignoring the
   whole-day entry), applies before `computeWindows`, and shows an "adjusted for today's cover/free" note.
5. **Tests.** Unit: `applyExceptions` + `computeWindows` (freed lesson appears; covered free period
   drops). Integration: `/time` gains the note + a window once an exception is added.

Out of scope (deliberately still display-only): the clock's now/next teaching (already reflected on the
Now strip), and whole-day off-timetable availability.
