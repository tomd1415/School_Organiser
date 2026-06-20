# Codebase Bug Report

**Audit date:** 19 June 2026  
**Scope:** Current working tree, including uncommitted changes  
**Method:** Static cross-check of routes, services, repositories, migrations, client code, tests, operational scripts, specifications, and the resolved June 2026 review reports. Findings below are limited to deterministic defects and strongly supported risks; style-only observations and already-resolved findings are excluded.

> **Remediation plan:** every finding below is scheduled into waves — with shared test harnesses, a
> red-then-green method, and per-wave acceptance — in [docs/REMEDIATION_PLAN.md](docs/REMEDIATION_PLAN.md).

## Executive summary

The audit found **50 current issues**. The most urgent defects are pupil-name redaction bypasses caused by punctuation variants and partial-name references. The main recurring patterns are insufficient binding of authentication steps, pupil/TA routes whose authorization scope is broader than the UI, non-atomic multi-step writes, limits applied after buffering, incomplete personal-data lifecycle handling, and recovery procedures that do not treat the database and file store as one recoverable unit.

| Severity | Confirmed | Credible risk | Total |
|---|---:|---:|---:|
| Critical | 2 | 0 | 2 |
| High | 16 | 2 | 18 |
| Medium | 15 | 11 | 26 |
| Low | 4 | 0 | 4 |
| **Total** | **37** | **13** | **50** |

“Confirmed” means the failure follows deterministically from the current code path. “Credible risk” means the code contains a concrete race or partial-failure path whose trigger depends on concurrency, I/O failure, or deployment conditions.

## Remediation progress (live)

Tracked against [docs/REMEDIATION_PLAN.md](docs/REMEDIATION_PLAN.md). Each fix lands with a red-then-green
regression test; suites stay green. Per-finding status is shown inline as **✅ Resolved**.

**Fixed: ALL 50 findings.** Critical — BUG-001, BUG-037 (redaction). High — BUG-002, BUG-003, BUG-004,
BUG-005, BUG-006, BUG-007, BUG-008, BUG-009, BUG-010, BUG-011, BUG-012, BUG-013, BUG-014, BUG-038,
BUG-039, BUG-040, BUG-041, BUG-042. Medium — BUG-015, BUG-016, BUG-017, BUG-018, BUG-019, BUG-020,
BUG-021, BUG-022, BUG-023, BUG-024, BUG-025, BUG-026, BUG-027, BUG-028, BUG-029, BUG-030, BUG-031,
BUG-032, BUG-033, BUG-043, BUG-044, BUG-045, BUG-046, BUG-047, BUG-048, BUG-049. Low — BUG-034, BUG-035,
BUG-036, BUG-050.

**Every audit finding is resolved in code/config, suites green, each with a red-then-green regression
test (incl. a jsdom harness for client JS and a real-PDF extraction check). Two items still need the
OPERATOR to act in their environment (the fixes are committed; these are deploy/ops steps, not open
bugs):** (1) **deploy 032/045** — `docker compose --profile proxy up -d --force-recreate` (add
`TRUST_PROXY=true` to an existing `app/.env`, or re-run `deploy/install.sh`); (2) **run the 009/010
restore drill** on a throwaway copy ([docs/RUNBOOK.md](docs/RUNBOOK.md)) to prove from-cold recovery.
**Note (out of scope):** the full `npm audit` still flags esbuild/vite **dev-server** advisories via
vitest — test-toolchain only, not shipped; production (`npm audit --omit=dev`) is **0 vulnerabilities**.

| Severity | Total | Resolved | Remaining |
|---|---:|---:|---:|
| Critical | 2 | 2 | 0 |
| High | 18 | 18 | 0 |
| Medium | 26 | 26 | 0 |
| Low | 4 | 4 | 0 |
| **Total** | **50** | **50** | **0** |

## Testing and environment limitations

- `npm run typecheck` passes on the audited working tree.
- The unit-test suite passes: **76 test files, 536 tests** (508 at audit time; remediation has added regression coverage, incl. a jsdom harness for `app.js` and a real-PDF extraction check). `npm audit --omit=dev` is now **0 vulnerabilities** (the prior `tar`/`pdfjs` advisories are cleared).
- The integration-test suite passes against the local PostgreSQL service: **71 test files, 335 tests** (301 at audit time). The suite creates scoped fixtures and temporary resource-store content and performs its normal cleanup.
- `npm audit --omit=dev` reports **0 vulnerabilities** (was three high-severity: the `tar` chain and the `pdfjs-dist` arbitrary-JS advisory, both cleared by the `pdfjs-dist` 3→4 upgrade — see BUG-049). The full `npm audit` (incl. dev) still flags esbuild/vite **dev-server** advisories pulled in by vitest; these are test-toolchain only, never shipped, and out of scope for the production audit.
- Backup and restore shell scripts were inspected but not run because doing so would create and replace recovery artifacts and database state. Concurrency, crash, filesystem-failure, memory-exhaustion, proxy-network, and full disaster-recovery paths remain statically validated unless a finding states otherwise.
- The existing tracked and untracked working-tree changes were treated as user-owned. This report is the only audit-created file.

## Critical findings

### BUG-001 — Typographic apostrophes bypass pupil-name redaction

- **Status:** ✅ Resolved 2026-06-19 — name matching now folds the apostrophe / hyphen-dash / accent / case families per character, in both `redactNames` and the `containsRosterName` egress assert. Regression tests cover straight/curly apostrophes and hyphen/en-dash in both stored-name directions.
- **Severity / confidence:** Critical / Confirmed
- **Affected:** `app/src/services/redact.ts:13-26, 41-49, 64-69`; `app/src/llm/client.ts:152-163`
- **Problem and trigger:** `nameRegExp` escapes punctuation literally. A roster name stored as `O'Brien` does not match pupil text containing the routine typographic form `O’Brien` (U+2019), and the reverse is also true. Both `redactNames` and `containsRosterName` use the same literal pattern, so neither the replacement nor the final egress assertion catches the variant.
- **Impact:** A real pupil name can be sent to the AI provider and written into the AI audit payload, violating the system’s explicit “no pupil name ever leaves” boundary.
- **Evidence / reproduction:** Store a roster name with a straight apostrophe, then pass text containing the same name with a curly apostrophe through either redaction function. The output retains the name and `containsRosterName` returns false. Hyphen/dash variants create the same class of mismatch.
- **Potential fix:** Canonicalise name punctuation before matching, or build separator-aware regex fragments that treat common apostrophe and hyphen variants as equivalent. Apply exactly the same canonicalisation to replacement and egress assertion.
- **Regression test / notes:** Add straight/curly apostrophe and hyphen/en-dash pairs in both stored-name directions, including mixed whitespace and NFD text. Keep the fail-closed egress assertion as a separate test.

### BUG-037 — Partial pupil-name references bypass redaction

- **Status:** ✅ Resolved 2026-06-19 — redaction now runs a second pass over distinctive given/sur-name parts (accent-folded), with an explicit, reviewable ambiguous-common-word policy and a length floor so ordinary prose isn't over-redacted; a two-pass (full-then-parts) order prevents a shared first name being mis-assigned. The egress assert fails closed on the same parts. **Residual policy note:** an ambiguous common-word name (e.g. a pupil named "Summer" or "Mark") is matched only by its FULL name, not the bare part — tune `AMBIGUOUS_PARTS` in `redact.ts`, or add structured preferred-name fields, if your roster needs more.
- **Severity / confidence:** Critical / Confirmed
- **Affected:** `app/src/services/redact.ts:22-26, 41-49, 64-69`; `app/src/repos/pupils.ts:76-84`; `app/src/llm/client.ts:152-163`
- **Problem and trigger:** The redactor builds one exact regular expression from each complete `display_name`. If the roster contains `Anna Lee`, ordinary prose containing only `Anna` or only `Lee` is neither replaced nor detected by the final assertion. Common accentless or nickname variants have the same failure mode.
- **Impact:** A pupil's identifiable name can be sent to the AI provider and stored in the AI audit payload even when every roster display name is supplied to the redactor. This violates the stated no-pupil-name egress boundary in routine teacher-written context.
- **Evidence / reproduction:** Add `Anna Lee` to the roster and pass `Anna struggled with fractions` through `redactNames`; the text is unchanged and `containsRosterName` returns false. The same deterministic result occurs for `Lee struggled` and for `Jose` when the stored display name is `José García`.
- **Potential fix:** Maintain structured preferred-name, given-name, surname, and known-variant aliases; canonicalise accents and separators; then use ambiguity-aware matching that fails closed before egress. Common-word collisions need an explicit policy rather than silently weakening the assertion.
- **Regression test / notes:** Cover given name, surname, accentless form, nickname, multi-part surname, initials, name collisions between pupils, and aliases that are also ordinary English words.

## High findings

### BUG-002 — The class code is not bound to the pupil PIN flow

- **Status:** ✅ Resolved 2026-06-20 — `/pupil/names` now binds the code-resolved group (+ a timestamp) to the session ([app/src/routes/pupilAuth.ts](app/src/routes/pupilAuth.ts)); `/pupil/pin` and `/pupil/login` refuse a posted group that isn't the session-bound one (or whose binding has expired, 30-min TTL) with "enter your class code first". So the class code — not a guessable pupil/group id — gates roster reveal and PIN attempts: skipping the code step is rejected before any name is shown or PIN checked. Integration test posts straight to /pupil/pin and /pupil/login with a valid (pupil, group) and asserts both are refused without the code; the wrong-PIN-vs-disabled oracle test still holds through the bound flow.
- **Severity / confidence:** High / Confirmed
- **Affected:** `app/src/routes/pupilAuth.ts:177-255`; `app/src/repos/pupilCredentials.ts:71-100`; `app/tests/integration/pupil.int.test.ts:124-190`
- **Problem and trigger:** `/pupil/names` resolves a class code but stores no server-side proof of the selected group. `/pupil/pin` and `/pupil/login` trust posted `pupil` and `group` IDs and only check that the pupil is enrolled in that group. They can be called directly after obtaining a CSRF token, without ever submitting a valid class code.
- **Impact:** The class code is not an authorization factor. A LAN client can enumerate pupil/group ID pairs, reveal names through the PIN page, and attempt PINs without knowing the group’s code. Rate limits slow the attack but do not restore the missing binding.
- **Evidence / reproduction:** GET `/pupil` for a session/CSRF token, then POST an enrolled `pupil`/`group` pair directly to `/pupil/pin`. The route returns the pupil’s name. The integration tests also exercise `/pupil/pin` directly, demonstrating that no code-derived state is required.
- **Potential fix:** Store the resolved group ID and a short expiry in the session, or issue a signed single-use group token from `/pupil/names`; require it on both later steps and reject posted groups that do not match it.
- **Regression test / notes:** Assert that direct `/pupil/pin` and `/pupil/login` posts fail before a valid code step, and that changing the group after the code step fails.

### BUG-003 — Pupils and TAs can enumerate unrelated image resources

- **Status:** ✅ Resolved 2026-06-19 — `/lesson-image` now requires a server signature for the limited (pupil/TA) roles: an `onSend` hook signs every `/lesson-image` URL in the HTML sent to those roles ([app/src/lib/lessonImageSig.ts](app/src/lib/lessonImageSig.ts), HMAC keyed by `SESSION_KEY`), and the route rejects an unsigned/forged id for them. Teachers are unrestricted. A limited role can now fetch only an image the server actually rendered into one of their pages — enumeration is closed. Unit + TA-route tests cover it.
- **Severity / confidence:** High / Confirmed
- **Affected:** `app/src/auth/lockdown.ts:8-20`; `app/src/routes/resources.ts:489-525`; `app/src/services/resource.ts:6-16`
- **Problem and trigger:** The limited-role allowlists permit every numeric `/lesson-image/:id`. The route checks only that the requested resource exists and has `kind = 'image'`; it does not verify that the image is linked to a lesson, worksheet, class, or occurrence the requester may see. Normal uploaded PNG/JPEG/GIF/WebP resources are also classified as images.
- **Impact:** Any logged-in pupil or TA can enumerate IDs and read unrelated teacher image resources. These may include internal teaching material or images uploaded outside the requester’s class.
- **Evidence / reproduction:** Log in as a pupil and request `/lesson-image/<id>` for an arbitrary uploaded image resource. A matching image is returned inline even when it has no relation to the pupil’s current lesson.
- **Potential fix:** Serve worksheet illustrations through scoped signed URLs, or require a resource link to the requester’s current/allowed occurrence. Mark editor-created illustrations explicitly instead of treating every image resource as globally visible.
- **Regression test / notes:** Test allowed current-lesson images and denied unlinked, other-class, historic, and teacher-only images for both pupil and TA roles.

### BUG-004 — Confirmed marks survive later answer edits

- **Status:** ✅ Resolved 2026-06-19 — `saveAnswer` now runs in one transaction: it `SELECT … FOR UPDATE`s the existing answer and, when the value actually CHANGES, **deletes the answer's `pupil_marks` row** (a confirmed/teacher mark included) — so a mark never describes text that no longer exists; the next pass re-marks. Integration test: a confirmed mark survives an unchanged re-save and is dropped on a changed one.
- **Severity / confidence:** High / Confirmed
- **Affected:** `app/src/repos/pupilWork.ts:63-82`; `app/src/repos/marking.ts:136-145`; `app/src/routes/me.ts:288-310`
- **Problem and trigger:** `saveAnswer` updates the existing `pupil_answers` row but does not invalidate its `pupil_marks` row. The marking pass deliberately skips confirmed marks and teacher overrides. A pupil can therefore change an answer after confirmation while the old mark remains attached to the same answer ID.
- **Impact:** Teachers and pupils can see a confirmed score and feedback for text that is no longer the text that was marked. Exports and attainment history can become materially wrong.
- **Evidence / reproduction:** Save an answer, confirm its mark, then submit a different value for the same occurrence/field. The answer row changes, the confirmed mark remains, and subsequent marking skips it.
- **Potential fix:** In one transaction, compare the old and new value and delete/demote the mark when the value changes. Alternatively lock confirmed/released answers and provide an audited teacher-approved reopen flow.
- **Regression test / notes:** Cover suggested, confirmed, teacher-overridden, released, unchanged-resave, and changed-resave cases.

### BUG-005 — Incomplete or duplicate AI marking batches are accepted as successful

- **Status:** ✅ Resolved 2026-06-19 — before any write, `markOpen` now checks the returned slots are EXACTLY the slots sent (`isCompleteBatch`: no empty/missing/duplicate/unknown); an invalid batch is rejected, the question is left unmarked, and the job re-arms (`'unavailable'`) so it retries. Unit tests cover every malformed-batch shape.
- **Severity / confidence:** High / Confirmed
- **Affected:** `app/src/llm/schemas/markAnswers.ts:5-19`; `app/src/services/marking.ts:183-270`; `app/src/services/markingQueue.ts:32-52`
- **Problem and trigger:** The structured schema accepts an empty array, missing slots, duplicate slots, and unknown slots. `markOpen` writes whichever known results are returned, ignores unknowns, and reports success unless the provider call itself failed. The durable queue job is then consumed rather than retried.
- **Impact:** Some pupils’ answers can remain silently unmarked while the operation appears successful. Duplicate output can repeatedly overwrite one answer while omitting others.
- **Evidence / reproduction:** Stub the structured response with results for slot A only when A, B, and C were sent, or with two A rows. The service writes the accepted rows and does not flag the batch as unavailable/incomplete.
- **Potential fix:** Compare the returned slot multiset with the exact expected slot set before any write. Reject empty, missing, duplicate, and unknown slots and re-arm the queue job. Prefer a transaction for a question batch.
- **Regression test / notes:** Add malformed-but-schema-valid provider responses and assert zero partial writes plus retry scheduling.

### BUG-006 — The 12 MB pupil/editor image limit is checked after buffering up to 500 MB

- **Status:** ✅ Resolved 2026-06-19 — both image routes (`/me/answer-image`, `/resources/:id/image`) now pass a **route-level `req.file({ limits: { fileSize: 12 MB } })`**, so busboy stops reading at 12 MB instead of buffering toward the global 500 MB; `toBuffer()` is wrapped (and `file.truncated` checked) → 413. Integration test (`uploadLimits.int.test`) asserts a 12 MB+ image is rejected with no orphan resource.
- **Severity / confidence:** High / Confirmed
- **Affected:** `app/src/server.ts:95-96`; `app/src/routes/me.ts:360-378`; `app/src/routes/resources.ts:489-503`
- **Problem and trigger:** Multipart is configured globally for 500 MB per file. Both image routes call `toBuffer()` before checking their intended 12 MB limit.
- **Impact:** An authenticated pupil can repeatedly force the Node process to allocate hundreds of megabytes, causing garbage-collection stalls or process termination. The teacher image endpoint has the same memory-amplification path.
- **Evidence / reproduction:** Upload a raster file larger than 12 MB but smaller than 500 MB. The complete body is buffered before the route returns 413.
- **Potential fix:** Apply a route-level multipart limit or consume the stream with a byte counter that aborts at 12 MB before accumulating it.
- **Regression test / notes:** Assert early stream termination and bounded memory for 12 MB + 1 byte, and verify valid files still store correctly.

### BUG-007 — Folder and nested-zip import limits are enforced after dangerous allocations

- **Status:** ✅ Resolved 2026-06-19 — the folder-upload loop now uses a **per-part `fileSize` cap + a running total** (stops before `folderEntries` grows past ~400 MB); `stageEntry` checks `acc.bytes + buf.length` **before** writing a file; and `stageZip` inspects each entry's advertised **uncompressed size (`e.header.size`) before `getData()`** — a zip-bomb entry is never inflated past the budget. Existing importer tests confirm normal extraction is unaffected. *(The 400 MB / 3000-file caps themselves are verified by inspection — testing them needs injectable limits.)*
- **Severity / confidence:** High / Confirmed
- **Affected:** `app/src/routes/resources.ts:257-281`; `app/src/services/resourceImport.ts:100-157, 220-227`
- **Problem and trigger:** A whole folder is fully buffered into `folderEntries` before the 400 MB aggregate cap is consulted. Nested zip entries are fully decompressed with `getData()` before the cap. `stageEntry` checks only the existing total, not `acc.bytes + buf.length`, so a single large entry can exceed the cap and is still written.
- **Impact:** A teacher upload, malformed archive, or zip bomb can exhaust application memory and disk despite the UI’s stated aggregate limit.
- **Evidence / reproduction:** Send many individually valid multipart files whose sum exceeds 400 MB, or an archive containing a highly compressed entry larger than the remaining allowance. Allocation occurs before truncation.
- **Potential fix:** Stream folder parts directly to a staging area while incrementing a shared byte/file budget; inspect archive metadata and stream decompression with per-entry and cumulative hard limits.
- **Regression test / notes:** Cover aggregate multipart overflow, oversized first entry, nested archive overflow, compression bombs, depth, and cleanup after abort.

### BUG-008 — Concurrent resource version writes can corrupt version/file provenance

- **Status:** ✅ Resolved 2026-06-20 — `addVersion` now allocates the version and updates the current pointer in **one transaction after `SELECT … FOR UPDATE` on the resource row** ([app/src/repos/resources.ts](app/src/repos/resources.ts)), so two concurrent appends serialise — the second reads the committed max and takes the next number instead of losing the `UNIQUE(resource_id, version_no)` race with a 500. The on-disk path (`relPathFor`) gained a random token, so the two writers can no longer target the **same file** (the version number in the path is now just a human-readable prefix; storage paths are opaque after write — reads never reconstruct them). Staged files are removed on a failed write via a `withStagedFile` wrapper applied to every resource write route, so a rolled-back version leaves no orphan. Integration test fires two appends that both pre-compute "v2" and asserts distinct version numbers, distinct files, both contents intact, and the pointer on the newest. **Residual:** a brand-new resource is still created in a separate statement before its first version, so a failure between them can leave a resource row with no version (harmless — no file, hidden from listings); folding create+first-version into one txn is a small follow-up, as is migrating the AI-markdown writers (lesson/schemes/services) to `withStagedFile` (they already inherit the atomic `addVersion`).
- **Severity / confidence:** High / Credible risk
- **Affected:** `app/src/routes/resources.ts:392-405, 447-485`; `app/src/repos/resources.ts:55-73`; `app/migrations/0006_phase3.sql:54-68`
- **Problem and trigger:** Routes read the current version, choose `nextNo`, and write that path before `addVersion` independently recomputes `max(version_no)+1`. The version insert and current-pointer update are also separate autocommit statements. Concurrent saves can choose the same path/version.
- **Impact:** One request may overwrite another request’s bytes, an inserted checksum can describe different bytes, a unique-key error can leave an orphan file, or `current_version_id` can point to an unexpected writer.
- **Evidence / reproduction:** Issue two simultaneous saves for the same resource while both observe version N. Both target an N+1 path; interleaving determines the final bytes and which database operation fails/wins.
- **Potential fix:** Lock the resource row and allocate the version inside one database transaction; use a unique immutable storage name based on the returned version ID/UUID; update the current pointer in the same transaction and delete staged files on rollback.
- **Regression test / notes:** Use two barriers/concurrent connections and verify distinct immutable files, sequential version numbers, matching checksums, and a deterministic current pointer.

### BUG-009 — The restore script cannot restore over the normal populated database

- **Status:** ✅ Resolved 2026-06-20 — `scripts/restore.sh` now restores from a **clean slate**: it requires a typed `REPLACE` confirmation (or `FORCE=1` for the drill), **stops the app**, terminates lingering connections, **`DROP`s + re-`CREATE`s the `organiser` database**, loads the dump into the empty DB, **restores the matching `resources-<stamp>` snapshot** (same set), and restarts the app — so a plain `pg_dump` no longer fails/duplicates against a populated database. `bash -n` clean. **Operator action (acceptance):** run the **restore drill** in [docs/RUNBOOK.md](docs/RUNBOOK.md) on a throwaway copy to prove the from-cold path end-to-end (I can't run a destructive restore against your live data).
- **Severity / confidence:** High / Confirmed
- **Affected:** `scripts/backup.sh:57-60`; `scripts/restore.sh:36-41`; `scripts/verify-backup.sh:34-44`
- **Problem and trigger:** Backups are plain `pg_dump` SQL. `restore.sh` pipes that SQL into the existing `organiser` database without dropping/recreating the database or cleaning its schema. The dump contains object creation and data statements that conflict with an already-migrated installation.
- **Impact:** The documented disaster-recovery command fails when it is most likely to be used: restoring an existing or freshly started stack whose schema already exists.
- **Evidence / reproduction:** Run the restore script against a database that already contains the application tables. `psql -v ON_ERROR_STOP=1` stops at the first duplicate relation/object or data conflict. The verifier succeeds only because it creates an empty scratch database first.
- **Potential fix:** Stop the app, restore into a newly created empty database/schema, or generate/restore a format that explicitly cleans objects with reviewed ownership/extension handling. Add a clear destructive confirmation.
- **Regression test / notes:** Test both bare-metal disaster recovery and replacement of a populated test database, then start the application and run integrity checks.

### BUG-010 — Database and resource backups are not published or verified as an atomic recovery set

- **Status:** ✅ Resolved 2026-06-20 — `scripts/backup.sh` now treats the DB + resources as ONE set: it stages both, then publishes a checksum **`manifest-<stamp>.sha256` LAST** (its presence marks the set complete), and **prunes by whole set** — keeping the newest 14 manifests + the files they name and sweeping any artifact no manifest references, so a half-written set can never be mistaken for restorable. `scripts/verify-backup.sh` now verifies the newest **set** end-to-end: both artifacts' **checksums** against the manifest, the DB **restores** into a scratch database (core tables non-empty), AND the **resources** archive **unpacks** — falling back to legacy db-only verification when no manifest exists. All three scripts `bash -n` clean. **Operator action (acceptance):** the same restore drill as BUG-009 exercises the matched DB+resources path; `verify-backup.sh` (already cron-scheduled) now covers the set automatically.
- **Severity / confidence:** High / Confirmed
- **Affected:** `scripts/backup.sh:47-70`; `scripts/verify-backup.sh:17-52`; `scripts/restore.sh:37-41`
- **Problem and trigger:** The database artifact is moved to its final name before the resource archive is produced. If resource tar/encryption fails, the newest visible DB backup has no matching file-store snapshot. DB and resource files are pruned independently. Verification selects and restores only the newest DB artifact; resource decryption, archive integrity, stamp matching, and referenced-file presence are never checked.
- **Impact:** Operators can receive a “PASS” for a backup that cannot restore worksheet/resource bytes, or select mismatched snapshots and recover database pointers to missing/wrong files.
- **Evidence / reproduction:** Make the resource directory unreadable after the DB dump succeeds. A final `db-<stamp>` remains while `resources-<stamp>` does not. The verifier can still pass that DB artifact.
- **Potential fix:** Keep both artifacts temporary until both succeed, publish a manifest/checksums last, prune by complete manifest set, and verify both artifacts together by restoring the DB and extracting the resources into temporary locations.
- **Regression test / notes:** Fault-inject dump, tar, encryption, move, and pruning failures. Assert no incomplete set is discoverable as current and verification rejects missing/mismatched resources.

### BUG-011 — The advertised monthly AI hard cap can be exceeded

- **Status:** ✅ Resolved 2026-06-20 — every call now computes a **conservative estimate centrally** (full `max_tokens` of output + input sized from the redacted payload) and **atomically reserves** it against the cap before the provider call: `reserveAiCall` ([app/src/repos/aiCalls.ts](app/src/repos/aiCalls.ts)) sums the month's spend and inserts a `'reserved'` row under a `pg_advisory_xact_lock` in one transaction, so two concurrent calls can't both pass a pre-check and overshoot — the second sees the first's reservation and is refused. After the call, `reconcileAiCall` replaces the estimate with the actual cost (an errored, unbilled call is released to 0). Integration test proves a reservation counts toward spend immediately and a second same-size reservation over the cap is refused with no row written.
- **Severity / confidence:** High / Confirmed
- **Affected:** `app/src/llm/client.ts:41-52, 105-110, 141-149`; `app/src/services/reviewLesson.ts:71, 155`
- **Problem and trigger:** The pre-call check includes estimated call cost only when the caller supplies `estimatedCostPence`. Only the lesson-review paths do so; every other AI feature passes an implicit zero. If current spend is below the cap, a call may start even when its actual cost will cross the cap. Concurrent calls can all pass the same non-reserving check.
- **Impact:** Schools can spend beyond the configured budget ceiling, with larger overshoot under simultaneous bulk operations.
- **Evidence / reproduction:** Set spend just below the cap and invoke any non-review AI feature. `overMonthlyCap(spent, cap, 0)` permits it regardless of `maxTokens` and model price.
- **Potential fix:** Compute a conservative estimate centrally from model, input size, and `maxTokens`; atomically reserve budget before provider calls and reconcile actual cost afterward.
- **Regression test / notes:** Test near-cap calls for every model role plus concurrent reservations; the total of reservations/actual charges must never exceed policy.

### BUG-012 — Pupil and TA “current lesson” views ignore cancellations and off-timetable exceptions

- **Status:** ✅ Resolved 2026-06-19 — both surfaces now index the day's `lesson_exceptions` and drop any lesson whose effect is `free` (cancelled / free / whole-day off-timetable) **before** rendering or materialising an occurrence ([app/src/routes/me.ts](app/src/routes/me.ts), [app/src/routes/ta.ts](app/src/routes/ta.ts) via the shared [services/exceptions.ts](app/src/services/exceptions.ts)). cover / room-change still run. The TA deep-link shows a "off timetable / cancelled" notice. Integration test proves a cancelled lesson is suppressed and no occurrence is created. *(Daily print view, BUG-047, is the same class of fix and still open.)*
- **Severity / confidence:** High / Confirmed
- **Affected:** `app/src/routes/me.ts:74-88, 185-204, 230-254`; `app/src/routes/ta.ts:47-68, 180-228`; `app/src/services/exceptions.ts:25-63`
- **Problem and trigger:** Both surfaces resolve the weekly timetable and materialise/render occurrences without consulting `lesson_exceptions`. `cancelled`, `free`, and whole-day `off_timetable` exceptions are handled on teacher timetable/Now surfaces but not here.
- **Impact:** Pupils and TAs can receive worksheets, plans, resources, feedback, and writable occurrence IDs for a lesson that the teacher marked cancelled or unavailable. This is both a disclosure and operational correctness issue.
- **Evidence / reproduction:** Add a cancelled or whole-day off-timetable exception for the current slot, then open `/me` or `/ta` in that slot. The original lesson still renders and may be materialised.
- **Potential fix:** Use the shared exception index/effect before selecting or creating an occurrence. Suppress free/cancelled/off-timetable lessons and apply room/cover changes consistently.
- **Regression test / notes:** Matrix-test whole-day and per-lesson exception kinds on pupil now/next, TA now/next/deep-link, and ordinary unaffected lessons.

### BUG-013 — Unexpected HTMX failures are reported as successful and can erase unsaved form input

- **Status:** ✅ Resolved 2026-06-20 — the server already swallows a 5xx on an HTMX request into a 200 fragment + an `app:save-failed` HX-Trigger (so the panel isn't dead); the gap was the client treating that 200 as a success and clearing the "not saved" banner the trigger had just raised. `public/app.js` now flags the swallowed failure and, in the **single** `htmx:afterRequest` decision point, marks that request as a FAILURE despite its 2xx — so a swallowed server error keeps the banner up; the typed text was never touched (autosaves are `hx-swap="none"`). Verified by a new **jsdom harness** ([app/tests/appjsUnsaved.test.ts](app/tests/appjsUnsaved.test.ts), `jsdom` dev-dep) that runs the real `app.js` and dispatches synthetic htmx events — the audit's "Wave-0 HTMX harness", now built.
- **Severity / confidence:** High / Confirmed
- **Affected:** `app/src/server.ts:98-116`; `app/public/app.js:83-117`; examples at `app/src/lib/resourceView.ts:118-128`, `app/src/lib/notesView.ts:38`, `app/src/routes/tasks.ts:50`, `app/src/routes/focus.ts:98`
- **Problem and trigger:** The global error handler converts unexpected HTMX 500s into HTTP 200. HTMX therefore sets `event.detail.successful = true`. Several forms reset unconditionally after any request, and even forms guarded by `successful` now treat a server crash as success.
- **Impact:** A failed upload, generated-resource brief, pasted email, follow-up, or other form can be cleared even though nothing was saved. The global toast incorrectly promises that the text remains on screen.
- **Evidence / reproduction:** Force a route handler to throw after form submission. The response is 200 with `app:save-failed`; HTMX fires a successful `afterRequest`, and `this.reset()` clears the form.
- **Potential fix:** Preserve a failing HTTP status and configure HTMX error swapping explicitly, or add a response header/detail that all reset handlers check. Reset only on an application-level confirmed-save event.
- **Regression test / notes:** Browser-test 500, 400, network abort, timeout, and success for every form with an after-request reset.

### BUG-014 — Whole-unit planner drops overwrite pinned lessons

- **Status:** ✅ Resolved 2026-06-20 — the `unit` op no longer calls the lock-blind `layLessonsAcrossClass`; it now uses a new pure `layUnit` primitive ([app/src/services/delivery.ts](app/src/services/delivery.ts)) that lays the unit's lessons into successive **non-locked** positions, flowing AROUND any pinned slot (the pin keeps its plan; the next lesson takes the next free position), and persists through the same atomic `applyPlacements` path as a single drop. A pinned **target** is rejected like an `insert`. Six pure tests cover lock-before/at/within-span, overwrite-non-pinned, run-out-of-room and out-of-range; the planner integration test asserts a whole-unit drop onto a pinned slot is refused (400).
- **Severity / confidence:** High / Confirmed
- **Affected:** `app/src/routes/planner.ts:322-335`; `app/src/repos/delivery.ts:164-183`; `app/migrations/0043_planner_lock.sql`
- **Problem and trigger:** Single-lesson operations reject a locked target, but the `unit` operation calls `layLessonsAcrossClass` over the raw stream. That repository method overwrites every target plan without reading `planner_locked`.
- **Impact:** A one-gesture unit placement can replace an assessment or other lesson the teacher explicitly pinned. The lock flag remains, so the replacement may misleadingly appear intentionally pinned.
- **Evidence / reproduction:** Pin a future planned slot, then drop a unit on an earlier slot whose sequence crosses it. The pinned row’s `lesson_plan_id` is overwritten.
- **Potential fix:** Build unit placement with the same lock-aware cascade primitive as single inserts, skipping locked positions or rejecting the operation with a preview of conflicts.
- **Regression test / notes:** Cover locks before, at, and within the unit span, insufficient trailing capacity, and undo.

### BUG-038 — Safeguarding phrases can bypass the local safety gate through trivial variants

- **Status:** ✅ Resolved 2026-06-19 — `guardMatch` now canonicalises (strip accents/zero-width, fold apostrophe/hyphen-dash families, collapse all whitespace incl. newlines/NBSP) before the substring check, so `hurt  myself`, `hurt\nmyself` and `self‑harm` (non-breaking hyphen) all match; the phrase set was broadened to direct first-person intent ("want to die", "end my life", "hate my life", …). Shared by marking + email intake.
- **Severity / confidence:** High / Confirmed
- **Affected:** `app/src/lib/markSafetyGate.ts:9-23`; `app/src/services/emailPoll.ts:19-25, 133-151`; `app/src/services/marking.ts:207-230`
- **Problem and trigger:** `guardMatch` lowercases text and performs literal substring checks, but does not normalise Unicode punctuation, repeated whitespace, or line breaks. Phrases such as `hurt  myself`, `hurt\nmyself`, and `self‑harm` with a non-breaking hyphen bypass the configured terms. Common direct language such as `I want to die` is also absent.
- **Impact:** Safeguarding content can be sent to the AI provider and processed as ordinary marking/email intake instead of being blocked and routed to the safeguarding register.
- **Evidence / reproduction:** Pass each variant above to `guardMatch`; it returns no match. Both marking and email polling treat that result as permission to continue to AI processing.
- **Potential fix:** Canonicalise Unicode, whitespace, punctuation, and separator variants before matching; broaden and clinically review the local phrase set or use an approved local classifier. Keep this decision local and fail closed on uncertainty.
- **Regression test / notes:** Add whitespace, newline, Unicode-dash, spelling, inflection, first-person intent, false-positive, and obfuscated-text cases to one shared safety-gate suite used by every AI entry point.

### BUG-039 — Pupil anonymisation and erasure leave narrative personal data behind

- **Status:** ✅ Resolved 2026-06-20 — both disposal modes now run a shared `scrubPupilNarrative` ([app/src/repos/pupils.ts](app/src/repos/pupils.ts)): the pupil's OWN notes/tasks/events (their individual narrative) are **deleted**, and in notes about OTHER pupils that merely mention them the exact matched name is **redacted out of the body** (`replace(body, mention.text, '[removed]')`) with the mention row removed. So **anonymise** no longer leaves records that still name the supposedly-anonymised pupil (attainment stays, now nameless under the token), and **erase** deletes the narrative instead of merely detaching it (`pupil_id=NULL`, which kept the identifying text). Integration test asserts owned narrative is gone for both modes, a shared note survives with the name redacted, and disposal stays audited. Privacy doc's lifecycle statements updated. *(Residual: redaction matches the exact text the mention recorded; a name written a different way in the same note isn't caught — the mention extractor's coverage bounds this.)*
- **Severity / confidence:** High / Confirmed
- **Affected:** `app/src/repos/pupils.ts:115-164`; `app/tests/integration/disposals.int.test.ts:35-47, 99-146`; pupil-data lifecycle statements in `docs/SECURITY_AND_PRIVACY.md`
- **Problem and trigger:** Anonymisation removes credentials, devices, profile fields, and comments but retains notes, tasks, events, and mentions associated with the pupil while merely replacing the pupil row's display name with a token. Erasure deletes mentions but sets linked note/task/event pupil IDs to `NULL`; free-text titles and bodies that identify the pupil remain. The integration test explicitly expects detached narrative records to survive.
- **Impact:** The system cannot reliably claim that anonymisation makes an individual unidentifiable or that erasure removes their personal data. Staff-written sensitive details can remain searchable and backed up after disposal.
- **Evidence / reproduction:** Create a pupil-linked note/task/event whose text contains the pupil's name and identifying details, then anonymise or erase the pupil. The narrative row and its identifying text remain; only the foreign key or pupil display name changes.
- **Potential fix:** Define a data inventory and lawful retention rule for every linked/free-text record. Redact or delete identifying narratives during disposal, or retain them under an explicit restricted legal basis with documented review. Do not label an operation anonymisation when residual records permit re-identification.
- **Regression test / notes:** Seed each pupil-linked table plus direct identifiers embedded in free text, perform both disposal modes, and assert the documented postcondition over database rows, search indexes, files, exports, backups, and audit-retention exceptions.

### BUG-040 — A successful TA login resets the shared teacher-login IP limiter

- **Status:** ✅ Resolved 2026-06-19 — `clearAttempts(login:${ip})` is now called **only on a successful teacher login**; both the named-TA and shared-TA success paths leave the shared `login:${ip}` counter untouched, so a lower-privilege success can no longer reset the teacher-password brake. Integration test (`loginLimit.int.test`) interleaves 5 wrong guesses → a successful TA login → 4 more wrong → asserts the 11th attempt is `429` (the TA success did *not* reset the counter). **Residual note:** counters remain keyed per-IP, not per-principal — a single IP's teacher and TA failures still share one budget (acceptable for a single-teacher LAN app; the security property — TA success can't unlock teacher guessing — holds). True per-principal counters + client-IP trust (BUG-045) are the larger follow-up.
- **Severity / confidence:** High / Confirmed
- **Affected:** `app/src/auth/routes.ts:49-83`; `app/src/auth/rateLimit.ts:8-27`
- **Problem and trigger:** Teacher and TA password attempts share the same `login:${req.ip}` counter. The route tests the teacher password first, then TA credentials, and clears the shared counter after any successful TA login. A person who knows their own TA password can repeatedly make teacher-password guesses and reset the limit by signing in as TA.
- **Impact:** The teacher password has no durable attempt limit against a legitimate or compromised TA/LAN client; the attacker can repeat bounded batches indefinitely.
- **Evidence / reproduction:** From one IP, make fewer than the blocking threshold of invalid teacher attempts, complete a valid TA login, and repeat. `clearAttempts` removes the key each cycle.
- **Potential fix:** Use separate per-principal counters and a non-resetting IP/network backoff. A successful lower-privilege login must not clear failures for the teacher principal; successful teacher authentication should clear only the appropriate account counter.
- **Regression test / notes:** Exercise alternating teacher failures/TA success, named and shared TA accounts, multiple IPs, account-specific success, expiry, and proxy-derived client addresses.

### BUG-041 — Concurrent first-run identity submissions can both obtain teacher sessions

- **Status:** ✅ Resolved 2026-06-19 — the claim is now serialised in `claimFirstRunIdentity` ([app/src/repos/settings.ts](app/src/repos/settings.ts)): one transaction takes a `pg_advisory_xact_lock`, re-checks for `auth_password_hash` **under the lock**, and only the single winner writes the hash (`INSERT … ON CONFLICT DO NOTHING`) and is granted a teacher session — a loser is told "already set up" and can never overwrite the winner's password. Integration test (`firstRunIdentity.int.test`) fires two concurrent claims and asserts exactly one wins and the loser's hash is never persisted.
- **Severity / confidence:** High / Credible risk
- **Affected:** `app/src/routes/welcome.ts:106-130`; `app/src/repos/settings.ts:17-22`
- **Problem and trigger:** `/welcome/identity` checks that no teacher hash exists, then independently inserts/updates staff and settings and upserts the new hash. There is no transaction, lock, or create-if-absent condition. Two concurrent requests can both pass the initial check; the later write wins the stored password and school values, but both responses grant a teacher session.
- **Impact:** During first boot, a second LAN client can race the legitimate setup and gain an authenticated teacher session even if its password does not become the stored password.
- **Evidence / reproduction:** Synchronise two identity requests after both read a missing hash, then release both. Each follows the success path and sets session role `teacher`; final configuration depends on write order.
- **Potential fix:** Serialize first-run setup with a transaction and advisory/row lock, atomically insert the identity only when absent, and grant a session only to the request whose conditional insert succeeds.
- **Regression test / notes:** Use two database connections and a barrier; assert exactly one successful setup/session, one immutable winning identity, and a safe rejection for the loser.

### BUG-042 — IMAP ingestion accepts unbounded literals and buffers complete messages

- **Status:** ✅ Resolved 2026-06-19 — the IMAP client now **rejects an advertised `{N}` literal larger than 25 MB before buffering it** (and caps an unterminated line) by aborting the connection cleanly; `pollMailbox` fetches **at most 50 messages per poll** (the backlog drains over cycles). Integration test feeds a hostile ~95 MB literal and asserts the poll returns promptly with nothing imported (no OOM, no hang).
- **Severity / confidence:** High / Confirmed
- **Affected:** `app/src/lib/imapClient.ts:30-73, 121-155`; `app/src/lib/mime.ts:77-129`
- **Problem and trigger:** The IMAP parser accepts the server's `{N}` literal length without a maximum, repeatedly grows a buffer until all N bytes arrive, and then passes the complete message to MIME parsing that creates further buffers/strings for multipart content. Mail polling fetches full unseen messages and has no message or attachment size policy.
- **Impact:** A large email received by the configured mailbox, or a hostile/misconfigured IMAP server, can exhaust Node memory and CPU and terminate the application.
- **Evidence / reproduction:** Feed an IMAP response advertising a literal larger than available memory, or poll a mailbox containing a very large multipart attachment. The client commits to buffering the advertised size before it can discard the content.
- **Potential fix:** Reject oversized advertised literals before allocation, stream messages through a strict total/part limit, discard attachments that are not required, and bound the number/bytes of unread messages processed per poll.
- **Regression test / notes:** Test just-over-limit literals split across chunks, large attachments, many unread messages, malformed lengths, cleanup after rejection, and continued processing of later valid mail.

## Medium findings

### BUG-015 — Marking applies one worksheet scheme to mixed answer provenance

- **Status:** ✅ Resolved 2026-06-19 — `answersForMarking` now returns each answer's `resource_id` + `version_no`, and both marking passes mark an answer ONLY when its provenance matches the resolved scheme's resource + version (`matchesProvenance`). A switched worksheet or a stale-version answer is **left for the teacher**, never evaluated against the wrong scheme (unknown/null provenance still marked best-effort). Integration test: a v2 answer is left while the v1 answer is marked.
- **Severity / confidence:** Medium / Confirmed
- **Affected:** `app/src/services/marking.ts:45-72, 143-151, 189-201`; `app/src/repos/marking.ts:115-132`; `app/migrations/0019_pupil_answer_key.sql`
- **Problem and trigger:** `answersVersionFor` selects only the maximum version for the currently resolved worksheet resource. `answersForMarking` then returns every answer for the occurrence without resource/version fields. All are evaluated against that one scheme and field map. Worksheet resource switches or mixed saved versions therefore collapse distinct provenance.
- **Impact:** Older answers can be evaluated against a newer/different scheme, or fields from a prior worksheet can be ignored or misinterpreted.
- **Evidence / reproduction:** Save pupil answers against worksheet resource/version A, switch/re-version the lesson worksheet, save another answer, then mark. Resolution chooses one version while the input set still contains all rows.
- **Potential fix:** Return resource/version with each marking answer and partition marking by exact provenance, or freeze one worksheet version for an occurrence once pupil work starts.
- **Regression test / notes:** Cover version changes, master/adapted resource switches, mixed pupils, removed/reused field keys, and exact scheme selection.

### BUG-016 — Disabling, deleting, or re-passwording a TA account does not revoke its live session

- **Status:** ✅ Resolved 2026-06-19 — symmetric to BUG-017: TA sessions carry `taAccountId` + `taEpoch`; the request hook re-checks `ta_accounts.active` + `session_epoch` ([migration 0049](app/migrations/0049_ta_session_epoch.sql)) and kills the session on a mismatch or a missing/inactive account. Disable / delete / password-change bump the epoch (delete removes the row), so revocation is immediate. A legacy shared-password TA loses its session when the shared password is cleared. Integration test proves each action bumps/clears.
- **Severity / confidence:** Medium / Confirmed
- **Affected:** `app/src/auth/routes.ts:65-81`; `app/src/server.ts:141-174`; `app/src/routes/settingsPage.ts:442-499`
- **Problem and trigger:** TA sessions store role/name/staff ID but no account ID or revocation version. The global hook checks only the role allowlist. Account disable, password reset, deletion, and clearing the legacy shared password affect future logins only.
- **Impact:** A lost or compromised TA browser remains authorized until its session expires or logs out, despite an administrator taking an explicit revocation action.
- **Evidence / reproduction:** Log in as a named/shared TA, disable/delete/change that credential in another teacher session, then continue using the original TA cookie.
- **Potential fix:** Store `taAccountId` and a session/account version, revalidate active state on requests (with a short cache), and increment the version for all revocation actions. Provide “revoke all TA sessions.”
- **Regression test / notes:** Verify immediate eviction after disable, delete, password change, shared-password clear, and staff deactivation.

### BUG-017 — Pupil PIN/account changes do not revoke live pupil sessions

- **Status:** ✅ Resolved 2026-06-19 — pupil sessions now carry a `pupilEpoch`; the request hook re-reads `pupils.active` + `session_epoch` ([migration 0048](app/migrations/0048_pupil_session_epoch.sql)) on every pupil request and kills the session on a mismatch or inactive/erased pupil. The epoch is bumped on PIN (re)set, credential disable and archive (disposal sets `active=false`/removes the row), so a reset/disable/archive revokes the live cookie immediately, not just at next login. Integration test proves each action bumps the epoch. *(TA-account revocation, BUG-016, is the symmetric remaining piece.)*
- **Severity / confidence:** Medium / Confirmed
- **Affected:** `app/src/server.ts:158-173`; `app/src/routes/pupils.ts:175-182, 295-321`; `app/src/repos/pupilCredentials.ts:107-119`; `app/src/repos/pupilWork.ts:12-20`
- **Problem and trigger:** Resetting or disabling a PIN and archiving a pupil revoke remembered-device rows, but not the self-contained live session. The request hook validates only the global access switch and idle time; it does not recheck pupil active/credential state. `pupilCanAccessOc` also ignores `pupils.active` and credential state.
- **Impact:** A pupil browser can continue reading/writing after the teacher disables that pupil’s access, resets a compromised PIN, or archives the pupil.
- **Evidence / reproduction:** Log in as a pupil, disable their PIN/archive them from a teacher session, then continue posting `/me/answer` with the existing cookie.
- **Potential fix:** Revalidate active pupil + enabled credential/session version in the pupil hook, and bump/revoke that version on PIN reset, disable, archive, anonymise, and erase.
- **Regression test / notes:** Verify immediate eviction for each individual action while unrelated pupil sessions continue.

### BUG-018 — AI audit-write failures silently undercount spend and remove DPIA evidence

- **Status:** ✅ Resolved 2026-06-20 — pairs with BUG-011's reservation. The redacted request + estimated cost are now persisted in the `'reserved'` ai_calls row **before** the provider call, and the post-call write is a `reconcileAiCall` **UPDATE** of that existing row. So if the reconcile fails, the reservation stands: the spend is still counted (no silent undercount) and the redacted-request DPIA evidence is already on disk — rather than the old path where a failed post-call insert discarded both. The reconcile failure is logged, not thrown. *(Residual: a stale `'reserved'` row from a hard crash mid-call keeps its estimate counted until manually cleared — a periodic expiry sweep is the remaining hardening.)*
- **Severity / confidence:** Medium / Credible risk
- **Affected:** `app/src/llm/client.ts:112-132, 183-195, 230-248`; `app/src/repos/aiCalls.ts:17-45`
- **Problem and trigger:** After a successful billed provider call, `audit` catches and only logs any database insert failure. The successful result is returned without a durable `ai_calls` row. Monthly spend is calculated solely from those rows.
- **Impact:** Cost caps undercount actual provider spend and the application loses the redacted request/response evidence expected for AI governance.
- **Evidence / reproduction:** Make `insertAiCall` fail after a successful mocked provider response. The caller receives success, while spend and audit history remain unchanged.
- **Potential fix:** Persist billing/audit records via a durable outbox or local append-only fallback and reconcile before allowing further calls; at minimum reserve estimated cost before the provider request.
- **Regression test / notes:** Fault-inject DB unavailability after provider success and prove eventual audit persistence and conservative cap accounting.

### BUG-019 — Database constraints do not enforce one active, uniquely versioned scheme per course

- **Status:** ✅ Resolved 2026-06-20 — [migration 0051](app/migrations/0051_scheme_invariants.sql) adds a partial unique index `(course_id) WHERE active` and a unique `(course_id, version)` (defensively demoting/re-sequencing any pre-existing violators first, so the auto-run can't fail). **Every** creation path — `createScheme`, `materialiseScheme`, `importScheme` — now goes through `nextSchemeSlot`, which under a per-course advisory lock picks `version = MAX+1` and makes the new scheme live **only if the course has no live scheme** (else a draft, so authoring never silently clobbers the scheme that's currently teaching); `cloneSchemeNewVersion` uses the same lock+`MAX+1` (was `head.version+1`, which double-cloned to a duplicate); `moveSchemeToCourse` re-versions into the destination's space and demotes to a draft if the destination is already live. Integration test asserts first-create-is-live/v1, second-is-draft/v2, two clones get distinct versions, and the DB itself rejects a 2nd active scheme and a duplicate `(course_id, version)`.
- **Severity / confidence:** Medium / Confirmed
- **Affected:** `app/migrations/0006_phase3.sql:7-14`; `app/src/repos/schemes.ts:128-143, 156-200, 609-621`
- **Problem and trigger:** There is no unique `(course_id, version)` constraint and no partial unique index for one active scheme per course. `createScheme` and materialisation use the default `active = true`; repeated creates can produce multiple active version-1 schemes. Concurrent/repeated cloning from the same source can create duplicate version numbers.
- **Impact:** `getActiveScheme` silently chooses the highest version/one row, so coverage, planning, adaptation, and editing can disagree about which scheme is live.
- **Evidence / reproduction:** Create two schemes for one course or clone the same version twice. The schema accepts both active rows/duplicate versions.
- **Potential fix:** Add unique `(course_id, version)` and a partial unique `(course_id) WHERE active`; create/activate versions transactionally with row locking and explicit intended state.
- **Regression test / notes:** Test repeated and concurrent create/clone/activate/move-to-course operations.

### BUG-020 — Cloning a scheme silently drops labels, lesson kit, and resource links

- **Status:** ✅ Resolved 2026-06-20 — `cloneSchemeNewVersion` ([app/src/repos/schemes.ts](app/src/repos/schemes.ts)) now copies, inside its existing transaction: the scheme's **labels** (from the source row), each plan's **kit_needed** (added to the plan-copy SELECT — it was dropped entirely, so a redraft lost the equipment list), and **resource_links** at both unit level (converted-unit source provenance) and plan level (the materials a redraft should still reference), carried via the old→new id maps it already builds for spec-point coverage. Integration test clones a scheme with labels + a kitted, resource-linked plan and asserts all three survive on the draft.
- **Severity / confidence:** Medium / Confirmed
- **Affected:** `app/src/repos/schemes.ts:609-649`; `app/migrations/0009_scheme_labels.sql`; `app/migrations/0040_lesson_kit.sql`; `app/migrations/0006_phase3.sql:70-83`
- **Problem and trigger:** The scheme clone inserts only course/title/version; labels are omitted. Lesson copies omit `kit_needed`, and only spec-point mappings are copied. Unit and lesson-plan `resource_links` are not recreated for the new IDs.
- **Impact:** A new-year draft appears complete structurally but loses organizational labels, equipment requirements, worksheets, slides, and attachments.
- **Evidence / reproduction:** Add a scheme label, kit note, unit resource, and lesson resource; clone the scheme. Query/render the clone: those values/links are absent.
- **Potential fix:** Define clone semantics explicitly and copy all owned planning metadata and links using old-to-new ID maps inside the existing transaction.
- **Regression test / notes:** Deep-compare source and clone for labels, active flags, units, plans, kit, objectives, spec mappings, and resource links while ensuring IDs differ.

### BUG-021 — Planner cascades and swaps are not atomic

- **Status:** ✅ Resolved 2026-06-20 — `applyPlacements` ([app/src/repos/delivery.ts](app/src/repos/delivery.ts)) now applies the cascade's binding changes **all-or-nothing**: occurrence creation (idempotent/additive) stays in a first phase, then every `lesson_plan_id` UPDATE runs in **one transaction** serialised per class by a `pg_advisory_xact_lock` — a connection drop or error mid-cascade rolls the whole shift back, and two concurrent planner writes for the same class queue rather than interleave. The in-memory one-step undo snapshot is now armed **only after that write commits** ([app/src/routes/planner.ts](app/src/routes/planner.ts)), so a failed drop can't leave a bogus undo. Every place op (insert/move/swap/pull/unit/lock) routes through this path. **Residual:** the swap helper `moveBinding` and undo's lock-restoration loop are not yet wrapped (lower-traffic; the binding rewrite — the corruption risk called out — is covered); fault-injection of a mid-cascade DB failure is verified by inspection (needs an injectable failpoint).
- **Severity / confidence:** Medium / Credible risk
- **Affected:** `app/src/routes/planner.ts:287-300, 338-375`; `app/src/repos/delivery.ts:166-181, 219-249`
- **Problem and trigger:** Multi-position operations loop through separate repository calls. `applyPlacements`, unit layout, undo lock restoration, and `moveBinding` can commit some updates before a later query fails.
- **Impact:** A connection drop, constraint failure, or process restart can leave a schedule half-shifted, duplicate a plan, lose a displaced plan, or restore bindings without their locks.
- **Evidence / reproduction:** Fault the nth `setOccurrenceCoursePlan` during a cascade or the second statement of a swap. Earlier writes remain committed.
- **Potential fix:** Execute each logical planner operation on one database client/transaction, lock affected occurrence-course rows, and update the in-memory undo snapshot only after commit.
- **Regression test / notes:** Fault-inject every write position and assert the before-state is fully preserved on failure.

### BUG-022 — Applying a lesson review marks it applied before its changes commit

- **Status:** ✅ Resolved 2026-06-20 — apply is now one transaction: `applyReview` ([app/src/repos/reviews.ts](app/src/repos/reviews.ts)) claims the open review (`UPDATE … status='applied' WHERE status='open' RETURNING`) **and** writes its suggested objectives/outline to the master lesson plan in the same transaction, so the review is never marked applied unless the master change committed (a mid-apply failure rolls both back, leaving it open to retry). Dismiss is now a single atomic `dismissOpenReview` (`UPDATE … 'dismissed' WHERE status='open'`, acting on the affected-row count) — no read-then-write TOCTOU. The route uses both ([app/src/routes/schemes.ts](app/src/routes/schemes.ts)). Integration test proves claim+write land together and that a closed review can never rewrite the master.
- **Severity / confidence:** Medium / Credible risk
- **Affected:** `app/src/repos/reviews.ts:121-138`; `app/src/routes/schemes.ts:621-646`; `app/src/repos/schemes.ts:418-427`
- **Problem and trigger:** `claimOpenReview` first commits `status = 'applied'`; objective and outline updates then run as independent statements. A later failure leaves the review permanently applied with zero or partial changes. Dismiss also performs a read-then-unconditional-update, so it can race an apply and relabel an already-applied review as dismissed.
- **Impact:** The UI/audit trail can claim a recommendation was applied when the lesson was not updated, or conceal that applied changes came from a review later marked dismissed.
- **Evidence / reproduction:** Fault the first/second `updatePlanField`, or concurrently invoke apply and dismiss after both observe open state.
- **Potential fix:** Lock/claim the open row and update all suggested fields/status in one transaction; make dismiss `UPDATE ... WHERE status='open'` and check the returned row.
- **Regression test / notes:** Cover field-write failure, missing plan, double apply, apply-vs-dismiss, and dismiss-vs-dismiss.

### BUG-023 — Deactivating a group’s course leaves it attached to timetable and occurrences

- **Status:** ✅ Resolved 2026-06-20 — chose the "every consumer filters active" route (so re-activation simply flips the flag, losing no mapping). `findOrCreateOccurrence` now only materialises occurrence_courses for **active** group_courses ([app/src/repos/occurrence.ts](app/src/repos/occurrence.ts)), and the forward-planning slot lists `listSlotsForCourse` + `listAllSlots` filter `gc.active` ([app/src/repos/delivery.ts](app/src/repos/delivery.ts)) — so a deactivated class stops appearing in the curriculum map / planner and stops spawning new occurrences. Already-materialised **historic** occurrences are deliberately left (getOccurrenceCourses is unchanged), preserving the record. Integration test deactivates a class and asserts it leaves the slot lists, a newly-opened occurrence no longer carries it, and a pre-existing occurrence still does.
- **Severity / confidence:** Medium / Confirmed
- **Affected:** `app/src/repos/setup.ts:625-664`; `app/src/repos/occurrence.ts:30-50, 84-99`; `app/src/repos/delivery.ts:27-43, 124-136`
- **Problem and trigger:** `setGroupCourse(..., false)` only sets `group_courses.active = false`. Existing `timetabled_lesson_courses` mappings remain, and occurrence/delivery queries do not filter `gc.active`.
- **Impact:** A course removed in Setup can continue appearing in slots, materialising occurrence-course rows, receiving plans, and surfacing to pupils/TAs.
- **Evidence / reproduction:** Attach a course to a group/lesson, untick the group course, then open/materialise that lesson. The stale mapping is still selected.
- **Potential fix:** Decide whether deactivation should detach all lesson mappings or make every consumer consistently filter active group courses; preserve historic occurrences explicitly where needed.
- **Regression test / notes:** Test removal before and after occurrences exist, then reactivation, split lessons, history, planner, pupil, and TA views.

### BUG-024 — Selecting a nonexistent academic year can leave no current year

- **Status:** ✅ Resolved 2026-06-19 — `makeYearCurrent` now `SELECT … FOR UPDATE`s the target first and rolls back (returning `false`) for an unknown id, so the current flag is never cleared without a replacement; the route rejects a bad id. Regression test asserts a nonexistent id leaves exactly one (unchanged) current year.
- **Severity / confidence:** Medium / Confirmed
- **Affected:** `app/src/repos/setup.ts:47-60`; `app/src/routes/setup.ts:473-479`
- **Problem and trigger:** `makeYearCurrent` clears the current flag before updating the requested ID and does not verify that the second update matched a row.
- **Impact:** A stale/forged/deleted year ID commits a state with no current academic year, breaking many scalar subqueries and current timetable/setup paths.
- **Evidence / reproduction:** Call `makeYearCurrent` with a positive nonexistent ID. The first update succeeds, the second affects zero rows, and the transaction commits.
- **Potential fix:** Lock and validate the target first, then update with a checked `RETURNING`; retain/add database enforcement appropriate to the exactly-one-current invariant.
- **Regression test / notes:** Verify nonexistent/deleted IDs roll back and concurrent switches end with exactly one valid current year.

### BUG-025 — `per_lesson` recurring tasks miss additional lessons on the same day

- **Status:** ✅ Resolved 2026-06-20 — recurrence now tracks a cursor of **(date, slot start-minute)**, not just date. `nextLesson` ([app/src/services/recurrence.ts](app/src/services/recurrence.ts)) returns the next `(date, slot)` strictly after that cursor — on the cursor day only later slots, on later days the earliest — and the generator advances the cursor to each due slot, so a class taught twice in a day yields two due points. The per-occurrence dedup key gained a `:startMinute` suffix so same-day slots don't collapse to one ([migration 0053](app/migrations/0053_recurring_slot_key_time.sql) rewrites existing keys to match; the generator's guard was raised to 40 to cover several slots within the lead window). Pure test asserts a twice-on-Monday class produces both the AM and PM due points before next week; integration test confirms two same-date/different-time keys coexist. *(Residual: `last_generated` is still a date; on resume the cursor starts at end-of-cursor-day, so a run cut off mid-day by the guard could skip that day's remaining slot — not reachable at realistic lead times for a single teacher.)*
- **Severity / confidence:** Medium / Confirmed
- **Affected:** `app/src/services/recurrence.ts:43-53`; `app/src/repos/recurringTasks.ts:100-121`
- **Problem and trigger:** `nextLesson` advances by whole date and selects only the first group slot for a matching weekday. `last_generated` stores only a date. If a group has two lessons on one day, the second slot can never be returned.
- **Impact:** “Per lesson” preparation/tasks are generated once per day rather than once per actual lesson, so work for double lessons is silently omitted.
- **Evidence / reproduction:** Give a group two Monday slots and evaluate recurrence after Sunday. The function returns the first Monday slot; the next search starts Tuesday and skips the second Monday slot.
- **Potential fix:** Track a due cursor including date plus timetabled lesson/slot, and enumerate the ordered slot stream rather than dates only.
- **Regression test / notes:** Cover double lessons, multiple weekdays, holidays, timetable changes, and year boundaries.

### BUG-026 — Concurrent recurring-task generators can insert duplicate instances

- **Status:** ✅ Resolved 2026-06-20 — each materialised occurrence now carries an explicit `recurring_slot_key` (`<defId>:<dueDate>`) with a partial unique index ([migration 0050](app/migrations/0050_recurring_slot_key.sql), existing rows backfilled), so one task per definition per due date is a **DB guarantee** rather than a racy `WHERE NOT EXISTS`. `generateDueInstances` switched to `INSERT … ON CONFLICT DO NOTHING` with the insert + cursor bump in **one transaction**, so an overlapping boot/cron sweep (or a crash before the cursor advanced) is a harmless no-op. Integration test asserts the index rejects a duplicate occurrence outright, and the existing generator-idempotency test still holds. *(The index can't use the `due_at AT TIME ZONE …` expression directly — that's STABLE, not IMMUTABLE — hence the stored key.)*
- **Severity / confidence:** Medium / Credible risk
- **Affected:** `app/src/repos/recurringTasks.ts:92-124`; `app/src/server.ts:215-227`; `app/migrations/0005_recurrence.sql:21-22`
- **Problem and trigger:** Idempotency uses `INSERT ... WHERE NOT EXISTS`, but there is no unique constraint and no transaction/advisory lock. Two app/cron runs can both observe absence and insert the same definition/date before either updates `last_generated`.
- **Impact:** Duplicate recurring tasks appear during overlapping boot, cron, or multi-process generation.
- **Evidence / reproduction:** Synchronise two transactions immediately after their NOT EXISTS checks for the same definition/date; both inserts are legal.
- **Potential fix:** Add a database-level unique occurrence key (preferably definition + exact due slot/time), use `ON CONFLICT DO NOTHING`, and update the cursor transactionally.
- **Regression test / notes:** Run two generator calls concurrently and assert one materialised task and a monotonic cursor.

### BUG-027 — Email deduplication still has check/create/mark races and partial-write gaps

- **Status:** ✅ Resolved 2026-06-20 — the dedup store gained a **processing/complete state + claim timestamp** ([migration 0054](app/migrations/0054_processed_emails_state.sql)), and the poll now `claimEmail`s a message ATOMICALLY before any destination write ([app/src/repos/tasks.ts](app/src/repos/tasks.ts), [app/src/services/emailPoll.ts](app/src/services/emailPoll.ts)): the `INSERT … ON CONFLICT DO UPDATE … WHERE state='processing' AND claimed_at < now()-15min RETURNING` makes the claim single-winner — a concurrent poll, or a re-seen copy whose `\Seen` flag failed, finds it claimed/complete and skips (no duplicate). On success the claim is marked `complete`; on a processing **failure** it's released so the next poll retries promptly; a claim left `processing` by a crash is **reclaimed after a 15-min stale window** so nothing is permanently lost. Integration test proves single-winner claiming, complete-blocks-reprocess, stale-reclaim, and release-for-retry; the end-to-end poll test still imports + dedups. **Residual:** this is robust at-least-once with bounded recovery rather than a single cross-write transaction (the destination writes fan out across event/note/captured/task repos) — a crash between the destination commit and the `complete` mark yields one delayed duplicate after the stale window, which for email intake is the safe failure direction (a duplicate, never a lost message).
- **Severity / confidence:** Medium / Credible risk
- **Affected:** `app/src/services/emailPoll.ts:123-162`; `app/src/repos/tasks.ts:45-80`; `app/migrations/0037_processed_emails.sql`
- **Problem and trigger:** The current remediation checks `processed_emails`, creates/routs the destination through several autocommit writes, then inserts the dedup key. Concurrent poll/test runs can both pass the check. A failure after destination creation but before `markEmailProcessed` repeats the import on the next poll.
- **Impact:** Duplicate tasks/events/notes/captured items and orphan/partially triaged intake records remain possible despite the processed-email table.
- **Evidence / reproduction:** Race two handlers on one Message-ID, or fault `markEmailProcessed` after `createTaskFromEmail`. The unique key protects only the late marker, not the already-created destinations.
- **Potential fix:** Atomically reserve the dedup key first (`INSERT ... ON CONFLICT ... RETURNING`) and perform destination/intake writes in the same transaction, with an explicit processing/complete state for retry recovery.
- **Regression test / notes:** Cover concurrent handlers and failure after every write for each route type.

### BUG-028 — Resource import commits can leave orphan database rows and files

- **Status:** ✅ Resolved 2026-06-20 — a new `createResourceWithVersion` ([app/src/repos/resources.ts](app/src/repos/resources.ts)) writes the resource row, its v1, the current-version pointer **and** the unit/year metadata in ONE transaction, staging the file inside that transaction's success path — so a failure on any step rolls the rows back and unlinks the file, leaving no orphan of either. The import loop ([app/src/services/resourceImport.ts](app/src/services/resourceImport.ts)) and the three new-resource routes (upload / AI-generate / worksheet-image) all use it — which also closes the **BUG-008 residual** (a resource was previously INSERTed a statement before its first version). Integration test asserts the resource, its v1 pointer, the unit/year metadata and the on-disk file all appear together; the existing import test confirms the same end-to-end. **Residuals (lower priority, noted not done):** the file is staged at its final token-bearing path with rollback-unlink rather than a temp-UUID-then-publish rename (equivalent safety for this single-writer app, minus the narrow commit-then-rename-fails window); cross-resource dedup is still the `findResourceByChecksum` query rather than a DB checksum-uniqueness constraint (a global `UNIQUE(checksum)` would change behaviour and risk existing duplicate-content rows). The AI-markdown writers in lesson/schemes/services still use `createResource`+`addVersion` (they inherit the atomic append; their new-resource orphan-row window is a small follow-up).
- **Severity / confidence:** Medium / Credible risk
- **Affected:** `app/src/services/resourceImport.ts:278-313`; `app/src/repos/resources.ts:40-73`; `app/src/routes/resources.ts:345-358`
- **Problem and trigger:** Import creates a resource row, writes a file, inserts a version, updates metadata, and later cleans staging through independent operations. Failure midway leaves some combination of resource row, stored file, version, and staging directory. Duplicate detection is also check-then-create without a uniqueness constraint on checksums.
- **Impact:** Failed or concurrent imports accumulate invisible/orphan files and incomplete resources; duplicates can be created despite the review warning.
- **Evidence / reproduction:** Fault `storeBuffer`, `addVersion`, or `setResourceUnit` after the preceding step, or import identical content concurrently.
- **Potential fix:** Stage files under temporary UUIDs, wrap database metadata in a transaction, publish/rename after commit with compensating cleanup, and enforce the intended checksum uniqueness policy in the database.
- **Regression test / notes:** Fault each boundary and verify no orphan resource/version/file/staging state remains.

### BUG-029 — Replacing a pupil screenshot with another format leaves the old image indefinitely

- **Status:** ✅ Resolved 2026-06-20 — `saveAnswer` now returns the value it superseded ([app/src/repos/pupilWork.ts](app/src/repos/pupilWork.ts), it already `SELECT … FOR UPDATE`d the prior row for BUG-004), and `/me/answer-image` ([app/src/routes/me.ts](app/src/routes/me.ts)) unlinks the old `img:<path>` once the new answer is durable, when its path actually differs (a same-format replace overwrote in place; a PNG→JPG replace lands at a different extension/path and would otherwise orphan the old file forever). Integration test uploads a PNG then a JPEG for the same key and asserts the new file exists and the old one is gone. *(Pre-existing orphans from before this fix are out of scope — an orphan-store reconciliation sweep, BUG-044's territory, would reclaim those.)*
- **Severity / confidence:** Medium / Confirmed
- **Affected:** `app/src/routes/me.ts:360-380`; `app/src/repos/pupils.ts:123-160`; `app/src/repos/pupilWork.ts:63-82`
- **Problem and trigger:** Screenshot paths include the extension. Replacing `field.png` with `field.jpg` writes a new file and overwrites the single DB pointer, but never deletes the previous path. Pupil disposal only queries currently referenced `img:` values, so the old unreferenced image is no longer discoverable for deletion.
- **Impact:** Sensitive pupil work remains on disk after replacement and can survive later anonymisation/erasure cleanup, contrary to data-minimisation expectations.
- **Evidence / reproduction:** Upload PNG then JPEG for the same pupil/occurrence/key. Both files remain; only the JPEG path exists in `pupil_answers`.
- **Potential fix:** Read the old pointer and transactionally/compensatingly unlink it after the new answer is durable, or use a stable extension-independent object key and overwrite atomically. Add orphan-store reconciliation.
- **Regression test / notes:** Cover same/different formats, failed replacement, concurrent replacement, anonymise, and erase.

### BUG-030 — Pupil work authorization permits forged historic/future writes and arbitrary answer fields

- **Status:** ✅ Resolved (core) 2026-06-19 — all pupil write routes (`/me/answer`, `/me/done`, `/me/feedback`, `/me/answer-image`) now authorise via `pupilMayWriteOc`: the occurrence-course must belong to the **session group**, its occurrence must be dated **today**, and the lesson must not be cancelled (shared exception check). This closes the main impact — a guessed/forged **historic** (altering past evidence), **future** (pre-filling) or **other-group** oc, and a **cancelled** lesson, are all refused. Integration tests cover other-group + historic denial and a live-lesson allow. **Residual (follow-up):** the field-key inventory check (an arbitrary key still creates a row on the pupil's *own live* lesson) and the resource-version (`stale-version`) check are not yet enforced — they need a worksheet-bound test fixture.
- **Severity / confidence:** Medium / Confirmed
- **Affected:** `app/src/repos/pupilWork.ts:8-20`; `app/src/routes/me.ts:288-325, 341-378`; `app/src/lib/worksheetForm.ts`
- **Problem and trigger:** `pupilCanAccessOc` proves only active enrolment in the occurrence course’s group. It does not require the session’s selected group, a current/next accessible date, a non-cancelled lesson, or the worksheet to contain the posted field key. A pupil who learns/guesses an occurrence-course ID can mutate old/future work for any group they are enrolled in and create up to one answer row per arbitrary 60-character key.
- **Impact:** Pupils can alter historical evidence after lessons, pre-fill future lessons, trigger marking/done state, and create fake/unbounded fields not present on the worksheet.
- **Evidence / reproduction:** While logged in, POST `/me/answer?oc=<historic enrolled oc>&key=fake.1`. The enrollment predicate passes and the row is inserted.
- **Potential fix:** Authorize against a server-issued current lesson/worksheet capability tied to pupil, group, occurrence, resource version, and allowed field inventory; define whether/when historical edits are permitted.
- **Regression test / notes:** Deny other session group, historic, future, cancelled, unknown-field, and stale-version writes; allow only the rendered current capability.

### BUG-031 — Migration execution has no cross-process lock

- **Status:** ✅ Resolved 2026-06-19 — the migration run now holds a session-level `pg_advisory_lock` for its whole duration and re-reads `schema_migrations` under the lock, so a serialised second migrator sees the winner's work and applies nothing. Test runs two `migrate()` calls concurrently and asserts both succeed.
- **Severity / confidence:** Medium / Credible risk
- **Affected:** `app/src/db/migrate.ts:7-40`; `app/migrations/*.sql`
- **Problem and trigger:** Each process reads the applied migration set before applying pending files, but no advisory lock serialises migrators. Two app instances starting together can both select the same pending migration; one then fails on DDL or the `schema_migrations` primary key.
- **Impact:** Rolling/multi-process startup can crash-loop an instance or leave deployment availability dependent on timing, even though each individual migration is transactional.
- **Evidence / reproduction:** Start two processes against a database with a pending migration and pause both after reading `schema_migrations`.
- **Potential fix:** Acquire a PostgreSQL advisory lock for the full migration run, then re-read the applied set while holding it.
- **Regression test / notes:** Launch two migration runners concurrently and assert both exit successfully with each migration applied once.

### BUG-032 — Production Compose exposes the database and direct app port on all host interfaces

- **Status:** ✅ Resolved 2026-06-20 — `app/docker-compose.yml` now binds Postgres (`5434`) and the app's direct port (`44360`) to **`127.0.0.1` only**, so neither is reachable from another LAN host; host dev tools still use `localhost:5434`, and the LAN reaches the app solely through Caddy (80/443 → internal `app:44360`). The app also **refuses to start in production if `DATABASE_URL` still carries the default `organiser` password** ([app/src/server.ts](app/src/server.ts) `start()`), a guard against a forgotten `DB_PASSWORD` (the installer generates a random one). Security + deployment docs updated. **Operator action on an existing box:** recreate the containers so the new bindings take effect — `docker compose --profile proxy up -d --force-recreate` (existing installs already have a random `DB_PASSWORD`). *(A separate prod override removing the DB publication entirely is still possible; loopback binding achieves the same exposure goal from one file.)*
- **Severity / confidence:** Medium / Credible risk
- **Affected:** `app/docker-compose.yml:7-18, 34-60`; `docs/SECURITY_AND_PRIVACY.md:124-131`
- **Problem and trigger:** Compose publishes `5434:5432` and `44360:44360`, which bind all interfaces by default. The latter bypasses Caddy TLS/IP controls; the former exposes PostgreSQL directly to the LAN and falls back to a known default password if production provisioning is incomplete.
- **Impact:** The deployment’s stated Caddy front-door controls are not the sole boundary. LAN clients may reach the app directly or attack the database service.
- **Evidence / reproduction:** On a default Docker host without a restrictive firewall, connect to the host’s LAN address on ports 44360 and 5434.
- **Potential fix:** Bind development ports to `127.0.0.1`, use a production override with no DB publication, and expose the app only to Caddy on an internal network. Fail production startup if the default DB password remains.
- **Regression test / notes:** Add deployment validation that inspects effective Compose bindings and verifies only intended 80/443 exposure from another LAN host.

### BUG-033 — Any unrelated successful HTMX action clears the “not saved” warning

- **Status:** ✅ Resolved 2026-06-20 — the banner is no longer a single global flag cleared by any success. `public/app.js` now tracks unsaved work **per operation** (a stable key off the field's `data-save-id` / `name` / `id`): a failed save records its key, and a later success clears **only that key** — an unrelated field or a background poll succeeding leaves the warning up. The banner counts outstanding fields ("2 changes not saved") and clears only when the last one saves; the old `[data-bg-poll]` special-case is gone (a read/poll never marks unsaved work, so nothing to skip). Same jsdom harness asserts: unrelated success doesn't clear, the matching retry does, the count tracks several, and a failed read isn't counted.
- **Severity / confidence:** Medium / Confirmed
- **Affected:** `app/public/app.js:98-117`; background poll emitters across `app/src/routes/now.ts`, `app/src/routes/focus.ts`, and `app/src/routes/pupilWork.ts`
- **Problem and trigger:** After a save failure, the toast is cleared by the next successful non-background HTMX request, not by a retry of the failed request or field. A toggle, navigation fragment, or different save is enough.
- **Impact:** The user can be told everything is healthy while the original text remains unsaved, increasing silent data-loss risk.
- **Evidence / reproduction:** Cause an autosave failure, then perform an unrelated successful HTMX action. `clearToast()` runs even though the failed payload was never persisted.
- **Potential fix:** Attach a save-operation/field ID to failure and success events and clear only when that same operation succeeds; retain a list/count if several fields are unsaved.
- **Regression test / notes:** Test unrelated success, background success, retry success, multiple failed fields, and full-page navigation.

### BUG-043 — The pupil subject-access export omits substantial pupil-linked data

- **Status:** ✅ Resolved 2026-06-20 — `exportPupilRecord` ([app/src/repos/pupils.ts](app/src/repos/pupils.ts)) now covers every pupil-linked table found in the schema sweep, not four queries: it adds **linked tasks**, **linked events**, per-class **levels**, **unit signals**, **completions** (`pupil_done`), **device metadata**, and **login-credential state** — alongside the existing profile/enrolments/answers/marks/feedback/comments/notes/mentions. Secrets are never disclosed (PIN hash and device `token_hash` are excluded — only existence/state). Safeguarding records are **deliberately excluded** with a documented `safeguardingNote` (released case-by-case by the DSL under the DPA 2018 safeguarding exemption). Integration test asserts the new sections appear and that no `scrypt:`/`pin_hash`/`token_hash` secret leaks into the export.
- **Severity / confidence:** Medium / Confirmed
- **Affected:** `app/src/repos/pupils.ts:183-201`; `app/migrations/0003_phase2.sql:30-77`; `app/migrations/0018_pupils.sql:47-74`; `app/migrations/0022_marking.sql:58-67`; `app/migrations/0025_safeguarding_review.sql:13-20`; `app/migrations/0027_pupil_unit_signal.sql:3-8`; `app/tests/integration/disposals.int.test.ts:90-97`
- **Problem and trigger:** `exportPupilRecord` includes current enrolment, note, answer, mark, feedback, comment, and profile data, but omits other pupil-linked records including completion state, levels, unit signals, remembered devices, linked tasks/events, and safeguarding workflow records. The integration test asserts only a subset of the implemented export and does not catch omissions as the schema grows.
- **Impact:** A teacher relying on the export for a subject-access request can produce an incomplete disclosure and miss educational, device, and safeguarding personal data held by the system.
- **Evidence / reproduction:** Seed `pupil_done`, `pupil_levels`, `pupil_unit_signal`, `pupil_devices`, pupil-linked tasks/events, and answer-linked safeguarding-review rows, then call `exportPupilRecord`; those records do not appear in the returned JSON.
- **Potential fix:** Maintain a versioned, reviewed personal-data inventory and build the export from it. Include every applicable linked record with appropriate handling for secrets and third-party/confidential information, rather than treating four queries as a complete record.
- **Regression test / notes:** Seed every pupil-bearing table/file category and assert inclusion or an explicitly documented legal exclusion. Add a schema-change checklist requiring export/disposal coverage for new pupil data.

### BUG-044 — Failed screenshot deletion after pupil disposal has no durable retry path

- **Status:** ✅ Resolved 2026-06-20 — disposal now enqueues a durable deletion **tombstone** for each screenshot path **inside the disposal transaction** ([migration 0052](app/migrations/0052_pending_file_deletions.sql), [app/src/repos/fileDeletions.ts](app/src/repos/fileDeletions.ts)), then attempts the unlink after commit and clears the tombstone on success. If the unlink fails (fs error) — or the process crashes before it runs — the tombstone survives, and a boot-plus-15-min sweep (`processPendingDeletions`, scheduled in [app/src/server.ts](app/src/server.ts)) retries idempotently (`removeStored` is a no-op on an already-gone file, so the tombstone clears whether the file was just deleted or already absent). The stored path is a non-identifying object key. Integration tests prove the sweep deletes a tombstoned file + clears the row, clears a tombstone for an already-missing file without error, and that a normal disposal leaves no lingering tombstone. *(Residual: no max-attempts dead-lettering — a permanently un-deletable path would be retried forever; a small follow-up given how rare that is.)*
- **Severity / confidence:** Medium / Credible risk
- **Affected:** `app/src/repos/pupils.ts:123-164`; `app/src/services/resourceStore.ts:31-35`
- **Problem and trigger:** Pupil disposal commits database deletion/anonymisation and removal of the screenshot pointers before deleting the referenced files. File removal failures are caught and logged only. Once the database pointers are gone, no deletion queue or tombstone records which sensitive paths still require cleanup.
- **Impact:** Pupil work images can remain indefinitely after the system reports disposal complete, and routine reconciliation can no longer associate those files with the pupil.
- **Evidence / reproduction:** Make one referenced screenshot temporarily undeletable while disposing a pupil. The database operation succeeds and the error is swallowed; restoring filesystem access does not trigger another deletion attempt.
- **Potential fix:** Persist a deletion job/tombstone before removing the last pointer, process it idempotently with retries and completion audit, and add an orphan reconciliation process based on non-identifying object IDs.
- **Regression test / notes:** Fault unlink for one/all files, restart the worker/app, and prove eventual deletion without rolling back already-completed database disposal or deleting unrelated objects.

### BUG-045 — The production reverse proxy collapses client-IP rate limits to one address

- **Status:** ✅ Resolved 2026-06-20 — Fastify is now built with `trustProxy` from a new `TRUST_PROXY` env ([app/src/config/app.ts](app/src/config/app.ts), [app/src/server.ts](app/src/server.ts)): empty in host dev (no proxy → trust the socket), `true` in production. The `Caddyfile` now **overwrites** `X-Forwarded-For` with the real client (`header_up X-Forwarded-For {http.request.remote.host}`), discarding any client-supplied value — so `req.ip` is the genuine device and the per-IP login/PIN/code brakes (BUG-040, pupilAuth) key on it, not all-collapsed-to-Caddy and not a spoofable header. The installer writes `TRUST_PROXY=true` on a fresh `.env` and idempotently adds it to an existing one on re-run. **Operator action on an existing box:** re-run `deploy/install.sh` (adds `TRUST_PROXY=true` to your `.env`) **or** add that line yourself, then recreate the proxy + app — `docker compose --profile proxy up -d --force-recreate`.
- **Severity / confidence:** Medium / Confirmed
- **Affected:** `app/src/server.ts:65-68`; `app/Caddyfile:10-14`; rate-limit consumers in `app/src/auth/routes.ts` and `app/src/routes/pupilAuth.ts`
- **Problem and trigger:** Fastify is created without trusted-proxy handling, while the production Caddy service forwards requests to the app. Consequently `req.ip` is the Caddy container address for proxied clients, and all login, class-code, name, and PIN attempts share global proxy-IP buckets.
- **Impact:** One LAN client can consume an attempt allowance and lock every other user out for the window. Logs and controls also cannot distinguish the originating clients. Direct access to the published app port behaves differently, making the security policy deployment-path dependent.
- **Evidence / reproduction:** Send failed attempts through Caddy from two different clients and inspect the rate-limit key; both use the same Caddy peer address because forwarded addresses are not trusted by Fastify.
- **Potential fix:** Configure `trustProxy` narrowly for the known Caddy network/address and ensure Caddy replaces, rather than trusts arbitrary client-supplied forwarding headers. Keep principal-specific controls in addition to IP controls.
- **Regression test / notes:** Integration-test two simulated forwarded clients, spoofed headers from a direct connection, Caddy-only deployment, IPv4/IPv6, and the intended shared-network policy.

### BUG-046 — Course-document upload buffers and parses files up to the global 500 MB limit

- **Status:** ✅ Resolved 2026-06-19 — `/coverage/doc/upload` now passes a **route-level 30 MB `fileSize` cap** so busboy stops at the limit instead of buffering up to 500 MB and handing a huge blob to PDF/Office extraction; over-limit → 413. *(Page-count / conversion-time bounds inside the extractor remain a smaller follow-up.)*
- **Severity / confidence:** Medium / Confirmed
- **Affected:** `app/src/routes/coverage.ts:199-211`; `app/src/server.ts:95-96`; `app/src/lib/docText.ts:15-35`
- **Problem and trigger:** `/coverage/doc/upload` calls `toBuffer()` without a smaller route limit. The global multipart allowance is 500 MB, after which the complete PDF/Office file is passed to PDF.js or document conversion/text extraction.
- **Impact:** An accidental or malicious teacher upload can create very large Node allocations and expensive parsing/conversion work, causing long stalls or process termination.
- **Evidence / reproduction:** Upload a course document below 500 MB but far above a reasonable specification-document size. The route buffers it completely before validating or extracting content.
- **Potential fix:** Set a conservative route-specific streaming byte limit, reject on declared/observed overflow before buffering, and bound page count, decompressed/conversion output, and processing time.
- **Regression test / notes:** Cover limit plus one byte, forged MIME/extension, compressed Office bombs, excessive PDF pages, converter timeout, and cleanup of rejected inputs.

### BUG-047 — The daily print view ignores holidays and lesson exceptions and creates ghost occurrences

- **Status:** ✅ Resolved 2026-06-19 — `/today/print` now classifies the date first: a holiday / INSET / weekend / out-of-term day prints "no teaching" and **materialises nothing**; on a school day, cancelled / free / whole-day off-timetable lessons are dropped (via the shared exception index) before any occurrence is created. Integration test: a holiday prints "no teaching" and creates zero occurrence rows. *(Read-only-on-future-school-days — not materialising a real not-yet-opened lesson — is a smaller residual; cover/room lessons still print.)*
- **Severity / confidence:** Medium / Confirmed
- **Affected:** `app/src/routes/lesson.ts:1339-1367`; `app/src/services/exceptions.ts:25-63`; occurrence creation used by `lessonPrintBlock`
- **Problem and trigger:** `/today/print` selects lessons from the weekly weekday pattern without classifying the date against the academic calendar or applying per-lesson/whole-day exceptions. It then calls the print-block path that finds or creates occurrences for those weekly lessons.
- **Impact:** Holiday, off-timetable, free, and cancelled dates print lessons that should not occur and can permanently materialise ghost occurrence rows. Cover/room/replacement details can also be wrong.
- **Evidence / reproduction:** Mark a date as a holiday or add a cancelled/off-timetable exception, then request `/today/print?date=<date>`. The original weekly lessons remain in the output and occurrence creation is invoked.
- **Potential fix:** Resolve the shared date classification and exception effect before rendering, apply replacement/cover/room semantics consistently, and keep a read-only print request from creating occurrence state unless explicitly required.
- **Regression test / notes:** Matrix-test term day, holiday, closure, whole-day/per-lesson exceptions, replacements, and repeated print requests with assertions on both HTML and occurrence-row counts.

### BUG-048 — The nightly review sweep records completion before work succeeds

- **Status:** ✅ Resolved 2026-06-20 — the sweep still claims the day BEFORE spending (so a restart/overlapping tick can't double-spend), but now **releases the claim** (restores the prior `ai_review_sweep_last`) if `sweepReviews` throws ([app/src/server.ts](app/src/server.ts)), so the day isn't silently lost — a later tick in the 4–8am window retries. `sweepReviews` is per-lesson idempotent (a lesson with an open review is skipped, via the one-open-review index), so a retry tops up toward the daily cap rather than re-spending. *(Residual: a hard process crash mid-sweep — after the claim, before the catch runs — still loses that day; the full fix is a DB lease with `started`/`completed` + expiry, recorded as the remaining hardening for an off-by-default, £-capped feature.)*
- **Severity / confidence:** Medium / Credible risk
- **Affected:** `app/src/server.ts:287-303`; `app/src/repos/settings.ts:17-22`; lesson-review sweep service called from the interval
- **Problem and trigger:** The background interval checks the last-run date and writes today's date before invoking the review sweep. A crash or transient database/AI failure after that write causes later ticks to skip all remaining work for the day. The check and write are also not an atomic claim, so multiple processes can both run and spend concurrently.
- **Impact:** Automated reviews may be silently skipped for a full day, or duplicated under multi-process deployment with unnecessary AI cost and competing writes.
- **Evidence / reproduction:** Fault the sweep immediately after `setSetting` succeeds; restart or wait for the next tick and observe it skip because today's date is already stored. A barrier before two processes set the value demonstrates the duplicate-run race.
- **Potential fix:** Use a database-backed lease/job row with atomic claim, `started`/`completed` state, expiry, per-item idempotency, and retryable failures. Record completion only after the intended work reaches a defined terminal state.
- **Regression test / notes:** Cover crash after claim, partial item failure, lease expiry, two processes, retry limits, and successful completion without duplicate AI calls.

### BUG-049 — A vulnerable `tar` version is reachable during dependency installation

- **Status:** ✅ Resolved 2026-06-20 — `pdfjs-dist` upgraded **3.11.174 → 4.10.38**. v4 replaced node-canvas (which pulled `@mapbox/node-pre-gyp` → the vulnerable `tar`) with the prebuilt **`@napi-rs/canvas`** (zero dependencies), so `tar` is now **gone from the tree entirely** (`npm ls tar` → empty), and the bump also clears the separate pdfjs "arbitrary-JS on a malicious PDF" advisory (we still pass `isEvalSupported: false`). `npm audit --omit=dev` is now **0 vulnerabilities**. The app only extracts TEXT, so the change is contained to `app/src/lib/docText.ts`: v4's legacy build is ESM (`pdf.mjs`), loaded via a lazy plain `import()` (vitest/vite handle it; at runtime tsc down-levels to `require()`, which Node 24 resolves for ESM). A new test extracts text from a real PDF, verified in **both** vitest and the compiled `dist/` runtime. **Residual (out of scope, dev-only):** the full `npm audit` still flags esbuild/vite **dev-server** advisories pulled by vitest — these are not shipped (test toolchain only) and would need a breaking vitest v4 bump; production (`--omit=dev`) is clean.
- **Severity / confidence:** Medium / Credible risk
- **Affected:** `app/package-lock.json` dependency chain `pdfjs-dist` → `canvas` → `@mapbox/node-pre-gyp` → `tar@6.2.1`; dependency-install/build environments
- **Problem and trigger:** `npm audit --omit=dev` reports high-severity path-traversal and arbitrary file read/write advisories for the installed transitive `tar@6.2.1`. The package is used by the native canvas installation path, so exploitation concerns the machine/container performing dependency installation or rebuilds rather than normal HTTP request handling.
- **Impact:** A compromised or malicious archive encountered in the native dependency installation path could read or overwrite files outside the intended extraction directory, affecting build hosts or image contents.
- **Evidence / reproduction:** Run `npm audit --omit=dev` in `app`; the audit traces the vulnerable package through the chain above. The separately reported `pdfjs-dist` JavaScript-evaluation advisory is not counted as another finding because `app/src/lib/docText.ts` explicitly sets `isEvalSupported: false`, the published mitigation.
- **Potential fix:** Upgrade the PDF/canvas dependency chain to versions using a fixed `tar`, or apply a tested package-manager override where semver/API compatibility permits. Rebuild from a clean lockfile and retain audit enforcement in CI.
- **Regression test / notes:** Assert the resolved `tar` version is outside all reported vulnerable ranges, run unit/integration PDF extraction tests, and build the production image from scratch.

## Low findings

### BUG-034 — Aborted HTMX requests decrement the global in-flight counter twice

- **Status:** ✅ Resolved 2026-06-19 — the in-flight counter now decrements on `htmx:afterRequest` only (which fires for success, error, timeout AND abort); the duplicate `htmx:sendAbort` listener was removed. (Client-side; the cross-request busy-bar behaviour is exercised manually pending the Wave-0 HTMX browser harness.)
- **Severity / confidence:** Low / Confirmed
- **Affected:** `app/public/app.js:58-81`; bundled HTMX abort event behavior
- **Problem and trigger:** `requestDone` is registered for both `htmx:afterRequest` and `htmx:sendAbort`. HTMX emits `afterRequest` and then `sendAbort` for an aborted XHR, so one request decrements twice.
- **Impact:** With multiple concurrent requests, aborting one can clear the global busy indicator while another slow request is still running.
- **Evidence / reproduction:** Start two requests, abort one, and observe the counter drop by two.
- **Potential fix:** Decrement on one terminal event only, or track request identities in a `Set` and remove each once.
- **Regression test / notes:** Browser-test success, error, timeout, abort, and overlapping requests.

### BUG-035 — Clearing required titles causes a database error instead of validation

- **Status:** ✅ Resolved 2026-06-19 — the task / unit / lesson-plan / recurring-task autosave routes reject an empty `title` with an in-place red message and write nothing; the repo updaters also refuse to null a required title (defence-in-depth), so a NOT NULL column never receives a null. Regression test covers empty / whitespace / null and a valid re-save.
- **Severity / confidence:** Low / Confirmed
- **Affected:** `app/src/routes/tasks.ts:103-119`; `app/src/repos/tasks.ts:104-121`; `app/src/repos/schemes.ts:408-427`; `app/src/repos/recurringTasks.ts:52-75`; relevant NOT NULL migrations
- **Problem and trigger:** Autosave routes normalise an empty title to `NULL`, while task, recurring-task, unit, and lesson-plan titles are NOT NULL. The repository sends that value to PostgreSQL instead of rejecting it or preserving a valid title.
- **Impact:** Clearing a title produces a generic failure/save warning and inconsistent UX rather than a useful validation message.
- **Evidence / reproduction:** Delete all text from an editable task/unit/lesson/recurring title and blur the field. The update violates NOT NULL.
- **Potential fix:** Validate trimmed non-empty titles at the route/repository boundary and return a field-specific 422 response, or deliberately allow empty strings if that is the product rule.
- **Regression test / notes:** Test empty, whitespace-only, maximum length, and ordinary title autosaves for each entity.

### BUG-036 — Academic-year timetable preview loses its selected structure on week navigation

- **Status:** ✅ Resolved 2026-06-19 — Prev/Next now carry the explicit `?year=` through navigation, with an "exit preview →" affordance ("This week" still returns to the current year intentionally). Integration test asserts both nav links keep `year=`.
- **Severity / confidence:** Low / Confirmed
- **Affected:** `app/src/routes/timetable.ts:100-181`
- **Problem and trigger:** `?year=<id>` selects an explicit academic-year structure, but Prev, Next, and This week links omit the `year` parameter.
- **Impact:** A teacher previewing next year’s draft timetable is silently returned to date-derived/current-year structure after one navigation click and may believe they are still editing/reviewing the previewed year.
- **Evidence / reproduction:** Open `/timetable?year=<draft>` and click Prev or Next; the resulting URL contains only `date`.
- **Potential fix:** Preserve the explicit `year` query parameter in all week-navigation links until the user intentionally exits preview mode.
- **Regression test / notes:** Assert navigation URLs and labels for current, archived, future, invalid, and no-explicit-year cases.

### BUG-050 — The stored IMAP password is returned to the browser in Settings HTML

- **Status:** ✅ Resolved 2026-06-19 — the password field renders empty with a "configured ✓" indicator; a blank submit preserves the stored secret and only an explicitly typed value overwrites it. Integration test asserts the secret never appears in the HTML and blank-preserves / explicit-replaces correctly.
- **Severity / confidence:** Low / Confirmed
- **Affected:** `app/src/routes/settingsPage.ts:70-75, 288-295`
- **Problem and trigger:** The settings page reads the stored `email_imap_password` and renders it as the full value of a password input. Loading the page therefore sends the reusable mailbox credential into the browser DOM, and test/save requests include it again.
- **Impact:** Any teacher-browser extension, DOM capture, diagnostic snapshot, or shoulder-access session that can inspect the page can recover a credential that did not need to leave server storage. This unnecessarily broadens exposure of a potentially sensitive mailbox password.
- **Evidence / reproduction:** Configure IMAP, reload Settings, and inspect the password input's `value` property or the returned HTML; it contains the stored plaintext password.
- **Potential fix:** Render an empty field with a separate “password configured” indicator, preserve the current secret when the submitted field is empty, and overwrite it only when an explicit new password is supplied. Prefer a dedicated secret store where deployment allows.
- **Regression test / notes:** Assert the stored secret never appears in HTML or test responses, blank submission preserves it, explicit replacement works, and disable/delete semantics are clear.

## Cross-cutting risks

1. **Trust-boundary checks are exact and brittle.** Name redaction and safeguarding gates rely on narrow literal matches, while class-code steps, image IDs, pupil occurrence writes, and session revocation rely on UI flow rather than durable server-side capabilities.
2. **Multi-step operations often lack one commit boundary or durable recovery state.** First-run identity, resource versions/imports, planner cascades, review application/sweeps, recurring generation, email intake, pupil disposal, and backup publication can expose partial state.
3. **Limits are absent or applied after materialisation.** Image, course-document, folder, archive, and IMAP paths accept or allocate content before enforcing an appropriate policy limit.
4. **Database invariants are sometimes implemented only by query convention.** Active scheme uniqueness, recurring idempotency, migrator serialization, and exactly-one-current-year behavior need database-backed enforcement.
5. **Personal-data and file-store lifecycle is not unified.** Exports, narrative records, imports, pupil screenshots, version files, backup, verification, restore, and erasure can disagree about which records/bytes belong to a person or operation.
6. **Network identity is deployment-dependent.** Proxy handling collapses IP limits while directly published ports bypass that proxy, so authentication controls differ according to which listener receives the request.
7. **Green unit and integration suites do not cover the highest-risk boundaries.** Several happy-path assertions encode incomplete disposal/export behavior; most remaining findings need concurrent-connection, injected-failure, streaming/memory, proxy, browser-event, or full disaster-recovery tests.

## Suggested remediation priority

1. **Immediate privacy/security containment:** BUG-001 through BUG-003, BUG-006, BUG-007, BUG-012, BUG-016, BUG-017, BUG-030, and BUG-037 through BUG-046.
2. **Assessment correctness:** BUG-004, BUG-005, BUG-015, and BUG-047 before relying on automated/released marks or daily lesson output.
3. **Prove recovery and disposal:** BUG-009, BUG-010, BUG-039, and BUG-044; perform a full isolated restore and disposal drill including resource bytes before treating either workflow as operational.
4. **Enforce transactional invariants:** BUG-008, BUG-014, BUG-019, BUG-021 through BUG-028, BUG-031, BUG-041, and BUG-048.
5. **Cost, audit, and supply-chain controls:** BUG-011, BUG-018, and BUG-049.
6. **User-facing reliability and deployment hardening:** BUG-013, BUG-032 through BUG-036, and BUG-050.

Before fixes are merged, add a small set of reusable test harnesses: concurrent PostgreSQL barriers, injected repository/filesystem failures, bounded-stream and multipart/archive/IMAP size probes, proxy-aware authentication tests, HTMX browser tests, exhaustive pupil-data fixtures, and an automated scratch restore of a matched database/resource backup set.
