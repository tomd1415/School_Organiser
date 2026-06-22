# Target architecture

## 1. Recommended approach

Build a **TypeScript modular monolith** with:

- SvelteKit for typed server routes/actions, reusable UI components, progressive enhancement, and SSR;
- PostgreSQL for all durable relational state;
- Kysely or Drizzle for typed SQL and migrations, while retaining explicit SQL for complex reports;
- Zod for every external boundary and stored JSON value;
- a local content-addressed/versioned file store behind one storage interface;
- a durable database job runner using leases and unique scheduled slots;
- server-only Anthropic integration behind one policy gateway;
- SSE for slide sync and narrowly scoped live events;
- Vitest for pure/service tests, PostgreSQL integration tests, and Playwright for browser/accessibility flows;
- Docker Compose with Caddy, app, PostgreSQL, and optional Gotenberg.

This is a recommendation, not a requirement to use SvelteKit specifically. Its main advantage is replacing thousands of lines of untyped HTML strings and DOM-selector contracts with compiled components while preserving server rendering and progressive forms. Keep the deployment as one app process unless load proves otherwise.

## 2. Acceptable lower-change alternative

Fastify + a real component/template layer (for example JSX/TSX server components or Nunjucks) + HTMX is acceptable if the team is more comfortable with it. It MUST still provide:

- typed page/view models;
- shared components rather than route-local strings;
- central form/error/autosave primitives;
- one CSS token/component system;
- end-to-end browser tests for HTMX contracts;
- strict route → application service → repository direction.

Do not reproduce the current long string-template modules or a second compatibility skin.

## 3. Logical architecture

```text
Browser
  ├─ Teacher SSR UI + enhanced forms
  ├─ TA restricted SSR UI
  └─ Pupil restricted SSR UI + local answer buffer
        │ HTTPS / forms / JSON / SSE
Reverse proxy (TLS, real client IP, security headers)
        │
Application process
  ├─ web adapters (routes/actions/view models)
  ├─ domain/application services
  ├─ authorisation policies
  ├─ AI policy gateway
  ├─ durable job runner
  ├─ repositories/unit of work
  └─ storage/document adapters
        ├─ PostgreSQL
        ├─ resource volume
        ├─ Anthropic HTTPS
        ├─ IMAP mailbox
        └─ Gotenberg (local sidecar)
```

## 4. Module boundaries

Use one folder/package per domain:

```text
src/
  domains/
    identity/
    calendar/
    curriculum/
    delivery/
    resources/
    teacher-work/
    notes/
    safeguarding/
    pupils/
    assessment/
    ai/
  infrastructure/
    db/
    jobs/
    storage/
    documents/
    email/
    telemetry/
  routes/
    teacher/
    ta/
    pupil/
  lib/ui/
    components/
    forms/
    accessibility/
```

Rules:

- Routes parse input, invoke an application use case, and map result to a view/response.
- Application services own workflows, transactions, and authorisation calls.
- Domain functions are pure where possible and do not import web/database code.
- Repositories contain persistence only and accept a transaction/unit-of-work handle.
- Views consume explicit typed view models and never query.
- Repositories MUST NOT import services.
- Raw SQL MUST NOT appear in route/UI files.
- AI prompt builders return policy-labelled context items and do not call the SDK.

## 5. Command/query separation

Use explicit use cases such as:

- `GetNowDashboard`
- `OpenLesson`
- `SaveStoppingPoint`
- `PlacePlans`
- `SavePupilAnswer`
- `MarkOccurrence`
- `ReleaseResults`
- `DisposePupil`
- `GenerateLessonResources`

Commands return domain outcomes, not HTML. Queries return typed read models, preferably through set-based SQL. This keeps UI changes from duplicating business rules.

## 6. Request and error model

Every external input is parsed through a schema. Standard errors:

- 400 validation;
- 401 unauthenticated;
- 403 authenticated but not authorised or feature gate off;
- 404 inaccessible/not found without cross-user disclosure;
- 409 optimistic/concurrency conflict;
- 413 size limit;
- 422 valid input but domain rule violated;
- 429 rate limited;
- 500 unexpected failure with correlation ID.

HTML-enhanced requests must retain real error status. The client must show save failures without requiring a 200 error fragment. Prefer a shared response envelope or framework action state over special-case selector logic.

## 7. Authorisation design

Implement policies as testable functions/services:

- `teacherOnly(actor)`
- `taMayViewOccurrence(actor, occurrence)`
- `limitedRoleMayReadResource(actor, signedCapability)`
- `pupilMayAccessOccurrence(actor, occurrence, now)`
- `pupilMayWriteField(actor, occurrence, worksheetVersion, fieldKey)`
- `teacherMayEditPlanScope(actor, classOrMaster)`

Perform both role and object checks inside the use case. Signed image/resource capabilities are short-lived and bind resource ID, audience/role, expiry, and optionally occurrence.

## 8. Time model

- Store all instants in UTC.
- Store school calendar dates separately from instants.
- Resolve “today/current lesson” only through a clock injected with `school_timezone`.
- Pass an injectable clock to all tests.
- Never construct school dates using browser locale or `new Date('YYYY-MM-DD')` without an explicit zone strategy.
- Recurring schedules and review windows are computed in the school timezone and protected against DST transitions.

## 9. File and document architecture

Define a `BlobStore` interface: stage, publish, read, stream, exists, delete, checksum. Local filesystem is the v1 adapter; object storage can be added without changing domain code.

Use opaque random paths, never user filenames as paths. Validate MIME by content where practical. Stream uploads and enforce per-file, per-request, entry-count, nesting, decompressed-size, and total budgets before allocation. Disable active evaluation in PDF extraction. Treat SVG/HTML as download-only unless sanitised in a separate origin.

## 10. Real-time design

SSE channel keys are occurrence-section IDs. Authenticate at connect and revalidate eligibility. Persist slide/lock state before broadcasting. Send current state immediately, heartbeat periodically, and remove subscribers on close. In a single process, an in-memory fanout is acceptable. If more than one app replica is ever allowed, replace it with PostgreSQL LISTEN/NOTIFY or Redis and add cross-instance tests.

Polling remains appropriate for aggregate pupil work, but use signatures/ETags and 204/304 no-change responses. Never refresh a region containing focused or dirty controls.

## 11. Background jobs

Replace independent `setInterval` loops with one leased job framework:

- database records scheduled slot and lease expiry;
- unique `(job type, slot)` guarantees once-per-slot claims;
- handlers are idempotent;
- retries use bounded exponential backoff;
- failures remain visible in an operations page/log;
- restart resumes expired leases;
- tests use an injected clock;
- AI jobs reserve cost before work and reconcile after.

Jobs: recurrence, email poll, due marking, file deletion, morning brief materialisation, optional review sweep, backup verification reminder, and cleanup of expired exports/devices/buffers.

## 12. UI architecture

Create one design system with semantic tokens and components: AppShell, Navigation, ContextHeader, Card, Button, FormField, SaveState, Dialog, Tabs, DataTable, Timeline, Badge, EmptyState, ErrorSummary, LiveRegion, Worksheet blocks, SlideDeck, Marking panel.

Use route-level page models. Keep teacher, TA, pupil, projector, and print layouts separate where their privacy/content needs differ, but share safe presentation components.

## 13. Performance budgets

- Now and ordinary list pages: server response p95 under 150 ms on LAN test hardware after warm-up.
- Lesson initial HTML: p95 under 300 ms with 30 pupils, two course sections, and multiple resources.
- Save action: p95 under 150 ms excluding file upload/AI.
- Unchanged poll: under 50 ms and no meaningful HTML payload.
- No ordinary page should issue a second query-heavy header request; compose required header data in the page query or a short-lived aggregate cache.
- Define query-count budgets for Now, timetable, lesson, marking, planner, and pupil workspace.
- Fingerprinted static assets with immutable caching; initial critical CSS/JS budget documented and tested.

## 14. Observability

Use structured logs with request/job correlation IDs and redaction. Record route, status, latency, query count, job outcome, AI feature/status/cost, upload size, and auth rate-limit events. Do not log passwords, tokens, raw cookies, pupil answers, unredacted prompts, or safeguarding text.

Provide `/health/live` and `/health/ready`; readiness checks DB and required resource volume without exposing details publicly.

## 15. Dependency policy

- Pin lockfile and run production-only audit in CI.
- No runtime CDN, analytics, external font/icon, or remote image dependency.
- Self-host Atkinson Hyperlegible with licence.
- Prefer maintained, narrowly scoped dependencies.
- Record licences for vendored/imported teaching content.
- AI SDK is imported only by the gateway adapter.

## 16. Architecture decision records required before build

1. SvelteKit vs Fastify/template approach.
2. Legacy data migration and cut-over strategy.
3. Future-binding table vs future occurrence materialisation.
4. Secret encryption mechanism.
5. Mark release policy defaults.
6. Whether test pupil writes are ephemeral or retained in isolated rows.
7. Exact school timezone and calendar semantics.
8. Browser support floor for school-managed devices.

