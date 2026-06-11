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
| AI prompts & responses | Internal (audited) | `ai_calls`, **redacted** request only |
| Auth secrets (`SESSION_SECRET`, API keys) | Secret | `.env`, never committed |

## Authentication & access

- **Single account** for the teacher. Login required even on the LAN (a logged-in laptop left
  open is the real-world threat, plus defence-in-depth).
- Session cookie: `HttpOnly`, `Secure`, `SameSite=Strict`. Server-side session.
- All POSTs CSRF-protected.
- Password hashed (argon2/bcrypt). Lockout after repeated failures.
- The app is **not exposed to the public internet**; only outbound HTTPS to the AI provider.
- If a TA read/feedback view is added later (SPECIFICATION §5.8), it gets a separate, lower-
  privilege account — never a shared login.

## The pupil-name rule (the one that must never break)

> **No pupil name is ever sent to any AI service.**

Implemented structurally, not by discipline:

1. Each pupil has a stable `ai_token` (e.g. `PUPIL_7`) in the database.
2. The **single LLM client wrapper** is the only code that calls a provider. Before sending,
   it substitutes every known pupil name in the payload with that pupil's token.
3. The `ai_calls` audit table stores **only the redacted request**, so the record itself
   proves no name left the building.
4. Responses that reference a token are re-expanded to the name **for display only**, in the
   app, after the call returns.
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
- **Retention:** pupil rows and their notes are deleted on a deliberate, audited retention
  action (e.g. end of the pupil's time in the class/school), not silently. Mirrors the
  `exam_questions` retention approach.
- **Subject access / portability:** all data is exportable (DATA_MODEL §"Data portability"),
  so an SAR can be satisfied.
- **DPIA:** maintain a short `docs/DPIA.md` before storing real pupil data, covering what's
  held, why, the AI-redaction control, retention, and backup handling. (To be written in P2,
  when pupils are introduced — see ROADMAP.)

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
| Secret leak via git | `.env` git-ignored; secrets never in code or docs. |
| Accidental data loss | No-soft-delete + nightly backups + tested restore. |

## Out of scope

- Penetration-grade hardening for a public service (not internet-facing).
- Multi-tenant isolation (single user).
