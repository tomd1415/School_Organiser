# UX Flows

Wireframes (ASCII, indicative not final) and interaction notes for the key screens. The
guiding rule from SPECIFICATION §3: **glanceable first, capture in seconds, one click to
everything else.**

## Interaction principles

- **The Now screen is home.** Opening the app always lands here.
- **Autosave everywhere.** Notes and "actual" logs save on blur / every few seconds via HTMX;
  no explicit Save button needed for capture.
- **Keyboard-fast.** A global shortcut (e.g. `n`) opens a note box from anywhere; `Enter` adds
  a follow-up line; `Esc` closes. Nothing requires the mouse.
- **Never block on structure.** A note saves with just text. Stopping point, follow-ups,
  pupils, tags are all optional and can be added after the bell.
- **Colour by course** so the timetable and Now screen are scannable at a glance.

## 1. Now screen (home)

```text
┌─ School Organiser ───────────────────  Tue 9 Sep · 11:12 · Week A ──┐
│                                                                      │
│  NOW · Lesson 3  (11:05–11:55)        ⏳ 43 min left                  │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ 9X/Cp1 · OCR J277 GCSE CS · Room D12                            │ │
│  │ Plan: 1.3 Networks — “Topologies & the Internet” (lesson 4/6)  │ │
│  │ Resources:  [Slides]  [Worksheet]  [Quiz]  [Folder]            │ │
│  │ Last time → stopped at: “packet switching, mid-way”            │ │
│  │            open follow-ups: ▢ re-cap subnetting to PUPIL_4     │ │
│  │ ┌─ Quick note ────────────────────────────────────────────┐   │ │
│  │ │ (type here — autosaves)                                  │   │ │
│  │ └──────────────────────────────────────────────────────────┘   │ │
│  │ + stopping point   + follow-up   + pupil   #tag                │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  BEFORE THE NEXT BELL (due by 11:55)                                  │
│   ▢ Set retrieval starter for 9Y (next, Lesson 4)   [do] [snooze]    │
│   ▢ Print 8 worksheets for Y10                       [do] [done]     │
│                                                                      │
│  NEXT · Lesson 4 (11:55) · 9Y/Cp2 · KS4 Python · D12   [open]        │
│                                                                      │
│  [Timetable]  [Tasks]  [Notes]  [Planning/AI]  [Settings]            │
└──────────────────────────────────────────────────────────────────────┘
```

During a **free period**, the top card flips to the planned work block:

```text
│  NOW · Free (Lesson 5, 13:50–14:40) · protected                     │
│  Planned: “Mark Y10 assessment” (45 min)        [start] [change]    │
│  ┌─ What I actually did ───────────────────────────────────────┐    │
│  │ (autosaves — e.g. “Pupil X pastoral issue, didn’t mark”)    │    │
│  └─────────────────────────────────────────────────────────────┘    │
│  This logs the block as ‘diverted’ and keeps the original plan.     │
```

## 2. Week timetable

```text
┌─ Timetable ─────────────────────  ◀ Week A ▶   [grid] [list] [today] ┐
│        Mon        Tue        Wed        Thu        Fri               │
│ 08:30  Briefing   prep       Briefing   Briefing   prep             │
│ 08:50  Form       Form       Form       Form       Form             │
│ L1     9X CS▮     10A CS▮    free ░░░    8B CS▮     7C CS▮           │
│ L2     8B CS▮     free ░░░   9X CS▮     10A CS▮     ⚑TA 8D CS       │
│ 10:50  ── break ───────────────────────────────────────────────    │
│ L3     9X CS▮     ⚑TA 7A     9Y Py▮     duty       9X CS▮           │
│ L4     9Y Py▮     8B CS▮     10A CS▮    9Y Py▮      free ░░░         │
│ 12:45  ── lunch ───────────────────────────────────────────────    │
│ L5     7C CS▮     7C CS▮     8B CS▮     ⚑TA 7A     10A CS▮          │
│ L6     10A CS▮    8D CS▮     7C CS▮     9X CS▮      8B CS▮           │
│ after  —          TTRPG      Staff TTRPG Staff mtg  Computing Club   │
│                   15:30      (alt wks)   15:45      15:30            │
│ ▮ colour = course   ░ free (protected)   ⚑TA = non-specialist I oversee │
└──────────────────────────────────────────────────────────────────────┘
```

Click any cell → **Lesson detail**. `⚑TA` cells are also collected in the "Lessons I
oversee" view (flow 7).

## 3. Lesson detail / occurrence

```text
┌─ 9X/Cp1 · OCR J277 · Tue 9 Sep · Lesson 3 ──────────────────────────┐
│ Plan: 1.3 Networks — Topologies (4/6)         [open plan] [change]   │
│ Resources: [Slides][Worksheet][Quiz][Folder]  + add                  │
│──────────────────────────────────────────────────────────────────── │
│ NOTES (this lesson)                                   [+ quick note] │
│  11:48  “Good engagement. Got through star/mesh, not bus.”           │
│         stopping point: bus topology                                 │
│         follow-ups: ▢ reteach subnetting · ▢ collect homework PUPIL_4│
│         pupils: PUPIL_4 absent · PUPIL_7 needs extension             │
│  #networks #assessment-soon                                          │
│──────────────────────────────────────────────────────────────────── │
│ Split class? add another course running this slot      [+ course]    │
└──────────────────────────────────────────────────────────────────────┘
```

For a **split lesson** (two courses at once), the detail shows a tab/section per course, each
with its own plan, resources, stopping point and notes (`occurrence_courses` in DATA_MODEL).

## 4. Quick-note capture (the fast path)

Triggered by the `n` shortcut or any `[+ quick note]` button — a small overlay, pre-bound to
the current lesson if one is in progress:

```text
        ┌─ Note · 9X/Cp1 · Lesson 3 ─────────────────┐
        │ [__________________________________________]│  ← focus here, autosaves
        │ stopping point: [______________]            │
        │ follow-up:      [______________] (+ Enter)  │
        │ pupil:          [PUPIL ▾][______] outstanding│
        │ #tag #tag                          [done ⏎] │
        └─────────────────────────────────────────────┘
```

Text-only is a complete note. Everything else is optional. Closing saves.

## 5. Task inbox & triage

```text
┌─ Tasks ────────────────────────  [inbox 4] [today] [scheduled] [done] ┐
│ INBOX (unscheduled)                                  [+ task] [paste email] │
│  • “Reply to parent re Y10 trip”      from email   est 10m  [triage] │
│  • “Prep cover work for 8D Fri”       by-next-lesson:8D     [triage] │
│ TODAY / URGENT                                                       │
│  ▢ Set 9X starter            by 11:55   →  [schedule to: L? ▾]       │
│  ▢ Print Y10 sheets          urgent     →  done from Now screen      │
│ SCHEDULED                                                            │
│  ▢ Mark Y10 assessment   → Free L5 today (45m)        [open block]   │
└──────────────────────────────────────────────────────────────────────┘
```

"Paste email" opens a box; pasted text becomes a draft task with the email kept as provenance
(`email_intake`). Triage = set urgency/estimate/link and optionally drop it into a work block.

## 6. Time planner & actuals

```text
┌─ Today · time ──────────────────────────────────────────────────────┐
│ Before 08:30  ▢ Plan L1 resources           planned 20m             │
│ Free · L1     ▣ Mark books                   planned 50m            │
│ Break         ✕ break-time pupils in room — not work time           │
│ Lunch         ✕ lunchtime club — not work time                      │
│ Free · L5     ▣ Mark Y10 assessment   →  ⚠ DIVERTED                  │
│               actually: “Pupil X pastoral, logged + reported”       │
│ After school  ▢ Set up Computing Club   (Tue: leave 17:30)          │
│                                                                      │
│ Week view → where did non-teaching time actually go?  [report]      │
└──────────────────────────────────────────────────────────────────────┘
```

One tap on a block toggles planned ↔ done, or opens the "what I actually did" box (sets
`status='diverted'`, preserves the plan). The weekly report rolls up actuals. Break and lunch
never appear as work blocks — they're occupied by the lunchtime club and break-time pupils, so
the planner offers only free periods and before/after school.

## 7. Lessons I oversee (non-specialist / TA)

```text
┌─ Lessons I oversee ─────────────────────────────────────────────────┐
│ ⚑ 7A · Mon L3 · TA: Mr R         plan set ✓   resources ✓           │
│      oversight: ▢ check how loops landed                            │
│ ⚑ 8D · Tue L6 · TA: Ms K         plan set ✓   resources ⚠ missing   │
│ ⚑ 7A · Thu L5 · TA: Mr R         plan set ✓                         │
│ [set plan]  [attach resources]  [add oversight note]                │
└──────────────────────────────────────────────────────────────────────┘
```

These are `timetabled_lessons` with a non-self `staff_id`. The teacher prepares the plan and
resources here and records oversight notes after.

## 8. Planning / AI assistant

```text
┌─ Planning assistant ─────────────────────────────────────────────────┐
│ Context: 9X/Cp1 · OCR J277 · SoW position 1.3 (4/6)                  │
│ Pulls in: last 4 lesson notes, stopping point, plan-change notes      │
│ (pupil names shown to AI as PUPIL_n)                                  │
│                                                                      │
│  [Draft next lesson]   [Summarise this term]   [Redesign this unit]  │
│                                                                      │
│  ┌─ Draft (editable) ────────────────────────────────────────────┐  │
│  │ Objectives … Activities … Resources to make …                 │  │
│  │  → [save as lesson plan]   [add resources-to-make as tasks]    │  │
│  └────────────────────────────────────────────────────────────────┘  │
│  every call recorded in ai_calls (redacted request only)            │
└──────────────────────────────────────────────────────────────────────┘
```

The "Redesign this unit" action supports the planned **large curriculum changes**: it takes
the current SoW + accumulated notes about what worked, and proposes a re-sequenced version
that you accept/edit into a new scheme version.

## 9. General notes / knowledge base

A simple notes list with search and optional links to a course/group/pupil/task — the same
`notes` table, `kind='general'`. Reached from the top nav; integrated because any general
note can be filtered by what it links to and surfaced next to that lesson/group.

## 10. Focus mode — one thing now (& end-of-day)

The antidote to morning overwhelm and free-period scatter: **one** action, broken into steps.

```text
┌─ Focus · 08:14 · 36 min before briefing ────────────────────────────┐
│ DO THIS NOW   (urgent · due before Lesson 1 · ~15 min · low load)    │
│ ┌──────────────────────────────────────────────────────────────────┐│
│ │ Assign 9X networks worksheet to MS Teams                         ││
│ │  ☑ open the resource in the app                                  ││
│ │  ☐ post to 9X Team, due Friday                                   ││
│ │  ☐ tick the lesson's "assigned to Teams" prep item               ││
│ └──────────────────────────────────────────────────────────────────┘│
│ [done & next]  [too big → break down]  [not now → snooze]  [skip]    │
│ 11 other tasks hidden — on purpose                                   │
└──────────────────────────────────────────────────────────────────────┘
```

End-of-day **wind-down** — protect the leave-earlier goal:

```text
┌─ Wind down · 16:40 · aiming to leave 17:30 ─────────────────────────┐
│ Only quick / urgent left:                                            │
│  ☐ Reply to Head of Year email            ~5 min   [do]             │
│  ☐ Submit Y10 report (DUE TODAY)          ~10 min  [do]             │
│ Everything heavier is parked for tomorrow.                           │
│ When these are clear:  ✅ "You're done — go home."                   │
└──────────────────────────────────────────────────────────────────────┘
```

Selection logic lives in **FocusService** (ARCHITECTURE): it ranks by urgency, due-before-next-
lesson, the time actually available in the current work window, and `cognitive_load` — then
shows just the top one. "Too big → break down" asks the AI to split the task into steps.
Hitting **start** runs a task timer (auto-paused when you tap away for an interruption); the
recorded actual time feeds the AI's estimate calibration.

## 11. Captured info — "things I've been told"

A one-line brain-dump for things you can't action yet; the AI files and resurfaces them.

```text
┌─ Tell me later · capture ───────────────────────────────────────────┐
│ [ D12 projector being replaced over half term__________________ ] + │
└──────────────────────────────────────────────────────────────────────┘
        ↓  AI files it
┌─ Captured info ─────────────────────────────────────────────────────┐
│ logistics · room D12     "projector replaced over half term"        │
│   ↳ resurfaces on: D12 lessons · ~half-term        [task] [archive]  │
│ pupil · PUPIL_4          "leaving at Easter"                         │
│   ↳ resurfaces on: PUPIL_4 · Spring term           [task] [archive]  │
│ admin                    "SENCo wants a catch-up re EHCPs"           │
│   ↳ [make it a task / deadline]                                      │
└──────────────────────────────────────────────────────────────────────┘
```

Re-file to override the AI's category, promote an item to a task/deadline, or archive it.
Stored as `notes` with `kind='captured'` (DATA_MODEL).

## Navigation summary

```text
Now ──┬── Timetable ──── Lesson detail ──── Plan / Resources
      ├── Focus ──────── One thing now / end-of-day wind-down
      ├── Tasks ──────── Triage / Work blocks / Events & deadlines
      ├── Notes ──────── Search / General notes
      ├── Captured ───── "Things I've been told" inbox (AI-filed)
      ├── Oversee ────── TA lesson prep
      └── Planning/AI ── Draft / Summarise / Redesign
```
