# LLM build playbook and common traps

## 1. Operating instructions for the implementation LLM

Before editing:

1. Read this pack in order and locate the requirement/test IDs for the assigned slice.
2. Inspect current target code and migration state; do not assume a phase document is current.
3. State the permission predicate, transaction boundary, failure direction, and non-goals.
4. Add failing tests first for safety/correctness work.
5. Make the smallest coherent change.
6. Run proportional unit, integration, browser, type, lint, and migration checks.
7. Update traceability and report exact validation.

If a requirement conflicts with existing code, stop and surface the conflict. Never weaken a privacy/safeguarding invariant to make a test pass.

## 2. Architecture traps

### Trap: copying current file structure

The current application grew by phases. Copying 40 route modules, 68 tables, and long HTML-string renderers preserves accidental complexity. Rebuild around domain use cases and typed components.

### Trap: “thin service” that still leaves logic in routes

Input parsing and response mapping belong in routes; orchestration, authorisation, transaction, and domain decisions do not. A route calling five repositories directly is not thin.

### Trap: generic repository abstraction

Do not create a CRUD repository that hides SQL semantics. Use domain-specific repository methods and explicit transactions. PostgreSQL constraints and set-based queries are part of the design.

### Trap: using JSONB for everything

JSONB is appropriate for prompt/audit payloads, guided access, history detail, and structured recurrence metadata. It is not a substitute for relational constraints on users, classes, plans, answers, marks, or links.

### Trap: premature microservices/Redis/queues

This is one teacher on one LAN server. A modular monolith plus PostgreSQL leases is sufficient. Add distributed infrastructure only if requirements change.

## 3. UI traps

### Trap: making a second theme

Create one token/component system. Do not import old CSS, add a compatibility layer, or use hundreds of `!important` rules.

### Trap: styling before state contracts

Autosave, error, dialog, polling, focus, and permission behaviour are functional requirements. Define component states and tests before visual polish.

### Trap: hiding instead of authorising

Removing a button from pupil/TA UI does not protect an endpoint. Enforce role and object predicates in the use case.

### Trap: drag-and-drop only

HTML5 drag-and-drop excludes touch and keyboard. Build click/pick/drop and keyboard operation first; mouse drag calls the same command.

### Trap: refreshing live regions containing input

Polling can wipe typed work, close dialogs, and move focus. Use signatures and 204 no-change; isolate live read-only regions.

### Trap: one global save flag

Track saves by stable operation/control ID. One successful request must not clear another failed field. Do not use common form names such as `value` as operation identity.

### Trap: assuming HTTP 200 means saved

Use real status and a typed domain success. Never reset on a swallowed server error or unrelated request.

### Trap: inaccessible collapsed navigation

Hover-only expansion and hidden open details fail keyboard/touch users. Support focus-within, explicit toggle, and persistent labels for assistive technology.

## 4. Time and schedule traps

### Trap: browser/local date guessing

“Today” and current lesson are school-timezone domain facts. Use the injected clock and explicit local date conversion, including DST.

### Trap: duplicating exception logic

Do not implement cancellation/free/room/cover rules separately in Now, timetable, TA, pupil, print, and availability. One resolver returns an effective slot.

### Trap: one slot per week

Classes can have multiple lessons per week. Lay units across the merged chronological class-slot stream.

### Trap: materialising on reads

Search, preview, print, and planning reads must not create ghost lesson occurrences. Use future delivery bindings or explicit command paths.

### Trap: planner overflow

Never drop the last lesson from a cascade silently. Calculate full result, show/return overflow, then write atomically.

## 5. Pupil and assessment traps

### Trap: trusting occurrence or pupil IDs

Every pupil write must bind session pupil + group + current eligible occurrence + actual worksheet field. IDs are guessable and not capabilities.

### Trap: validating only a worksheet prefix

Render/resolve the exact worksheet version and level slice; require the submitted field key to be present.

### Trap: showing differentiation labels

The teacher sees Support/Core/Challenge. Pupils receive the slice without the label/colour hierarchy.

### Trap: treating Done as release

Done may trigger marking; it never makes AI suggestions visible. Confirmation and release are separate state transitions.

### Trap: marking stale provenance

Answer rows carry resource/version. Do not apply a new worksheet's scheme to old answers.

### Trap: marking every level's questions

The modal must show the pupil's assigned slice plus any saved historical answer after re-level, not all differentiated questions.

### Trap: exposing teacher notes/model answers

Strip/private-render structurally at the server component boundary. Do not depend only on CSS or prompt compliance.

### Trap: local buffer overwriting server truth

Restore only when server field is empty/equivalent; preserve conflicts. Expire buffers on shared machines.

## 6. AI traps

### Trap: redacting only user context

Names may appear in system text, instruction, attachments, or model-grounding material. Redact the final complete payload and assert before egress.

### Trap: class-only roster

A pupil can type another pupil's name. Redact against the whole active roster.

### Trap: redacting safeguarding content

Safeguarding content must be removed, not tokenised. Guard-matched pupil answers also bypass AI.

### Trap: direct SDK convenience call

No service/route imports the SDK. Add the feature to the registry and gateway.

### Trap: unregistered audit labels

Tests must compare every call feature against registry. A settings picker that omits calls makes cost/policy drift invisible.

### Trap: trusting structured output

Schema validation does not validate referenced IDs, totals, file paths, sequence length, or domain permissions. Validate all before persistence.

### Trap: auto-applying a critique/adaptation

AI is advisory. Apply only after explicit teacher action, except narrow user-triggered generation into an isolated draft.

### Trap: retrying billed/uncertain calls blindly

Use idempotency and audit reservation. A timeout may have been processed by the provider; prevent duplicate writes/spend.

### Trap: prompt feedback loops

Do not feed generated resources back as authoritative source material without an explicit reviewed provenance policy.

## 7. Data and file traps

### Trap: DB transaction assumed to cover filesystem

Stage/publish or durable outbox. Test DB failure, file failure, and crash between them.

### Trap: checking size after `toBuffer()`

Enforce stream/decompressed limits during read. Test memory and cap+1.

### Trap: using filenames as paths

Use opaque paths and retain original name only as metadata.

### Trap: deleting applied migrations

Never remove/renumber a migration that may exist in production. Add forward migrations.

### Trap: anonymising only the pupil row

Names survive in notes, tasks, events, screenshots, devices, profiles, exports, and backups. Use an exhaustive lifecycle plan and audit counts.

### Trap: restoring DB without matching files

Database and resource archive are one recovery set with a manifest/checksums.

## 8. Security traps

### Trap: `authed` used instead of role

TA and pupil sessions are authenticated. Teacher commands must require teacher role.

### Trap: trusting forwarded IP from everyone

The proxy overwrites client headers; the app trusts only the proxy hop. Direct app/DB ports are not LAN-exposed.

### Trap: rendering stored secrets masked

A password input with bullets may still contain the secret in DOM. Render it empty and show a separate configured indicator.

### Trap: public/shared caching

Authenticated pupil/teacher pages and personal images need private/no-store policies. Fingerprinted static assets can be immutable.

### Trap: disclosure text in logs/errors

Correlation IDs and safe metadata are enough. Never log raw pupil answers, note bodies, prompts, credentials, or cookies.

## 9. Testing traps

### Trap: snapshots as correctness

Snapshots do not prove authorisation, state transition, transaction, or accessibility. Prefer explicit assertions; review any visual snapshot update.

### Trap: happy-path mocks

Use real PostgreSQL for invariants/concurrency and injected file/provider failures. Simulate restart and uncertain outcomes.

### Trap: no real browser tests

DOM event wiring, touch, keyboard, focus, offline, SSE, and accessibility cannot be proven by route injection alone.

### Trap: tests that encode a bug

Derive expectations from this pack and policy, not merely current output. If a legacy test conflicts with a non-negotiable rule, surface it.

### Trap: shared real pupil fixtures

Use fictional names/content only. Never copy production exports into development or prompts.

## 10. Completion checklist for each LLM task

- Requirement/test identifiers referenced.
- Permissions enforced server-side.
- Inputs and stored JSON validated.
- Transaction/file failure semantics stated and tested.
- Timezone handled through clock.
- AI gateway used or explicitly not involved.
- Safeguarding impact considered.
- Accessibility and non-JS/progressive fallback considered.
- Relevant tests pass with totals reported.
- No unrelated files changed.
- Traceability/documentation updated.

