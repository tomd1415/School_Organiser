# School Organiser — Implementation Spec (UI rebuild)

Spec for the rebuilt screens, written against the repo's existing tokens/classes
(`app/public/styles.css`, `body[data-shell="next"]`). The prototype uses its own
clean dark palette; this doc maps every value back to the repo so the build slots
into the current Fastify + HTMX, server-rendered HTML stack.

> **Stack reminder:** routes → services (pure) → repos. Screens are server-rendered
> HTML fragments + vendored HTMX. Inline-autosave is the standard pattern (save on
> blur / change, no Save button). Keep everything inside the existing `data-shell="next"`
> dark scope.

---

## 0. Shared shell & navigation (applies to every screen)

The prototype's clean palette maps to the repo tokens as follows. **Prefer the repo
tokens** in the build — they already carry the high-contrast theme.

| Prototype value | Repo token | Use |
|---|---|---|
| `#0e141b` | `--bg` (`#080b12`) / `--bg-soft` | page background, inset wells |
| `#11181f` | `--bg-soft` / `--rail` | rail, header |
| `#141d26` | `--surface` (`#111824`) | cards |
| `#1a232d` / `#1d2a35` | `--surface-2` / `--surface-3` | buttons, active nav |
| `#232c37` | `--line` (`#2a3749`) | borders |
| `#2a333f` | `--line-strong` (`#3b4b62`) | input borders |
| `#e7ebf0` | `--text` | body text |
| `#9aa4b0` | `--muted` | secondary text |
| `#5f6b78` / `#7c8693` | `--quiet` | labels, captions |
| `oklch(0.72 0.1 200)` teal | `--teal` / `--accent` (`#5de0d0`) | primary accent, primary buttons |
| `oklch(0.7 0.12 155)` green | `--green` (`#83dfa2`) | success, "saved", on-track |
| `oklch(0.78 0.12 75)` amber | `--amber` (`#ffc06a`) | warn, marking, pupil tag |
| `oklch(0.78 0.13 25)` red | `--red` (`#ff8f9b`) | safeguarding, danger |
| `--radius 16px` / `14px` cards · `8–10px` controls | `--radius` / `--radius-sm` | radii |
| `44px` min touch target | `--target` | every button/input |

**Type:** Atkinson Hyperlegible (already self-hosted in repo) for UI; a mono
(JetBrains Mono in prototype → repo can use `ui-monospace`) for clock, times, counts,
versions, codes. Base 16px / line-height 1.45.

**Rail (left, `.scaffolded-ribbon` equivalent):** sticky, full height, `--rail` bg,
1px right border. Grouped destinations with small uppercase group labels (`--quiet`,
11px, letter-spacing 1px). Active item: `--surface-3` bg, white text, bold. Each item
= 8px status dot + label + optional count pill. **New grouping (more predictable):**

```
TODAY       Now · Timetable · Focus · Tasks(5) · Marking(18) · Cover(2)
FLAGGED     ⚑ Safeguarding(1)          ← own group, always visible, never AI-bound
RECORD      Captured · Notes · Events
CURRICULUM  Schemes · Map · Coverage · Resources
CLASSES     Oversee · Pupils
SETUP       Kit · Planner · Settings
```

Rationale for the regroup (addresses "buttons aren't where you'd expect"): everything
you touch *during the day* is in one top group; the things you *record* are together;
planning/curriculum is one group; admin/config sinks to the bottom. Safeguarding is
pulled out as its own pinned group so it's never buried.

**Header (sticky, 64px):** page title + one-line context (left), spacer, Search (`/`),
Quick note (`n`), live clock + date (right). Wraps below ~720px.

### Responsiveness — REQUIRED (landscape 1920×1080 **and** portrait 1080×1920)

Nothing may run off-screen in either orientation. Rules used in the prototype:

- All page content lives in `max-width` containers (`740–1320px`) centred in the stage.
- Multi-column regions are CSS grid/flex with `gap`; **never** fixed widths that can
  exceed the viewport. Use `min-width:0` on flex children that hold text.
- `@media (orientation: portrait), (max-width:1024px)` → collapse every 2-up grid to
  one column (`.so-grid2`, hero split, scheme spine, pupil two-pane, etc.).
- Wide tables (timetable, scheme matrix) sit in an `overflow-x:auto` wrapper with a
  `min-width` so they scroll horizontally instead of breaking the page.
- `@media (max-width:720px)` → rail becomes a horizontal scrolling top strip.
- At **1080px portrait** the rail (232px) + stage (≈848px) both fit; the 2-up grids
  stack via the portrait query; card grids use `repeat(auto-fill,minmax(280px,1fr))`
  so they reflow to 2 columns. Verified: no horizontal overflow.

---

## 1. Captured  (`/captured` — `notes` table, `kind='captured'`)

**Purpose (UX_FLOWS flow 11):** one-line brain-dump for things you can't action yet;
the AI files and resurfaces them.

**Layout** (max-width 960, centred):

1. **Capture bar** — teal-tinted gradient panel (`linear-gradient(100deg,#152431,#11181f)`,
   1px `#25404e`). Full-width text input ("Tell me later… e.g. B14 projector being
   replaced over half term") + primary **Capture +** button (teal, `--target` tall).
   Posts via HTMX; on success the row prepends to the list and the input clears.
   Text-only is a complete capture.
2. **Helper line** (`--muted`, 13px): "One line is enough… resurfaces on the day it
   matters… Re-file to override the category, promote to a task, or archive."
3. **Filter chips** — rounded-pill row: `All · Logistics · Pupil · Admin · Curriculum ·
   Safeguarding`, each with a count pill. Active chip: `--surface-3` + teal border +
   teal count pill. Drives a client/HTMX filter on category.
4. **Item list** — each item a card (`--surface`, 12px radius) with a **left border in
   the category tone**:
   - Header row: category **badge** (tone-tinted: bg `tone+22`, text `tone`, border
     `tone+66`), subject (`--quiet`, e.g. "Room B14", "PUPIL_4 · Y9"), spacer, "added"
     time (`--muted`).
   - Body: the captured text, 15px.
   - Footer row: "↳ resurfaces **{when}**" (`--muted`, bold value), spacer, primary
     action button (**Make a task** / **Open register**), **Archive** (ghost).

**Category → tone:** Logistics→teal, Pupil→amber, Admin→quiet/grey, Curriculum→green,
Safeguarding→red.

**Safeguarding rule (non-negotiable):** a safeguarding-flagged capture shows the red
badge "⚑ Flagged · withheld from AI" and its resurface line reads "kept out of AI
entirely". It is **never** sent to any AI service — handled in the teacher-only
register. Its primary action is **Open register**, not Make a task.

**Behaviour:** AI triage assigns the category + resurface trigger (cheap model, through
the one wrapper, redacted/audited). Re-filing overrides the AI category. "Make a task"
promotes to a `tasks` row keeping provenance; "Archive" soft-archives (never delete).

---

## 2. Notes  (`/notes` — `notes` table, `kind='general'`)

**Purpose (flow 9):** a searchable knowledge base; any note can link to a
course/group/pupil/task and surface next to it.

**Layout:**

1. **Top row:** search field (flex-grow, leading `⌕` glyph) + primary **＋ New note**
   button (opens the same quick-note composer the `n` shortcut uses).
2. **Filter chips:** `All · Lessons · Groups · Pupils · Tasks · General` — filters by
   what the note links to (i.e. its `kind`/link type). Active style as Captured.
3. **Note grid:** `display:grid; repeat(auto-fill,minmax(280px,1fr)); gap:12px` (reflows
   3→2→1 column across landscape→portrait). Each note card (`--surface`, 12px):
   - Header: **kind badge** (tone-tinted) + spacer + date (mono, `--quiet`).
   - Title (15px, bold).
   - Snippet (13.5px, `--muted`, line-height 1.5).
   - **Link chips** (inset wells): the course/group/pupil/task/tag this note is bound
     to — clicking a chip filters to that entity.

**Kind → tone:** General→grey, Group→teal, Pupil→amber, Lesson→green, Task→teal.

**Behaviour:** search filters title + body + link labels. Notes are the same `notes`
table rows as captures/lesson notes, just `kind='general'`; the link chips come from
the note's joins (course/group/pupil/task). Editing opens the note composer; autosave.

---

## 3. Settings  (`/settings` — one page, every field inline-autosaves)

**Purpose (flow 15):** everything that used to need SQL, on one page. Reading-width
single column (max-width 740), stacked section cards. Each card shows a **✓ Saved**
green chip when its fields autosave.

Sections, in order:

1. **School** — school name text field. Caption: "Shown on printed worksheets and the
   pupil login screen. Autosaves on blur." Writes the school-name setting.
2. **AI** — "Key set via .env" pill; line: "Every call is redacted,
   safeguarding-withheld and audited regardless." Rows (each separated by a 1px
   `--line` divider):
   - **AI features enabled** — pill **toggle** (knob slides; on = `--green`).
   - **Monthly spend cap** — `£` + numeric field (mono, right-aligned). Stops AI calls
     when reached.
   - **Model per task** — three `<select>`s: Design / Planning / Cheap-triage. Key
     stays read-only (lives in `.env`); only the model choice is editable here.
3. **TA access** — explainer; **TA login enabled** toggle. When on, reveal a "New TA
   password (8+)" field + **Set password** button. When off, status reads "Disabled —
   no TA login accepted". Sets/clears the separate TA password (flow 14).
4. **Email intake** — `repeat(auto-fit,minmax(150px,1fr))` grid of fields: IMAP host /
   port / username / poll-every-N-min (+ password, TLS, folder in the real build).
   **Poll now / test** button + last-poll status line ("Last poll 10:35 — 2 unseen,
   2 imported"). *Poll-now must save typed values first, then poll* (avoids the race
   that reports "not configured").
5. **Password** — if managed by `APP_PASSWORD_HASH`, show the lock explainer (mono code
   spans for the var/`.env`). Remove the var → show current/new/again change form.
6. **Data health** — `auto-fit` stat grid: Curriculum year / Database size / AI calls
   this month (the count in teal).

**Toggle component:** 46×26 pill, 20px white knob, `--green` when on, `--line-strong`
when off, `aria-pressed`, ≥44px effective hit area, 150ms transition.

---

---

## 4. Tasks  (`/tasks`)

**Tabs** (segmented control): `Inbox(4) · Today · Scheduled · Done`. Right-aligned
**✉ Paste email** + primary **＋ Task**. Each task = card with left border in a tone:
- **Inbox** rows show an `EMAIL`/source mono tag (or none) and a **Triage** action.
- **Today/Scheduled/Done** rows show a check box (toggle done; struck-through when done),
  meta chips (due time mono, `urgent` in red), and an action (`Schedule` / `Open block` /
  `Open`). Done rows render pre-checked.

Tone: email/scheduled→teal, urgent→red/amber, plain→quiet. "Paste email" opens a box →
draft task with the email kept as provenance (`email_intake`). Triage = set
urgency/estimate/link + optionally drop into a work block.

## 5. Focus  (`/focus`)

Mode toggle: **Do this now** / **Wind down**.
- **Do this now:** one big card (teal gradient) with the single chosen task, its steps as
  a tappable checklist, and actions **Done & next · Too big → break down · Snooze · Skip**.
  Caption shows urgency/window/load. Footer: "N other tasks hidden — on purpose".
  Selection is FocusService's job (rank by urgency, due-before-next-lesson, time in the
  current window, cognitive load → show only the top one).
- **Wind down:** end-of-day; only quick/urgent left, each with estimate + **Do**. When all
  cleared, a green "✅ You're done — go home." banner appears.

## 6. Planner  (`/planner`, time & actuals)

Reading-width list of today's time blocks. Each: slot + time (mono) · status mark
(`▢ planned` / `▣ done` / `⚠ diverted` / `✕ not work time`) · title · planned duration.
One tap toggles planned↔done or opens the "what I actually did" box (sets
`status='diverted'`, keeps the plan — shown in amber). **Break and lunch never appear as
work blocks** (they're occupied) — render as `✕ not work time`, muted. **Week report →**
rolls up actuals.

## 7. Events  (`/events`)

Grouped by how-soon: **This week / Next two weeks / Later this term**. Each event = date
chip (mono day + month, tone-coloured) · title + detail · **kind badge** · "in N days"
(tone). Kind→tone: Deadline→red, Trip→amber, Club→teal, Meeting/Off-tt→quiet. **＋ Event**.

## 8. Curriculum map  (`/map`, flow 12)

One class's weekly slot as a vertical term calendar. **Group & weekly slot** selector +
**Fill a slot from a unit**. Rows on a timeline rail (date mono, connector line):
- **Past** = real occurrences, green left-border card, "stopped at …"; the most recent
  unfinished one gets **↻ Continue next week** (amber).
- **Today** = accent (teal) bordered card.
- **Future** = plain card; **Empty** = dashed "— nothing planned"; **Holiday** = muted
  dashed. Future rows walk the school calendar, holidays skipped. ✏ = adapted-for-group.
Read-only — editing stays on the lesson screen.

## 9. Coverage  (`/coverage`, spec-point backbone)

Course selector + filter `All · Covered · Gaps`. Cards per **spec area** with a % bar.
Each point row: status dot (✓ covered green · ◐ partial amber · ○ gap red) · code (mono) ·
label · meta (covering lesson, or "not yet" / "today" in the status colour). Filtering to
Gaps hides covered points and drops fully-covered areas. Each point links to the lesson
that closes it. % = covered ÷ total.

## 10. Resources  (`/resources`, hosted store)

Search + **⇪ Upload**. Filter pills `All · Slides · Worksheets · Answers · Other`. Card
grid (`auto-fill,minmax(290px,1fr)`): **kind badge** (SLIDES teal · SHEET green · ANSWER
amber · OTHER grey) · version (mono) · title · meta (🔗 linked-lesson count · size ·
updated) · **Open** / **Present ↗**. Linked-lesson count comes from the resource's joins.

## 11. Pupils  (`/pupils`, teacher-only)

Class chips select the roster. Class header: name · meta (count · course) · **ability
midpoint** (the Support/Core/Challenge anchor). **Red privacy banner**: individual pupils
are *never named or described to any AI service* — cohort-level prose only. Roster grid
(`auto-fill,minmax(220px,1fr)`): initials avatar · name · **level chip** (Support green ·
Core teal · Challenge amber) · completion % · ATL trend arrow.

## 12. Equipment / Kit  (`/kit`, flow 13)

Filter field · **Show archived** checkbox · **＋ Add item**. One flat table
(`overflow-x:auto`, `min-width:760px` so it scrolls in portrait rather than breaking),
grouped by category. Columns: Item · Own · Work · Location · Notes · Tags · Checked + a
**✓ stock-take** button. Rules: **Work < Own renders the Work count red**; a checked date
older than a term (or "never") renders red as stale; items **archive, never delete**. Every
cell is inline-autosaving in the real build. The active list is injected into all six AI
planning features so suggestions fit the kit actually owned.

---

## 13. Oversee — Lessons I oversee  (`/oversee`, flow 7)

TA-led / non-specialist lessons (`timetabled_lessons` with a non-self `staff_id`). You
prepare the plan + resources here and record oversight after. Each row: ⚑ class · slot ·
TA name · **plan set ✓ / plan missing** pill · **resources ✓ / ⚠ missing** pill (missing
turns the row's left border red) · actions **Set plan · Attach resources · Add oversight
note**. (Distinct from **Radar** below — the old prototype "Oversee" was actually a risk
board and has been renamed.)

## 14. Radar — class radar  (`/radar`, prototype addition, power-level)

Deterministic, no-AI cohort attention board (not in the original repo — a prototype
proposal). Cards per class sorted by urgency, each explained by reason chips (exam
proximity, unbound lessons, marking backlog, pace, coverage %). Explicitly *not* a
prediction about individuals. Keep behind the **power** experience level.

## 15. Planning assistant  (`/planning`, flow 8)

Context selector (class · scheme position) + a note that it pulls the last 4 lesson
notes / stopping point / plan-change notes, with pupil names shown to AI as `PUPIL_n`,
every call redacted + audited. Three action cards: **Draft next lesson · Summarise this
term · Redesign this unit**. Output is an **editable draft** shown for review (never saved
automatically) with **Save as lesson plan · Add resources-to-make as tasks · Discard**.
All calls go through the one LLM wrapper and land in `ai_calls` (redacted request only).

## 16. Year setup  (`/setup`, Phase 6 + Phase 10 admin, power-level)

Hub for the rarely-changed things:
- **Timetable editor** — periods, rooms, classes, slots, free/duty.
- **September rollover** — new timetable per year; class-group knowledge follows the group
  up the **predecessor chain** (9A ← 8A ← 7A) so notes/adaptations travel with the group.
- **Onboarding** — first-run wizard for this teacher instance.
- **Data & safety** tiles (Phase 10): Backups & restore (encrypted nightly + restore
  drill), Pupil erasure / SAR (anonymise + disposal audit), Idle logout, **AI-call audit**
  (every redacted request, searchable).

## 17. Lesson cockpit  (`/lesson/:occurrenceId`, flow 3 — the deepest screen)

The in-lesson command surface. **Top of screen, kept deliberately light** (this was
decluttered): one status line (effective room badge · date · period · time · pupil count ·
live clock), the **View / Edit this class / Edit master** mode segmented control, a **Plan
bar** (plan selector + "last time → stopped at …" resume), and **split-course tabs** (one
tab per course in a split lesson). Nothing else competes with the board.

**Action rail (right, vertical, sticky):** the old horizontal button row is now a thin
50px icon column to the right of the content grid — **Board screen ↗** (accent/primary),
**View as pupil ↗**, **Presenter ↗**, **Print plan**, **Plan tools** (opens modal),
**Focus mode** (toggles; lit when active). Each is a 50×48 icon button with a `title`
tooltip + `aria-label`. In the build, render these as icon buttons with accessible labels;
keep Board-screen visually primary.

**Content grid** (`1.3fr 1fr`, collapses to `1fr` in Focus mode and on portrait):
- **Left:** *Board mirror* (slide thumbnails rail + 16:9 current-slide preview, lock-to-
  slide toggle, prev/next, "no pupil names on board", a teacher-note callout for the
  current step); *Lesson flow* (objective + kit chips, the tappable step tracker that
  doubles as the stopping point, per-step private teacher notes, the autosaving stopping-
  point bar).
- **Right (hidden in Focus mode):** *Who may need you*, *Class timer*, *Live pupil work*,
  *Activity groups*, *TA feedback* (safeguarding-flagged items routed to the register and
  withheld from AI), *Resources*, fast-capture note composer with category chips.

**Modals:** Plan tools (quick peek by level, test-as-pupil, spaced-recall starter, generate
cover work, teaching context, term map, continue-next-week); Live pupil work; Edit activity
groups; the marking modal (suggested mark + ATL + comment, prev/next pupil).

**Adaptation model:** Edit-this-class vs Edit-master modes resolve override-else-master per
field; a class edit creates this group's override and logs to its change log. The footer
scope strip ("this change affects N classes — just this class / apply to master") appears
only once an edit touches shared content.

---

## Navigation model — experience levels

The rail supports an **Everyday ↔ Power** toggle (header segmented control), mirroring the
repo's everyday/power tiers — directly answers "too many buttons everywhere":

- **Everyday** (default) shows the daily core: Today (Now, Timetable, Focus, Tasks,
  Marking, Planner, Cover), Flagged (Safeguarding), Record (Captured, Notes, Events),
  Curriculum (Schemes, Planning, Map, Resources), Classes (Oversee), Setup (Settings).
- **Power** additionally reveals: **Coverage, Radar, Pupils, Kit, Year setup**.
- Switching to Everyday while on a power-only page falls back to **Now** (never strands
  the user on a hidden page). In the repo this maps to the `power` experience flag plus the
  one-time "earned" nudge.

---

## Open items / next screens

- **Pupil worksheet view** already exists in the prototype as the **test-pupil overlay**
  (calm light theme, A−/A+/Easy-read/High-contrast bar, slide mirror + level-sliced sheet,
  per-question hints, autosave, Done, feedback faces). It is the same renderer the real
  `/me` pupil surface should use — spec it next as a standalone page behind the DPIA gate.
- **Lesson cockpit / detail** is the deepest screen and only lightly specced here — worth a
  dedicated pass (slides mirror, in-lesson tracker, live pupil work, groups, plan tools,
  adaptation override-else-master, marking modal).
- All teacher-facing nav destinations now have a real screen in the prototype. Remaining
  detail screens to formalise: the **Safeguarding register**, **Oversee** deep view, and
  the **Schemes** editors (already built — just need their spec written up).
