# Data Protection Impact Assessment (DPIA)

> **Status: working draft.** This document is not valid until it has been reviewed, amended as
> necessary, and **signed by the school's Data Protection Officer (DPO) and a member of SLT with
> safeguarding responsibility** (§8). Real pupil data is already stored (a names-only roster — see
> §1); this draft must be reviewed promptly. Fields marked **[CONFIRM]** need the school's input.

- **Project:** School_Organiser — a single-teacher "command centre" (timetable, lesson notes,
  tasks/time, schemes of work, a hosted resource store, and AI-assisted planning). Internal LAN use.
- **Data controller:** the school. **Data processor:** the project owner (the teacher), operating the
  app on a school-provided Debian server.
- **Author of this draft:** the project owner (teacher). **Date of draft:** 2026-06-10.
- **Phase at time of draft:** Phase 4 (AI assistance). A **names-only pupil roster** and free-text
  notes are in use; the AI sub-processor (Anthropic) is live behind the redaction control (§5).
- **Reviewed 2026-06-11 (Phase 5, curriculum delivery):** new AI flows since the draft — per-class
  **lesson notes + stopping points** (the feedback loop), per-course **and per-class teaching
  contexts** (cohort-level prose; the UI instructs "never an individual pupil"), and the
  **equipment inventory** (no personal data). All pass through the same wrapper (redaction,
  safeguarding withholding, audit); no new category of personal data is processed, so the §5
  controls and the Anthropic sub-processor position are unchanged.
- **Reviewed 2026-06-12 (email intake + TA access):** two new inbound flows — forwarded **emails**
  (parsed, AI-triaged through the standard wrapper; mailbox credentials in the instance DB) and
  **TA lesson feedback** (may describe pupils; redacted before AI; safeguarding-flagged feedback
  withheld from AI entirely and highlighted to the teacher). Same controls, no new category.
- **Review cadence:** termly, and before any change that widens the scope of processing (notably any
  move to pupil-facing logins, or storing per-pupil progress/SEND data). **The planned Phase 8
  (pupil logins + answers) requires completing this DPIA's [CONFIRM] items and DPO sign-off first
  — pupil-authored answers are a new category of personal data.**
- **Built 2026-06-13 (Phase 8, behind the gate):** the pupil-login code is in place but **disabled
  by default**. Enabling it is a deliberate Settings action that **requires the teacher to confirm
  DPO/SLT sign-off** (recorded as `pupil_dpia_ack`); until then `/pupil` refuses and no
  `pupil_credentials` row can be created. So this DPIA's completion remains the precondition for
  any real pupil use — now enforced in code, not only in process. New personal data once enabled:
  pupil **PINs** (hashed), pupil **answers** (`pupil_answers`), per-pupil **differentiation level**
  (`pupil_levels`), and **lesson feedback** (`pupil_lesson_feedback`). The AI boundary is unchanged
  — answers reach the AI only **aggregated per question and anonymised**, through the same wrapper. **The planned Phase 9
  (auto-marking) additionally requires an addendum before build: per-pupil attainment records are
  stored (server-side only); identity-free pupil answer text goes to the AI sub-processor for
  marking (anonymous slots, roster redaction still applied inside the text, pattern-screened
  content withheld entirely); and a revocable remembered-device credential exists on classroom
  machines ([PHASE_9_PLAN.md](PHASE_9_PLAN.md) §8).**
- **Built 2026-06-13 (Phase 9, behind the gate):** the auto-marking code is in place but **disabled
  by default**. Enabling it is a deliberate Settings action that **requires confirming DPO/SLT
  sign-off of the addendum** (recorded as `pupil_marks_dpia_ack`) and that pupil access is already
  on — so this addendum remains the precondition for real use, now enforced in code. New personal
  data once enabled: per-pupil **marks** (`pupil_marks`) + teacher **comments**, a **remembered-
  device** credential (sha256-hashed), and a per-pupil **"what works for me" profile**. AI exposure
  is the **least-identified traffic in the app** — open answers are marked in **anonymous,
  slot-lettered, per-question batches** (no id/token/name) through the same wrapper, and
  **guard-matched answers are withheld from the AI entirely**. Cross-subject sharing of the profile
  is out of scope here (deferred to the multi-teacher whole-school DPIA). Marks retention: proposed
  academic year + one term, then aggregate — DPO to confirm.

- **Built 2026-06-15 (Phase 10, trustworthy in daily use):** the privacy/safeguarding promises are now
  **enforced in code**, not just stated. **Encrypted nightly backups** with a monthly restore-drill
  (R4); a teacher **idle-logout** on shared machines, now correctly ignoring background polls so an
  unattended laptop actually times out (R3); the **`ai_calls` audit is reviewable in-app** as DPO
  evidence; a **safeguarding disclosure register** (`safeguarding_review`) gives the teacher one place
  to review every flagged item — disclosure answers, safeguarding-flagged captured items and TA
  feedback — and **record what was done** (a record-of-handling, never a referral system, **never sent
  to any AI**); and pupil **erasure / anonymisation** writes a **disposal audit** (`pupil_disposals`)
  recording the action and per-table counts while keeping only the non-identifying token. No new
  category of personal data reaches the sub-processor; the §5 controls are unchanged and, where noted,
  strengthened (the redaction matcher is now whitespace-robust — 2026-06-15 review).

- **Built 2026-06-15 (Worksheets v2 — pupil-pasted screenshots):** the pupil worksheet became a
  two-pane workspace and pupils can now **paste screenshots** of their practical work as answers. This
  adds **one new on-disk modality of pupil-authored personal data** — image files under
  `pupil-work/<oc>/<pupil>/…` on the LAN resource volume, with `pupil_answers.value='img:…'` as the only
  DB pointer (DATA_MODEL §O). It stays **inside the existing Phase 8 pupil-access gate** (no new switch
  or category): served **access-scoped** (a pupil sees only their own; teacher all; **TAs none**),
  **raster-only + `nosniff`**, and **removed by the pupil-erasure path** — `disposePupil` deletes the
  files from disk, not just the rows, and an `anonymise` (leaver kept for cohort stats) drops the raw
  screenshots too, because an image can carry direct identifiers the app cannot redact, while text
  attainment is kept nameless (§7). The **AI boundary is unchanged**: image fields are excluded from
  marking *and* from the anonymised class-work summary, so **no screenshot — and no path pointer —
  ever reaches the sub-processor**. A separate **TA-notes** document (`kind='ta_notes'`) holds support
  guidance + answers and is structurally unreachable by pupils; a **fictitious test pupil** (`is_test`,
  no personal data, excluded from the roster/redaction/marking) lets the teacher preview the pupil
  surface without a real child. No new sub-processor exposure; the §5 controls are unchanged.

Follows [SECURITY_AND_PRIVACY.md](SECURITY_AND_PRIVACY.md) §"GDPR / data protection". It
cross-references rather than duplicates [SECURITY_AND_PRIVACY.md](SECURITY_AND_PRIVACY.md) and
[DATA_MODEL.md](DATA_MODEL.md), which are load-bearing for this assessment.

## 1. Nature, scope, context and purposes

**Nature.** A web app served only on the school LAN (not internet-facing), used by **one teacher**.
Pupils do **not** log in or enter data. The app holds the teacher's planning record and a small
pupil roster used solely so that the AI layer can replace names with tokens (§5).

**Scope — personal data held:**
- **Pupil roster:** `display_name` and a stable non-identifying `ai_token` (e.g. `PUPIL_7`), plus an
  active flag. **No** DOB, contact details, photos, attendance, or per-pupil SEND/diagnosis/behaviour
  records. (Currently a small number of names — see [DATA_MODEL.md](DATA_MODEL.md).)
- **Free-text the teacher writes:** lesson notes, "captured" snippets, tasks, stopping points. These
  **may incidentally** mention a pupil by name or refer to progress/behaviour. This is anticipated by
  design (§4) and handled by the safeguarding flag + redaction (§5).
- **Cohort-level teaching context (Phase 4):** aggregate, non-identifying prose describing a class
  (e.g. "majority autistic; many show typical ADHD traits") attached to a *course*, used to pitch AI
  output. This is **cohort-level only and must never name or describe an individual pupil** (§5).
- **No teacher PII beyond** a single login credential (hashed) and a session secret.

**Context.** A UK **special-education** secondary setting; the cohort is therefore a group of
**vulnerable pupils**, so any incidental progress/behaviour content is treated as sensitive even
though no formal SEND records are stored. **[CONFIRM: school name, key stages in scope.]**

**Purposes.** Lesson/curriculum planning and day-to-day teaching organisation; AI assistance drafts
lessons, authors/redesigns schemes, and (later) summarises and categorises — always with the teacher
as the decision-maker. AI is additive; the app is fully usable with it switched off.

## 2. Necessity and proportionality

The roster exists **only** to make name-redaction possible: a stable token can be substituted for a
name before any AI call and re-expanded for display afterwards. Storing the name is the minimum
needed for that substitution to work on the teacher's own free text. Lawful basis: processing in the
school's capacity as data controller under its existing data-protection policy (public task /
legitimate interests of running the school). **[CONFIRM with DPO.]** Data minimisation is enforced by
design — no special-category per-pupil data is stored; the schema has no field for it (§1).

## 3. Consultation

**[CONFIRM]** — to be completed by the DPO: whether pupils/parents need informing, and how this sits
under the school's existing privacy notice. The system is internal, teacher-only, and processes data
the teacher would keep anyway (planning notes), which should keep this proportionate.

## 4. Risks identified

| # | Risk | Likelihood | Impact |
|---|------|-----------|--------|
| R1 | A pupil name reaches the external AI provider | Low (structural control, §5) | High |
| R2 | Safeguarding-relevant content reaches the AI | Low (withheld entirely, §5) | High |
| R3 | Unattended logged-in device exposes the record | Medium | Medium |
| R4 | Backup media lost / mis-handled | Low | Medium |
| R5 | Incidental sensitive content accumulates in free-text notes | Medium | Medium |
| R6 | Cohort teaching-context inadvertently identifies a pupil | Low | Medium |
| R7 | A pupil-pasted screenshot exposes a peer's work, persists after erasure, or carries an unredactable identifier | Low (access-scoped serve; erasure deletes the files; never sent to AI) | Medium |

## 5. Measures to reduce risk (the AI control)

The single **LLM wrapper** ([app/src/llm/client.ts](../app/src/llm/client.ts)) is the only code that
contacts a provider (Anthropic Claude). Before any request it, in order:
1. **Withholds** every safeguarding-flagged note/item entirely — not redacted, **never sent** (R2).
2. **Redacts** every roster `display_name` to its `ai_token` (R1).
3. **Egress-asserts** — if any roster name survives, it refuses to send.
4. **Audits** an `ai_calls` row containing **only the redacted request** — the audit itself is
   evidence no name left the building.
5. Re-expands tokens to names **for display only**, after the response returns.

This is proven by automated **egress tests** that fail the build if a roster name or flagged item
could escape ([app/tests/redact.test.ts](../app/tests/redact.test.ts)). The cohort teaching-context
(R6) is **aggregate prose only**, stored per course, never per pupil, and passes through the same
redaction path. **Inbound email is `guardMatch`-screened *before* any AI call** (Phase 10.5): a
forwarded email touching welfare is filed as a flagged captured item with **zero** AI egress, rather
than relying on the model to classify it after the body was already sent. Further measures: LAN-only,
authenticated single account, `HttpOnly`/`Secure`/`SameSite=Strict` session, all POSTs
CSRF-protected, outbound HTTPS to Anthropic only; a **teacher idle-logout** in addition to the 12h
absolute session (Phase 10.3) so an unattended classroom laptop locks itself (R3); **encrypted
nightly backups** (`age`/`gpg` at rest, the script refuses plaintext) with a monthly automated
restore-drill (Phase 10.1, R4); no silent deletion, deliberate audited retention actions (R5); and
the **`ai_calls` audit is reviewable in-app** (Settings → AI call log) as DPO evidence (Phase 10.6).
See [SECURITY_AND_PRIVACY.md](SECURITY_AND_PRIVACY.md) for the full controls.

## 6. Sub-processors

| Sub-processor | Purpose | Data sent | Safeguards |
|---|---|---|---|
| **Anthropic (Claude API)** | AI lesson/scheme drafting, summaries, categorisation | **Redacted** prompts only — pupil names tokenised, safeguarding content withheld | §5; `ANTHROPIC_API_KEY` in `.env` (never committed); a monthly spend cap; a kill-switch. **[CONFIRM Anthropic's data-processing terms / no-training assurance for API data.]** |

## 7. Retention and disposal

Pupil rows and the teacher's notes are deleted on a **deliberate, audited** action (e.g. end of the
pupil's time in the class/school), not silently. The disposal itself is recorded in `pupil_disposals`
(Phase 10.2) — that an erasure/anonymisation happened and what it removed, **without re-storing the
identity removed** (only the non-identifying `ai_token` is kept). Pupil-pasted **screenshots** are
deleted from the resource volume too, not just their DB pointers — `disposePupil` removes the files on
erase, and an `anonymise` strips them as well, since a raw image can carry an identifier the app cannot
redact (the count appears in the disposal audit). `ai_calls` audit rows are retained as
the redaction-control evidence; they contain no names. **[CONFIRM retention periods with DPO.]** All
data is exportable for a subject-access request (DATA_MODEL §"Data portability").

**Assessments.** The summative-assessment feature stores additional pupil PII: free-text answers
(`assessment_answers`), per-pupil marks/feedback (`assessment_awarded_marks`) and objective per-spec-point
results (`assessment_spec_point_results`); these cascade-delete with the pupil on erasure (FK
`ON DELETE CASCADE` from `pupils`). The AI control is unchanged: generation is cohort-level (no pupil
identity), marking sends only **redacted, slot-lettered** answers via the one wrapper, safeguarding-matched
answers are **withheld from AI** (and surface in the safeguarding register), and all marking is behind the
`pupil_marks_enabled` DPIA gate. Test-Lab attempts (`is_test`) are excluded from analytics and never
AI-marked, and `wipeTestAttempts` clears them.

## 8. Outcome and sign-off

Residual risk after measures: **low**, conditional on the sign-offs below and the **[CONFIRM]** items
being resolved. Until both signatures are in place and the open items closed, treat real pupil data
as provisional.

| Role | Name | Decision | Date |
|---|---|---|---|
| Data Protection Officer | **[ ]** | approve / amend / reject | |
| SLT (safeguarding) | **[ ]** | approve / amend / reject | |
| Project owner (teacher) | **[ ]** | | |
