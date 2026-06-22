# Gaps and recommended additions

## 1. Status categories

- **Current gap:** code/documented behaviour is incomplete or brittle now.
- **Rebuild hardening:** parity behaviour exists but target design should strengthen it.
- **Proposed feature:** not required for strict parity; recommended after core acceptance.

## 2. Current gaps to close before trusting a rebuild

### P0 — correctness and recovery

1. **Planner cascade can silently overflow.** The current Phase 14 plan identifies a last-lesson drop when no trailing gap exists. Target must preview/refuse/warn and write atomically.
2. **Planner lacks complete touch/keyboard interaction.** Server operations are tested; client drop-resolution and non-mouse use are not adequately covered.
3. **Restore drill is an operator action, not yet evidence.** Scripts exist, but production confidence requires an executed isolated restore with recorded result.
4. **No full browser safety net.** Critical DOM behaviour is partly jsdom-tested, but offline/reconnect, SSE, focus, touch, drag, and end-to-end accessibility need Playwright/manual coverage.

### P1 — architecture and performance

5. **CSS compatibility debt.** The single live dark stylesheet still imports recovered light widget rules and repairs them with a large compatibility layer. Do not copy this into the rebuild.
6. **Lesson and header query duplication.** Current code defers a query-heavy header and repeats pupil/resource reads. Build composed page queries and enforce budgets.
7. **Planner writes are not fully set-based.** Large cascade/unit changes cause repeated occurrence operations.
8. **In-process timers are bespoke.** Move to one leased job runner to close crash/multi-process gaps.
9. **AI registry drift.** Actual feature labels such as lesson/adapt slides, estimate calibration, and scheme review are not all represented in the current picker registry.
10. **Secret at rest.** IMAP/API secrets may be application-managed in PostgreSQL. Encrypt or keep them deployment-managed.
11. **Timezone consistency.** Several code paths hardcode Europe/London. Make it one validated setting/domain service.

### P2 — maintainability

12. **Large route/render modules and raw SQL in routes.** Rebuild with typed use cases/view models.
13. **Historical schema seams.** Merge duplicate exception concepts and structure recurrence patterns.
14. **Stale documentation labels.** Establish generated feature/route/schema references and traceability.
15. **Static asset caching.** Fingerprint/minify assets and add immutable caching.

## 3. Recommended product additions

### 3.1 Homework as data — high value, medium effort

Assign a worksheet/resource to a class with due date, allow pupil completion outside the live lesson under a separate eligibility policy, auto-mark through the existing pipeline, and show missing/late status. This solves a natural gap between lesson work and tasks.

Safety prerequisites: explicit homework access window, no “current lesson only” predicate reuse, separate release policy, retention, and device/session review.

### 3.2 Stages and strands progression — high value, large effort

Model reusable strands, ordered stages, criteria per stage/strand, evidence links, and per-pupil attainment. Overall stage is achieved only when required criteria across strands are evidenced. Add class heat map and evidence suggestion from confirmed marks, never automatic award.

Open owner decisions: course-specific vs school-wide, independent strand advancement, evidence authority, and retention/reporting use.

### 3.3 Class risk board — high value, medium effort

One teacher-only view per class: spec coverage against exam proximity, recent pace, unbound lessons, marking backlog, ATL trend, completion/feedback, and last taught. Deterministic, no AI. Sort by urgency with transparent reasons.

Avoid predictive labels about individual pupils; this is cohort planning support.

### 3.4 Weekly time review — medium value, small effort

Roll up work blocks and timers by planning/marking/admin/resource work, planned vs actual, and evening load. Show estimate bias and protected-free-period erosion. This makes existing time capture useful.

### 3.5 Parent contact and EHCP preparation — high value, medium effort

Add an owed/made contact log and structured preparation checklist linked to event/pupil, without outbound communication. Keep sensitive detail local and exclude from AI unless a separately designed tokenised report feature is approved.

### 3.6 Recurring exceptions and cover ledger — medium value, small/medium effort

Materialise standing duties/meetings as dated exceptions with the same idempotent scheduler. Summarise cover given/owed and show a Now action during cover. Keep source pattern and materialised exception distinct.

### 3.7 Pupil progress view — medium value, small effort after homework

Show own completed work, released feedback, next assigned work, and retrieval history. No ranking or peer comparison. Avoid exposing teacher-only level/ATL notes.

### 3.8 External reference links — medium value, small effort

Permit licence-safe URL + note + attribution on a lesson/unit without copying content. Validate scheme, display external destination clearly, and never server-fetch arbitrary URLs without SSRF controls.

### 3.9 Read-only calendar/MIS synchronisation — medium value, medium/large effort

Import iCal or a known MIS export into a staged preview/diff. Do not allow an external feed to overwrite local timetable/history without explicit application. Prefer signed/static imports over new long-lived credentials initially.

### 3.10 Teams assignment deep link — situational value

Keep per-class Teams URL and one-click open/copy. Deeper Microsoft Graph integration adds identity, scopes, token storage, and DPIA burden; design only if the manual link remains painful.

### 3.11 Richer worksheet blocks — medium value

Add label-the-diagram/hotspot and ordered-steps beyond Parson's where pedagogically useful. Each new block must define keyboard/touch fallback, stable answer representation, deterministic/AI marking policy, export/print, and read-aloud behaviour before implementation.

## 4. Features deliberately deferred

- Multi-teacher/shared-school tenancy: requires new ownership/RBAC/DPIA architecture.
- AI-written parent reports: high privacy risk; design and approval before coding.
- Vector search: adds embedding provider/data flow; keyword search should be measured first.
- Outbound email: a new egress and impersonation surface.
- Automatic progression/ability decisions: keep teacher judgement authoritative.
- Full behaviour/sanction log, attendance, or MIS replacement.

## 5. Recommended priority after parity

1. Planner/recovery/browser hardening.
2. Class risk board and weekly time review from existing data.
3. Homework as data plus pupil progress view.
4. Parent contact/EHCP preparation.
5. Stages/strands after owner decisions.
6. Recurring exceptions/cover ledger and external references.
7. Integrations only after local workflows prove insufficient.

## 6. Feature proposal template

Before adding any feature, document:

- problem and primary user;
- data collected and lawful purpose;
- role/object permissions;
- states and destructive transitions;
- AI/provider involvement;
- safeguarding and retention impact;
- UI/accessibility flow;
- failure/offline behaviour;
- migrations/backups/exports/disposal;
- tests and performance budget;
- explicit non-goals.

