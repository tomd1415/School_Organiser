# UX Flows

Wireframes (ASCII, indicative not final) and interaction notes for the key screens. The
guiding rule from SPECIFICATION §3: **glanceable first, capture in seconds, one click to
everything else.**

## Interaction principles

- **The Now screen is home.** Opening the app always lands here.
- **Rail & Stage.** A persistent left **rail** sits beside one content **Stage**. The rail groups
  destinations as **Today** (a configurable pin set — by default Now, Focus, Timetable, Tasks,
  Captured), a permanently-pinned **⚑ Safeguarding**, **Plan** (the rest of the everyday pages), and
  **Advanced** (expert/setup pages, revealed only when the `power` experience level is on). An
  `everyday` → `power` toggle (with a one-time *earned* nudge after enough lessons) plus a **command
  palette** (`/search`) keep day-to-day use uncluttered while leaving everything one keystroke away.
- **Autosave everywhere.** Notes and "actual" logs save on blur / every few seconds via HTMX;
  no explicit Save button needed for capture.
- **Keyboard-fast.** A global shortcut (e.g. `n`) opens a note box from anywhere; `Enter` adds
  a follow-up line; `Esc` closes. `g`+letter jumps to any rail destination and `/search` opens the
  command palette. Nothing requires the mouse.
- **Never block on structure.** A note saves with just text. Stopping point, follow-ups,
  pupils, tags are all optional and can be added after the bell.
- **Colour by course** so the timetable and Now screen are scannable at a glance.

## 1. Now screen (home)

```text
┌─ School Organiser ──────────────────────────────────────────────────┐
│ Tue 9 Sep · 11:12 · wk 3/12 · NOW Lesson 3 · 9X/Cp1 · 43 min left   │
│                              · NEXT Lesson 4 9Y/Cp2 [open]    ⟳ 30s │
│──────────────────────────────────────────────────────────────────── │
│  🎯 Focus — one thing now →        │  NEXT · Lesson 4 (11:55)        │
│  ┌─ NOW · Lesson 3 ─────────────┐  │  9Y/Cp2 · in 43 min · D12       │
│  │ 9X/Cp1 · OCR J277 · Room D12 │  │  KS4 Python 📋 “Loops 3/6”      │
│  │ Last time → “packet switch-  │  │  resume → “while loops” (2 Sep) │
│  │  ing, mid-way” (2 Sep)       │  │─────────────────────────────────│
│  │ ┌─ Quick note ────────────┐  │  │  BEFORE THE NEXT BELL           │
│  │ │ (type here — autosaves) │  │  │  ✓ Set retrieval starter 9Y     │
│  │ └─────────────────────────┘  │  │  ✓ Print 8 worksheets Y10       │
│  │ Open lesson detail →         │  │─────────────────────────────────│
│  └──────────────────────────────┘  │  COMING UP    Y10 reports in 3d │
│                                    │  HEADS UP     D12 projector …   │
│                                    │  END OF DAY   ▢ lock cupboard B │
└────────────────────────────────────┴─────────────────────────────────┘
```

The **strip** along the top carries the clock, the **week-of-term badge** ("wk 3/12") and the
now/next summary, and **auto-refreshes every 30 s**. Each refresh carries a *signature* of what
is on show (day · current period · next teaching slot): unchanged → only the strip swaps and
the countdown ticks down; changed (the bell rang, a gap started, the day rolled over) → the
whole page reloads so every card is fresh. The note composer is never part of the refresh, so a
half-typed note is never wiped.

**Two columns.** The current lesson fills the left: course(s), room, "last time → stopping
point" per course, and the quick-note box. The right rail stacks the **next-session card** —
when and where it starts and, per course, the bound plan and where that group will pick up —
then **before-the-bell tasks** (tick done in place), **coming up** (events by days-until),
**heads-up** (captured info resurfacing for today's groups), and the **start-of-day /
end-of-day checklist** (start shown before noon, end after).

During a **free period**, the left card shows the protected slot with the same quick-note box;
the planned block and "what I actually did" live on the Time planner (flow 6), and Focus
(flow 10) picks the one thing to do with the window.

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
┌─ 9X/Cp1 · Tue 9 Sep · Lesson 3 · 11:05–11:55 · D12 ─────────────────┐
│ ── OCR J277 GCSE CS ─────────────────────────────────────────────── │
│ Plan: [1.3 Networks — Topologies ▾]  edit →                          │
│   Objectives: … master …      Outline: … master …                    │
│  ┌─ This group's version ────────────────────────────────────────┐  │
│  │ ✏ adapted for this group              ↩ reset to master       │  │
│  │ Objectives — for this group [(inherits the master)__________] │  │
│  │ Outline — for this group    [___________________] (autosaves) │  │
│  │ ✨ Adapt from recent lessons (AI)                              │  │
│  │ ⬆ Suggest master improvement (AI)         ▸ change log        │  │
│  └────────────────────────────────────────────────────────────────┘  │
│ Resources: [Slides][Worksheet][Quiz]                                 │
│ Last time → stopped at “packet switching” (2 Sep)                    │
│ Stopping point: [where we got to…_________________] (autosaves)     │
│ 📅 term map for this class →     ↻ continue next week                │
│ ▸ this class's teaching context                                      │
│──────────────────────────────────────────────────────────────────── │
│ BEFORE THE BELL   ▢ assign to Teams   ▢ starter set                  │
│ NOTES (this lesson)                                   [+ quick note] │
│  11:48  “Good engagement. Got through star/mesh, not bus.”           │
└──────────────────────────────────────────────────────────────────────┘
```

For a **split lesson** (two courses at once), one such section renders per course, each with
its own plan, adaptation, resources and stopping point (`occurrence_courses` in DATA_MODEL);
the notes belong to the occurrence.

**The adaptation block** (Phase 5) resolves **override-else-master, per field**: empty boxes
inherit the master, the first edit creates this group's override, and every change — teacher or
AI — lands in the group's **change log** (`lesson_adaptations` in DATA_MODEL). "Adapt from
recent lessons (AI)" rewrites this group's version from its recent stopping points and notes;
"Suggest a master improvement (AI)" proposes folding a proven adaptation back into the master,
applied only on approval. "Term map" jumps to the curriculum map (flow 12) for this class's
slot; "continue next week" is the same carry-over as the map's. "This class's teaching context"
folds out an editor for the per-class prose added to the course default in AI calls.

**Since Phase 6** each course section also carries: the **in-lesson tracker** — the effective
outline's steps as a tappable list (✓ done · ▶ current; tapping "we are here" also writes the
textual stopping point, so resume and the AI feedback loop work off the same record); an
**ability midpoint** field inside the teaching-context fold-out — the anchor Support / Core /
Challenge work is pitched around (SPECIFICATION §5.28); and a **TA feedback** block showing
what the TA sent from flow 14, safeguarding-flagged items marked. Objectives and outlines
everywhere render as formatted read-views (step cards with timing pills, ✓-listed objectives)
rather than walls of text.

**Worksheets v2** (2026-06-15) reshaped the Worksheet resource here. The teacher opens a **block
editor** — instruction / question / screenshot-paste / note / image cards they retype, recolour,
reorder and drop images into — which serialises back to the **one Markdown source** the marking keys
derive from, so editing never breaks auto-marking. The add-block menu also offers closed question types
— **multiple-choice**, **true/false**, **fill-in-the-blanks** and **matching** (one shared option set
across rows) — all of which **auto-mark** with no migration. A **per-level preview** and **🧪 Test as pupil**
(flow 17) show exactly what each ability level sees, and a per-level **print / Word export** produces
one clean sheet per level. Generation now also writes a separate **TA notes** document (how to support
each level + the answers), shown here and in the TA view but **never** to a pupil; any picture the AI
couldn't source becomes a **Before-the-bell** "🖼️ add image" task that clears when an image is dropped
into the editor.

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
`notes` table, `kind='general'`. Reached from the rail (Plan group); integrated because any general
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

## 12. Curriculum map — the term at a glance

```text
┌─ Curriculum map ────────────────────────────────────────────────────┐
│ Group & weekly slot: [7ARO · Computing Curriculum · Tue Lesson 3 ▾] │
│ Last 6 weeks taught, then the next 12 school weeks (holidays        │
│ skipped). ✏ = adapted for this group.   fill this slot from a       │
│ downloaded unit →                                                    │
│                                                                      │
│  2026-06-02  Algorithms 3  master ↗     stopped at “flowcharts”     │
│                                         ↻ continue next week        │
│  2026-06-09  Algorithms 4 ✏ adapted     today                       │
│  2026-06-16  Algorithms 5  master ↗                                 │
│  2026-06-23  Algorithms 6  master ↗                                 │
│  2026-06-30  — nothing planned                                      │
└──────────────────────────────────────────────────────────────────────┘
```

One class's weekly slot as a term calendar: which lesson lands which week. Past rows come from
real occurrences and show the recorded **stopping point**; future rows walk the **next school
weeks, holiday-aware**. Every lesson links to its dated occurrence (flow 3); "master ↗" opens
the master on the Schemes page; "fill this slot" jumps to the convert-a-unit panel.
**↻ continue next week** (today + the recent past): the unfinished lesson repeats at the slot's
next occurrence and every later lesson shifts back one school week — holidays still skipped,
nothing before today ever rebound. The map is otherwise read-only; editing stays on the lesson
screen and the Schemes page.

## 13. Kit — the classroom equipment inventory

```text
┌─ Kit — classroom equipment ─────────────────────────────────────────┐
│ [filter… name, notes, tags]   ☐ show archived                       │
│                                                                      │
│ physical-computing                                                   │
│  Item          Own Work Location    Notes        Tags    Checked    │
│  micro:bit v2  30  27   cupboard B  3 dead USB   ks3     2026-06-01 │
│                                                          [✓ today]  │
│  Crumble kit   12  12   trolley 2   2×AAA each           never      │
│ av                                                                   │
│  Visualiser    1   1    front desk                       2026-04-20 │
│                                                                      │
│ [ new item… e.g. micro:bit v2 ]  [category ▾]  [＋ add]   [archive] │
└──────────────────────────────────────────────────────────────────────┘
```

One flat list grouped by category, every cell **inline-autosaving** — maintained in the seconds
it takes to notice "two micro:bits died". *Work* < *Own* renders the counts red so broken stock
shows at a glance; **✓ today** stamps a stock-take, and a last-checked date older than a term
(~13 weeks) turns red as stale. Items **archive, never delete**. Referred to while planning
from this page and from a read-only "🔧 Kit available" panel on the Schemes page — and the
active list is injected into all six AI planning features (author scheme, draft lesson, convert
unit, adapt for a group, improve the master, generate a resource) so practical suggestions fit
the kit actually owned.

## 14. The TA view — current lesson, read-only, with feedback

```text
┌─ School Organiser · TA view ───────────────────────────── [Log out] ┐
│ [This lesson]  [Next lesson (if you're early)]                       │
│ 7ARO                                                                 │
│ Lesson 3 · 11:05–11:55 · D12                                         │
│ ── Computing Curriculum ──────────────────────────────────────────── │
│ Algorithms 4  ✏ adapted for this class                               │
│   Objectives  ✓ describe a flowchart   ✓ order the steps …           │
│   Outline     1. Arrival routine (5 min)  2. Recap quiz (10 min) …   │
│   Resources   Slides · Worksheet · Support sheet                     │
│ ── Your feedback for the teacher ──────────────────────────────────  │
│   How were the pupils?   [_______________________________________]   │
│   Thoughts on the lesson [_______________________________________]   │
│   ▢ safeguarding concern (also tell the teacher in person —          │
│      flagged items are kept out of AI)             [Send feedback]   │
└──────────────────────────────────────────────────────────────────────┘
```

A TA logs in **on the normal login page** with a **separate TA password** (set or disabled in
Settings, flow 15) and lands straight here. The session is **deny-by-default**: a global hook
allows only this view, log in/out, static assets and linked-resource view/download/present —
everything else bounces back to `/ta`. The view is the **current lesson, strictly read-only**:
the **effective plan** (the class's adapted version where one exists, ✏-badged, formatted like
the teacher's read-views) with its linked resources and any class copies; the second tab shows
the **next lesson, today only**, for early arrivals. Every lesson running in the slot renders —
the teacher's own and TA-led ones — so a TA in another room still finds theirs, and a split
lesson gets one section per course. The **two-part feedback** (how the pupils were / thoughts
on the lesson) plus a **safeguarding tick** posts to the teacher: it appears on the lesson
screen (flow 3) and joins the group's recent history behind "adapt from recent lessons" —
**flagged items are withheld from AI entirely**, and the form reminds the TA to speak to the
teacher in person. No notes, no pupil names, no navigation.

## 15. Settings

```text
┌─ Settings ──────────────────────────────────────────────────────────┐
│ School        School name [____________________]  saved ✓           │
│ Password      managed by APP_PASSWORD_HASH in .env (remove it to    │
│               manage here) — otherwise current/new/again [Change]   │
│ AI            Key: ✅ set (via .env) · every call is redacted,      │
│               safeguarding-withheld and audited regardless          │
│               ☑ AI features enabled · monthly cap (pence) [____]    │
│               Design [claude-…] Planning [claude-…] Cheap [claude-…]│
│ TA access     [new TA password (8+)____] [Set] [Disable TA access]  │
│ Email intake  IMAP host [____] port [993] user [____] pass [____]   │
│               folder [INBOX] · ☑ TLS · ☑ poll automatically [5] min │
│               [Poll now / test]  last poll: … — 2 unseen, 2 imported │
│ Data health   ✅ current year · 📦 DB size · 🤖 AI calls this month  │
└──────────────────────────────────────────────────────────────────────┘
```

Everything that used to need SQL, on one page, every field **inline-autosaving** (the standard
pattern). **Password**: an instance managed by `APP_PASSWORD_HASH` sees an explanation instead
of a form; remove the variable and the change form appears (writing `auth_password_hash` to
settings). **TA access** sets or disables the separate TA password (flow 14). **AI** holds the
enabled toggle, the monthly cap and the three model fields (design / planning / cheap), with
the key's status shown read-only — the key itself stays in `.env`. **Email intake** (flow 16)
is configured here; **"Poll now / test" saves whatever is typed first, then polls**, so a
freshly entered config can never race the autosaves and report "not configured", and the
last-poll status line records every outcome, success or failure. **Data health** shows the
current year, database size and this month's AI call count.

## 16. Email intake & triage

```text
  dedicated / forwarded mailbox    (an Outlook rule forwards the mail
        │                           that should become tasks)
        ▼  IMAP poll · unread only — imported mail is marked read (dedup)
  MIME parse — encoded subjects · multipart · QP/base64 · HTML-strip
        ▼
  AI triage — email_triage@2 · cheap model · redacted · audited
        │      (AI unavailable → plain inbox task; intake never blocks)
        ├─ task      → inbox task: urgency + class matched from group names
        ├─ event     → dated event (kind + date)
        ├─ awareness → Captured item (category · ⚑ safeguarding flag)
        └─ note      → general note (pure reference)
```

The triaged task, opened in the inbox (flow 5):

```text
│ • Trip money — chase 8PFA payments             from email   [triage] │
│   ▾ ✉ what it says                                                   │
│     (deadline Thu 9 July) (money £8) (who 8PFA — 5 outstanding)      │
│     One or two extracted sentences, dates and amounts highlighted.   │
│     route: task — the teacher must chase payments · from office@…    │
```

A **dedicated or forwarded mailbox** — never the main school account — is polled on the
configurable cadence (flow 15, plus "Poll now / test"). Each unread message is MIME-parsed
dependency-free, then classified by the **cheap model** through the one AI wrapper. The
classifier never dismisses a forwarded email — there is always a reason it arrived — it picks
the **single best home** of the four routes above. The key **facts** (when · deadline · where ·
who · money · bring · contact) come back as tiny values and render as **colour-coded chips**
inside the task's "✉ what it says" disclosure, with dates and amounts highlighted in the
remaining prose and the provenance line muted; plain prose (manual tasks, pre-triage emails)
renders unchanged. Dedup is **belt-and-braces**: only successfully imported messages are marked
read (a failure stays unseen for the next poll), *and* a per-message key (Message-ID, or a content
hash when absent) is recorded in `processed_emails` so a message that was imported but failed to get
marked read is recognised and skipped — not re-imported — on the next poll. Every import keeps the
raw email as provenance (`email_intake`), exactly like the paste box.

## 17. The pupil view — the worksheet workspace (`/me`)

```text
┌─ My work · Networks 4 ──────────────── 🟢 · A− A A+ · 🌙 dark · Log out ┐
│ ┌─ On the board ─────────────┐ ┌─ My sheet ───────────────────────────┐ │
│ │ Slide 2 of 6      ◀   ▶    │ │ Name: (auto)      Date: 9 Sep (auto)  │ │
│ │ ┌────────────────────────┐ │ │ ── ✏ Do this ──────────────────────   │ │
│ │ │ What is a network?     │ │ │  1. Open the network diagram.         │ │
│ │ │ • computers joined up  │ │ │ ── ❓ Question ─────────────────────   │ │
│ │ │ [ diagram ]            │ │ │  Name one type of network.            │ │
│ │ └────────────────────────┘ │ │  [ your answer …                   ]  │ │
│ │ (slides simplified to 🟢)  │ │ ── 📷 Show me ──────────────────────   │ │
│ └────────────────────────────┘ │  [ paste / drop / choose a screenshot ] 💡 │
│                                 │  ☑ I saved my file    [ Done ✓ ]      │ │
└────────────────────────────────────────────────────────────────────────┘
```

The pupil-facing surface (Phase 8, off until the DPIA gate is on — not on the teacher's rail). After
**class code → tap your name → PIN**, the pupil lands on a **two-pane workspace**: the lesson's slides
on the left, **sliced to their ability level** so they follow the board with a simpler deck, and their
**full-width sheet** on the right. The theme is soft and friendly; the accessibility bar keeps
contrast/text-size and adds a **🌙 dark toggle** (pre-painted on load so there's no flash). Name and
date **auto-fill** — nothing to type. The sheet's blocks are **colour-differentiated**: a calm "✏ do
this" instruction panel, a "❓ question" with a typed-answer box, a green "📷 show me" **screenshot
paste/drop/upload zone**, and "key idea" notes. Questions can also be **multiple-choice / true-false**
(big radio buttons), **fill-in-the-blanks** (gaps typed inline, with a word bank), or **matching** —
drag an answer tile onto each item, or tap a tile then a box (a keyboard/touch path, ARIA-announced).
A **💡 paste-help** button opens a short, SEND-friendly
how-to (with a practice box) for taking and pasting a screenshot. Every answer and screenshot
**autosaves** per field; a **Done ✓** marks the sheet complete. A pupil only ever sees **their own**
work; the teacher previews the whole thing for any lesson/level through the **🧪 test pupil** (flow 3)
without a real child's data.

## Navigation summary — the rail

The persistent left **rail** groups destinations; the **Stage** to its right shows one screen at a
time. **Today** is a teacher-configurable pin set; **⚑ Safeguarding** is always pinned and never
gated; **Plan** holds the rest of the everyday pages; **Advanced** appears only at the `power`
experience level. `g`+letter jumps to a destination and `/search` opens the command palette.

```text
TODAY      Now · Focus · Timetable · Tasks · Captured        (default pins — configurable)
⚑          Safeguarding                                       (always visible, never AI-bound)
PLAN       Schemes · Map · Coverage · Notes · Oversee · Events · Resources
ADVANCED   Pupils · Concepts · Kit · Recurring · Time · Setup · Settings   (power level only)
─────────────────────────────────────────────────────────────────────────────────────────────
Each rail link opens its screen on the Stage, e.g.:
  Now       → current & next lesson · before-the-bell · heads-up · end-of-day        (flow 1)
  Timetable → week grid → Lesson detail → Plan / Resources / adaptation             (flows 2–3)
  Schemes   → schemes of work · lesson plans · the advisory AI reviewer 🔎 · AI authoring (flow 8)
  Coverage  → spec-point coverage backbone (what the course must still cover)
  Map       → curriculum map — which lesson lands which week                         (flow 12)
```
