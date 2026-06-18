# Next steps

A living checklist of the follow-ups suggested while building the setup/deploy and cover/free work
(2026-06-18). Phase-level direction lives in [ROADMAP.md](ROADMAP.md); shipped detail in
[../CHANGELOG.md](../CHANGELOG.md). Items are ticked here as they land.

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
- [ ] **Exceptions → availability engine** *(larger; own sub-plan below)* — make a marked-free slot
  count as real availability (free-time finder, scheduling) and a cover block you, not just change the
  display.

## D. Hygiene

- [x] **CHANGELOG entries** for the session's features ([../CHANGELOG.md](../CHANGELOG.md)). (2026-06-18)

---

## Sub-plan — C: exceptions into the availability engine

Today dated exceptions are **display-level only** ([../app/src/repos/exceptions.ts](../app/src/repos/exceptions.ts)):
the Now strip/cards and timetable show free/cover, but the clock/availability maths still follows the
recurring pattern. To make them *count*:

1. **Read path.** Teach `services/clock.ts` / the availability lookup to take the day's exceptions so
   `resolveNow`/free-time queries treat a `free`/`cancelled`/`off_timetable` slot as free and a `cover`
   slot as occupied.
2. **Free-time finder.** Anywhere that hunts for genuine free periods (task "before next bell", focus,
   protected work time) should add exception-freed slots and drop cover slots.
3. **Guardrails.** Keep it date-scoped (exceptions are per-date, the pattern stays the source of truth
   for unexceptional days); cover with no lesson (a free period you're pulled onto) must register as busy.
4. **Tests.** Unit-cover the merge (pattern + exceptions → effective availability) and an integration
   pass over the Now screen + free-time finder on a day with each kind.

Deferred deliberately — it touches the scheduling core, so it deserves its own focused pass.
