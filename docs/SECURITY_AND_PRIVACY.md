# Security & Privacy

This app holds pupil-related data (names, progress notes, "outstanding pupils"), so it is
treated as a safeguarding-sensitive system even though it runs on the internal LAN for one
user. Mirrors the approach in `exam_questions/SECURITY_AND_PRIVACY.md` and `DPIA.md`.

## Data classification

| Data | Sensitivity | Where it lives |
| --- | --- | --- |
| Pupil names, enrolments | **Personal data** | PostgreSQL only; never sent to AI with name attached |
| Pupil progress / behaviour notes | **Sensitive** | PostgreSQL; included in AI calls only after redaction; safeguarding-flagged notes **withheld entirely** |
| Lesson notes + stopping points (per class) | **Sensitive** | PostgreSQL; flow to AI (adapt-lesson, improve-master, term-summary) after redaction + withholding |
| Teaching contexts (per course + per class) | Sensitive — cohort-level prose, must never name a pupil | PostgreSQL; injected into every AI planning call via the wrapper |
| Lesson plans, schemes, adaptations, resources, tasks | Internal | PostgreSQL / hosted resource store |
| Equipment inventory (kit list) | Internal — no personal data | PostgreSQL; injected into AI planning calls |
| TA lesson feedback | **Sensitive** (may describe pupils) | PostgreSQL; flows to adapt-lesson AI after redaction; **safeguarding-flagged feedback withheld entirely** |
| Pupil PINs (Phase 8) | Secret (low-entropy) | `pupil_credentials`: scrypt **hash** (verification) **plus the PIN value** so the teacher can print/read it onto login cards. A 4–6 digit classroom PIN isn't a real secret here — LAN-only, rate-limited, lockout after 5 fails, shared machines, classmates known to each other; never sent to AI; shown only on teacher-authenticated surfaces |
| Pupil answers + lesson feedback (Phase 8) | **Sensitive** (pupil-authored) | PostgreSQL; reach AI only **aggregated per question + anonymised**, through the wrapper; never linked to a name on egress |
| Pupil-pasted screenshots (worksheets v2) | **Sensitive** (pupil-authored work) | Resource volume `pupil-work/<oc>/<pupil>/…`; `pupil_answers.value='img:…'` points at it. Served **access-scoped** (`/pupil-image`: pupil sees only their own, teacher any, **TA none**), raster-only + `nosniff` + `inline`. **Never sent to AI** — image fields are excluded from marking *and* from the class-work summary (only text answers become questions); erased with the pupil's other answers |
| Fictitious test pupil (worksheets v2) | **Not personal data** | `pupils.is_test=true`; excluded from the roster, redaction targets and marking reports — lets the teacher preview the pupil experience for any lesson without a real child's data |
| Pupil differentiation level (Phase 8) | **Sensitive** (attainment) | `pupil_levels`; server-side only, never sent to AI |
| Pupil marks + comments (Phase 9) | **Sensitive** (attainment) | `pupil_marks` / `pupil_lesson_comments`; gated by `pupil_marks_enabled` (DPIA addendum). AI open-marking sends **anonymous slot-lettered per-question batches** (no pupil id/name); pupils see only **confirmed**, visibility-gated marks |
| Remembered-device credential (Phase 9) | Secret | `pupil_devices`: the cookie holds a random secret; only its **sha256** is stored. Pupil-bound, ~term expiry, revoked on PIN-reset/disable/teacher-revoke. Off unless the class enables it |
| "What works for me" profile (Phase 9) | **Sensitive** (profiling) | `pupil_profiles`; AI digest built from the pupil's own feedback+marks (no name to AI); pupil-keyed (cross-subject sharing is deferred to the multi-teacher DPIA) |
| Safeguarding disclosure register (Phase 10) | **Sensitive** (record of handling) | `safeguarding_review`; teacher-only, **never sent to AI** — a record-of-handling, not a referral system |
| Pupil disposal audit (Phase 10) | Internal — no identity | `pupil_disposals`; records that an erasure/anonymisation happened + per-table counts, keeping only the non-identifying token |
| AI prompts & responses | Internal (audited) | `ai_calls`, **redacted** request only |
| Auth secrets (`SESSION_SECRET`) | Secret | `.env`, never committed |
| AI provider API key | Secret | `ANTHROPIC_API_KEY` in `.env` where set (wins); otherwise the teacher's own key stored in the `settings` table (instance-local DB, LAN-only) — like the mailbox password. Test mode never reads the stored key, so tests can't make real calls |
| Email-intake mailbox credentials | Secret | `settings` table (instance-local DB); use a **dedicated/forwarded mailbox with an app password**, never the main school account |

## Authentication & access

- **Single account** for the teacher. Login required even on the LAN (a logged-in laptop left
  open is the real-world threat, plus defence-in-depth).
- Session cookie: `HttpOnly`, `Secure`, `SameSite=Strict`. Server-side session.
- All POSTs CSRF-protected.
- Password hashed (argon2/bcrypt). Lockout after repeated failures.
- The app is **not exposed to the public internet**; only outbound HTTPS to the AI provider.
- **TA access (built 2026-06-12; per-TA named accounts 2026-06-13):** TAs log in with their own
  password (set in Settings) into a deny-by-default role — only the read-only current/next-lesson
  view, its linked resources, the feedback form (and, if their account links a staff row, "my
  upcoming lessons") are reachable; everything else bounces. TA feedback can be
  safeguarding-flagged, which withholds it from all AI calls. A TA can only open resources **linked
  to a lesson running in their current slot** (`taMayAccessResource`), and a named TA's now/next view
  is scoped to **their own** lessons — closing an enumerate-by-id gap (2026-06-15 review). Uploaded
  **SVGs are served as downloads** (`Content-Disposition: attachment` + `nosniff`), never inline, so
  a malicious SVG cannot run script in the app origin.
- **Pupil access (built 2026-06-13, off by default):** a deny-by-default `pupil` role reaching
  only `/me` and its autosave endpoints — **no `/resources/*`** (worksheet content is rendered
  server-side). Login is **class code → tap your name → PIN**, rate-limited per IP with a durable
  per-pupil lockout; sessions idle out on shared classroom machines. The whole surface is gated by
  a **Settings master switch that stays off until the teacher confirms DPIA/DPO sign-off** — until
  then no pupil credential can be created. Pupils only ever see their own work; answer writes are
  checked against the pupil's enrolment, not just the session.
- **Pupil worksheet surface (worksheets v2, 2026-06-15):** the `/me` page is a two-pane workspace
  (level-sliced slides beside a full-width sheet) and the pupil role's allow-list now also reaches
  three **narrow** image endpoints — still **no `/resources/*`**: `POST /me/answer-image` (paste a
  screenshot answer; CSRF; raster-only, no SVG, 12 MB cap), `GET /pupil-image` (their **own**
  screenshots only — the `<pupil_id>` path segment must match the session), and `GET /lesson-image/:id`
  (a worksheet's teaching illustrations, `kind='image'` only, served to any authed session because
  pupils must see the sheet's pictures). The **test pupil** overlay lets the teacher walk this surface
  for any lesson/level without a real child's data or PIN, and is the only actor that bypasses the
  clock/DPIA access gates.
- **Richer question types (2026-06-15)** — multiple-choice, true/false, matching and fill-in-the-blanks
  — add **no new data category**: a pupil's answer is still text in `pupil_answers.value` (the chosen
  option, the placed label or the typed word), marked by the existing pipeline. They mark
  **deterministically** (`choice`/`exact`/`keyword`) and never reach the AI, and the **correct** answers
  live only in the teacher-authored `answers` document (Internal), not in the pupil worksheet.

## The pupil-name rule (the one that must never break)

> **No pupil name is ever sent to any AI service.**

Implemented structurally, not by discipline:

1. Each pupil has a stable `ai_token` (e.g. `PUPIL_7`) in the database.
2. The **single LLM client wrapper** is the only code that calls a provider. Before sending,
   it substitutes every known pupil name in the payload with that pupil's token. Matching is
   **Unicode-aware and whitespace-robust** — a name is matched across any run of spaces, tabs,
   non-breaking spaces or a line break that falls mid-name, so an odd space cannot smuggle a name
   through (2026-06-15 review). It also catches a **first- or surname-only** reference and is
   **fail-closed on everyday-word names**: a pupil named "Summer" or "Mark" is redacted even though
   that word also appears in ordinary prose — the absolute rule holds, at the cost of occasionally
   tokenising that common word in AI context for a roster that contains such a pupil (BUG-037, 2026-06-21).
3. The `ai_calls` audit table stores **only the redacted request**, so the record itself
   proves no name left the building.
4. Responses that reference a token are re-expanded to the name **for display only**, in the
   app, after the call returns — **longest-token-first** and walking the structured response
   recursively, so `PUPIL_1` never corrupts `PUPIL_10`.
5. Tests assert that a payload containing a roster name is rejected/redacted before egress.

This matches the project-wide rule in the root `CLAUDE.md` ("Pupil names are never sent to AI
services — they are replaced with `PUPIL_NAME` before any call").

## Safeguarding content is withheld from AI

Any note or captured item flagged **safeguarding** is highlighted in the UI and **excluded from
every AI call** — not merely name-redacted, but never sent at all. The flag can be set by hand
and is suggested by the categoriser; once flagged, the item is removed from all AI context
(planning, summaries, categorisation). The AI provider is **Anthropic (Claude)**; the same
redaction *and* withholding rules apply regardless of provider.

## GDPR / data protection

- **Lawful basis / role:** the school is the data controller; this tool is a processing system
  under the school's existing data-protection policy. Confirm with the school DPO before go-live.
- **Data minimisation:** store only what the tool needs (names + the notes the teacher would
  keep anyway). No home addresses, no special-category data unless explicitly justified.
- **Retention / disposal:** pupil data is removed on a deliberate, audited action, not silently.
  Two modes (`disposePupil`): **anonymise** keeps cohort *attainment* (answers/marks/feedback/levels)
  but strips identity, login, screenshots **and the individual narrative** — the pupil's own
  notes/tasks/events are deleted and their name is redacted out of any shared note that merely mentioned
  them, so an "anonymised" record can no longer be re-identified (BUG-039). **Erase** is a full
  right-to-erasure: every dependent personal record is deleted (the narrative is **deleted, not just
  detached**), leaving only the non-identifying disposal-audit token.
- **Subject access / portability:** `exportPupilRecord` assembles the pupil's *whole* record — profile,
  enrolments, answers/marks/feedback, teacher comments, linked notes/tasks/events + mentions, per-class
  levels, unit signals, completions, and login/device **metadata** (never the PIN or device-token
  hashes). Safeguarding records are excluded by design and released case-by-case by the DSL under the
  DPA 2018 safeguarding exemption (BUG-043).
- **DPIA:** [docs/DPIA.md](DPIA.md) is a **working draft** covering what's held, why, the
  AI-redaction control, retention/disposal and backup handling. It awaits DPO + SLT (safeguarding)
  sign-off; the pupil-login and auto-marking surfaces stay **code-disabled** until that sign-off is
  confirmed in Settings (`pupil_dpia_ack` / `pupil_marks_dpia_ack`).

## Backups

- Nightly encrypted `pg_dump`; restore tested at least once and documented in the RUNBOOK.
- Backups inherit the school's existing off-site regime. Because backups contain pupil data,
  they are encrypted at rest and access-controlled the same as the live DB.

## Threat model (proportionate, one school, one user)

| Threat | Mitigation |
| --- | --- |
| Unattended logged-in laptop | Login + session timeout; lock-screen habit. |
| Pupil name leaking to a third-party AI | Structural redaction in the one LLM wrapper + audit. |
| Backup tape/disk lost | Encrypted backups. |
| Another LAN device reaching the app | Auth required; optional IP allow-list on Caddy. |
| A LAN device reaching the **database** or the app's debug port directly | Compose publishes Postgres (5434) and the app (44360) on **127.0.0.1 only**; the LAN reaches the app solely through Caddy on 80/443 (internal Docker network to `app:44360`). Production **refuses to start on the default DB password**. *(BUG-032)* |
| Per-IP login/PIN rate limits defeated behind the reverse proxy | Caddy **overwrites** `X-Forwarded-For` with the real client, and the app's `TRUST_PROXY=true` reads it — so the brakes key on the actual device, not all-collapsed-to-Caddy and not a client-spoofable header. *(BUG-045)* |
| Limited-role user reaching another lesson's data | TA role scoped to resources/lessons in the current slot; named-TA views filtered to their own lessons. |
| Malicious uploaded SVG running script in the app origin | SVGs served as downloads (`attachment` + `nosniff`), never inline. |
| Pupil uploads a hostile file as a "screenshot" answer | Raster-only allow-list (png/jpg/webp/gif — **no SVG**), 12 MB cap, served `inline` + `nosniff`; path-scoped serve so a pupil reaches only their own. |
| One pupil reading another pupil's screenshot | `/pupil-image` checks the `<pupil_id>` path segment against the session; TAs denied; traversal-guarded (`pupil-work/` prefix, no `..`). |
| Secret leak via git | `.env` git-ignored; secrets never in code or docs. |
| Accidental data loss | No-soft-delete + nightly backups + tested restore. |

## Out of scope

- Penetration-grade hardening for a public service (not internet-facing).
- Multi-tenant isolation (single user).
