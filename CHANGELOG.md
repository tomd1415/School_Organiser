# Changelog

All notable changes to **School_Organiser**. Format loosely follows
[Keep a Changelog](https://keepachangelog.com/); dates are absolute (YYYY-MM-DD). The project
is pre-release, so this logs planning and build progress. Decision detail lives in
[docs/OPEN_QUESTIONS_ANSWERS.md](docs/OPEN_QUESTIONS_ANSWERS.md).

## [Unreleased]

### 2026-06-13 — Phase 8 second review: renderer + reliability fixes (migration `0020`)

A second adversarial review (fix-regressions, renderer edge-cases, teacher-UI, performance, plus a
test-gap audit) found 24 more real issues; the load-bearing ones are fixed and locked with tests
(**206 unit / 129 integration green**):

- **Worksheet renderer (the pupil-facing core).** Four real parsing bugs that could blank or
  corrupt a pupil's worksheet, all fixed in [worksheetForm.ts](../app/src/lib/worksheetForm.ts):
  (1) an **unclosed code fence** used to swallow the next level's heading + table, leaving that
  level's pupils a blank sheet — fences now only open if a closing fence follows (a stray ``` is
  literal), so balanced fences (even with a `# Challenge:` comment) stay opaque while strays
  don't eat the document; (2) a table **cell containing a pipe** (e.g. `` `a|b` ``) or an escaped
  `\|` no longer splits into phantom columns (`cells()` is GFM-aware); (3) a **single-dash
  separator** row `| - | - |` is stripped, not turned into a fillable row; (4) an answer table
  with a **missing separator** still renders input cells instead of degrading to literal-pipe
  prose. The markdown renderer now also recognises `~~~` fences.
- **AI summary crash (HIGH, was hidden by the empty-key test env).** A successful (billed)
  "summarise the class's work" then crashed inserting a `notes` row — `notes.kind` had no
  `ai_summary` value. Migration `0020` allows it; the insert is also wrapped so a save failure
  never loses a billed summary. The summary now also **drops answers whose field key isn't in the
  current worksheet** (a re-versioned/adapted sheet could otherwise feed the AI mislabelled
  questions).
- **Migration `0020`** also changes `pupil_answers.resource_id` to **ON DELETE SET NULL** (after
  0019 made it provenance, the inherited CASCADE could have deleted a pupil's answers if a
  worksheet resource were ever hard-deleted).
- **The DPIA kill-switch is now instant.** The lockdown hook's access/idle cache
  ([pupilAccessCache.ts](../app/src/auth/pupilAccessCache.ts)) is **invalidated the moment** the
  teacher toggles pupil access or idle-minutes, so disabling access evicts live sessions at once
  rather than after a 30s TTL.
- **Performance** (medium, LAN-scale but real): `/me` no longer reads the worksheet file or
  fans out queries serially per section (read-first occurrence — no write/lock on the common
  GET — plus `Promise.all`); the teacher grid parses the worksheet **once** instead of three
  times; `listGroupLogins` is a single query instead of N+1; autosave already avoided the disk
  read (metadata-only resolver).
- **Smaller fixes:** a shared-password TA can no longer deep-link to an arbitrary lesson by id
  (named-TA / teacher only); the pupil-idle field rejects empty values; the enable-pupil-access
  form only reloads on success (shows the DPIA-ack error otherwise).
- **Tests added:** renderer regressions (unclosed/balanced fence, pipe-in-cell, escaped pipe,
  single-dash + missing separator); PIN lockout **via the HTTP route**; the login
  enumeration-oracle (wrong/not-enrolled/disabled byte-identical); `seen_by_teacher` only clears
  on a real change; the `/me/feedback` one-per-lesson upsert + chip whitelist; `/me/done`+
  feedback role guards; a full teacher-side suite (review-grid math, level-chip + **IDOR**
  enrolment check, read-back marks-seen, AI-summary **degrade path**, **named-TA** login); the
  level-change-preserves-answers and resource-flip invariants; the `/pupil/names` rate limit.
  Integration tests now run **serially** (shared dev DB) to remove a cross-file count race.

### 2026-06-13 — Phase 8 hardening: adversarial review + fixes (migration `0019`)

An adversarial multi-agent review of the Phase 8 diff surfaced 21 confirmed issues; the load-bearing
ones are fixed:

- **Redaction boundary (HIGH).** JS `\b` is ASCII-only, so a pupil name whose first/last character
  is accented (José, Zoë, André) slipped past **both** `redactNames` and the `containsRosterName`
  egress assert — a real-name-to-AI hole. Both now use Unicode-aware boundaries
  ([app/src/services/redact.ts](../app/src/services/redact.ts)). Also: the redaction roster now
  **includes inactive (left) pupils**, who keep their real name until anonymisation — so a leaver's
  name typed into an answer is still caught.
- **Pupil-auth disclosure/abuse (HIGH/MED).** `/pupil/pin` no longer reveals a name for a pupil
  outside the class code used (was an unauthenticated full-roster enumeration); `/pupil/names`,
  `/pupil/pin` are rate-limited; the login failure message is now **generic** (no wrong-vs-disabled
  enumeration oracle), and the per-IP PIN limiter is **no longer reset by a successful login** (it
  enabled cross-pupil PIN spraying / class-lockout DoS).
- **The DPIA kill-switch now evicts live sessions (MED).** Turning pupil access off (or idle-out)
  deletes an already-authenticated pupil session at the lockdown hook, not just blocks new logins.
- **Answer keying (MED).** Answers are now keyed on the **lesson instance**
  (`pupil_id, occurrence_course_id, field_key`; migration `0019`) instead of the worksheet
  resource/version — so they survive a class's worksheet resolving master↔adapted or being
  re-versioned (previously those flips silently hid a pupil's earlier work). `resource_id`/
  `version_no` become provenance; `/me/answer` resolves the worksheet **server-side** (no trust in
  client-supplied ids).
- **Smaller correctness fixes.** Teacher per-pupil handlers now verify the pupil is enrolled in the
  occurrence's group (IDOR); the completion count counts text fields only (tick-boxes no longer
  inflate "n of m"); a re-blur of an unchanged answer no longer re-flags it as new; `/me` resolves
  form/tutor-period worksheets and prefers the teacher's own row when a group sits in a slot twice.
- Tests added/updated for every fix (accented-name redaction, generic login message, access-off
  eviction, `/pupil/pin` scoping, inactive-roster redaction). **200 unit / 115 integration green.**

### 2026-06-13 — Phase 8 BUILT: pupil logins & in-app work (8.1–8.7)

- **Migration `0018`** adds `ta_accounts`, `pupil_credentials`, `pupil_answers`, `pupil_done`,
  `pupil_levels`, `pupil_lesson_feedback`, and `groups.login_code`.
- **8.1 Roles** — a shared deny-by-default lockdown helper ([app/src/auth/lockdown.ts](../app/src/auth/lockdown.ts))
  now covers both `ta` and `pupil`; login is **rate-limited** (per-IP sliding window) with a
  **durable per-pupil PIN lockout**; pupil sessions **idle out** on shared machines. **Per-TA
  named accounts** replace the shared TA password (the old one still works until cleared), and a
  linked staff row gives the TA a **"my upcoming lessons"** tab.
- **8.2 Pupil login** — SEND-friendly **class code → tap your name → PIN** ([/pupil](../app/src/routes/pupilAuth.ts)).
  The Pupils page grows a **logins admin** (per-class code, per-pupil PIN set/reset, enable/disable,
  unlock) and **printable login cards**.
- **8.3/8.4 The `/me` surface** — one screen: the pupil's class lesson now, the worksheet as a
  **form sliced to their level** (unlabelled), per-field **autosave** to `pupil_answers`, a
  self-declared **Done ✓**. New renderer [app/src/lib/worksheetForm.ts](../app/src/lib/worksheetForm.ts):
  field keys from the full document (stable across slices), fence-aware level detection, safe
  fallback to the whole sheet when a worksheet isn't cleanly sectioned. Pupils get **no
  `/resources/*` access**; answer writes are checked against enrolment.
- **8.5 Feedback widget** — emoji rating + tap-the-chips (enjoyed/disliked) + optional comment,
  one editable row per lesson.
- **8.6 Teacher review** — the lesson page gains a lazy **Pupil work** panel: completion grid
  (level chip 🟢🟡🔴 click-to-change, fields done, Done ✓, rating, last-saved), read-back of any
  pupil's sheet (marks their answers seen), "mark all seen".
- **8.7 The loop** — "✨ Summarise the class's work" aggregates answers **per question,
  anonymised** + the feedback, through the standard wrapper (`class_work@1`), writes the summary
  to the lesson's notes (so "adapt from recent lessons" reads it), and offers a one-click
  feedback digest into the class teaching-context.
- **The DPIA gate is enforced in code**: pupil access is a **Settings master switch, off by
  default**, and turning it on **requires confirming DPO/SLT sign-off**; with it off, `/pupil`
  refuses and the logins admin is hidden. Generation prompt bumped to `lesson_resources@5`
  (levels as strict `## 🟢/🟡/🔴` sections so slicing is reliable).
- **Tests**: +5 unit files / cases (worksheet renderer incl. real-worksheet regression, rate
  limiter, class-work egress) and a pupil integration suite (login, lockdown, autosave +
  ownership 403, lockout, levels). **198 unit / 113 integration green; typecheck clean.**
  Verified the renderer against real generated worksheets in the dev DB (level partitioning
  6/11/15-style) and booted the app live.

### 2026-06-12 — Q29–Q37 answered: all Phase 8/9 plan decisions made

- All nine open questions decided by the teacher (canonical record:
  [docs/OPEN_QUESTIONS_ANSWERS.md](docs/OPEN_QUESTIONS_ANSWERS.md) batch 3): login =
  **class-code → pick-your-name → PIN**; level slices **unlabelled** (teacher toggle);
  **classroom-only** use (idle-logout ~20 min); **Done ✓ self-declared** (+ field count on the
  grid); released results **ticks-only by default** (per-class score toggle); **remembered
  devices per-class, off by default**; numeric marking **strict after parsing**; misconception
  notes **free prose** until 9.9 needs a table.
- **One divergence from the recommendations — Q34, refined the same day into a per-class
  choice: mark "as pupils finish" (default) or in one batch on the button** (the button stays
  as the sweep in both modes; Done ✓ enqueues and a ~2-minute debounce keeps the per-question
  anonymous batches). **Paired with per-class results visibility: instant-on-confirm
  (default) — objective ✓/✗ seconds after Done ✓ so feedback lands *inside* the lesson,
  AI-marked answers appearing as the teacher confirms them from the live grid — or
  hold-until-Release.** Invariant either way: pupils only ever see *confirmed* marks; AI
  feedback never reaches a pupil unconfirmed; spend cap + kill-switch apply (AI off ⇒ answers
  wait, everything else works). PHASE_9_PLAN updated (9.3–9.5 slices, §0, §2 settings columns,
  §3 trigger, §5 visibility, §8, §9, §10); SPECIFICATION §5.30 aligned; PHASE_8_PLAN §8
  decision list updated; OPEN_QUESTIONS now shows only the DPIA [CONFIRM]/sign-off items as
  open (DPO/SLT — gates 8.0 and the 9.0 addendum).

### 2026-06-12 — Phase 9 planned: auto-marking & the results loop

- **[docs/PHASE_9_PLAN.md](docs/PHASE_9_PLAN.md)** (plan-first, for review): the answers Phase 8
  collects get marked — **mark schemes as data** emitted beside every generated answers doc
  (9.1, can land before pupils even log in); **deterministic marking** of tick/choice/exact/
  numeric/keyword fields, instant and AI-free (9.2); **AI-suggested marks for open answers**,
  batched per question with **no pupil identity attached** (anonymous slots — the
  least-identified AI traffic in the app), evidence-quoted, confidence-scored, safety-gated,
  with guard-patterned answers **withheld from AI and routed to a "needs your eyes" strip**
  (9.3); teacher **confirm/override → comment back → release** before pupils see friendly
  ✓/✗ + a "try this" line on `/me` (9.4/9.5); **stay signed in on this computer** — a
  revocable, hashed, term-bounded device cookie so Windows login becomes app login, replacing
  the kiosk-per-room idea (9.6); marks make the adapt loop **question-precise** + printable
  class answer pack + CSV export (9.7); per-pupil **"what works for me" profiles** (9.8);
  stretch: retrieval-practice starters from real misses (9.9). Absorbs the 8.8 stretch list.
- **Design mined from the sibling `exam_questions` project** (its Phase-3 marking architecture):
  reused mark-points-with-alternatives, deterministic-first dispatch, evidence-substring
  verification, confidence-thresholded moderation and guard patterns; adapted per-attempt
  marking into anonymous per-question batching; skipped its prompt-version table, pgvector
  bank and authoring wizard as unneeded here.
- **Gate added to [docs/DPIA.md](docs/DPIA.md):** Phase 9 needs an addendum before build —
  per-pupil attainment stored, identity-free answer text to the AI sub-processor, the
  remembered-device credential. README (status + docs table), ROADMAP (Phase 9 section + size
  row), SPECIFICATION (§5.30 auto-marking, §5.31 stay-signed-in) and PHASE_8_PLAN (8.8 →
  promoted) all reconciled.

### 2026-06-12 — Phase 8 plan: per-pupil levels + pupil lesson feedback (teacher additions)

- The plan now specifies (teacher, 2026-06-12): **each pupil is assigned a differentiation level
  per course** (🟢🟡🔴, default core, changed live from the review grid) and **receives only that
  slice of the worksheet** — shared parts plus their level's section; field keys derive from the
  full document so review aligns and level changes never lose answers. New **8.5: pupil lesson
  feedback** — an emoji rating + tap-chips for activities enjoyed/disliked + optional comment,
  one per lesson. Both the answers *and* the feedback feed the adapt-next-lesson loop (8.7), and
  over time the feedback offers a one-click digest into the class teaching-context ("loves
  practical + cards, rates long typing lowest"). New tables sketched: `pupil_levels`,
  `pupil_lesson_feedback`. Open question flagged: whether pupils see their level label at all
  (recommend unlabelled, teacher toggle). ROADMAP blurb updated to match.

### 2026-06-12 — Docs reconciled with reality + Phase 8 (pupils) planned

- **Documentation catch-up** for everything since the last pass: README status rewritten
  (Phases 0–6 + the polish items now live); DATA_MODEL gains §J (migrations 0013–0017 as built);
  UX_FLOWS gains the TA view, Settings, and email-intake/triage flows (+ tracker/ability notes on
  the lesson flow); SPECIFICATION gains §5.25–§5.29 (setup & September, exceptions, email triage,
  tracker + differentiation, TA access); SECURITY adds the TA-feedback data row; DPIA gains the
  2026-06-12 review entry and an explicit **Phase-8 precondition** (sign-off before any pupil
  credential); ROADMAP gains Phase 7 status + the Phase 8 section.
- **[docs/PHASE_8_PLAN.md](docs/PHASE_8_PLAN.md) — Pupils: logins & in-app work** (plan-first,
  for review): DPIA sign-off as a hard gate (8.0); roles hardened + **per-TA named accounts**
  (8.1); SEND-friendly pupil login — class code → pick your name → PIN, with lockout and
  printable cards (8.2); a zero-navigation pupil surface showing *their* class's live worksheet
  (8.3); **interactive worksheets** — answer cells become inputs, autosaved per pupil per lesson
  occurrence, version-pinned (8.4); a live **completion grid + read-back** on the teacher's
  lesson page (8.5); and an aggregated, redacted **class-answers summary feeding the
  adapt-next-lesson loop** (8.6). Decisions flagged for the DPO/teacher: login style, retention,
  level assignment. Recommended start: 8.1 immediately, DPIA in parallel.

### 2026-06-12 — TA read/feedback login

- **TAs can now log in** with a separate password (Settings → **TA access**; same login page —
  the password decides the role). A TA session is **deny-by-default**: it lands straight on
  `/ta`, a read-only view of the **current lesson** — the class's effective plan (adapted where
  one exists, formatted with the step cards), its linked + class-copy resources — with a
  **"Next lesson (if you're early)"** tab for the rest of today. Everything else (notes, pupils,
  schemes, settings…) bounces back to `/ta`; only resource viewing/downloading is allowed
  through.
- **Structured feedback** per class: *How were the pupils?* and *Thoughts on the lesson*, plus a
  **safeguarding-concern flag** ("also tell the teacher in person") — flagged feedback is
  **withheld from every AI call**, like all safeguarding content. Feedback appears on the
  teacher's lesson page as a purple-edged "TA feedback" block (🛡 highlighted when flagged) and
  **joins the per-class history the AI uses to adapt the next lesson** (migration `0017`,
  `ta_feedback`).
- Looking ahead (noted in ROADMAP): per-TA logins + "all my upcoming prepared lessons" arrive
  with the pupil-login project — this shared-password version is deliberately the simple bridge.
- Tested end-to-end: TA password routes to `/ta`; six teacher pages all bounce; feedback lands,
  reaches the teacher view, appears in `recentGroupHistory` and the adapt-lesson prompt items;
  flagged feedback is provably withheld. **179 unit / 104 integration tests green.**

### 2026-06-12 — Email settings: the "not persistent" mystery, fixed properly

- **The settings were saving all along** — the database showed every field stored and a
  successful poll ("0 unseen") minutes later. What *looked* like non-persistence was a **race**:
  typing a value and clicking "Poll now / test" immediately fired the test before the field's
  autosave landed → "not configured" → re-enter everything. Three fixes: every email field now
  flashes **saved ✓**; fields **save while typing** (700ms debounce), not only on leaving the
  field; and the test button **submits the current field values with it** — the test route saves
  them first, then polls, so type-and-test can never race again. Browser-verified: fill + instant
  click now reports an honest connection result and the values survive reload.
- Dropped the `hx-vals='js:…'` pattern on this section for plain named fields (checkbox-absent =
  off handled server-side) — fewer moving parts.
- **Fixed a destructive test**: the email-intake suite's cleanup blanket-deleted `email_%`
  settings from the shared dev database (it wiped the real config once — restored, bar the app
  password). It now snapshots and restores instead; the full suite run leaves real settings
  untouched, verified. **179 unit / 100 integration tests green.**

### 2026-06-12 — Email summaries built for scanning: fact chips, highlights, whitespace

- The triage classifier (`email_triage@2`) now also returns the **key facts as structure** —
  when / deadline / where / who / money / bring / contact — and the task's "✉ what it says" box
  renders them as **colour-coded chips** (deadlines amber, money green, people purple), above a
  short prose summary in which **dates, times and amounts are highlighted**, with the routing
  reason + sender tucked into a muted footer line. Whitespace and boxes throughout.
- The same fact lines are written into events/captured/notes details as plain "• label: value"
  text, so they read fine everywhere else too; plain manual tasks render exactly as before.
  Verified live — a trip email came back with when/deadline/where/money/who facts populated.
  4 renderer unit tests. **179 unit / 100 integration tests green.**

### 2026-06-12 — Email triage: every forwarded email is read, classified and filed by AI

- **Incoming emails are now triaged, not just dumped as tasks.** Each polled email goes through a
  fast, cheap classifier (`email_triage@1`, Haiku) that assumes the forward was deliberate — it
  never ignores, it picks the best home: **task** (something to do — with an urgency guess and
  the class matched from your real group names), **event** (a dated thing — filed into Events
  with kind + date), **awareness** (need-to-know, undated — filed into Captured with a category
  and, when content touches welfare, the **safeguarding flag set**, which withholds it from all
  future AI calls), or **note** (pure reference → general notes). The substance is **extracted
  and rewritten** — greetings, signatures and legal footers stripped; the poll status line now
  reports the breakdown ("3 imported (2 tasks, 1 event)").
- **Frictionless by design:** if AI is unreachable the email still lands as a plain task exactly
  as before — intake never blocks on the classifier. Every email keeps its `email_intake` record
  whichever way it routes.
- **Tasks now show the content, not just the subject**: each email-created task has a "✉ what it
  says" disclosure with the extracted detail (TaskRow finally carries `detail`).
- Verified: four-route integration tests against the database (urgency+group on tasks, dated
  events, flagged captured items, general notes, intake records) and a **live triage** of a
  realistic office email — routed as a by-next-lesson task for 8PFA with dates, £8 and the
  outstanding-forms count extracted, footer dropped. **175 unit / 100 integration tests green.**

### 2026-06-12 — Email intake v2: the mailbox becomes the task inbox (no more copy-paste)

- **Emails now become tasks automatically.** The app polls an IMAP mailbox (Settings → **Email
  intake**: host/port/user/app-password/folder, poll toggle + cadence, **Poll now / test**
  button, last-poll status line). Each unread message becomes a draft **inbox task** through the
  exact same path as the paste box (`email_intake` row + task with `source='email'`), so triage,
  the Now screen and AI task-breakdown all behave identically. Only unread mail is imported;
  imported mail is marked read — that flag *is* the dedup, and failures stay unread for retry.
  The paste box remains as a fallback.
- **Dependency-free by necessity** (npm unreachable on the school line): a minimal IMAP4 client
  ([lib/imapClient.ts](app/src/lib/imapClient.ts) — LOGIN/SELECT/SEARCH UNSEEN/FETCH
  BODY.PEEK/STORE \Seen over TLS, with literal handling) and a tolerant MIME parser
  ([lib/mime.ts](app/src/lib/mime.ts) — RFC2047 subjects, multipart/alternative preferring
  text/plain, quoted-printable + base64, HTML-strip fallback). 7 parser unit tests.
- **Proven end-to-end** against a scripted in-process IMAP server (integration test): one unseen
  multipart email with a base64-encoded subject → poll → task "Trip forms ✅" with the text/plain
  body and sender in its detail → marked seen → a second poll imports nothing → unconfigured
  polls degrade with a clear message.
- **Recommended setup** (documented in Settings + SECURITY): a *dedicated or forwarded* mailbox
  (an Outlook rule forwards the school mail you want as tasks), never the main school account —
  this also sidesteps O365's OAuth-only IMAP. Credentials live in the instance's own database;
  ROADMAP's Phase-7 "Email intake v2" is ticked off. **175 unit / 95 integration tests green.**

### 2026-06-12 — Draft-with-AI flat-text fix, Word layout polish, pupil-format investigation

- **Why "Draft with AI" produced one big chunk:** the draft schema only asked for "a concise
  outline", so the model returned a single flat block ("STARTER (10 min) — … MAIN — …") with no
  line breaks for the formatter to work on. Fixed at both ends: the schema now demands numbered
  steps **one per line** (`draft_lesson@4`), and the formatter gained a **flat-block rescue** —
  inline numbered steps and CAPS section headers are split apart and rendered as proper step
  cards. **Existing drafted lessons display structured immediately** (no regeneration needed),
  and the lesson tracker works on them too. 4 new unit tests incl. a no-mangling guard for prose.
- **Word export layout polish** (the "crowded / misaligned" feedback): table cell margins,
  question/answer columns at 38/62, and **answer rows with a minimum typing height** (~1.1 cm).
  Revalidated via the LibreOffice round-trip.
- **Pupil-fillable formats investigated** and parked deliberately until pupil logins, as agreed:
  [docs/PUPIL_WORKSHEET_FORMATS.md](docs/PUPIL_WORKSHEET_FORMATS.md) compares in-app HTML
  worksheets (recommended — answers become data), fillable PDF, DOCX content controls, and
  Teams/Forms; linked from PHASE_6_PLAN §12. **168 unit / 93 integration tests green.**

### 2026-06-12 — Cumulative-slides fix, lesson tracker, readable plans, 3-level differentiation

- **Fixed the "three slides files, no worksheet" generation** (reported): the model sometimes
  emits *progressive drafts of one document as separate entries* and burns its budget before the
  worksheet. `tidyResourceSet` now keeps only the longest of same-kind entries, detects a missing
  slides/worksheet, **retries once automatically**, and refuses honestly ("incomplete set —
  missing: worksheet") rather than storing a broken set. Schema wording forbids partial entries.
  3 unit tests.
- **Lesson plans are readable everywhere.** The Schemes tree now shows the same **formatted
  read-view** (objective ✓-boxes, step cards) as the lesson screen, with the editor textareas
  behind "✏ edit"; plan content everywhere got boxes, colour tints and whitespace (objectives in
  a green-tinted card, each outline step its own row).
- **The in-lesson tracker** (migration `0016`): every lesson section shows its effective
  outline's steps as a tappable list — tap to mark **▶ we are here** (done steps tick and dim).
  The tap also writes the textual **stopping point**, so "last time → resume", the Now screen and
  the AI feedback loop all keep working off the same record.
- **Three-level differentiation is now the default** across draft-lesson, lesson-resources,
  adapt-lesson and adapt-resources (all prompts bumped): whole-class teaching, then 🟢 Support /
  🟡 Core / 🔴 Challenge tasks that all meet the same objectives. **Core pitches at the class's
  recorded ability midpoint** — a new per-class field (migration `0016`,
  `group_courses.ability_midpoint`) edited in the lesson screen's class panel and injected into
  the per-class AI calls. Worksheets carry the three labelled sections.
- **Network resilience for the school line**: the Anthropic client now retries 4× with a 180s
  budget, and node prefers IPv4 (the school's IPv6 route intermittently blackholes). The final
  live check of the differentiated output is pending a stable line — the button now either
  delivers or explains itself. **164 unit / 93 integration tests green.**

### 2026-06-12 — Resource generation hardened by live verification (post-outage)

- The deferred live check ran once the connection returned, and shook out three robustness fixes:
  **(1)** the model sometimes labels a document outside the four kinds ("support worksheet",
  "answer key") — a strict enum failed the whole response, so `kind` is now a guided string with
  a **normaliser** (`normaliseResourceKind`, unit-tested) and the storage maps' fallbacks;
  **(2)** four full documents didn't fit an 8k output budget, making the model drop one —
  **raised to 16k** and the instruction now demands *exactly four documents*; **(3)** prompts →
  **@3**: no underscore runs anywhere — the name/date header must itself be a typed table.
- Final live run **PASS**: worksheet opens with `| Name | Type your name here |`, every task is a
  question + "Type your answer here" cell, zero underscores; slides arrive numbered with an emoji
  visual per slide and ≤4 big-print bullets. **161 unit / 92 integration tests green.**

### 2026-06-12 — Worksheets pupils can type into; slides that actually present

- **Worksheets are now designed for the computer, not paper** (prompts → `lesson_resources@2`,
  `adapt_resources@2`): pupils type answers into two-column tables ("Type your answer here"
  cells); blank lines, dotted lines and underscores are banned; "type" not "write". Support
  versions keep sentence starters in the answer cells.
- **⬇ Word (.docx) export** on every generated document: a dependency-free Markdown→DOCX
  converter ([lib/docx.ts](app/src/lib/docx.ts) — hand-rolled ZIP + WordprocessingML, since npm
  is proxy-blocked) with headings, bold/italic, lists, task boxes and **bordered tables pupils
  type into**. Validated by a LibreOffice round-trip (opens + converts cleanly) and python's
  strict zip reader; 3 unit tests.
- **▶ Present mode** for slides documents (`/resources/:id/present`): one slide at a time,
  full screen — ←/→/space/click to move, **F** fullscreen, **N** toggles the teacher *Say:*
  notes (hidden from the class by default), Esc/✕ back to the document. Slides prompts now put
  a **large supporting emoji visual** on every slide (rendered huge), at most 4 big-print
  bullets, and a highlighted `> key idea` callout; `![images](…)` render too if a document
  includes them.
- Fixed en route: the resource-set schema's hard `.max(4)` failed the **whole** response when
  the model offered extra documents — now soft-capped in code; format/parse failures get an
  honest message ("the AI returned an unexpected format — retry") instead of "unavailable".
- **160 unit / 92 integration tests green.** (The final live-output spot-check hit a school
  internet outage — the pipeline was proven live earlier today; press 📄 once the line is back.)

### 2026-06-12 — Generated resources preview in the browser, formatted

- Generated documents are Markdown, but the viewer only knew PDF/image/Office — so "view" fell
  through to a download. Now **`/resources/:id/view` renders Markdown as a formatted, printable
  page**: headings, bold/italic/code, bullet + numbered lists, **tables** (worksheets lean on
  them), task checkboxes, blockquotes, fenced code and rules — with the title/version, a **🖨
  print** button and a download link in the header. **Slides outlines get one card per `##`
  slide, and print one slide per page.** Plain-text files preview too.
- Rendering is a small dependency-free renderer ([lib/markdown.ts](app/src/lib/markdown.ts), 5
  unit tests): text is escaped before any tags are added, so raw HTML/script in a document can
  never reach the page. Integration test renders a stored worksheet end-to-end; verified in a
  real browser against today's actual generated set ("What Makes a Good Digital Message?") —
  worksheet tables and the slide cards render exactly as intended.
  **156 unit / 91 integration tests green.**

### 2026-06-12 — Immediate feedback on every AI (and other) button

- AI calls can take 20–60s and the only signal was a quietly-disabled button — inviting repeat
  clicks. Now **every htmx-driven button shows itself working, globally** (no per-button markup,
  so future buttons inherit it): the in-flight button dims, gets a **spinner**, and ignores
  further clicks; submit buttons inside posting forms do the same; and a thin **animated activity
  bar** appears across the top of the page for anything in flight longer than 400ms (so instant
  autosaves never flash it), clearing when the work lands.
- Verified with a headless browser holding a real AI endpoint open: spinner + bar visible
  mid-flight, a second click fires **zero** extra requests, everything clears on completion.
  The lay-down form also gained the disable-while-busy guard its siblings already had.

### 2026-06-12 — Scheme authoring now knows the curriculum history + bug-class sweep

- **Creating/updating schemes now accounts for what came before.** New
  [repos/curriculumHistory.ts](app/src/repos/curriculumHistory.ts): the course's existing schemes
  (all versions — they persist across years) and, for every class currently taking the course,
  **what it has already covered walked back through its predecessor chain** (taught lesson titles
  and counts across years, token-capped). Injected as two labelled context items into **author a
  scheme** (4.4, prompt → `author_scheme@3`) and **convert a downloaded unit** (5.3 →
  `convert_unit@2`), whose system prompts now instruct: *design the next step — continue from
  what was covered, recap rather than reteach, don't repeat whole units.* Empty history injects
  nothing, so new courses behave exactly as before. Tests: items builder (2 unit), recursive
  chain coverage across a two-year fixture (integration), and a live check — the model correctly
  named the real Computing Curriculum unit from the history item, and the audited request carries
  it.
- **Bug sweep for the two recent bug classes:**
  - *CHECK-constraint mismatches* (the `source='ai'` class): full cross-reference of every CHECK
    in migrations 0001–0015 against every write site — **no further instances**.
  - *Error-hiding catches* (the "unavailable" class): **21 page-render catches across 20 route
    files logged nothing** and blamed the database for any failure whatsoever. All now log the
    real error (`app.log.error`) before showing the friendly page — `docker compose logs app`
    finally tells the truth. Resource **download/view** also no longer 500 on a missing store
    file: they log the path and return a clear 404 ("restore from backup or re-upload").
- **151 unit / 90 integration tests green.**

### 2026-06-12 — Fixed: "AI service unavailable" was the container losing its internet

- Every AI call failed with the generic message; the audit log showed the real cause:
  **"Connection error."** — the app container had lost all outbound network (DNS *and* raw TCP)
  while the host was fine, the classic Docker symptom after a host network/firewall change
  (likely overnight, post-power-cut). `./start.sh` recreates the compose network and its NAT
  rules; verified from inside the container afterwards (DNS ✓, egress ✓, the Anthropic models
  endpoint answering **200** with the real key, no tokens spent).
- **The wrapper now says what's actually wrong** instead of one generic line: connection failures
  → "the server has lost internet access… restart the stack"; rate-limit → "wait a minute";
  overloaded → "try again shortly"; rejected key → "check ANTHROPIC_API_KEY". The audit row
  always kept the raw error; now the on-screen message is actionable too.

### 2026-06-12 — Per-class adapted resources

- A class's adapted lesson can now get **its own versions of the documents**: the new
  **📄 Adapt resources for this class (AI)** button on the adaptation block feeds the AI the
  lesson's **master documents** (read from the store, so it adapts the real sheets rather than
  regenerating blind), the class's adapted objectives/outline + adaptation note, both teaching
  contexts and the kit list — and produces the class's slides/worksheet/support/answers, named
  with the class ("… — worksheet (8PFA).md").
- **Filed in the right place:** migration `0015` adds `resource_links.adaptation_id` (the
  exactly-one-target rule now spans six targets), so class copies are linked to the *adaptation* —
  they appear on the lesson screen under "✏ this class" next to the master resources, count in the
  where-used badge, and show as "✏ class copy" in a resource's usage list. **Reset to master
  cascades the links away** (the documents stay in the store). Re-running **version-bumps, never
  duplicates**; without an adaptation the button nudges you to adapt the lesson first.
- Live-verified end-to-end (4 class copies named for 8PFA → regenerate → v2, no duplicates →
  reset cascade confirmed). One flake found en route: two 8k-token AI calls back-to-back can trip
  the API rate limit — harmless in real use (calls are one-at-a-time button presses).
  **149 unit / 89 integration tests green.**

### 2026-06-12 — Readable lesson outlines + per-lesson resource generation

- **Outlines are structure, not a text block.** New formatter ([lib/formatLesson.ts](app/src/lib/formatLesson.ts),
  6 unit tests): numbered lines become a step list with the **timing pulled out as a badge**
  ("(5 min)" → a pill on the right), bullet lines a list, prose stays short paragraphs;
  objectives render as a ✓-list. Applied to the lesson screen's master-plan block and to the
  per-group adaptation, which now shows a **formatted read view** (kept fresh by an out-of-band
  swap on every autosave) with the edit textareas tucked behind "✏ edit this group's version".
- **Every lesson can generate/update its full resource set and file it in the right place.**
  New `lesson_resources` AI feature: one call per lesson produces **slides outline + pupil
  worksheet + scaffolded support version + teacher answers** as Markdown, each stored in the
  resource store, **linked to the lesson plan** (so they surface on the lesson screen, the plan
  editor and resource where-used), pitched by the course teaching-context and the kit list.
  **Re-running updates the same documents as new versions — never duplicates.** Buttons:
  **📄 Generate resources** on each plan (Schemes), **📄 resources for all lessons** per unit
  (one call per lesson, stops early if AI is unavailable), and **📄 generate/update (AI)** right
  on the lesson screen. Guard: a plan with no objectives/outline is refused before any spend.
- **Fixed (pre-existing):** both AI resource creators passed `source='ai'`, violating the
  `resources_source_check` constraint (allowed: `ai_generated`) — 4.7's generate button would
  have failed at runtime; both now write `ai_generated`.
- Live-verified end-to-end (4 documents generated → linked; regenerate → v2, no duplicates;
  all cleaned up). **149 unit / 89 integration tests green.**

### 2026-06-12 — Phase 6 built: setup in-app, September solved, onboarding, instances

The whole phase (6.1–6.9) landed in one pass. **Next September can now be built months in
advance as a draft, without touching the live year** — the explicit "go live" flips the app over.

- **6.1 Year-scoping** (migration `0013`): day shapes (`period_definitions`) are now per-year;
  groups gain a `predecessor_group_id` chain; the clock/timetable/map/slots queries all filter to
  the **current** year (regression test: a draft year never bleeds into live views); lay-down,
  map and carry-over **clamp to the current year's end**. The pool-level BIGINT parser meant zero
  comparison bugs.
- **6.2 Setup area** (`/setup`, in the nav): year-aware tabs — *Year & terms* (create years —
  the first ever becomes current automatically; "make current" = go-live with confirm), *Day
  shape* (per-weekday period editor + **copy from another year**), *Rooms & staff*, *Courses*
  (name/colour/archive), *Groups & pupils* (groups with predecessor info, course ticks, pupil
  enrolment chips — enrolments are now live data).
- **6.3 Timetable editor** (Setup → Timetable): the week grid per year; each slot holds multiple
  entries (splits, TA lessons); per-entry purpose/group/room/staff selects + course ticks;
  entries with taught history are locked 🔒 (the past is never rewritten).
- **6.4 September rollover wizard** (`/setup/rollover`): pick from-year → to-year; checklist of
  the new year's bones; **classes move up** with suggested names (7ARO→8ARO, editable), leaver
  unticks, and each successor keeping its **pupils, courses and per-class teaching context**,
  chained to its old self. Adaptations stay with their year (the masters already absorbed them).
  Idempotent — moved classes show as done. Integration test asserts the §3 carries table.
- **6.5 Onboarding** (`/welcome`): a brand-new instance (no password anywhere) opens a one-time
  identity form (name/school/password → settings; **env var still wins** on existing instances),
  then a 10-step checklist over the real Setup editors with live counts and a finish gate.
- **6.6 Settings** (`/settings`): school name, password change (when DB-managed), AI kill-switch +
  monthly cap + per-role models (was SQL-only), data-health panel (current year, DB size, AI
  calls this month).
- **6.7 Exceptions** (migration `0014`): cancelled / room change / cover / off-timetable day per
  date — reported from the lesson page, shown as banners there, ⚠ badges on the timetable and a
  note on Now. (Clock/availability integration deliberately deferred — see plan §12.)
- **6.8 Instances**: `scripts/new-instance.sh <name> <port>` creates an isolated compose project
  (own DB volume, port, secrets, backup script, 14-deep rotation) whose first boot lands on the
  onboarding wizard; RUNBOOK gains the instances section; `instances/` git-ignored.
- **6.9 History & archive**: `/group/:id/history` walks the predecessor chain both ways (contexts,
  coverage, notes per year — safeguarding withheld); `/timetable?year=` browses a draft/archive
  year's structure; `npm run export-year "2025/26"` dumps a year's full record as JSON.
- **Plan §12** records the post-phase improvement list (exceptions→clock, onboarding templates +
  MIS CSV import, rollover adaptation-carry option, instance update script, retention mechanism…)
  and §13 the build-vs-plan deviations. **143 unit / 88 integration tests green** (5 new).

### 2026-06-11 — Phase 6 planned: setup editors, the September problem, onboarding, instances

- New [docs/PHASE_6_PLAN.md](docs/PHASE_6_PLAN.md) (plan-first, for review): **in-app setup
  editors** (terms, day shape, rooms/staff, courses, groups & pupils, timetable grid — lesson
  times/details finally editable without SQL); the **September rollover wizard** — a completely
  new timetable each year with **class-group knowledge following the group** across its rename
  via a `predecessor_group_id` chain (teaching contexts copied forward, history browsable,
  adaptations deliberately staying with their year since masters already absorbed them); an
  **onboarding wizard** for first boot of an empty instance (password moves to `settings` with
  env override); **one instance per teacher** (`new-instance.sh`, no cross-instance traffic);
  plus settings page, calendar exceptions, group-history/year-archive views, year export, MIS
  CSV import (stretch). ROADMAP updated (old polish phase → Phase 7); README indexes the plan.
  Docs only — no code in this change.

### 2026-06-11 — Fitted to the classroom monitor (portrait 1080×1920 + landscape 1920×1080)

The app's real home is a 1920×1080 monitor **on its side** in Edge on a school Windows PC, with
landscape as the secondary case. Verified with headless-Chromium screenshots of 8 key pages at
**both orientations**: zero horizontal overflow anywhere (including the kit table seeded with
worst-case-length content), nav fits one row in landscape and wraps cleanly in portrait.

- **Page-width strategy:** work surfaces (Now, lesson, Schemes, Map, Kit, Resources) widen to
  73rem — filling a portrait screen edge-to-edge and sitting at a comfortable centred ~1170px in
  landscape; reading pages keep the narrower 60rem measure; the timetable keeps 76rem.
- **The Now screen now earns the tall screen:** outside a lesson, the main column shows the
  **rest of today's lessons** (or, evenings/weekends, the **next teaching day's full list** —
  "Next teaching day — Friday 12 Jun"), each row time · class · course linking straight to the
  dated lesson. During a lesson the current-lesson card keeps the space as before.
- All 143 unit / 84 integration tests green; screenshot kit, test instance and seeded rows all
  cleaned up.

### 2026-06-11 — Review pass: fixes, doc catch-up, and usability batch

A full docs-vs-code-vs-UX review (three parallel audits), then everything actionable applied.

- **Fixed: the pg BIGINT bug class, at the root.** node-postgres returns BIGINT as a string; this
  had silently broken four comparisons over time. A pool-level type parser
  ([db/pool.ts](app/src/db/pool.ts)) now parses int8 → `Number` everywhere. This also fixes a real
  bug: **archiving/restoring a pupil made the row vanish** until reload (regression test added).
- **Quick wins:** *Recurring* added to the nav; stale "Phase 2+" copy on Notes replaced; the Now
  strip shows a **week-of-term badge** ("wk 3/12", from term dates; `termProgress` + 4 unit tests);
  each lesson section links to **📅 the term map for that class** and offers **↻ continue next
  week** right where the stopping point is typed; map rows link back to the master on Schemes.
- **Docs caught up with reality:** ROADMAP gains a status banner, the real **Phase 5 (curriculum
  delivery)** section, and the old polish phase renumbered to **Phase 6**; SECURITY_AND_PRIVACY's
  data table now names the Phase 5 AI flows (per-class notes/stopping points, teaching contexts,
  kit list); DPIA gains a 2026-06-11 review note (no new category of personal data); a repo-root
  **CLAUDE.md** now exists (two docs referenced it); DATA_MODEL gains §I (migrations 0007–0012 as
  built); UX_FLOWS updated for the two-column Now and the adaptation block, and gains §12
  (Curriculum map) and §13 (Kit); SPECIFICATION gains §5.19–§5.24 (Phase 5 stories, marked built).
- **Usability batch:** **responsive pass** (nav wraps; timetable/map/kit tables scroll sideways in
  a `.table-scroll` wrapper; narrow-screen rules at 900/600px) and a **print stylesheet** (chrome,
  buttons and forms hidden; collapsed sections print expanded — a lesson page, the map or the week
  grid now prints as a usable cover/medium-term-plan sheet). **Schemes page readability**: expand
  all / collapse all on the tree, titled ▲▼✕ buttons, and "Add or import content" / "Reference &
  admin" dividers. **Resources where-used**: a 📋 *n* badge per resource expands to the lesson
  plans it's attached to and the units it's a source for, each linking to the course's Schemes
  page (`/resources/:id/usage`; +1 integration test).
- **Totals: 143 unit / 84 integration tests, all green.**

### 2026-06-11 — Phase 5.7 + 5.8 built, and 5.9's first two stretches

- **5.8 — Kit inventory** (`/kit`, "Kit" in the nav; migration `0011_equipment`): the classroom
  hardware list — name, category, **own vs working counts** (the gap = out for repair, shown red),
  location, notes, tags, archive-not-delete, and a one-click **"✓ today"** stock-take stamp (stale >
  a term shows red). A collapsed **"🔧 Kit available"** panel sits on the Schemes page, and
  `equipmentItem()` injects the active list into **all six AI planning features** (author scheme,
  draft lesson, generate resource, convert unit, adapt lesson, improve master) with the instruction
  to *plan within this list and say so if something needed isn't on it*. Empty inventory injects
  nothing. Live-verified: the audited request for a real conversion contained the kit list.
- **5.7 — Bulk: fill a whole unit + assign, in one action.** The convert panel gains *"…and lay
  into [slot] starting from [date]"*: convert → materialise → source-link → lay into the slot's
  upcoming weeks → land on **`/map`** showing the filled weeks. The assign target is validated
  **before** the AI call (no spend on a doomed request); a short or skipped lay-down never rolls
  back the converted unit. The Map page links back ("fill this slot from a downloaded unit →").
  Live-verified end-to-end (real AI convert → 3 lessons laid in order onto far-future dates).
- **5.9 (first two stretches):**
  - **"↻ continue next week"** on the map (recent/today rows): the unfinished lesson repeats at the
    slot's next occurrence and everything after shifts back one school week, holiday-aware; new
    bindings never start before today, so history is never rewritten.
  - **Per-class teaching-context** (migration `0012_group_context`): a per-`group_courses` text on
    the lesson screen ("this class's teaching context"), **adding to** the course context (labelled
    *FOR THIS CLASS SPECIFICALLY*) when the AI adapts for that class. Improve-master deliberately
    still gets only the course context, so the canonical lesson never drifts towards one group.
- **Totals: 139 unit / 82 integration tests, all green.** Two live AI verifications, cleaned up;
  zero test/audit debris. Remaining 5.9: content-based conversion, cross-group compare,
  kit-per-lesson, CSV import / convert de-dup.

### 2026-06-11 — Plan: equipment inventory joins Phase 5 (5.8); detailed 5.7/5.8 plans written

- **New requirement (teacher):** keep an **inventory of classroom hardware/equipment** that can be
  referred to during planning at any stage. Added to [docs/PHASE_5_PLAN.md](docs/PHASE_5_PLAN.md) as
  **slice 5.8** (`/kit`): migration `0011_equipment` (name, category, qty total/working, location,
  notes, tags, archive, last-checked), a grouped autosaving page, a read-only "🔧 Kit available"
  panel on Schemes, and an `equipmentItems()` prompt item injected into **all six AI planning
  features** (author/draft/generate/convert/adapt/improve) — empty inventory injects nothing.
- **Detailed plans written** for **5.7** (bulk *fill a whole unit + assign* in one action: optional
  assign block on the convert panel → lay into the slot's weeks → land on `/map` to review; decided
  semantics: degrade writes nothing, short lay-downs never roll back the conversion) and **5.8**
  (above), plus an itemised **5.9** stretch list (pacing/carry-over, per-group teaching-context,
  content-based conversion, kit-per-lesson, cross-group compare). Former stretch bundle renumbered
  **5.8 → 5.9**; §8 marked promote-to-master and source-provenance as already landed (5.5b / 5.3).
  Docs only — no code in this change.

### 2026-06-11 — Phase 5.3–5.6: convert a downloaded unit, lay it into the calendar, the feedback loop, and the curriculum map

Phase 5's headline workflow is now end-to-end: **download → convert → lay into the weeks → teach →
adapt per group → fold improvements back into the master.**

- **5.4 — Lay a unit into a group's calendar.** Each unit on the Schemes page gains **📅 Lay into a
  group's calendar**: pick the group's weekly slot (every slot that teaches the course is listed) and
  a start date → each unit lesson is bound, in order, to that slot's upcoming weeks via
  `occurrence_courses.lesson_plan_id`. Dates come from the pure `upcomingSlotDates` walk —
  **skipping weekends, holidays, half-term, INSET and out-of-term weeks** (the unit slides past
  them). Re-laying overwrites those weeks; short windows lay down only what fits (and say so).
  New `services/delivery.ts` + `repos/delivery.ts`. 8 unit tests (the holiday logic) + 5 integration
  (binding order, re-lay overwrite, route validation — tests bind only far-future 2099 dates).
- **5.3 — Convert a downloaded unit → adapted master lessons (AI).** The Schemes page gains
  **📥 Convert a downloaded unit**: search the 2,433 imported files' original folders (provenance
  recorded at import), pick a unit (folders with ≥2 `Lesson n…`/`L9 - …` subfolders — KS3 and GCSE
  trees both work), and the AI converts its lesson structure into **full SEND-pitched master
  lessons** (objectives + outline, one per source lesson, course teaching-context applied) appended
  as a new unit on the course's scheme (created if missing). The source files are **linked to the new
  unit** (`resource_links.unit_id`) for provenance. Live-verified: a real 3-lesson Year-8 web unit
  converted with arrival routines, card sorts and TA deployment baked in. 6 unit + 1 integration test
  (degrade path writes nothing).
- **5.5 — The feedback loop (both directions).**
  - **✨ Adapt from recent lessons (AI)** on each lesson's per-group block: feeds the group's last
    few taught lessons (stopping points + lesson notes) + the current version into the wrapper and
    **writes the group's adaptation** (logged as `ai` in the change log, master untouched).
    Safeguarding-flagged notes are **withheld entirely** (each note travels as its own item with its
    flag); names are redacted as always. Live-verified — it spotted a Y11 class's real "course
    finished, in revision mode" note and reframed the lesson as revision.
  - **⬆ Suggest master improvement (AI)** (shown once a group has an adaptation): proposes folding
    what worked back into the **canonical** lesson — shown as a reviewable proposal; **nothing
    changes until "Apply to master"** is clicked. Live-verified (sound generalisation: kept the
    movement break, generalised the recap, dropped class-specific bits).
  - New `recentGroupHistory` repo (per-group taught record), 4 unit tests on the prompt boundary
    (incl. safeguarding withholding) + integration coverage of the no-history nudge, degrade-writes-
    nothing, and apply-improvement.
- **5.6 — Curriculum map** (`/map`, in the nav): per group-slot, the last 6 taught weeks (with
  stopping points) → **today** → the next 12 school weeks (holiday-aware), each linking to its
  lesson, with **✏ adapted** marked. The medium-term plan at a glance; laying down stays on Schemes.
- **Totals: 130 unit / 79 integration tests, all green.** Three live AI verifications run and
  cleaned up (no audit debris, no test schemes left).

### 2026-06-10 — Now + Focus auto-refresh (no manual reload)

- **Now** — the 30s clock-strip poll now carries a signature of the current day/period/lesson + next
  slot; when that **changes** (the bell rings, a gap starts, the day rolls over) it returns
  `HX-Refresh` so the whole page re-renders. Unchanged ticks still only swap the strip, so a quick
  note (which autosaves) is untouched between lessons.
- **Focus** — the card now **self-polls every 45s** and re-renders only when the picked task or mode
  shifts (`HX-Reswap: none` otherwise, so a half-typed sub-step is never wiped), and the page now
  shows the **running timer banner** like Now does. +2 integration tests. **112 unit / 71 integration.**

### 2026-06-10 — Phase 5.1 + 5.2: per-group lesson adaptation, and the Now screen in two columns

- **5.1 — Adaptation data layer** (migration `0010`): `lesson_adaptations` (a group's override of one
  master lesson, keyed on `group_courses` + `lesson_plans`, `UNIQUE` per pair) and an append-only
  `lesson_adaptation_history`. New repo `repos/adaptations.ts`: `getEffectiveLesson` (the **resolution
  rule** — a group's override where present, else the master, per-field), `upsertAdaptation` (creates/
  updates + logs, in a transaction; **never touches the master**), `listAdaptationHistory`,
  `resetAdaptation` (deletes the override; history cascades).
- **5.2 — Per-group adaptation on the lesson screen** — under each bound master lesson, an editable
  "for this group" block (objectives/outline) that autosaves as the group's adaptation, a badge
  (*following the master* ↔ *✏ adapted for this group*), **↩ reset to master**, and a lazy-loaded
  **change log**. Routes `POST /lesson/adapt/:gc/:lp`, `…/reset`, `GET …/history`. The master scheme
  stays canonical and is still edited in `/schemes`.
- **Now screen → two columns** — **now on the left** (current lesson + quick note), **what's next on
  the right** (a new *next-session* card: time + countdown, room, and per group its bound plan +
  where to *resume*, plus before-the-bell / coming-up / heads-up). Stacks (now above next) below
  760px. Files: `routes/now.ts`, `routes/lesson.ts`, `public/styles.css`.
- Tests: +6 adaptation integration tests (resolution, per-field inherit, history append, master-never-
  mutated, reset-cascades) and +2 screen tests (two-column Now render; lesson adapt round-trip end-to-
  end). **112 unit / 69 integration.**

### 2026-06-10 — Phase 5 plan authored (curriculum delivery)

- **Authored [docs/PHASE_5_PLAN.md](docs/PHASE_5_PLAN.md)** — the curriculum-delivery phase: convert a
  downloaded unit → a SEND **master scheme**; deliver it to each group's weekly slot; **per-group
  adaptations** (overrides + change log, master stays canonical); lay a unit into the **term calendar**
  (holiday-aware); and a **feedback loop** (stopping point + notes → adapt the next lesson / improve the
  master). Decided: master+overrides model, plan-first. Grounded in the existing
  slot→course→scheme + `occurrence_courses` binding. Plan only — no code yet, pending approval.

### 2026-06-10 — Manage schemes: delete, move between courses, and label

- **Delete a scheme** — "🗑 delete scheme" on `/schemes` (with confirm). `deleteScheme` handles the
  awkward FKs in one transaction: nulls `occurrence_courses` bindings, deletes the lesson plans
  explicitly (so the `unit_id` SET-NULL FK can't leave orphans), then the scheme (units cascade).
- **Move a scheme to another course** — a "Move to →" course dropdown; repoints the scheme + all its
  plans' `course_id` and renames the title only if it still used the old default pattern (migration
  schema `0009`-adjacent; no more raw-SQL moves).
- **Label schemes** — free-text labels (e.g. "Year 7", "Computer skills"), shown as chips and edited
  inline; stored in `schemes_of_work.labels` (schema `0009`).
- **"All schemes" overview** — a collapsible list of every scheme across courses (course, labels,
  unit/lesson counts, open link) so they're findable. +1 integration test; **112 unit / 61 integration**.

### 2026-06-10 — Phase 4 batch: DPIA, teaching-context, term-summary, task-breakdown, resource-generation

- **`docs/DPIA.md`** — data-protection impact assessment (real pupil names are now stored for
  redaction). Mirrors the `exam_questions` DPIA; `[CONFIRM]` markers for the school/DPO to complete.
- **Teaching-context auto-inject (4.4.1)** — schema `0008` adds `courses.teaching_context`, seeded
  with a school-wide SEND default (editable per course). `teachingContextItems()` prepends it to
  every draft/scheme request via `context[]` — so it inherits redaction + safeguarding-withholding +
  the audit. Editor on `/schemes`; prompt versions bumped to `@2`. **Live-verified:** a draft came
  back with the predictable SEND routine + visual supports baked in.
- **4.5 term-summary** — "✨ summarise this course's notes" on `/schemes` (text via `callLLM`).
- **4.6 task-breakdown** — "✨ Break down with AI" in Focus → AI sub-steps (Haiku, ~0.1p). Live.
- **4.7 AI resource-generation** — "✨ Generate a resource with AI" on Resources → a Markdown
  resource saved as a versioned `.md` (Sonnet, ~0.8p). **Live-verified** a SEND binary-addition
  worksheet with answer spaces. (DOCX/PPTX rendering remains a later spike.)
- +tests for each (schemas + full-route degrade paths) → **112 unit / 60 integration**. All live
  verification was throwaway (self-cleaned); a few pence total.
- Still open in Phase 4: 4.6 captured-categorise / estimate-calibration / current-interest (need data
  or steering), scheme **redesign**, and optional 4.8 semantic search.

### 2026-06-10 — Schemes: make the selected course unmistakable

- The active **course tab now highlights** on `/schemes` — it never did, because `c.id === courseId`
  compared a `BIGINT` (pg returns a string) to a coerced number. Normalised the comparison.
- Added an explicit **"Course:"** label (showing the selected course's name) under the tabs, and the
  author form now names the course it will create the scheme under — so it's clear where it lands.

### 2026-06-09 — 4.4: author a scheme of work with AI (verified live)

- **"✨ Author scheme with AI"** in the Schemes empty state → a brief becomes a full scheme (units
  + lesson titles), **materialised atomically** as a real, editable scheme you then prune and flesh
  out lesson-by-lesson with the 4.3 drafter. Opus (design model); **nested** structured output.
- **Verified live:** a 4-unit / 23-lesson KS3 scheme authored for **1.06p** and materialised correctly.
- New: `llm/schemas/authorScheme.ts`, `llm/prompts/authorScheme.ts`, `repos/schemes.materialiseScheme`
  (one transaction), `POST /schemes/author`, `renderSchemeEmpty`. Fixed a latent `pg`
  bigint-as-string comparison bug on course ids. +3 unit, +2 integration → **108 unit / 56 integration**.

### 2026-06-09 — 4.3: draft-next-lesson (first AI feature, verified live)

- **"✨ Draft with AI"** on each lesson plan in the schemes editor → drafts objectives, a lesson
  outline and a duration from the plan's place in the scheme (course · unit · sibling lessons) and
  lands them in the plan to edit. Structured output via `messages.parse` + `zodOutputFormat`
  (zod/v4); `callLLMStructured` reuses the entire 4.1 boundary (withhold → redact → audit → expand).
- **Verified live end-to-end:** a real draft cost **0.7p** (Sonnet) and the audit row stored only
  the redacted request. Degrades cleanly with no key (full-route integration test).
- New: `llm/schemas/draftLesson.ts`, `llm/prompts/draftLesson.ts`, `repos/schemes.getPlanContext`/
  `getPlanRow`, `POST /schemes/plan/:id/draft`. +3 unit, +1 integration → **105 unit / 54 integration**.

### 2026-06-09 — Phase 4 boundary (4.1 + 4.2): the one LLM wrapper + redaction + roster

- **`src/llm/client.ts`** — the single wrapper every AI call goes through: withhold safeguarding
  content → redact pupil names to tokens → **egress-assert** → call Anthropic → audit the
  **redacted** request → re-expand tokens for display. Degrades cleanly (no key / `ai_enabled=false`
  / over the monthly cap → "unavailable"/"blocked", never throws).
- **`services/redact.ts`** — the pure boundary (withhold / `redactNames` / `containsRosterName` /
  `expandTokens`), word-bounded + longest-name-first. **8 egress unit tests** prove no roster name
  or flagged item can leave.
- **Schema `0007`** — `ai_calls` audit (redacted-only by construction) + default AI settings
  (`ai_enabled`, model choices, `ai_month_cap_pence` = £50 ceiling, all runtime-adjustable).
- **Minimal names-only roster** — `/pupils` page + `repos/pupils.ts` (auto `PUPIL_<n>` tokens);
  plus `repos/settings.ts`, `repos/aiCalls.ts`, `config/llm.ts`.
- Dep `@anthropic-ai/sdk`; `ANTHROPIC_API_KEY` documented in `.env.example` (optional — absent ⇒ AI
  off). **Tests force the key empty: no real call, no spend, ever.** +8 unit, +3 integration.
- Next: **4.3 draft-next-lesson** (the first feature) adds structured output on top.

### 2026-06-09 — Phase 4 plan authored

- **Authored [docs/PHASE_4_PLAN.md](docs/PHASE_4_PLAN.md)** — the AI build plan: one `llm/` wrapper
  (the only code that talks to a provider) carrying **pupil-name → token redaction** and
  **safeguarding withholding**, an `ai_calls` audit (redacted-only), then features in order —
  draft-next-lesson, scheme author/redesign, term summary, the "manual now, AI later" hooks
  (task breakdown, estimate calibration, captured categorisation, current-interest), and
  (staged) AI resource editing. Provider **Anthropic Claude**, provider/model in `settings`.
  Flags the **pupil-roster decision** (§10.2) that sets how real redaction is on day one.

### 2026-06-09 — 3.7: "Lessons I oversee" view — Phase 3 complete

- New **`/oversee`** view: the TA-led lessons you supervise (`isSelf = false`), grouped by day
  with time, group, course and TA, each linking to the lesson detail. Week prev/next nav + today
  highlight; new nav entry. Pure `buildOverseenWeek` service (+3 unit tests, +1 integration).
- **Phase 3 is complete** (3.1–3.8): schemes → lesson plans, the hosted **resource store** (2,433
  resources), bulk-import + reconcile tooling, the **search browser**, Office preview (wired,
  sidecar profiled — pull to enable), **lesson-resource wiring**, and this oversee view.

### 2026-06-09 — 3.8: resources on the lesson screen + attach-to-plan UI

- The **lesson screen** now shows a bound plan's linked resources (read-only — view/download),
  replacing the old "Phase 3.4" placeholder.
- The **plan editor** (schemes) gains an **attach/detach** UI per lesson plan: live resource
  search → ＋ to link, ✕ to unlink. Lazy-loaded when a plan is expanded (no upfront cost for big
  schemes). Routes under `/schemes/plan/:id/resources`.
- Repo: `linkResourceToPlan` (idempotent) / `unlinkResourceFromPlan`. +3 integration tests
  (repo idempotency, lesson render, authed HTTP attach/detach with CSRF). Phase 3 now needs only
  3.7 (the "lessons I oversee" view).

### 2026-06-09 — Resource browser: search + filter + pagination

- `/resources` now has a **live search box** (debounced), a **kind filter**, and **pagination**
  (50/page) with a running result count — previously it showed only the 200 most-recent of 2,433,
  leaving most of the store unreachable. New repo helpers `searchResources` / `countResources` /
  `listKinds`; HTMX partial endpoint `GET /resources/list`. +2 integration tests.

### 2026-06-09 — Resource ingestion: reconcile tool + first full curriculum import

- **`npm run reconcile`** (`app/src/jobs/reconcileOldPlans.ts`) — classifies the teacher's old
  `old_lesson_plan/` folder against the fresh Teach Computing downloads. The new download is a
  **different curriculum version** (renamed units, en-dash file-renames), so match-based buckets
  are unreliable; the robust signal is a **download-independent naming split** — **280 files are
  the teacher's own work**, the rest TC curriculum. Writes manifests to `data/reconcile-report/`.
- **`import-resources --filter <manifest>`** — import only the files listed in a manifest (e.g.
  `own.tsv`); also now skips `.part`/`.crdownload` partial downloads and Mac `__MACOSX`/`._` junk.
- **First full import:** own work (265 files, big backup zips excluded) + KS3 + all 16 GCSE units
  + KS4 non-GCSE → **2,433 resources, 3.6 GB** in the store (dedup skipped 534 byte-identical).
- Docs: [docs/RESOURCE_INGEST.md](docs/RESOURCE_INGEST.md) — KS4 download checklist + workflow.
- `.gitignore`: `data/reconcile-report/` (regenerable, pupil-data-adjacent).

### 2026-06-09 — Phase 3 build: schemes, plans, resource store, bulk-import (3.1–3.6) + Office preview (3.5)

- **Schema `0006`** + **schemes of work → units → lesson plans** editor with versioning, and **plan
  binding** on the lesson detail — the "Plan" placeholder is now real (3.1–3.3).
- **Hosted resource store** (3.4): upload, sha256 checksum, versioning + revert, download, inline
  PDF/image preview. Files live on a **bind-mounted** `data/resources` shared by the app, the
  importer and backups (replaces the Docker named volume).
- **Office preview** (3.5): a **Gotenberg** sidecar renders DOCX/PPTX/XLSX → PDF on demand;
  PDFs/images preview directly; the original is always downloadable. The sidecar is **profiled**
  (`docker compose --profile preview up -d gotenberg`) so it never blocks the core stack and is not
  pulled by default — preview degrades to download when it is absent (live conversion unverified).
- **Bulk-import** (3.6): `npm run import-resources` walks a folder, extracts zip lesson packages,
  and dedups by checksum. First real run imported **312 files** from the Teach Computing download.
- **Backups** updated for the bind mount (`scripts/backup.sh`/`restore.sh` tar the host store dir).
- New deps: `@fastify/multipart`, `adm-zip`. Remaining in Phase 3: 3.7 (oversee view) + 3.8 wiring.

### 2026-06-09 — Phase 3 plan authored; docs audited

- **Authored [docs/PHASE_3_PLAN.md](docs/PHASE_3_PLAN.md)** — the Phase 3 build plan (schemes of
  work → lesson plans → the **hosted, versioned resource store** + Office/PDF preview + bulk-import
  + the "lessons I oversee" view + file-store backups), 8 increments (3.1–3.8). For sign-off.
- **Docs brought up to date:** added `recurring_tasks` + `tasks.recurring_task_id` to DATA_MODEL,
  noted the recurring-task generator in ARCHITECTURE, and **marked 2.11 (pupils / DPIA) deferred**
  in the ROADMAP — picked up with the pupil-facing resources project.

### 2026-06-09 — captured info & recurrence / current-interest (2.10, 2.12)

- **2.10 Captured info** — `/captured`: a one-line capture box, a category (Pupil · Logistics ·
  Admin · Curriculum · CPD · Safeguarding · Other), an optional class link and a "resurface on"
  date; relevant items appear on **Now** ("Heads up") by date or today's classes; ⚑ safeguarding is
  highlighted (and earmarked never-to-AI for Phase 4); one tap turns a captured note into a task.
  Reuses the `notes` table (`kind='captured'`) — **no migration**. (`services/captured.ts`,
  `repos/captured.ts`, `lib/capturedView.ts`, `routes/captured.ts`)
- **2.12 Recurrence + current-interest** — migration `0005` adds `recurring_tasks`; `/recurring`
  defines them (weekly / fortnightly / monthly / **per-lesson**), and an idempotent generator
  materialises due instances into the inbox ahead of their due date — run on app boot + a daily
  in-app timer **and** as `npm run generate-recurring` (cron-friendly; no broker). Pure
  `nextDueDate` is the tested core. **Current-interest** ⭐ toggles on tasks (+ a ⭐ Interest filter)
  and captured items. (`services/recurrence.ts`, `repos/recurringTasks.ts`, `routes/recurring.ts`,
  `src/jobs/generateRecurring.ts`)
- **Deferred by the teacher:** 2.11 pupils / **DPIA** — individual pupil names come later, with the
  pupil-facing resources project.
- **Tests:** pure units for `resurfacing` and `nextDueDate`; integration for captured CRUD +
  promote, recurring generation (idempotent) + pause, and the ⭐ interest toggle; + authenticated
  renders of `/captured` and `/recurring`. **83 unit + 38 integration pass.** Built unattended,
  left **uncommitted** for review.

### 2026-06-09 — Phase 2 planning core: email, events, time, timers, prep & focus (2.4–2.9)

- **2.4 Email paste-box** — paste an email on /tasks → a draft task (Subject / first line → title),
  kept in `email_intake`. (`services/emailIntake.ts`)
- **2.5 Events & deadlines** — `/events` "what's coming" (parents' evenings, deadlines, exams,
  parent-contact); lead-time `dueSoon` surfaces them on Now. (`repos/events.ts`, `services/event.ts`,
  `lib/eventView.ts`, `routes/events.ts`)
- **2.6 Availability + work blocks** — pure `computeWindows` (free periods + before/after school,
  minus break/lunch/coffee/teaching, minus after-school commitments + a **10-min buffer** + blocking
  events); `/time` shows the windows + a planned-vs-actual work log with the one-tap **diverted**
  path. (`services/availability.ts`, `lib/commitments.ts`, `repos/workBlocks.ts`, `routes/time.ts`)
- **2.7 Timers** — one timer at a time (partial unique index), interruptible, accumulating onto
  `tasks.actual_seconds`; ▶ on tasks, a running banner on Now/Tasks. (`repos/timeEntries.ts`,
  `routes/timer.ts`)
- **2.8 Prep checklists** — per-lesson "before the bell" (`prep_templates` → `occurrence_prep`,
  materialised when a lesson is opened); a **start/end-of-day** checklist on Now. (migration `0004`,
  `repos/prep.ts`, `services/prep.ts`)
- **2.9 Focus mode** — pure `pickNext` ranks open tasks (urgency · due-before-bell · fits the
  window · load vs. energy) to **one next action** with sub-steps; morning / free-period / end-of-day
  modes + a "✅ go home" wind-down. (`services/focus.ts`, `routes/focus.ts`)
- Nav: Now · **Focus** · Timetable · Tasks · **Events** · **Time** · Notes.
- **Tests:** pure units for `parseEmail`, `dueSoon`, `computeWindows`, `pickNext`; integration for
  events, work blocks / day-slots, timers (one-running + accumulate), focus sub-steps and prep
  materialisation; + authenticated renders of every new screen. **73 unit + 31 integration pass.**
- **Deferred (need you):** 2.10 captured-info, 2.11 pupils / **DPIA**, 2.12 recurrence + current
  interest (task sub-steps already landed in 2.9). Built unattended; left **uncommitted** for review.

### 2026-06-09 — Phase 2 started: schema, tasks & "before the next bell" (2.1–2.3)

- **Migration `0003_phase2.sql`** — the full P2 schema: `tasks`, `events`, `work_blocks`,
  `time_entries` (+ one-running-timer index), `email_intake`, `prep_templates`/`occurrence_prep`,
  `pupils`, `enrolments`, `note_pupil_mentions`, `tags`, `schedule_exceptions`, and the deferred
  Phase-1 FKs (notes → pupils/tasks/events, follow-ups → tasks). `schema_phase=2`.
- **2.2 Tasks** — `/tasks` with **Inbox / Open / Done**; ＋ New task; inline HTMX-autosaved triage
  (title, urgency, estimate, cognitive-load, group, context); triage / done / drop. Nav gains Tasks.
  (`repos/tasks.ts`, `services/task.ts`, `lib/taskView.ts`, `routes/tasks.ts`)
- **2.3 due_rule + Now** — pure `resolveDueRule` ("by next lesson with group X" → the group's next
  lesson via the ClockService) + `beforeNextBell`; the Now screen gains a **"Before the next bell"**
  list (urgent + by-next-lesson + due-before-the-bell) with one-tap done. (`routes/now.ts`)
- **Tests:** +9 unit (`statusesFor`, `resolveDueRule`, `beforeNextBell`, taskView) + 5 integration
  (task CRUD/buckets, group-slots, bell candidates, `/tasks` render). **56 unit + 17 integration pass.**

### 2026-06-09 — Phase 2 plan authored

- **Authored [docs/PHASE_2_PLAN.md](docs/PHASE_2_PLAN.md)** — the detailed build plan for Phase 2
  (tasks → time → focus): 12 increments (2.1–2.12), the P2 schema, the **AvailabilityService** and
  **FocusService** as the two pure "hearts", the safeguarding/**DPIA** gate, and a "manual now, AI
  in Phase 4" split. For sign-off.

### 2026-06-09 — earlier start: 07:30 coffee + before-school slots

- The seeded day now starts at **07:30** — a 10-minute **Coffee** slot, then a **before-school**
  work/prep block to 08:30 (briefing / form / lessons unchanged). 13 period slots per weekday;
  `default_arrival` → 07:30. The Now clock strip shows "NOW Coffee" first thing. (`seed/data.ts`)

### 2026-06-08 — fast notes, the live Now screen & general notes (1.6–1.8) · Phase 1 MVP complete

- **1.6 Notes capture** — HTMX vendored (`public/htmx.min.js`). Inline, autosaving notes on the
  lesson and Now screens: ＋ New note, body autosaves (debounced; no focus loss, via out-of-band
  swaps), add/tick **follow-ups**, and an editable **per-course stopping point** that feeds "last
  time". `n` opens a new note from anywhere. (`repos/notes.ts`, `lib/notesView.ts`,
  `routes/notes.ts`, `public/app.js`)
- **1.7 Now screen** — `/` is wired to the ClockService: the current lesson (group, course, room,
  "last time → stopped at") with an embedded quick-note composer, the next teaching slot, and a
  clock strip that self-advances every 30s — kept separate from the composer so a half-typed note
  is never wiped. (`repos/clock.ts`, `routes/now.ts`)
- **1.8 General notes** — `GET /notes` lists general notes with a composer; top-bar nav
  (Now · Timetable · Notes).
- **Tests:** notesView render (incl. HTML-escaping); the integration suite now covers notes CRUD,
  the clock repo, and an **authenticated end-to-end render** of every screen (login → Timetable,
  Now strip, Notes, Lesson detail). **46 unit + 12 integration pass**; typecheck clean.

### 2026-06-08 — lesson detail & lazy occurrences (1.5)

- **1.5 Lesson detail** — opening a timetable cell find-or-creates the dated `lesson_occurrence`
  (idempotent on lesson+date) and materialises one `occurrence_course` per course, so split
  classes show a section each with its stopping point, plan placeholder and **“last time →
  stopped at”** (the previous occurrence). Read-only notes list (capture lands in 1.6).
  (`repos/occurrence.ts`, pure `services/occurrence.ts`, `routes/lesson.ts`)
- **Integration tests** — a separate `npm run test:integration` (`vitest.integration.config.ts`)
  exercises find-or-create against the dev DB (idempotency + course materialisation), kept out of
  the DB-free unit suite. Plus a `buildLessonDetail` unit test. **41 unit + 3 integration pass.**

### 2026-06-08 — start/stop scripts, login-hash fix, and the timetable grid (1.4)

- **`./start.sh` / `./stop.sh`** (repo root) — one command each. `start.sh` stops anything
  running, brings up Postgres + the app (Docker Compose; `dev` hot-reloads from source, `prod`
  runs the built image), waits for health, and seeds the timetable if the DB is empty. Identical
  on the Gentoo dev box and a Debian / Proxmox deploy. (`app/docker-compose.dev.yml`)
- **Fixed a deployment footgun:** the scrypt password hash used `$`, which Docker Compose
  interpolates — corrupting the hash in the container and breaking login. Hash format is now
  `scrypt:<salt>:<key>` (no `$`); `verifyPassword` still accepts legacy `$` hashes; secrets pass
  via `env_file` (literal). (`src/lib/passwords.ts`, `app/docker-compose.yml`)
- **1.4 Timetable grid** — `/timetable` renders the real week from the DB: colour-by-course,
  split classes, free periods, clubs and ⚑ overseen lessons; prev/next week; cells link to a
  lesson-detail placeholder (`/lesson`, fleshed out in 1.5). Top-bar nav (Now · Timetable).
  (`repos/timetable.ts`, `services/timetable.ts`, `routes/timetable.ts`, `routes/lesson.ts`)
- **Tests:** TimetableService grid assembly, seed-data invariants (catch a mistyped
  group/course or miscounted split before the DB), and the password round-trip — **36 pass**.

### 2026-06-08 — Phase 1 started: schema, real-timetable seed & ClockService (1.1–1.3)

- **Migration `0002_phase1.sql`** — the P1 schema: academic years, term dates, period definitions,
  staff / rooms / courses / groups / group_courses, timetabled lessons (+ split slots), the dated
  record (`lesson_occurrences` / `occurrence_courses`) and `notes` / `note_followups`. Adds `form`
  to the lesson `purpose` set.
- **`npm run seed`** (`src/seed/`) — idempotent seed of the real week from `TEACHING_PATTERN.md`:
  47 timetabled lessons (Post-16 ×3 and Y10 ×2 splits, 3 frees, daily form/club/open-room, the two
  known overseen lessons), **2025/26 set current** with **2026/27 seeded ahead** for rollover.
  Self-checks its integrity counts.
- **ClockService** (`src/services/clock.ts`, pure) + **`src/lib/time.ts`** + **14 tests** —
  resolves the current period, minutes remaining and the next teaching slot across every edge
  (break/lunch/free, before/after school, Fri→Mon, weekend, half-term, INSET, in-term bank holiday,
  crossing Christmas).
- **Go-live resolved: live now on 2025/26** (working ASAP); 2026/27 ready for the September
  rollover. Typecheck green; **18/18 tests pass**.

### 2026-06-08 — repo renamed; Phase 1 planned

- **Renamed** the local folder and GitHub repo to **`School_Organiser`** — the rename that was
  pending is done; spelling and naming now match across docs, `package.json` and Docker.
- **Authored [docs/PHASE_1_PLAN.md](docs/PHASE_1_PLAN.md)** — the detailed build plan for the
  Timetable + Now + Notes MVP (schema → real seed → ClockService → screens), for sign-off.
- **Captured Phase 1 seed inputs:** the **2026/27 term dates** and the first overseen-lesson
  slots (7ARO Skills Wed L3, 7JMI Curriculum Fri L3) in
  [docs/TEACHING_PATTERN.md](docs/TEACHING_PATTERN.md); the remaining overseen slots follow.

### 2026-06-08 — project-name spelling corrected

- **Corrected "Orgniser" → "Organiser"** in all docs/scripts (the project name is
  **School_Organiser**). `package.json` (`school-organiser`) and Docker (`school_organiser`)
  were already correct. The local folder and GitHub repo have **since been renamed to
  `School_Organiser`** (see the entry above), so naming is consistent everywhere.

### 2026-06-08 — Q3/Q14 answered, gitignore fix

- **Q3 → paste box (a)** to start; **Q14** resolved (formats PPTX/DOCX/PDF + media; AI editing
  "as far as possible" with editable/good-looking output; sizeable bulk-import).
  (`docs/OPEN_QUESTIONS_ANSWERS.md`)
- **Fixed `.gitignore`** — removed the over-broad Python `lib/` / `bin/` patterns that were
  excluding `app/src/lib/`; `html.ts` & `passwords.ts` were **missing from the repo** and must be
  added in the next commit.
- **Parked future direction** noted: a pupil-facing resource/quiz site (login + marking),
  overlapping `exam_questions`; the resource store stays compatible. (`SPECIFICATION §7`)

### 2026-06-08 — answers batch 2 + provider switch

- **Recorded answers batch 2** (Q3–Q28 + extra) in `docs/OPEN_QUESTIONS_ANSWERS.md`; trimmed
  `docs/OPEN_QUESTIONS.md` to a decided-summary + still-open (Q3 explained, Q14 detail).
- **AI provider → Anthropic (Claude)** (was OpenAI). Provider-swappable wrapper; default models
  per environment. (`ARCHITECTURE`, `DATA_MODEL`, `SECURITY_AND_PRIVACY`)
- **Captured real timetable** in `docs/TEACHING_PATTERN.md`: full Mon–Fri grid, all lessons in
  room **U1**, three free periods (Tue L4, Thu L1, Thu L4), Computing Club every break + lunch
  (13:00–13:30), Wednesday taxi-number duty.
- **Post-16 courses named** (BCS Thinking Like a Coder, AIMS Robotics, Computers for VI) and
  **Year 10 Sound Engineering** noted as in development.
- **New feature — "Current interest"**: mark items as current interest; the system learns and
  biases what it surfaces. (`SPEC §5.18`)
- **Safeguarding handling**: notes/captured items flagged safeguarding are highlighted and
  **withheld from all AI calls** (never sent). (`SECURITY`, `SPEC §5.17`, `DATA_MODEL`)
- **Scope added**: exam dates (events), a start/end-of-day checklist, and a light
  parental-contact log. (`SPEC`, `ROADMAP`)
- **Cognitive-load / categorisation are learned**: AI tags first, you override, the system
  learns from corrections. (`SPEC`)
- Added `CHANGELOG.md` and `docs/OPEN_QUESTIONS_ANSWERS.md`.

### 2026-06-08 — features added to the plan

- **Timers + actual-duration AI calibration** and the **"things I've been told" captured-info
  inbox**. (`SPEC §5.16–5.17`, `DATA_MODEL` `time_entries`, captured-info columns on `notes`)

### 2026-06-08 — Phase 0 scaffolded & verified

- Stood up `app/`: Fastify 5 + PostgreSQL (pgvector **pg16**) + single-user auth (scrypt +
  encrypted-cookie session + CSRF), SQL migration runner, `/health`, login flow, and
  backup/restore scripts.
- Verified end-to-end (typecheck, 4 smoke tests, live DB migrate + login + backup);
  **0 production-dependency vulnerabilities** (bumped `@fastify/static` to 9.1.3).

### 2026-06-08 — plan reshaped around teacher input

- Resources **hosted** (single source of truth, versioned, AI-editable, importable); break &
  lunch are **not** work windows; **focus mode** + end-of-day wind-down; **events & deadlines**;
  **prep checklists**; **academic-year rollover**; cognitive-load tagging.

### 2026-06-07/08 — initial documents

- Authored the specification & design set: `README`, `SPECIFICATION`, `DATA_MODEL`,
  `ARCHITECTURE`, `UX_FLOWS`, `SECURITY_AND_PRIVACY`, `ROADMAP`, `OPEN_QUESTIONS`,
  `TEACHING_PATTERN`. Locked stack (TypeScript/Fastify), single-week timetable.
