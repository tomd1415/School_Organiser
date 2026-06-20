# Information required from developers for the UI overhaul

**Purpose:** Collect the contracts, decisions, examples, and ownership information needed to complete
the UI overhaul while changing as little non-UI code as possible.  
**Companion document:** [UI developer guide](UI_DEVELOPER_GUIDE.md)  
**Target direction:** Option 2 dark, task-first workspace

This is an input checklist, not a request for other developers to redesign the UI. The UI work should
consume stable application behavior rather than rediscovering business rules from repositories,
migrations, background jobs, or database queries.

## 1. Required handoff outcome

Before a page is overhauled, the responsible developer should supply enough information for the UI
developer to answer all of these questions without changing domain logic:

1. What user task does the page support?
2. Which roles may see it and which actions may each role perform?
3. What data is available on initial render?
4. What are every meaningful empty, loading, partial, disabled, success, stale and failure state?
5. Which routes perform actions, and what are their exact request/response contracts?
6. Which state changes are atomic, irreversible, audited, AI-assisted or privacy-sensitive?
7. Which existing tests prove the underlying behavior?
8. Which files are currently owned or being changed by another developer?

If any answer is unknown, record it as an open product or engineering decision. Do not ask the UI layer
to infer it from incidental HTML, current CSS, or observed database contents.

## 2. Change boundary

### 2.1 Files normally owned by the UI overhaul

The UI developer may expect to create or change:

- UI design documentation and prototypes;
- semantic server-rendered markup and view-only render helpers;
- shared UI components such as page headers, cards, badges, status regions, fields and dialogs;
- CSS tokens, foundations, components, layouts and route-specific styles;
- narrowly scoped client behavior for dialogs, focus, tabs, preferences, timers and HTMX lifecycle;
- accessibility, interaction and visual-regression tests;
- UI-only fixtures or typed view-model fixtures containing fictional data;
- feature-flagged shell/navigation presentation.

Route files may need markup changes because the current application builds HTML inside handlers. Those
changes should remain limited to presentation or to calling a view helper. If changing the markup would
also change authorization, validation, queries, persistence or workflow semantics, split ownership with
the relevant developer first.

### 2.2 Shared files requiring coordination

Obtain current ownership and agreement before modifying:

- `app/src/lib/html.ts`
- `app/src/lib/nav.ts`
- `app/public/app.js`
- `app/public/styles.css`
- route modules that mix handlers, queries and HTML;
- the marking modal/page implementation;
- Now and live-lesson routes;
- pupil and TA layouts;
- global error handling, CSRF hooks and HTMX response handling;
- test helpers used by multiple workstreams.

For each shared file, request the developer's branch/commit, current intent, expected merge date, and
the smallest stable seam the UI can use.

### 2.3 Files and behavior to avoid changing

The UI overhaul should not normally change:

- database schema or migrations;
- repositories, SQL queries or transaction boundaries;
- service/business logic;
- authentication, authorization, CSRF or session rules;
- pupil/TA access policy;
- AI prompts, schemas, model selection, budgets or redaction;
- background jobs, recurrence, email intake or review sweeps;
- backup, restore, deployment or Docker configuration;
- resource storage and file lifecycle;
- mark calculation, safety gates or release semantics;
- lesson exception, timetable or academic-calendar calculations.

If the UI cannot be implemented without one of these changes, write a small interface request for the
owning developer. State the missing view-model field or endpoint behavior rather than implementing a
new domain rule inside the UI work.

## 3. Ownership and coordination information

Request one current coordination sheet containing:

| Required information | Why it is needed |
|---|---|
| Active branches/worktrees and their purpose | Prevent editing stale or competing implementations |
| Developer responsible for each major area | Route questions to the person who knows the invariant |
| Files currently being edited | Avoid merge conflicts and accidental overwrites |
| Expected merge order and dates | Base UI work on the correct implementation |
| Pending migrations or route changes | Avoid designing against a contract that is about to disappear |
| Known regressions or unfinished fixes | Avoid encoding a defect into the design system |
| Feature flags already available | Reuse rollout infrastructure |
| Decisions considered final versus provisional | Avoid repeatedly revisiting settled behavior |

Ask developers to notify the UI owner before changing shared markup contracts, route names, status
classes, global HTMX events or navigation while the overhaul is active.

## 4. Complete route and page inventory

Request a machine-readable or maintained Markdown inventory for every user-facing route. Each entry
should include:

- HTTP method and path;
- current page title and purpose;
- allowed roles;
- primary task area: Today, Teach, Plan, Assess, Organise, Safeguarding, Pupil or TA;
- route owner;
- render function or file;
- partial/HTMX endpoints used by the page;
- redirects and deep-link expectations;
- whether it is everyday, advanced, setup-only or deprecated;
- whether another page embeds or links to it;
- keyboard shortcut, if any;
- feature gate or setting;
- current automated tests;
- planned replacement or consolidation.

The inventory must cover literal routes and parameterised routes, including dialogs and fragments. It
should identify pages that have the same business function but different teacher, TA, pupil, print or
board presentations.

### 4.1 Task-area mapping decisions needed

Confirm the destination for at least these existing areas:

| Existing area | Proposed home | Decision required |
|---|---|---|
| Now, Focus | Today | Confirm whether Focus remains a page or becomes a Now mode |
| Timetable | Plan with a Today entry point | Confirm grid/agenda canonical route |
| Marking and pupil work | Assess | Confirm which actions remain inside lesson context |
| Schemes, Map, Planner, Coverage | Plan | Confirm terminology and cross-links |
| Tasks, Recurring, Events, Captured, Time | Organise / Today context | Confirm daily shortcuts |
| Notes, Resources, Concepts | Organise plus contextual access | Confirm canonical search/browse pages |
| Pupils, Setup, Kit, Settings | Organise / Advanced | Confirm access and experience gating |
| Oversee | Teach or Organise | Product decision needed |
| Safeguarding | Persistent global destination | Confirm placement outside task-area hiding |

Existing URLs can remain stable even if navigation labels or grouping change.

## 5. Per-page handoff template

Ask the owning developer to complete this template for each migrated page or dialog:

```md
### Page or dialog name

- Route(s):
- Owner:
- Primary user and task:
- Allowed roles:
- Entry points and deep links:
- Data/view-model type:
- Read dependencies:
- Write actions:
- Feature gates/settings:
- Privacy classification:
- Empty states:
- Partial/incomplete states:
- Disabled/permission states:
- Success states:
- Failure and retry states:
- Stale/concurrent-update behavior:
- Slow/background states:
- Long-content constraints:
- Keyboard/focus requirements:
- Existing tests:
- Known defects or pending changes:
- Behavior that must not change:
```

One completed example with realistic fictional data is more useful than screenshots alone.

## 6. View-model contracts

The UI should render typed view models rather than query database structure or reconstruct domain rules.
For each page, request:

- TypeScript interface/type definitions;
- field meaning and units;
- whether a field is required, nullable, absent by permission, or temporarily unavailable;
- valid enum values and user-facing meaning;
- ordering guarantees;
- maximum realistic collection sizes;
- maximum realistic text lengths;
- date/time format and timezone meaning;
- stable IDs suitable for DOM keys and HTMX targets;
- version/revision fields needed for stale-write protection;
- precomputed permissions such as `canEdit`, `canRelease` or `canChangeGroups`;
- precomputed effective values where exceptions apply, such as effective room/staff;
- status values and permitted transitions;
- privacy classification for each sensitive field.

Do not make the UI independently calculate lesson state, current academic year, effective cover/room,
marking status, pupil eligibility, progression, or whether a write is authorized. Request those as
explicit fields from the owning service/route.

### 6.1 Example fixture set required

For every substantial view model, request fictional fixtures for:

- ordinary populated state;
- empty state;
- one item and maximum realistic item count;
- very long class, pupil, course, lesson and resource names;
- missing optional information;
- partial work and stale/version-conflict state;
- permission-disabled state;
- recoverable service/database failure;
- AI disabled, unavailable, suggested, review-required and checked states where applicable;
- current, future, historic, holiday and exception-adjusted lessons where applicable.

Fixtures must contain no real pupil, staff, school, credential or provider data.

## 7. Write and HTMX endpoint contracts

Request a contract for every action the UI can trigger:

| Contract field | Required detail |
|---|---|
| Method and path | Exact endpoint and parameter rules |
| Authorization | Role/context checks performed server-side |
| CSRF | Required header/token mechanism |
| Request body | Field names, types, limits and encoding |
| Validation errors | HTTP status and structured/HTML error response |
| Success response | Status, fragment shape, redirects and events |
| HTMX target | Stable region intended for swapping |
| Idempotency | Safe retry behavior and duplicate protection |
| Concurrency | Version, lock or conflict behavior |
| Audit | Whether and how the change is recorded |
| Focus | Intended focus target after success/failure |
| Failure recovery | What input/state must be retained |

Ask explicitly which error statuses HTMX should swap and how global error handling exposes them. A
failed write must not be reported as HTTP 200 merely to render an error message.

For autosave operations, request a stable operation ID and revision. Common field names such as
`title`, `text` or `value` are not sufficient to correlate concurrent saves.

## 8. Authentication, authorization and role information

Request an authoritative permission matrix covering:

- unauthenticated user;
- teacher;
- TA;
- pupil;
- everyday versus advanced teacher experience;
- feature-disabled states;
- class/lesson/occurrence membership constraints;
- current versus historic/future lesson access;
- safeguarding-specific access;
- print, export, resource and board-display access.

For each UI action, developers should say whether an unauthorized action is omitted, disabled with an
explanation, or shown but rejected after a state change. The server remains responsible for enforcement.

Also request:

- session timeout behavior;
- behavior after logout in an open tab/dialog;
- CSRF expiry behavior;
- role-specific landing page;
- whether a route is safe to preload/prefetch;
- which information must never be included in a response for another role.

## 9. Workflow and state-transition information

Visual states depend on domain transitions. Request an explicit transition table for each stateful
workflow rather than inferring it from button labels.

### 9.1 Lesson lifecycle

Confirm:

- states before, during and after a lesson;
- when an occurrence is materialised;
- whether merely viewing/printing creates state;
- how holiday, free, cancelled, cover, replacement and room-change effects are represented;
- when pupil work becomes available;
- what “Start work” changes;
- when Support/Core/Extend assignments lock;
- whether a teacher can override a lock and how that is audited;
- when stopping points are saved;
- when notes and lesson progress become historic/read-only.

### 9.2 Activity groups

Confirm:

- canonical names (`Support`, `Core`, `Extend` versus legacy `Challenge`);
- eligibility and default-assignment rules;
- whether suggestions are generated and their source;
- whether changes alter worksheet versions already opened by pupils;
- atomic save behavior;
- conflict behavior when two staff edit;
- post-start lock and override policy;
- what pupils and TAs see after a change.

### 9.3 Marking

Request the current marking owner to confirm:

- exact meanings of unmarked, suggested, needs-review, confirmed/checked, released and overridden;
- whether confidence is always available and how it should be explained;
- whether “Confirm all” confirms every answer or only eligible suggestions;
- Confirm & next behavior on partial failure;
- score bounds and mark-scheme version behavior;
- pupil-comment autosave or explicit-save behavior;
- navigation order and handling of pupils with no work;
- release rules and whether release is reversible;
- AI-off presentation and permitted teacher marking;
- stale answers/marks behavior after pupil edits;
- keyboard shortcuts approved for marking;
- endpoints/fragments that are now considered stable.

Supply screenshots or rendered fixtures for every mark state, but treat the typed contract and tests as
the source of truth.

### 9.4 Notes and safeguarding capture

Confirm:

- note categories and user-facing names;
- default visibility;
- pupil/class/lesson linking rules;
- plain note versus AI-routed capture;
- which categories can never be sent to AI;
- safeguarding routing and review behavior;
- edit/delete/audit rules;
- save failure behavior;
- whether note categories are configuration or fixed enums.

### 9.5 Per-slide teacher notes future feature

Before enabling the currently disabled prototype control, request decisions for:

- database owner and persistence model;
- stable slide identity;
- resource and slide-version binding;
- behavior when slides are inserted, removed or regenerated;
- whether notes are personal, shared among teachers, or class-specific;
- visibility to TAs;
- export/backup/retention/SAR implications;
- autosave, conflict and offline/failure behavior;
- confirmation that notes never enter board or pupil responses;
- whether notes may enter AI context and under what redaction policy.

Until those contracts exist, retain the `Future feature` label and disabled persistence action.

## 10. Now and daily-context information

Request the Now owner to provide one resolved daily view model rather than requiring the UI to combine
independent route/repository calls. It should distinguish:

- current time and school timezone;
- current lesson/work window/non-teaching state;
- effective lesson details after exceptions;
- time remaining and current lesson-flow step;
- next lesson/event and preparation action;
- live pupil-work counts safe for the teacher;
- ranked “Needs me” items with reason, severity, destination and stable identity;
- marking backlog summary;
- urgent safeguarding/attendance/cover state;
- daily timeline entries and their status;
- which information may refresh automatically;
- refresh interval and stale-data indication;
- behavior when no timetable, term or current academic year exists.

Ask which actions must be instant and which can load as secondary HTMX regions. Background refresh must
not steal focus, close dialogs, overwrite typed notes, or repeatedly announce unchanged content.

## 11. Plan, timetable and curriculum information

Request contracts for:

- canonical week/date navigation and academic-year preview;
- semantic agenda data equivalent to the timetable grid;
- effective exceptions and display wording;
- readiness calculation and reasons a lesson is not ready;
- draft/live scheme and lesson-plan status;
- drag/drop operations and keyboard alternatives;
- move/swap/undo atomicity and conflict behavior;
- cover, room-change and replacement rendering;
- when future lesson views may create occurrences;
- resource requirements and missing-file states;
- printing and export behavior.

Ask the curriculum owners to define terms consistently: scheme, unit, lesson plan, occurrence, course,
group course, timetable lesson and resource version. The UI guide should not invent simpler labels that
change the actual meaning.

## 12. Organise-area information

For Tasks, Events, Captured, Notes, Resources, Pupils, Setup and Settings, request:

- grouping and priority decisions;
- everyday versus advanced visibility;
- safe global-search fields and result permissions;
- item counts worth showing in navigation;
- bulk action contracts;
- import/export states and size constraints;
- file-type, preview and download behavior;
- destructive action and recovery semantics;
- retention and audit information;
- settings that require restart, reload or immediate application;
- first-run/setup dependencies;
- operator-only actions that must not be presented as ordinary teacher actions.

## 13. Pupil and TA requirements

Request separate, role-specific journey maps. Do not ask the teacher UI developer to derive them by
hiding teacher controls.

### Pupil journey information

- login/class-code/PIN steps and session expiry;
- current lesson eligibility;
- worksheet/resource version and permitted fields;
- save, upload, done and reopen behavior;
- feedback/marks release rules;
- offline/network-failure wording;
- accessibility and reading-age requirements;
- information that must never be exposed to another pupil.

### TA journey information

- assigned/overseen lessons;
- class and pupil scope;
- effective room, cover and cancellation details;
- support/teacher notes visible to TAs;
- actions TAs may perform;
- safeguarding boundaries;
- historic/future access;
- mobile/device assumptions during a lesson.

## 14. Accessibility and content inputs

Request from the team or product owner:

- confirmed accessibility target and any school-specific SEND requirements;
- supported browsers, devices and assistive technologies;
- required text-size, font, contrast, motion, density and reading-width preferences;
- existing accessibility defects that must not regress;
- approved keyboard shortcuts and conflicts;
- preferred terminology and tone;
- examples of realistically long content;
- languages/localisation expectations;
- print requirements;
- color restrictions or school branding that are genuinely mandatory.

Ask a developer to identify all custom controls that currently replace native HTML. Each needs either a
native replacement or a documented keyboard/focus contract.

## 15. Assets, browser and deployment constraints

Request confirmation of:

- browser/version support on school-managed devices;
- typical laptop, tablet, phone and classroom-board resolutions;
- touch versus mouse/keyboard use;
- whether dual-monitor positioning can be assumed or only supported;
- Content Security Policy restrictions;
- self-hosted font and icon requirements;
- offline/LAN-only behavior;
- cache policy for CSS, JavaScript and static assets;
- build/bundling constraints;
- maximum acceptable asset sizes;
- print/PDF requirements;
- whether dark mode is default, opt-in or follows the OS;
- how user preferences persist and when they are applied before paint.

The UI must not add external CDNs, analytics, fonts, icon services or image calls without an explicit
privacy/security decision.

## 16. Testing information and support

Request the following testing support before migration:

- command list for typecheck, unit, integration and browser tests;
- fixture/database setup instructions;
- stable fictional dataset representing a full school day;
- test accounts/sessions for teacher, TA and pupil roles;
- existing accessibility tooling;
- visual-regression tooling and baseline ownership;
- way to simulate slow responses, timeouts and failures;
- way to control clock/date, term, timetable and lesson state;
- way to simulate AI off, unavailable, malformed and successful output;
- way to simulate cover/free/holiday/room-change states;
- way to test both screens without real pupil data;
- CI restrictions and expected runtime.

For each migrated journey, ask the domain owner to name the tests that prove behavior did not change.
UI snapshots alone do not prove authorization, persistence, atomicity or privacy.

## 17. Feature flag and rollout information

Request a rollout owner and answers to:

- Which setting or flag selects the new shell?
- Is selection per instance, user or session?
- Can users return to the old shell without losing work?
- How are new and old routes linked while both exist?
- Which analytics or non-identifying feedback will inform rollout?
- What constitutes parity for each journey?
- What accessibility and usability sign-off is required?
- What is the rollback procedure?
- When may old markup, CSS and client behavior be deleted?

Do not mix old and new component semantics unpredictably within one page. Migrate complete journeys
behind the flag.

## 18. Minimum information packet before coding

For a UI work item to be ready, require this minimum packet:

- [ ] Named domain owner and UI owner.
- [ ] Current branch/commit and conflicting-file list.
- [ ] Route/page inventory entry.
- [ ] Completed per-page handoff template.
- [ ] Typed read/view-model contract.
- [ ] Typed write/HTMX contracts.
- [ ] Permission and privacy classification.
- [ ] State-transition rules.
- [ ] Fictional fixtures for ordinary and edge states.
- [ ] Existing behavior/regression tests identified.
- [ ] Unresolved product questions recorded with an owner.
- [ ] Feature-flag and rollback path confirmed.
- [ ] Agreement on files the UI developer may edit.

If the packet is incomplete, UI work may still proceed on an isolated static prototype, but production
integration should wait. This keeps speculative UI decisions from leaking into repositories, schema,
authorization or other non-UI code.

## 19. Suggested handoff format from each developer

Ask each developer to respond with a short document or issue using this format:

```md
# UI handoff: <area>

Owner:
Branch/commit:
Files currently changing:
Stable after:

## User tasks

## Routes and permissions

## View-model types

## Write/HTMX contracts

## State transitions

## Privacy and safeguarding constraints

## Empty, failure and edge states

## Fictional fixtures/screenshots

## Existing tests

## Must-not-change behavior

## Open decisions and owner
```

Store completed handoffs in this `docs/ui-design/` directory or link them from a maintained index. Keep
the handoff updated when a contract changes; a chat message or screenshot should not be the sole source
of truth.
