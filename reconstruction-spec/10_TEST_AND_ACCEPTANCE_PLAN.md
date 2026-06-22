# Test and acceptance plan

## 1. Test layers

- **Pure/domain:** time, recurrence, exception precedence, planner maths, worksheet parsing, markers, redaction.
- **Repository integration:** real PostgreSQL, constraints, transactions, locks, queries.
- **Application/route:** real app instance and test DB/file store, auth, CSRF, status, view models.
- **Client/component:** component state, autosave, local buffer, dialogs, SSE reducers.
- **Browser E2E:** real browser, server, DB, seeded fictional data; keyboard/touch/offline/accessibility.
- **Operational:** Compose, proxy, backup, verify, restore, migration, resource checksum.
- **Non-functional:** query count, latency, memory/streaming, asset budgets, dependency/security scans.

No test may call a real AI provider or real mailbox. Provider and IMAP adapters are contract-faked; optional manual live smoke is separate, explicit, and self-cleaning.

## 2. Foundation and migration tests

- Fresh database applies every migration once.
- Two concurrent migrators serialise and both finish safely.
- Upgrade from each supported release fixture succeeds.
- Constraints reject two current years, two active schemes, duplicate versions, duplicate recurrence instances, two running timers, invalid enum/range, and multi-target resource links.
- Failed migration rolls back and leaves schema version honest.
- Legacy transform reconciles table counts and resource checksums.
- Current timetable, active schemes, adaptation links, pupil answer provenance, marks, and disposal records survive sampled migration.
- Migration is idempotent or clearly refuses a second run without corrupting data.

## 3. Authentication and authorisation tests

- Brand-new instance redirects login to welcome.
- Concurrent welcome claims have one winner.
- Password hash never appears in response/log.
- Teacher login success/invalid/rate-limit/idle/absolute-expiry paths.
- TA success does not reset teacher brute-force counter.
- Named TA disable, delete, password reset, and epoch mismatch revoke live session.
- Pupil access switch off blocks class-code, resume, current sessions, and writes.
- Class code is required and bound with TTL before name/PIN stages.
- Class-code and PIN rate limits work behind trusted proxy and resist spoofed headers.
- Pupil errors do not reveal disabled account or correct identity.
- PIN lock/unlock/reset and credential-disable atomically revoke sessions/devices.
- Remembered device happy path, expiry, wrong class, policy off, pupil inactive, revoked token, Not me.
- Teacher-only endpoints reject TA and pupil even if `authed` is true.
- TA allow-list and per-occurrence/resource assignment checks.
- Pupil cannot access teacher/TA/resource/download/search routes.
- Test-pupil activation is teacher-only and retains teacher role.
- CSRF missing/wrong/valid for every mutation family.

## 4. Clock, calendar, and exception tests

- Before/inside/after each period, day boundaries, weekend, holiday, INSET, out-of-term, no-year, no-timetable.
- Europe/London DST spring/fall and configured non-London zone if supported.
- Current/next lesson with multi-course slot.
- Exception precedence for whole-day and per-slot cancelled/free/room/cover.
- The same effective result appears on Now, timetable, lesson, TA, pupil eligibility, availability, and print.
- Temporary free creates free workspace and reverts to teaching.
- Holiday/cancelled/free print does not materialise occurrences.
- Explicit academic-year preview persists across week navigation.
- Custom lesson start/end overrides affect clock and display.

## 5. Now/dashboard tests

- Current/next cards, free period, outside-hours, empty setup states.
- Stopping point and open follow-ups from last occurrence.
- Needs-me ranking: safeguarding above marking/tasks/events/captures; cap and more count.
- Marking content absent when marks gate off.
- Pupil work shown only as aggregate.
- Morning brief risk bands and empty state.
- Unchanged signature returns 204; changed state updates; poll does not replace focused/dirty content.
- Background polls do not refresh idle last-active timestamp.
- Header rendered without extra query-heavy round trip; enforce query budget.

## 6. Curriculum and planner tests

- Scheme author materialises atomically; AI/unavailable/invalid output leaves no partial rows.
- First/draft activation policy; one-active constraint under concurrency.
- Clone preserves labels, kit, links, spec points, order, and adaptations remain linked to original plan by policy.
- Unit/lesson reorder and delete/archive with referenced history.
- Class adaptation inherit/create/edit/history/reset; simultaneous edits conflict or serialise.
- Promotion proposal never edits master before approval.
- Multi-slot class stream orders dates correctly and skips holidays.
- Lay-down does not rewrite past occurrences.
- Carry-over shifts future unlocked bindings and preserves history.
- Planner pure cases: insert empty/occupied, move/swap, whole unit, pull, lock, no-op, undo.
- Cascade crosses half-term correctly and warns/refuses year overflow without dropping a plan.
- Concurrent planner commands serialise per class and calculate against locked current state.
- Click/touch/keyboard drop resolution produces the same commands as mouse drag.
- Planner performance on full-year three-slot class stays within query/latency budget.

## 7. Resource and file tests

- Atomic create+v1 and concurrent append allocate unique versions/paths and correct current pointer.
- Failed DB write removes staged file or leaves a durable cleanup job.
- Duplicate checksum handling under concurrency.
- Link exactly-one-target and usage queries.
- Individual/folder/ZIP limits stop streaming early; memory remains bounded.
- ZIP slip, nested depth, entry count, compression bomb, path traversal, empty/in-progress files.
- PDF extraction with evaluation disabled; DOCX/PPTX/ODT/text extraction; Gotenberg down fallback.
- Character caps, per-file/total caps, skip generated sources.
- SVG/HTML active content forced download; raster safe inline; `nosniff`.
- Signed lesson image correct/forged/expired/wrong role/wrong lesson.
- Import stage/preview/commit/cancel, duplicate titles, OGL attribution, idempotent re-import.
- Markdown/block edit preview/round-trip and optimistic version conflict.
- DOCX export, slide level slicing, teacher-note stripping on pupil/projector and presence in presenter.
- File deletion retry after replacement/disposal.

## 8. Lesson cockpit tests

- Opening existing occurrence avoids writes; opening new teacher lesson materialises exactly once.
- Preview/search/print paths remain read-only.
- Split lesson exposes every course tab with correct plan, adaptation, resources, roster endpoint, and slide deck.
- Effective room/cover badge; cancelled/free suppression.
- Plan bind refreshes details/resources without full reload.
- View/local/master editing writes correct target; no `gc=0` local fallthrough.
- Existing adaptation fields not clobbered by partial save.
- Outline tracker updates progress and textual stopping point; disabled in edit mode.
- Fast-capture category/safeguarding survives reload and enters register.
- TA feedback appears where intended and flagged feedback is withheld from AI.
- Pupil-work unchanged poll returns 204 and does not disturb an open marking dialog.
- Query-count and response-time budget with 30 pupils, multiple worksheets, two sections.

## 9. Pupil login/work tests

- Current lesson selection for one/multiple enrolments and remembered resume.
- Other class, historic, future, cancelled, free, off-timetable occurrence writes return 403/404 safely.
- Forged field key, hidden other-level field, stale/other worksheet version, arbitrary image path rejected.
- Pupil sees shared + assigned level only and no Support/Core/Challenge label.
- Multiple worksheet keys do not collide and remain stable across resource switches as specified.
- Every field type saves and shows saving/saved/failure accessible state.
- Answer change invalidates stale mark transactionally.
- Offline typed answer buffered, restored, retried, cleared after confirmation, expires after 24h.
- Conflicting non-empty server value is not overwritten by stale local buffer.
- A failed save remains warned after unrelated successful request.
- Active interaction keep-alive prevents mid-work timeout; hidden/unattended tab still expires.
- Screenshot valid formats/size, replacement tombstone, DB failure cleanup, own-image read, cross-pupil/TA denial.
- Done trigger/undo and marking enqueue idempotency.
- Feedback allow-list/rating/comment limits.
- Accessibility preferences apply before paint and persist without leaking between server identities beyond device-local intent.
- Test pupil excluded from real counts, marks, redaction, and roster.

## 10. Worksheet parser/widget tests

- Parse/render/serialise round-trip for headings, instructions, differentiation sections, text, blanks, choice, check, matching, Parson's, code, tables, screenshot.
- Stable deterministic keys after unrelated prose changes according to documented key policy.
- Duplicate/malformed key handling.
- Review, pupil, projector, and edit modes expose only allowed data.
- Matching and Parson's keyboard/touch alternatives, completion counts, autosave.
- Trace/truth-table cells render compact single-line controls and mark correctly.
- Read-aloud text excludes answers/private notes and handles code appropriately.
- Word-bank insertion is XSS-safe and triggers save.
- Prompt-generated maximum-length worksheet renders within performance/accessibility budgets.

## 11. Marking and ATL tests

- Derive scheme only from matching resource/version; edit point ownership check; ready state.
- Exact normalisation, numeric tolerance policy, keyword alternatives, choice/tick, partial totals.
- Open batch is anonymous per question; no pupil IDs/tokens/names.
- Guard-matched answer never reaches provider spy and appears for teacher review.
- AI evidence substring/range/confidence/safety gate.
- Suggestions remain hidden from pupil; confirmation/release matrix exhaustively tested.
- Hold/release/revoke, ticks-only/scores, instant policy.
- Changing answer invalidates mark; switching worksheet does not mark stale provenance.
- Confirm-all only confirms eligible confident suggestions.
- Override belongs to correct pupil/occurrence/answer and records history.
- Marking modal shows pupil's assigned questions plus saved prior-level answers, not all levels.
- Previous/next and worksheet tabs preserve modal/focus.
- Comment/profile/class summary and AI unavailable paths.
- CSV escaping/formula-injection protection; answer-pack print safety.
- ATL accepts 1..4, rejects range and out-of-class pupil, same value on modal/grid.
- Durable marking job survives restart, deduplicates, and honours changed manual policy.

## 12. AI gateway tests

- No API key, master off, feature off, over budget, timeout, 401/403, 429, overload, parse error, success.
- Roster full-name, punctuation, whitespace, substring collision (`PUPIL_1` vs `PUPIL_10`), common-word name, quote/backslash name, school-wide roster scale.
- System/instruction/context all redacted; final serialised egress assertion.
- Safeguarding item removal for every feature family.
- Redacted request persisted before provider call; concurrent cost reservations cannot exceed cap.
- Successful call reconcile failure does not discard output and remains operationally visible.
- Failed unbilled call releases estimate according to policy.
- Structured output schema, array/string caps, invalid IDs, malicious Markdown/HTML.
- Token re-expansion recursively and only for teacher display.
- Registry contains every gateway feature and only priced/selectable model IDs.
- Idempotency prevents double generation/spend on retry.
- No source file outside AI adapter imports provider SDK.

## 13. Notes, safeguarding, disposal, and export tests

- CRUD, links, tags, follow-ups, stopping point, interest/resurface.
- Quick note AI preview then apply; plain fallback; private bypass.
- Every flagged source type enters safeguarding register/count and remains after reload.
- Handling status/action note permissions and audit.
- Safeguarding records absent from all AI provider spies and lower-role/search contexts.
- Pupil SAR includes all permitted records, files, manifest/checksums; excludes PIN/device hash and safeguarding.
- Anonymise removes name variants, owned narrative, credentials/devices/screenshots/profile while retaining only approved nameless attainment.
- Erase removes all dependent personal rows and bytes; shared text scrubbed; failed unlink queued/retried.
- Disposal transaction rollback does not leave half-erased state; audit contains token/counts only.

## 14. Tasks, recurrence, time, email tests

- Task validation/status/due-rule resolution/by-next-lesson around holidays.
- Paste parse and task breakdown manual/AI failure.
- Focus ranking by urgency, fit, load, interest decay, time of day; empty “go home” state.
- One running timer under concurrency; pause/resume actual accumulation.
- Work windows exclude break/lunch and include dated free/cancelled while excluding cover/events.
- Planned vs actual/diverted preserved.
- Weekly/monthly/every-N/per-lesson recurrence; two same-day slots; crash after first slot; overlapping workers.
- Email MIME/encoded subject/multipart/HTML stripping/limits.
- Email dedup single winner, stale claim, crash between route/complete, fallback task when AI off.
- Stored mailbox secret never rendered/logged; blank update preserves; explicit replacement works.

## 15. Browser and accessibility tests

- Teacher keyboard navigation, active link, advanced drawer, accessibility panel.
- Native dialogs: open, focus, Escape, return focus, mark arrow navigation.
- Save error/offline banners and beforeunload only when genuinely dirty.
- Planner mouse, touch, keyboard; no hover-only controls.
- Pupil login PIN pad, worksheet tabs/panes, all widgets, screenshot help, Done/feedback.
- SSE late join, navigation, lock/unlock, reconnect, unauthorised section.
- Projector contains no pupil names/private notes/model answers.
- axe: no serious/critical violations on representative teacher/TA/pupil/print pages.
- Manual screen reader: Now, lesson tabs, marking modal, pupil worksheet, save state, safeguarding.
- 200%/400% zoom, large text, high contrast, reduced motion, narrow viewport.
- Unique IDs and valid landmark/heading order after dynamic updates.

## 16. Performance and resilience tests

- Query counts and p95 budgets from architecture document.
- Static asset compressed-size and request-count budget.
- Idle CPU: timers pause in hidden tab; no unnecessary 1-second DOM scans.
- Upload memory under cap+1 inputs.
- 30-pupil/two-course/multi-worksheet lesson load.
- Full-year planner unit cascade.
- PostgreSQL/app restart during answer save, resource append, marking job, recurrence, email, disposal, and AI reservation.
- Resource volume unavailable/read-only produces actionable failure and no false DB success.
- AI/IMAP/Gotenberg offline core journeys remain functional.

## 17. Operational acceptance

- Compose starts from empty host and survives reboot.
- Only proxy ports exposed to LAN; trusted IP observed correctly.
- Production refuses default credentials/insecure config.
- Backup is encrypted and manifest written last.
- Verification checks checksums, restores DB to scratch, unpacks files, and cross-checks references.
- Full destructive restore on throwaway copy succeeds from cold.
- Upgrade and rollback instructions are executed, not only read.
- Health/readiness and structured logs work without data leakage.
- Production dependency audit has no unaccepted runtime high/critical advisory.

## 18. Release acceptance record

For each release record commit, schema version, test totals, browser matrix, accessibility findings, performance figures, dependency audit, backup compatibility, restore-drill date, open risks, DPIA gate state, and owner sign-off. A green unit suite alone is insufficient.

