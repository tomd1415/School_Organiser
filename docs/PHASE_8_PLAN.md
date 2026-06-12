# Phase 8 — Pupils: logins & in-app work

> **Status (2026-06-12): planned, plan-first — for review before any code.**
> The destination the teacher named: *"the system allowing pupils to log in and answer questions
> on the system."* This is the long-deferred pupil-facing project (2.11), now next in line.
> **Hard gate: no pupil credential exists until the DPIA's [CONFIRM] items are completed and the
> DPO/SLT have signed (§8 of [DPIA.md](DPIA.md))** — pupil-authored answers are a new category of
> personal data.

Everything this phase needs is already in place on the teacher side: per-lesson **worksheets are
generated as structured Markdown** (three differentiation levels, computer-completable answer
tables), **per-class copies** exist, lessons resolve to a class's dated occurrence, and the
**adapt-next-lesson loop** already consumes per-class history. Phase 8 turns the worksheet from a
document pupils *download* into a form they *fill in* — and turns their answers into data the
teacher (and the loop) can use.

---

## 0. What Phase 8 changes

- **Pupils become users** — the roster rows (names-only, with `ai_token`) gain credentials and a
  deny-by-default surface, exactly the TA-lockdown pattern at pupil strength.
- **The worksheet becomes the lesson's workspace** — answer cells render as inputs, tick-boxes
  become real, everything autosaves per pupil against the lesson occurrence.
- **Answers become data** — live completion on the teacher's lesson page, read-back per pupil,
  and an aggregated, redacted summary feeding the AI loop. Less collecting-in; less marking.
- **TAs get named accounts** (the shared-password version was the bridge) with "my upcoming
  lessons".

What deliberately does *not* change: the AI boundary (one wrapper; pupil names never leave;
safeguarding content withheld), LAN-only deployment, one instance per teacher.

---

## 1. Build order (each slice a reviewable commit)

| # | Slice | Delivers | Size |
|---|---|---|---|
| **8.0** | **DPIA completion + sign-off** (external) | the legal/safeguarding gate: [CONFIRM] fields, retention for pupil answers, DPO/SLT signatures | S (but blocking) |
| **8.1** | **Roles done properly** — shared lockdown helper for `ta`/`pupil` roles, login rate-limiting + lockout, short pupil sessions + idle logout (shared classroom machines), per-TA **named accounts** (replacing the shared TA password) with "my upcoming lessons" | the safe foundation | M |
| **8.2** | **Pupil credentials + admin** — class-code → pick-your-name → PIN login (SEND-friendly, see §4); Pupils page grows per-pupil PIN set/reset, enable/disable, printable login cards | pupils can get in | M |
| **8.3** | **The pupil surface** — `/me`: today's lesson for *their* class (via enrolments → group → timetable), the live worksheet (class copy where one exists, else master), big type, zero navigation | pupils see the right thing | M |
| **8.4** | **Interactive worksheets, sliced per pupil** — form mode (answer cells → inputs, `- [ ]` → live tick-boxes, per-field autosave to `pupil_answers`), and **each pupil receives ONLY their assigned level's section** (🟢/🟡/🔴) plus the shared parts — the level set per pupil per course by the teacher | "answer questions on the system", pitched right | L |
| **8.5** | **Pupil lesson feedback** — a tiny SEND-friendly widget after the work: an emoji rating (😀🙂😐🙁), tap-the-chips for what they enjoyed/disliked (practical · typing · cards · video · drawing · talking · worksheet…), optional short comment | pupils' voice, captured in seconds | S |
| **8.6** | **Teacher review** — the lesson page gains *Pupil work*: completion grid (pupil × progress), open any sheet read-only, mark seen, **set/change each pupil's level** (🟢🟡🔴 chips, live), and the class's feedback at a glance | the payoff screen | M |
| **8.7** | **Answers + feedback → the loop** — aggregated, name-redacted summaries of the class's answers (stuck points, common wrong turns) **and** its feedback (what they enjoyed/disliked) feed `adapt_lesson` history and a "✨ summarise the class's work" action; over time the feedback shapes the class teaching-context ("this class loves practical, hates long typing") | the loop closes on real pupil signal | M |
| **8.8** | *(stretch — promoted to [Phase 9](PHASE_9_PLAN.md), 2026-06-12)* auto-marking, teacher comment back to pupil, the "what works for me" profile and the printable answer pack are now a phase of their own; the kiosk-per-room idea is replaced there by per-pupil **stay-signed-in-on-this-computer** (one teaching room, so the pupil-bound version is the useful one) | → Phase 9 | — |

Strict order: 8.0 gates 8.2+ (8.1 can build concurrently with sign-off in progress).

---

## 2. Data model — migration `0018` (sketch)

```
pupil_credentials            -- separate from the roster row: created only after DPIA sign-off
  pupil_id      BIGINT PK REFERENCES pupils(id) ON DELETE CASCADE
  pin_hash      TEXT NOT NULL              -- scrypt, same as other credentials
  enabled       BOOLEAN NOT NULL DEFAULT true
  failed_count  INT NOT NULL DEFAULT 0     -- lockout after N failures (reset by teacher)
  updated_at    TIMESTAMPTZ

ta_accounts                  -- named TA logins (8.1); the shared ta_password_hash retires
  id            BIGSERIAL PK
  name          TEXT NOT NULL UNIQUE
  staff_id      BIGINT REFERENCES staff(id)    -- links "my lessons"
  password_hash TEXT NOT NULL
  active        BOOLEAN NOT NULL DEFAULT true

pupil_answers                -- the work itself
  id                   BIGSERIAL PK
  pupil_id             BIGINT NOT NULL REFERENCES pupils(id)
  occurrence_course_id BIGINT NOT NULL REFERENCES occurrence_courses(id)  -- the dated lesson
  resource_id          BIGINT NOT NULL REFERENCES resources(id)           -- the worksheet
  version_no           INT NOT NULL                                       -- pinned to what they saw
  field_key            TEXT NOT NULL      -- deterministic: "t2.r3.c1" (table/row/cell) or "task.4"
  value                TEXT NOT NULL DEFAULT ''
  seen_by_teacher      BOOLEAN NOT NULL DEFAULT false
  updated_at           TIMESTAMPTZ NOT NULL
  UNIQUE (pupil_id, occurrence_course_id, resource_id, field_key)

pupil_levels                 -- which differentiation tier each pupil works at, per course
  pupil_id        BIGINT NOT NULL REFERENCES pupils(id) ON DELETE CASCADE
  group_course_id BIGINT NOT NULL REFERENCES group_courses(id) ON DELETE CASCADE
  level           TEXT NOT NULL CHECK (level IN ('support','core','challenge'))
  updated_at      TIMESTAMPTZ NOT NULL
  UNIQUE (pupil_id, group_course_id)
  -- unset ⇒ core; sits naturally beside group_courses.ability_midpoint (the tier anchor)

pupil_lesson_feedback        -- the pupil's voice on the lesson itself
  id                   BIGSERIAL PK
  pupil_id             BIGINT NOT NULL REFERENCES pupils(id)
  occurrence_course_id BIGINT NOT NULL REFERENCES occurrence_courses(id) ON DELETE CASCADE
  rating               INT CHECK (rating BETWEEN 1 AND 4)   -- 🙁😐🙂😀
  liked                TEXT NOT NULL DEFAULT ''             -- comma chips: "practical,cards"
  disliked             TEXT NOT NULL DEFAULT ''
  comment              TEXT NOT NULL DEFAULT ''
  created_at           TIMESTAMPTZ NOT NULL
  UNIQUE (pupil_id, occurrence_course_id)                   -- one per pupil per lesson, editable
```

Field keys come from the worksheet's *structure* (table index, row, cell; checklist index), so
re-rendering the same version is stable, and a regenerated worksheet (new version) starts cleanly
while old answers stay attached to the version the pupil actually saw.

---

## 3. The pupil surface (8.3/8.4)

- **`/me`** resolves: session pupil → active enrolment → group → the group's lesson *now* (or
  next today, like the TA view) → its occurrence-course → the bound plan's worksheet, preferring
  the **class copy**. One screen: lesson title, the worksheet as a form, a big **Done ✓** button
  that marks their completion (and logs out on shared machines after idle).
- **Form mode rendering** extends the existing dependency-free renderer: an empty cell in a
  column headed "Type your answer here" → `<textarea>`; `- [ ]` → live checkbox; everything else
  stays read-only formatted. Autosave per field (the house autosave pattern), offline-tolerant
  (retry on reconnect — classroom wifi).
- **Sliced to the pupil's level**: the worksheet's 🟢/🟡/🔴 sections are detected from their
  headings; a pupil sees the shared parts (title, instructions, success checklist) **plus only
  their assigned level's section** — no scrolling past work that isn't theirs, no comparing
  levels mid-lesson. Field keys derive from the FULL document's structure, so the teacher's
  review aligns whichever slice a pupil saw, and a mid-lesson level change just re-slices.
- **Feedback in seconds, after the work**: tap a face (😀🙂😐🙁), tap chips for what they
  enjoyed and what they didn't (activity types: practical, typing, cards, video, drawing,
  talking, worksheet…), optionally type a short comment. One per lesson, editable until the day
  ends. Designed to be doable independently by this cohort.
- No pupil ever sees: other pupils' work, teacher notes, navigation, or anything outside `/me`
  (deny-by-default role hook, as proven with the TA role).

---

## 4. Logging in, for this cohort (8.2)

Typed usernames+passwords are a genuine barrier for many of these pupils. Proposed (decide with
DPO/SLT sign-off): **class code → pick your name → PIN**:

1. The classroom machine opens `/pupil` and the pupil (or TA) enters the short class code
   (e.g. `8PFA-31`, rotatable per term).
2. The pupil taps their **first name** from the class list (LAN-only; classmates are not secret
   from each other; the list shows only first names + initial).
3. They enter their **4–6 digit PIN** (teacher sets/resets from the Pupils page; lockout after 5
   failures; printable login cards for the start of term).

Sessions are short (the school day), idle-logout ~20 minutes, and the login is rate-limited
per-IP and per-pupil. The DPO may prefer full usernames — the schema doesn't care; §8 question.

---

## 5. Teacher review & the loop (8.5/8.6)

- The lesson page's new **Pupil work** block, per class section: a live grid — each pupil's
  **level chip (🟢🟡🔴, click to change — takes effect on their next refresh)**, fill-in progress
  (n of m fields), Done ✓ state, their lesson rating, last-saved time; click a name → their sheet
  read-only (answers inline in the worksheet layout); "mark all seen". Level assignments are
  remembered per course, so next lesson starts right.
- **"✨ Summarise the class's work"**: aggregates the class's responses per question AND its
  feedback (names → tokens as ever), asks the cheap model for: questions most got right/wrong,
  common misconceptions verbatim (anonymised), who-needs-help *as tokens* re-expanded only for
  display, and the feedback picture (rating spread; activities enjoyed/disliked, by level). The
  summary lands in the lesson's notes and joins `recentGroupHistory` — so **"adapt from recent
  lessons" knows what the class answered AND how the lesson landed with them**.
- **Feedback shapes future lessons two ways**: per-lesson (the adapt loop, above) and over time —
  a standing per-class digest ("consistently loves practical + cards; long typing tasks rated
  lowest") offered as a one-click append to the class teaching-context, which every planning AI
  call already reads.
- Completion/answers never go to AI raw: aggregation + redaction first, same boundary, and the
  whole feature degrades to "grid only" with AI off.

---

## 6. Per-TA accounts (8.1)

- Named `ta_accounts` (password per TA), same login page, same locked surface — plus, because the
  account links to a `staff` row, the TA view gains **"My upcoming lessons"**: the prepared
  lessons they lead (oversee data already exists), each opening the read-only lesson view ahead
  of time. The shared `ta_password_hash` is retired with a migration note (existing TAs get
  accounts on the Settings page).

---

## 7. Security & safeguarding posture (the section that matters)

- **DPIA first** (8.0): pupil answers are pupil-authored personal data in a special-education
  setting. Retention (proposal: answers kept for the academic year + one term, then anonymised to
  aggregate stats), pupil/parent information route, and the login design need DPO sign-off.
- **Same boundary, no exceptions**: pupil names continue to never reach the AI (tokens); pupil
  *answers* reach it only aggregated AND redacted (8.6); anything safeguarding-flagged anywhere
  remains withheld.
- **Role isolation**: pupil sessions are deny-by-default (the proven TA pattern) — `/me`, its
  autosave endpoints, the login flow, nothing else. Resource access is *not* granted broadly:
  pupils get the worksheet content rendered server-side into `/me`, not `/resources/*`.
- **Shared machines**: short sessions, idle logout, a huge "I'm done — log out" button, no
  credential autofill (PIN inputs are `autocomplete="off"`/`one-time-code`).
- **Abuse limits**: per-IP and per-identity rate limits on the pupil login; lockout visible to
  the teacher on the Pupils page (one-click unlock).
- **Audit**: pupil logins and answer-summary AI calls land in the existing audit surfaces.

---

## 8. Decisions & open questions

- **Login style** (§4): class-code + name + PIN (recommended for this cohort) vs full usernames —
  needs DPO/SLT view during 8.0.
- **Decided (teacher, 2026-06-12):** pupils are **assigned a level per course** and receive
  **only that slice** of the worksheet (default core when unset; changeable live from the review
  grid). Pupil lesson feedback (rating + activity chips) is in scope from the start.
- **Open**: should pupils SEE their level name/colour, or just get "their" sheet unlabelled?
  (Sensitivity question for this cohort — recommend unlabelled by default, teacher toggle.)
- **Retention**: proposed year+term for answers — DPO to confirm.
- **Where pupils work**: classroom machines only at first (LAN), or also school-network laptops
  anywhere on site? (Same build either way; affects the idle-logout default.)
- **Done ✓ semantics**: self-declared vs all-required-fields — recommend self-declared plus the
  field count shown to the teacher (honest *and* low-pressure).

---

## 9. Test strategy

- Role lockdown: the TA-pattern walk — a pupil session tries every teacher/TA surface and must
  bounce; pupils can never read another pupil's answers (direct-ID probes included).
- Form mode: renderer unit tests (cell→input mapping, deterministic field keys, version pinning);
  autosave round-trip + UNIQUE upsert integration tests.
- **Level slicing**: keys identical whether sliced or full; only the assigned section's fields
  render; level change re-slices without losing saved answers; unset level ⇒ core.
- **Feedback**: one-per-lesson upsert; aggregation produces token-redacted text only (egress
  test); chips round-trip; the teaching-context digest never names a pupil.
- Review grid: completion math; seen-flag; read-back renders the right version's answers.
- Login: rate-limit/lockout tests; PIN reset; class-code rotation.
- AI summary: aggregation redacts before egress (egress tests extended to pupil answers); the
  degrade path (no key) leaves the grid fully functional. One live verification of the summary.
- A browser pass on the actual classroom hardware (portrait monitor, shared machine) before any
  pupil uses it.

---

## 10. Out of scope for Phase 8

- Internet exposure / homework from home (LAN only; revisit only with the school's infrastructure
  and a fresh DPIA).
- Parent access, grade books, formal assessment records.
- Cross-instance anything (one teacher's pupils, one instance).
- Real-time collaboration features (one pupil, one sheet).

---

## 11. Recommended first slice

**8.1 (roles + rate-limiting + per-TA accounts)** — valuable on its own, no DPIA dependency, and
it hardens exactly the surface pupils will stand on. Start **8.0 (DPIA sign-off)** in parallel —
it's the only external dependency and therefore the schedule risk. Then 8.2 → 8.3 → 8.4 as one
arc, with 8.5 landing before the first real class uses it (the teacher must be able to see what
pupils submit from day one).
