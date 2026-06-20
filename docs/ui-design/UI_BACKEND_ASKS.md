# UI overhaul — backend asks, assessed

The "Unified Cockpit" implementation plan (external UI dev) lists backend features it needs (its §1).
Assessed here against the existing codebase so the overhaul **reuses stable behaviour instead of
building parallel systems** — which is the whole point of the handoff. Status: ✅ done · ♻️ reuse what
exists · 🆕 genuinely new (build here) · ⏭ skip (not needed).

## §1 — Requested endpoints/tables

| Ask (from the plan) | Status | What to actually do |
|---|---|---|
| `ui_shell` flag + `POST /settings/ui-shell` | ✅ **done** | Built this session: setting `ui_shell` ∈ `classic`/`next`, in-memory write-through (`lib/nav.ts`), boot-primed (`server.ts`), `<body data-shell>` seam (`lib/html.ts`), Settings toggle. Use as-is. |
| `POST /today/capture` → `inbox_items` table (Mind Dump Dock) | ♻️ **reuse** | Don't add a table/endpoint. **`POST /capture-quick`** (`routes/captured.ts`) already captures quick notes; the **note modal** `POST /note/route` does AI-routed capture. Tasks already carry an **`inbox` status** (migration 0003). The Mind Dump Dock should post to one of these. |
| `POST /today/inbox/:id/process` → task/pupil/calendar | ♻️ **reuse** | Already exists: **`/captured/:id/to-task`** turns a captured item into a task; **`/note/route` → `/note/route/apply`** routes a note into task/event/captured/note. Wire the dock's "process" to these, not a new endpoint. |
| Per-slide teacher notes: `slide_notes(...)` table + `GET/POST /occurrence-course/:id/slide/:num/notes` | ✅ **built (2026-06-20) — but NOT as a table; see below** | Implemented **in the slide Markdown**, not a `slide_notes` table — which sidesteps the fragile `slide_index` key entirely. The UI dev should consume the **presenter view**, not build a parallel store. |
| `POST /pupil/worksheet/autosave` server debouncer | ⏭ **skip (for now)** | `/me/answer` already (a) debounces client-side (`hx-trigger="input changed delay:600ms"`) and (b) is a **single-row upsert** (`ON CONFLICT … DO UPDATE`), so there's no table-lock problem to solve. Don't add a server debouncer without a measured one. |

## Per-slide notes — how it was built (built 2026-06-20)

Built **in the slide Markdown**, not as a `slide_notes` table — which makes the fragile-slide-identity
problem moot (the notes live *on* the slide, so they move with it, survive a re-version naturally, and
never need a positional key). Design:

- **Authoring:** each slide carries a private blockquote whose first line is marked 🧑‍🏫 (`> 🧑‍🏫 …`).
  The AI (`lesson_resources@17`) now writes these — teaching tips, fun facts, learning hints, engagement
  ideas (NOT subject-knowledge "say this"), the teacher's stated need. The old leaky `*Say:*` line is
  gone and is auto-stripped from existing decks.
- **The safety boundary:** `splitTeacherNotes()` / `stripTeacherNotes()` in `lib/slideDeck.ts`;
  `renderSlideDeck(md, id, level, audience='pupil')` **strips notes by default**, so the pupil surface
  (`/me`) and the projector board (`/lesson/pupil-view`) never show them — even if a caller forgets the
  arg. Only `audience='teacher'` renders them, in a labelled side panel. A test
  (`tests/slideTeacherNotes.test.ts`) asserts the pupil render contains no note.
- **Presenter view:** `GET /lesson/present?gc&lp&level` renders the deck for the teacher's OWN screen with
  the notes; linked from the lesson screen ("🧑‍🏫 Presenter"). The board stays clean.

**For the UI dev:** the prototype's per-slide-notes control can come off "Future feature" — but consume
this (the presenter view + `renderSlideDeck(..., 'teacher')`), do **not** build a `slide_notes` table.
The board view must keep using the default (pupil) render. Editing notes happens via the existing slide
Markdown editor (`/lesson/pupil-view?edit=…`); if you later want notes that survive a full slide
regeneration, that's the only reason to revisit a separate store.

## Plan items that conflict with what's already there

The plan marks several things **[NEW]** that **already exist** — extend them, don't recreate (recreating
would orphan working behaviour + tests):

- **`capturedView.ts`, `schemeView.ts`** (and `eventView`, `notesView`, `taskView`, `recurringView`,
  `resourceView`, `prepView`, `workBlockView`) already exist in `app/src/lib/`. The plan's "NEW
  capturedView.ts / schemeView.ts" should be **MODIFY**.
- **Client TTS** is already built: `public/pupil.js` `speak()` uses `window.speechSynthesis` with
  `.ws-speak` buttons + a `data-speak` toggle. The plan's "new TTS engine" in `pupil-overhaul.js` /
  `app-overhaul.js` should **reuse/move** this, not reimplement it (and keep the `data-speak*` contracts —
  see CONTRACTS_TO_PRESERVE).
- **Stage 1's** conditional asset loading (`html.ts` loads `styles-overhaul.css`/`app-overhaul.js` when
  `next`) is supported by the `data-shell` seam — fine, but it touches the shared `html.ts`; coordinate
  there (DEVELOPER_INPUTS_RESPONSE §1).

## Net for "what needs doing here"

- ✅ The flag is done.
- 🆕 **Per-slide notes** is the one backend feature to build — after the decisions above. Good candidate
  for parallel backend work while the UI dev does presentation.
- ♻️ Everything else the plan asks for is **reuse**; the right action is to point the UI dev at the
  existing endpoints (this doc) so they don't duplicate the capture/inbox/autosave systems.
- The big *non-UI* feature you actually want next is still **Stages & strands** (NEXT_STEPS) — independent
  of the overhaul.
