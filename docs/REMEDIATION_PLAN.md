# Remediation & Completion Plan

> **Status (2026-06-19): in progress — 9 of 50 fixed.** This is the fix-and-finish programme for the 50
> findings in [../BUGREPORT.md](../BUGREPORT.md) (the 19 June 2026 audit) **plus** the still-outstanding
> features drawn from [FUTURE_WAVES.md](FUTURE_WAVES.md), [PHASE_14_PLAN.md](PHASE_14_PLAN.md),
> [ROADMAP.md](ROADMAP.md) §7 and [NEXT_STEPS.md](NEXT_STEPS.md). Each wave is a reviewable,
> independently-shippable slice.
>
> **Landed (2026-06-19):** the A1 trust-boundary canonicalisation cluster — **BUG-001 / 037** (redaction)
> and **BUG-038** (safety gate); the A8 reliability quick wins — **BUG-034 / 035 / 036 / 050**; and two A6
> invariants — **BUG-024 / 031**. Suites green: 515 unit / 307 integration; typecheck clean. Per-finding
> detail in the BUGREPORT progress section.

**Part A** fixes the audited defects (Waves 0 + A1–A8). **Part B** lists the outstanding features and
points at their existing plans. Do **Part A first** — privacy, correctness and recovery before new
surface.

## Standing constraints (unchanged)

Single-teacher; TypeScript / Fastify 5 / PostgreSQL 16 / server-rendered HTML + vendored HTMX / Zod;
`routes → services (pure) → repos`. **The AI boundary is immovable:** redaction → withholding → egress
assert → audit stays *above* every provider call ([../app/src/llm/client.ts](../app/src/llm/client.ts));
tests never call the real API (the integration config forces an empty key). The user commits between
sessions — don't commit unless asked.

## Working method (per bug, every time)

1. **Red:** write the failing test that reproduces the defect *first* (the audit gives a reproduction
   and a regression-test sketch for each). This is also how we confirm a "credible-risk" finding is real
   before changing code.
2. **Green:** the smallest fix that satisfies the test and the audit's "potential fix".
3. **Gate:** the wave ends only when `npm test` + `npm run test:integration` + `npm run typecheck` are
   all green, with a [CHANGELOG.md](../CHANGELOG.md) entry. Fail **closed** on every trust boundary.
4. **Scope discipline:** a fix touches its finding; opportunistic refactors go to a separate slice.

---

## Wave 0 — Reusable test harnesses (build first; unblocks everything)

The audit's closing note is correct: the green suites don't cover the highest-risk boundaries because the
*harnesses* don't exist. Build these once; every later wave consumes them. (Size **M** total.)

| Harness | What it gives | First consumers |
|---|---|---|
| **Concurrent-PG barrier** — two pooled clients + a release barrier | Race assertions on check-then-write paths | BUG-008, 019, 024, 026, 027, 031, 041, 048 |
| **Injected repo/FS failure** — wrap a repo/`fs` call to throw after step *N* | Partial-write / rollback assertions | BUG-018, 021, 022, 028, 044 |
| **Bounded-stream / multipart & archive size probe** — emit *limit ± 1 byte*, count bytes allocated | Early-abort + bounded-memory assertions | BUG-006, 007, 042, 046 |
| **Proxy-aware auth client** — inject `X-Forwarded-For` with/without trust | Per-client vs collapsed rate-limit tests | BUG-040, 045 |
| **HTMX outcome probe** — assert response status/headers + that a form reset is gated on a confirmed-save signal | Save-failure / silent-loss tests | BUG-013, 033, 035 |
| **Exhaustive pupil-data fixture** — seed *every* pupil-linked table + identifiers in free text | Disposal / export completeness | BUG-039, 043, 029, 044 |
| **Scratch restore drill** — restore a matched DB+resource set into throwaway locations and integrity-check | Recovery as one atomic unit | BUG-009, 010 |

**Done when:** each harness has a self-test and is importable by the integration suite (`fileParallelism:
false` already serialises DB churn).

---

# Part A — Audited defect remediation

## Wave A1 — Trust boundaries & authorization 🔴 *(Critical + High privacy)*

The audit's #1 theme: boundary checks are exact/brittle or rely on UI flow rather than durable
server-side capability. **Fail closed.**

| BUG | Fix essence | Primary files | New test | Size |
|---|---|---|---|---|
| **001** *(Crit)* | Canonicalise apostrophe/hyphen/dash + NFD before matching; apply the **same** canonicalisation to replacement *and* the egress assertion | `services/redact.ts`, `llm/client.ts` | straight/curly + hyphen/en-dash pairs both directions; fail-closed assert separately | M |
| **037** *(Crit)* | Structured given/surname/preferred/alias matching with accent+separator canonicalisation; explicit policy for common-word collisions; fail closed before egress | `services/redact.ts`, `repos/pupils.ts`, `llm/client.ts` | given-only, surname-only, accentless, nickname, multi-part surname, initials, pupil-name collisions | L |
| **038** | Canonicalise Unicode/whitespace/punctuation before substring match; broaden + clinically review the phrase set; fail closed | `lib/markSafetyGate.ts`, `services/emailPoll.ts`, `services/marking.ts` | whitespace/newline/Unicode-dash/inflection/first-person-intent/obfuscation cases in one shared suite used by **every** AI entry point | M |
| **002** | Issue a signed single-use group token (or session-stored group+expiry) from `/pupil/names`; require + match it on `/pupil/pin` and `/pupil/login` | `routes/pupilAuth.ts`, `repos/pupilCredentials.ts` | direct `/pupil/pin` & `/pupil/login` fail before a valid code step; group swap after code fails | M |
| **003** | Require a resource link to the requester's allowed occurrence (or scoped signed URLs); mark editor illustrations explicitly instead of "all images public" | `auth/lockdown.ts`, `routes/resources.ts`, `services/resource.ts` | allow current-lesson image; deny unlinked / other-class / historic / teacher-only for pupil + TA | M |
| **012** | Consult the shared exception index before selecting/creating an occurrence; suppress free/cancelled/off-timetable; apply room/cover | `routes/me.ts`, `routes/ta.ts`, `services/exceptions.ts` | matrix: whole-day + per-lesson kinds on pupil now/next, TA now/next/deep-link, unaffected lessons | M |
| **030** | Authorize against a server-issued current-lesson capability (pupil+group+occurrence+resource version+allowed field set); define if/when historic edits are allowed | `repos/pupilWork.ts`, `routes/me.ts`, `lib/worksheetForm.ts` | deny other-session-group / historic / future / cancelled / unknown-field / stale-version; allow only rendered capability | L |
| **016** | Store `taAccountId` + a session/account version; revalidate active state per request (short cache); bump version on disable/delete/password-change/shared-clear; "revoke all TA sessions" | `auth/routes.ts`, `server.ts`, `routes/settingsPage.ts` | immediate eviction after each revocation action | M |
| **017** | Revalidate active pupil + enabled credential/session version in the pupil hook; bump on PIN reset/disable/archive/anonymise/erase; `pupilCanAccessOc` checks `active` | `server.ts`, `routes/pupils.ts`, `repos/pupilCredentials.ts`, `repos/pupilWork.ts` | immediate eviction per action; unrelated sessions unaffected | M |

**Dependencies:** 030 builds on 012's exception index and shares the capability idea with 002/017.
**Done when:** no roster name (any punctuation/partial), no safeguarding-variant, and no UI-only authz
path can cross its boundary; session revocation is immediate.

## Wave A2 — Limits before materialisation 🔴

Theme #3: content is buffered/allocated before the limit is checked.

| BUG | Fix essence | Primary files | New test | Size |
|---|---|---|---|---|
| **006** | Route-level multipart limit (or a counting stream that aborts at 12 MB) before `toBuffer()` | `server.ts`, `routes/me.ts`, `routes/resources.ts` | early abort + bounded memory at 12 MB+1; valid files still store | S |
| **007** | Stream folder parts to staging while incrementing a **shared** byte/file budget; check `acc.bytes + buf.length` *before* writing; per-entry + cumulative caps on nested-zip decompression | `routes/resources.ts`, `services/resourceImport.ts` | aggregate multipart overflow, oversized first entry, nested-archive overflow, compression bomb, depth, cleanup-after-abort | M |
| **042** | Reject oversized advertised IMAP literals before allocation; strict total/part caps; bound messages/bytes per poll; drop unneeded attachments | `lib/imapClient.ts`, `lib/mime.ts` | just-over-limit literal split across chunks, large attachment, many unread, malformed length, cleanup, continued processing | M |
| **046** | Conservative route-specific streaming limit for course-doc upload; reject on overflow before buffering; bound pages/conversion output/time | `routes/coverage.ts`, `server.ts`, `lib/docText.ts` | limit+1, forged MIME/extension, Office bomb, excessive pages, converter timeout, rejected-input cleanup | M |

**Done when:** no authenticated upload or mailbox message can force unbounded allocation; every path
enforces its policy *before* materialising bytes.

## Wave A3 — Auth, network & secrets hardening 🔴/🟠

| BUG | Fix essence | Primary files | New test | Size |
|---|---|---|---|---|
| **040** | Separate per-principal counters + a non-resetting IP/network backoff; a TA success must not clear teacher failures | `auth/routes.ts`, `auth/rateLimit.ts` | alternating teacher-fail/TA-success, named+shared TA, multi-IP, account-specific success, expiry, proxy IP | M |
| **041** | Serialize first-run setup in a transaction + advisory/row lock; conditional insert-when-absent; grant a session only to the winning insert | `routes/welcome.ts`, `repos/settings.ts` | two barriered identity requests → exactly one setup/session, one immutable winner | M |
| **045** | Configure `trustProxy` narrowly for the Caddy peer; ensure Caddy *replaces* forwarding headers; keep principal-specific controls | `server.ts`, `Caddyfile`, `auth/routes.ts`, `routes/pupilAuth.ts` | two forwarded clients keyed separately; spoofed header from direct conn rejected; IPv4/IPv6 | M |
| **032** | Bind dev ports to `127.0.0.1`; production override with no DB publication; app reachable only via Caddy on an internal network; fail startup if default DB password remains | `app/docker-compose.yml`, a prod override, `docs/SECURITY_AND_PRIVACY.md` | deployment check inspects effective bindings; only 80/443 reachable from another host | S |
| **050** | Render an empty IMAP-password field + a "configured" indicator; preserve secret on blank submit; overwrite only on explicit new value | `routes/settingsPage.ts` | stored secret never in HTML/test responses; blank preserves; explicit replace works | S |

**Done when:** the teacher password has a durable limit, first-run can't be raced, rate limits key on the
real client, the DB isn't LAN-exposed, and the mailbox secret never leaves server storage.

## Wave A4 — Assessment correctness 🟠 *(before trusting released marks / daily output)*

| BUG | Fix essence | Primary files | New test | Size |
|---|---|---|---|---|
| **004** | In one transaction, compare old/new answer value and delete/demote the mark when it changes (or lock released answers + audited reopen) | `repos/pupilWork.ts`, `repos/marking.ts`, `routes/me.ts` | suggested/confirmed/overridden/released/unchanged-resave/changed-resave | M |
| **005** | Compare returned slot multiset to the exact expected set **before any write**; reject empty/missing/duplicate/unknown; re-arm the queue job; batch in a transaction | `llm/schemas/markAnswers.ts`, `services/marking.ts`, `services/markingQueue.ts` | malformed-but-schema-valid responses → zero partial writes + retry scheduled | M |
| **015** | Return resource+version per marking answer and partition by exact provenance (or freeze one worksheet version once work starts) | `services/marking.ts`, `repos/marking.ts` | version changes, master/adapted switch, mixed pupils, removed/reused keys, exact scheme selection | M |
| **047** | Resolve date classification + exception effect before rendering `/today/print`; keep the read-only print from creating occurrences | `routes/lesson.ts`, `services/exceptions.ts` | term/holiday/closure/whole-day+per-lesson/replacement; assert HTML **and** occurrence-row counts | M |

**Done when:** a confirmed mark always describes the marked text, AI batches are all-or-nothing, mixed
provenance can't cross schemes, and the print view honours the calendar without materialising ghosts.

## Wave A5 — Recovery, disposal & SAR proof 🟠 *(run a real drill)*

| BUG | Fix essence | Primary files | New test | Size |
|---|---|---|---|---|
| **009** | Restore into a freshly-created empty DB (or a clean-first dump format) with a destructive confirmation; stop the app first | `scripts/restore.sh`, `scripts/backup.sh`, `scripts/verify-backup.sh` | bare-metal DR **and** replacing a populated DB, then start app + integrity check | M |
| **010** | Keep DB+resource artifacts temporary until both succeed; publish a manifest/checksums last; prune by complete set; verify both together | `scripts/backup.sh`, `scripts/verify-backup.sh`, `scripts/restore.sh` | fault-inject dump/tar/encrypt/move/prune; no incomplete set is "current"; verifier rejects mismatch | M |
| **039** | Data inventory + retention rule per pupil-linked/free-text record; redact or delete identifying narratives on disposal (don't call it anonymisation if re-identification survives) | `repos/pupils.ts`, `disposals.int.test.ts`, `docs/SECURITY_AND_PRIVACY.md` | seed every linked table + names in free text; assert documented postcondition over rows/search/files/backups | L |
| **043** | Build the SAR export from a versioned personal-data inventory; include completion/levels/unit-signal/devices/linked tasks+events/safeguarding rows (or document a legal exclusion) | `repos/pupils.ts` + the listed migrations | seed every pupil-bearing table/file; assert inclusion or explicit exclusion; schema-change checklist | M |
| **044** | Persist a deletion job/tombstone before removing the last pointer; idempotent retried processing + completion audit; orphan reconciliation by non-identifying object ID | `repos/pupils.ts`, `lib/resourceStore.ts` | fault unlink for one/all, restart worker, eventual deletion without rolling back DB disposal | M |
| **029** | Read the old screenshot pointer and unlink it after the new answer is durable (or use a stable extension-independent key); orphan-store reconciliation | `routes/me.ts`, `repos/pupils.ts`, `repos/pupilWork.ts` | same/different format, failed/concurrent replace, anonymise, erase | S |

**Done when:** a from-cold restore of a *matched* DB+resource set is proven, and both disposal modes leave
no identifying narrative or orphaned pupil bytes — demonstrated by an isolated drill, not just unit rows.

## Wave A6 — Transactional invariants 🟠

Theme #2/#4: multi-step writes need one commit boundary; invariants need DB enforcement, not query
convention. Each row below = "one logical op on one client/transaction with the right lock".

| BUG | Fix essence | Primary files | Size |
|---|---|---|---|
| **008** | Lock the resource row; allocate version + immutable UUID filename + current-pointer in one txn; delete staged file on rollback | `routes/resources.ts`, `repos/resources.ts`, `migrations/0006` | M |
| **014** | Build whole-unit placement on the same lock-aware cascade primitive as single inserts; skip/reject locked positions with a conflict preview | `routes/planner.ts`, `repos/delivery.ts` | M |
| **019** | Add unique `(course_id, version)` + partial unique `(course_id) WHERE active`; create/activate transactionally | `migrations/*`, `repos/schemes.ts` | S |
| **020** | Define clone semantics; copy labels, `kit_needed`, objectives, spec-maps **and** resource_links via old→new ID maps in the existing txn | `repos/schemes.ts` | M |
| **021** | Each planner cascade/swap/undo on one txn with locked occurrence-course rows; update in-memory undo only after commit | `routes/planner.ts`, `repos/delivery.ts` | M |
| **022** | Lock/claim the open review; update all suggested fields + status in one txn; dismiss `... WHERE status='open'` checking the returned row | `repos/reviews.ts`, `routes/schemes.ts`, `repos/schemes.ts` | S |
| **023** | Decide detach-vs-filter for a deactivated group course and make **every** consumer consistent; preserve historic occurrences explicitly | `repos/setup.ts`, `repos/occurrence.ts`, `repos/delivery.ts` | M |
| **024** | Lock+validate the target year, update with checked `RETURNING`; DB enforcement for exactly-one-current | `repos/setup.ts`, `routes/setup.ts` | S |
| **025** | Track a due cursor of date **+ timetabled lesson/slot**; enumerate the ordered slot stream, not dates | `services/recurrence.ts`, `repos/recurringTasks.ts` | M |
| **026** | DB unique occurrence key (definition + due slot/time) + `ON CONFLICT DO NOTHING`; update cursor transactionally | `repos/recurringTasks.ts`, `migrations/*` | S |
| **027** | Reserve the dedup key first (`INSERT ... ON CONFLICT RETURNING`); destination writes in the same txn with an explicit processing/complete state | `services/emailPoll.ts`, `repos/tasks.ts` | M |
| **028** | Stage under temp UUIDs; wrap resource+version+metadata in a txn; publish/rename after commit with compensating cleanup; enforce checksum-uniqueness policy in DB | `services/resourceImport.ts`, `repos/resources.ts`, `routes/resources.ts` | M |
| **031** | Acquire a PostgreSQL advisory lock for the whole migration run, then re-read applied set while held | `db/migrate.ts` | S |
| **048** | DB-backed lease/job row with atomic claim, `started`/`completed`, expiry, per-item idempotency; record completion only at a terminal state | `server.ts`, `repos/settings.ts`, the sweep service | M |

**Note:** 041 (first-run race) is fixed in **A3** but shares this wave's lock-the-claim pattern.
**Done when:** every listed op is atomic under the concurrent-PG barrier, and the four query-only
invariants (active scheme, recurring idempotency, migrator serialisation, one-current-year) are
DB-enforced.

## Wave A7 — Cost, audit & supply chain 🟠

| BUG | Fix essence | Primary files | New test | Size |
|---|---|---|---|---|
| **011** | Compute a conservative estimate centrally from model + input size + `maxTokens`; **reserve** budget atomically before the call; reconcile actual after | `llm/client.ts`, `config/llm.ts`, `services/reviewLesson.ts` | near-cap call for every model role + concurrent reservations never exceed policy | M |
| **018** | Durable outbox / append-only fallback for `ai_calls`; reconcile before further calls; at minimum reserve cost before the request (pairs with 011) | `llm/client.ts`, `repos/aiCalls.ts` | fault `insertAiCall` after provider success → eventual persistence + conservative accounting | M |
| **049** | Upgrade the `pdfjs-dist`→`canvas`→`tar` chain (or a tested override) to a fixed `tar`; rebuild from a clean lockfile; keep `npm audit` in CI | `app/package-lock.json`, `package.json` overrides | assert resolved `tar` outside vulnerable ranges; PDF extraction tests still pass; clean image build | S |

**Done when:** the monthly cap can't be overshot (estimate+reserve), no billed call is lost from the
audit, and `npm audit --omit=dev` is clean.

## Wave A8 — UX reliability & low-risk fixes 🟡

| BUG | Fix essence | Primary files | New test | Size |
|---|---|---|---|---|
| **013** | Preserve a failing HTTP status (don't 200 every HTMX error); reset a form only on an application-level confirmed-save signal | `server.ts`, `public/app.js`, the reset call-sites | 500/400/abort/timeout/success per form with after-request reset | M |
| **033** | Tag failure+success with a save-operation/field ID; clear the "not saved" toast only when *that* op succeeds; count multiple unsaved fields | `public/app.js`, poll emitters in `now.ts`/`focus.ts`/`pupilWork.ts` | unrelated success, background success, retry success, multiple failed fields, full nav | S |
| **034** | Decrement the in-flight counter on one terminal event (or track request IDs in a Set) | `public/app.js` | success/error/timeout/abort/overlapping requests | S |
| **035** | Validate trimmed non-empty titles at the route/repo boundary → field-specific 422 (or deliberately allow empty) | `routes/tasks.ts`, `repos/{tasks,schemes,recurringTasks}.ts` | empty/whitespace/max-length/ordinary autosave per entity | S |
| **036** | Preserve the explicit `?year=` on Prev/Next/This-week links until the user exits preview | `routes/timetable.ts` | nav URLs + labels for current/archived/future/invalid/no-year | S |

> **Quick win:** **036** is a one-spot follow-up to the just-shipped timetable year-resolution
> ([../app/src/routes/timetable.ts](../app/src/routes/timetable.ts)) — pull it forward if convenient.
**Done when:** no form silently clears on failure, the unsaved-warning is operation-scoped, and the
busy/nav indicators are accurate.

---

## Suggested execution sequence (Part A)

1. **Wave 0** (harnesses) — small, unblocks the rest.
2. **A1 → A2 → A3** — the privacy/security/exhaustion containment the audit ranks first.
3. **A4** — before trusting any released mark or daily print.
4. **A5** — then run an **isolated restore + disposal drill** (the real acceptance for recovery/SAR).
5. **A6** — transactional invariants (largest wave; can interleave with A4/A5 by subsystem).
6. **A7** — cost/audit/supply-chain.
7. **A8** — reliability polish; **036** can land any time.

Each wave is its own PR-sized slice, suite-green, with a CHANGELOG entry. Rough total: **~6 M-waves +
several S items** — weeks of evenings, but every wave independently raises the floor.

---

# Part B — Outstanding features & tasks

These are *planned, not defective* — the forward backlog once Part A's floor is solid. Full specs live in
the linked docs; this is the consolidated index with priority (🔴/🟠/🟡) and effort (S/M/L).

### B1 — Planner hardening *(already fully planned — [PHASE_14_PLAN.md](PHASE_14_PLAN.md))* 🟠

Phase 13 shipped the drag-drop planner with **no client-side tests**, one **silent-data-loss** edge
(14.2), and **no touch/keyboard path** (14.3). 14.1–14.6 are specified there. Several items overlap Part
A (14.2 silent loss ↔ BUG-013/033; 14.4 N+1 ↔ BUG-021) — **do them together** to avoid touching
`delivery.ts`/`planner.ts` twice.

### B2 — Wave 6 cover thread remainder *([FUTURE_WAVES.md](FUTURE_WAVES.md) §6)*

| # | What | Pri | Effort |
|---|---|---|---|
| 6.2 | **Recurring exceptions** — standing weekly duty / fortnightly meeting as a recurring lesson exception (reuse `recurrence` + `scheduleRecurring`), auto-folding into availability | 🟠 | S |
| 6.3 | **Cover ledger + Now actions** — owed/given tally from `cover` exceptions + one-tap "open cover note / start a work block" on Now | 🟡 | S |

### B3 — Wave 8 insight from the record *([FUTURE_WAVES.md](FUTURE_WAVES.md) §8)*

| # | What | Pri | Effort |
|---|---|---|---|
| 8.1 | **Class risk board** — per class: coverage % vs weeks-to-exam, pace band, marking backlog, last-taught; risk floats up. AI-free | 🟠 | M |
| 8.2 | **Where-my-time-goes** — weekly rollup over `work_blocks` (planned vs actual). AI-free | 🟡 | S |
| 8.3 | **Parents'-evening / term-review prep** — per-pupil talking-points draft from held data. **Needs the per-pupil privacy design pass** (tokens through the one wrapper, off by default, DPIA-gated) before any build | 🟡 | L |

### B4 — Wave 9 pupil-facing depth *([FUTURE_WAVES.md](FUTURE_WAVES.md) §9)*

| # | What | Pri | Effort |
|---|---|---|---|
| 9.1 | **Homework as data** — assign a worksheet as homework with a due date (reuse pupilWork + tasks + `before_next_lesson`); auto-marks on submit | 🟠 | M |
| 9.2 | **Pupil progress view** — read-only "what I've done / what's next / retrieval streak" | 🟡 | S |
| 9.3 | **More worksheet block types** — code-trace, label-the-diagram (hotspot), order-the-steps for OCR content | 🟡 | M |

### B5 — Phase 7 long-tail *([ROADMAP.md](ROADMAP.md) §7, [SPECIFICATION.md](SPECIFICATION.md) §8)*

- **SPECIFICATION §8 picks** (by what actually hurts): homework tracking *(↔ 9.1)*, exam-board key dates,
  duty rota, print queue. 🟡 / S–M each.
- **Deeper MS Teams integration** beyond the per-class link/checklist, if worth it. 🟡 / M.
- **Multi-provider LLM** (Anthropic / OpenAI / Gemini) — **scoped in ROADMAP §7**: keep `callLLM*` as the
  single redaction/audit boundary, add a thin provider-adapter (`fetch`-based), Settings provider+key+model
  selector, **and add each provider to [DPIA.md](DPIA.md) §6 as a sub-processor** before enabling. 🟡 / M.

### B6 — Deferred AI tails *(small follow-ons on shipped features)*

- **Morning brief (7.1):** tomorrow's lessons lacking a bound plan; the optional AI summary. 🟡 / S.
- **Spaced retrieval (7.3):** AI-generated recall *questions* + scheduled pre-generation on the 7.2
  cost-safety seam. 🟡 / M.
- **Reviewer-finding re-injection** into the cheap planners — gated until the base reviewer is proven to
  get applied (`lesson_reviews.status` adoption). 🟡 / M.

### Parked (deliberately not scheduled)

- **Multi-teacher v2** — [PHASE_MULTI_TEACHER_PLAN.md](PHASE_MULTI_TEACHER_PLAN.md); gated on real-use
  proof + a fresh whole-school DPIA.
- **pgvector embeddings** over course docs — lexical (tsvector) search first; revisit only if it surfaces
  junk.
- **Outbound email** — the app only ingests email; sending is a new egress surface to design deliberately.

### Operator actions outstanding *([NEXT_STEPS.md](NEXT_STEPS.md) §A — not dev work)*

Deploy the latest build to the Proxmox box and run first-year setup. These are the user's to run; listed
here only so they aren't lost.

---

## Programme acceptance

Part A is "done" when: every BUGREPORT finding has a red-then-green regression test; the Wave-0 harnesses
exist; an isolated DB+resource **restore-and-disposal drill** passes; `npm audit --omit=dev` is clean; and
the full suite (`npm test` + `npm run test:integration` + `npm run typecheck`) is green. Part B then
proceeds wave-by-wave under the same gate, AI boundary untouched.
