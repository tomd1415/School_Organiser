# Implementation and migration plan

## 1. Delivery strategy

Build in vertical slices that end in usable, tested behaviour. Do not create every table first and leave policy/UI until later. Safety foundations land before pupil or AI traffic. The legacy system remains available and read-only during migration rehearsal.

Each slice requires:

- approved requirement and view model;
- schema/migration where necessary;
- domain tests before route/UI work;
- repository integration tests;
- permission and failure-path tests;
- browser acceptance for interactive behaviour;
- documentation/traceability update;
- no new critical/high findings in review.

## 2. Phase 0 — decisions and harness

Deliverables:

1. Approve framework ADR, timezone, browser support, secret storage, future-binding model, data cut-over, and retention unknowns.
2. Create repository structure, TypeScript strict configuration, lint/format, CI, test database factory, fake clock, provider spy, file-store fake, and seeded fictional dataset.
3. Build PostgreSQL migration runner with advisory lock.
4. Add request correlation, structured redacted logging, health endpoints, and production config validation.
5. Add Playwright with desktop, keyboard, touch, pupil, projector, and accessibility projects.
6. Define design tokens/components and accessibility acceptance harness.

Exit: blank application, database, auth skeleton, CI, browser test, and backup smoke run locally.

## 3. Phase 1 — identity, setup, and schedule foundation

Implement:

- first-run atomic identity claim;
- teacher and named TA accounts/session revocation/rate limiting;
- academic years/calendar ranges/periods/staff/rooms/courses/groups/enrolments;
- timetable slots and multi-course links;
- onboarding and setup UI;
- one clock service and one exception resolver;
- week timetable and accessible list view;
- draft-year preview and rollover foundation.

Exit: a teacher can configure a fictional school year and see a correct timetable at boundary dates; TA cannot reach teacher routes.

## 4. Phase 2 — daily operational core

Implement:

- Now dashboard and no-change signature;
- lesson occurrence/section open with split-course tabs;
- notes, stopping points, follow-ups, quick capture;
- tasks, events/deadlines, day/lesson checklists;
- free-period workspace, club record, exceptions, effective print;
- recurring task definitions/instances and durable job runner;
- focus and timer/work-block basics;
- full-text search.

Exit: the product is useful without curriculum import, pupil access, or AI.

## 5. Phase 3 — curriculum and resources

Implement:

- schemes/versions/units/plans/activation constraints;
- resource store, atomic versions, links, safe upload/download;
- PDF/Office extraction and Gotenberg adapter;
- Markdown/block slides, worksheets, answers, support, TA notes;
- preview, projector, presenter, DOCX export;
- class adaptations/history/reset/promotion;
- curriculum map and multi-slot delivery;
- planner with keyboard/touch/cascade preview/overflow/locks/undo;
- kit, concepts, pedagogy, course documents, spec coverage.

Exit: a whole term can be planned, rescheduled, taught, and reviewed manually. Planner cannot silently drop a lesson.

## 6. Phase 4 — privacy gateway and teacher AI

Implement one AI gateway and complete registry first. Add features incrementally:

1. captured/note/email/task routing and breakdown;
2. lesson drafting/adaptation/resources/slides/retrieval;
3. scheme authoring/conversion/review/coverage;
4. summaries and calibration.

For each: redaction/withholding tests, schema validation, idempotency, cost reservation, degrade path, and proposal-before-apply. Add audit viewer/export and feature/model/budget settings.

Exit: all gateway labels are registered; a code search confirms no SDK import outside adapter; AI-off and provider-failure journeys pass.

## 7. Phase 5 — pupil access and accessible workspace

Implement behind default-off DPIA gate:

- class code/name/PIN flow and locks;
- pupil/test-pupil policy predicates;
- worksheet parser/renderer and stable field inventory;
- all required block types and multiple worksheet prefixes;
- autosave, operation-scoped state, local text buffer/reconnect/conflict;
- screenshot answers with file lifecycle;
- Done/feedback/accessibility toolbar;
- remembered devices behind separate policy;
- slide SSE and lock.

Exit: exhaustive cross-pupil/cross-class/historic/future/field-forgery tests pass; WCAG/manual pupil pass complete; access switch immediately revokes sessions.

## 8. Phase 6 — assessment and safeguarding loop

Implement behind marks DPIA gate:

- mark scheme derive/edit/ready;
- deterministic markers and provenance;
- anonymous open-answer batches and safety gate;
- durable marking jobs;
- marking queue/modal, confirmation, override/history;
- hold/instant release and pupil results;
- comments, answer pack, CSV, class summaries, profiles;
- ATL live grid;
- safeguarding register across all source types;
- SAR export, anonymise, erase, disposal/file outbox.

Exit: no suggested mark can appear to a pupil; guard-matched text never reaches provider; complete export/disposal drills pass.

## 9. Phase 7 — operations, migration, and production proof

Implement/complete:

- IMAP polling with encrypted secret and durable claims;
- morning brief and review jobs;
- backup/verify/restore scripts for DB+files as a matched set;
- static fingerprinting, security headers, production network topology;
- metrics/query budgets and slow-page optimisation;
- legacy import utility and reconciliation report.

Run at least two full migration rehearsals from copies:

1. export legacy DB/resource manifest;
2. transform into target schema;
3. validate counts, constraints, checksums, active schemes, current timetable, selected pupil work and marks;
4. run all tests plus exploratory acceptance on migrated data;
5. discard and repeat from clean target;
6. time cut-over and rollback.

Exit: signed restore drill, migration report, DPIA decision, and production readiness review.

## 10. Cut-over plan

1. Announce read-only window.
2. Stop legacy writes/background jobs.
3. Create verified encrypted legacy backup set.
4. Run final migration with correlation report.
5. Start target on a private validation port.
6. Smoke teacher, TA, pupil-gated-off, current timetable, lesson, resources, marks, exports.
7. Switch reverse proxy.
8. Keep legacy stopped/read-only with rollback instructions for an agreed period.
9. Monitor errors, jobs, storage, and save failure rate.
10. Roll back only by stopping target and restoring/switching the verified legacy set; never write both systems concurrently without a designed replication mechanism.

## 11. Work decomposition for an implementation LLM

Give the LLM one bounded issue at a time containing:

- requirement IDs;
- allowed files/modules;
- exact permission policy;
- transaction and failure semantics;
- tests to add first;
- explicit non-goals;
- command gates.

Preferred issue order within a slice:

1. pure domain types/functions and failing tests;
2. migration and constraint tests;
3. repository and transaction integration tests;
4. application use case and authorisation tests;
5. route/action and view-model tests;
6. component/UI/browser tests;
7. docs/traceability and review.

Avoid “build the whole pupil portal” prompts. Use changes reviewable in hundreds, not thousands, of lines.

## 12. Quality gates

Every merge:

- typecheck, lint, unit, integration, and relevant Playwright pass;
- migrations apply from blank and previous release;
- no real external AI/email call in tests;
- no snapshot update without human review;
- no new SDK import outside adapters;
- no raw SQL in routes/components;
- no unvalidated mutation input;
- no accessibility serious/critical violation;
- no secrets/pupil content in logs/fixtures;
- production dependency audit reviewed.

Every release additionally requires backup/restore compatibility, performance budget, permission matrix, migration rehearsal where schema changed materially, and owner acceptance on a fictional dataset.

## 13. Effort/risk order

Highest risk: data migration, pupil authorisation, safeguarding/AI boundary, marking release, file lifecycle, planner cascade, and restore. Build/review these with small changes and independent adversarial tests.

Lower risk: ordinary teacher CRUD, static pedagogy content, labels/filters, read-only reports. These can be grouped after foundations are stable.

