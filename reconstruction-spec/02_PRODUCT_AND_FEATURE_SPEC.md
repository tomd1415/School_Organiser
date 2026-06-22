# Product and feature specification

## 1. Product statement

Build a calm, fast school-day command centre that lets one teacher see what is happening now, run and review lessons, protect limited preparation time, retain curriculum knowledge across years, and safely use AI to reduce planning effort. It must support restricted TA and pupil experiences without becoming a general school MIS or public learning platform.

## 2. Product principles

1. **Now first.** The default view answers now, next, and needs-attention without configuration or hunting.
2. **Capture in seconds.** Notes, stopping points, ATL, task completion, and pupil work saves must not demand unnecessary structure.
3. **No silent loss.** A failed save remains visible; typed pupil work survives transient disconnects.
4. **Manual core, optional AI.** Every operational feature functions with AI switched off.
5. **One source of truth.** Curriculum and resources are versioned and linked, not copied across hidden folders.
6. **History is durable.** Annual schedules change; curriculum, resources, evidence, and prior-year records remain available.
7. **Safety over convenience.** Privacy, safeguarding, identity, marks release, and destructive actions fail closed.
8. **Accessible by default.** SEND-oriented reading, motion, contrast, keyboard, touch, and screen-reader support are acceptance criteria.
9. **Explain automation.** AI proposals, planner cascades, imports, and marks show what will change before irreversible application.

## 3. Roles

### 3.1 Teacher

The single privileged operator. MUST manage all configuration, teaching records, curriculum, resources, pupil access, marking, safeguarding handling, AI settings, exports, and disposal.

### 3.2 Teaching assistant / non-specialist

A named, individually revocable account SHOULD be linked to a staff record. It MUST see only current/next assigned lessons, effective adapted content, approved linked resources, and its own feedback form. It MUST NOT see pupil rosters, pupil answers, marks, general notes, safeguarding records, settings, or unrelated resources.

### 3.3 Pupil

A class-code/name/PIN session. It MUST see only that pupil's work and released results for an eligible current lesson. It MUST NOT enumerate other pupils after authentication, reach resources directly, write to historical/future/other-class work, or see differentiation labels, teacher notes, model answers, or unconfirmed marks.

### 3.4 Test pupil

A fictitious teacher-controlled preview identity. It MUST use the same pupil renderer and controls without changing the teacher's role. It MUST be excluded from real rosters, marking queues, class statistics, redaction lists, and exports about real pupils.

## 4. Academic structure and setup

The application MUST support:

- academic years with start/end dates and exactly one current year;
- term, holiday, half-term, and INSET ranges;
- year-scoped weekday period definitions with labels, types, order, and times;
- rooms, staff, courses, groups/classes, group-course associations, and pupil enrolments;
- recurring timetable entries for teaching, free, duty, meeting, club, open-room, and form periods;
- multiple courses inside one timetabled lesson;
- optional per-lesson start/end overrides;
- active/archive states rather than destructive deletion for referenced setup records;
- a blank first-run onboarding flow that atomically claims the teacher identity and password;
- in-app editors and CSV/MIS import with preview, validation, row-level errors, and idempotent re-import;
- a September rollover that creates a draft year, preserves durable curriculum/resources/history, maps predecessor classes, and requires explicit activation;
- year export containing schedule, enrolments, delivery, adaptations, and notes, clearly classified as personal data.

## 5. Calendar, timetable, and exceptions

The teacher MUST be able to:

- view a full week with all school-day bands, status dots, effective room, teacher, class, course, and lesson readiness;
- navigate dates while preserving an explicitly previewed academic year;
- distinguish teaching, free time, clubs, duties, meetings, holidays, INSET, and off-timetable periods;
- create dated exceptions: cancelled/free, cover, room change, and whole-day off-timetable;
- see the same effective exception result on Now, timetable, lesson, TA, pupil eligibility, availability, and print surfaces;
- revert a temporary free period to teaching;
- print today's effective schedule without creating occurrences on holidays or suppressed lessons.

Exception precedence MUST be specified once in domain code. UI code MUST NOT independently infer it.

## 6. Now dashboard and morning brief

The home page MUST show:

- current period, next period, time remaining/to-start, school-day state, and effective exception badges;
- current and next teaching lesson links with class, course, room, plan readiness, stopping point, and key resources;
- a free-period action when the effective slot is free;
- immediate note/stopping-point/follow-up capture;
- up to a concise number of ranked “Needs me” items: safeguarding first, then marking, before-next-lesson tasks, deadlines/events, and surfaced captures;
- start/end-of-day checklist state;
- current interest and morning-risk summaries when present;
- a 204/no-swap live-clock refresh when unchanged;
- a clear refresh boundary when the current lesson changes, rather than replacing a page with active input.

The morning brief SHOULD combine tomorrow's teaching load, unbound or unready lessons, exam coverage risk, marking backlog, upcoming deadlines, open safeguarding handling, and optional advisory review findings.

## 7. Lesson occurrence and in-lesson cockpit

The lesson page MUST:

- resolve a stable `(timetabled lesson, date)` occurrence and one occurrence-course section per class/course slice;
- support split lessons through explicit tabs/sections, never silently use only the first course;
- show effective room/cover/free/cancelled status;
- show current plan, class adaptation, objectives, outline, duration, kit, resources, prior stopping point, recent notes, TA feedback, pupil-work summary, and spaced recall;
- allow plan binding, teacher notes, follow-ups, stopping point, and a combined tappable outline/progress tracker;
- support View, Edit this class, and Edit master modes with unmistakable scope labels;
- disable progress tapping while editing;
- preserve a complete change history for class adaptations;
- permit reset-to-master and propose-then-approve promotion to master;
- open clean pupil/projector and teacher-presenter views in separate tabs;
- keep teacher slide notes private from pupils and the projector;
- offer cover-pack generation and effective print views;
- expose live pupil-work and ATL surfaces without stealing focus on unchanged polling.

Opening a teacher lesson MAY materialise its occurrence. Preview, search, print, and scheme inspection paths MUST be explicitly read-only unless the user performs a write action.

## 8. Curriculum, schemes, map, and planner

The product MUST support:

- courses with teaching context, qualification, board, key stage, exam date, colour, and notes;
- one active scheme version per course and any number of draft/historic versions;
- units and ordered lesson plans with objectives, outline, duration, kit, and resources;
- transactional scheme cloning and activation preserving labels, resource links, kit, and spec mappings;
- AI authoring and imported-unit conversion with teacher review and no partial scheme on failure;
- class-specific lesson adaptations stored as deltas from the master;
- multi-slot class delivery: lesson sequence laid across every weekly class slot in chronological order, skipping non-teaching dates;
- a class curriculum map with taught history, today, future bindings, stopping points, adaptation indicators, and kit summary;
- carry-over and pull-forward operations that never rewrite history;
- drag, click, touch, and keyboard planner placement;
- pin/lock, insert-and-cascade, move/swap, whole-unit placement, pull-forward, and undo;
- explicit overflow warning when any cascade would push a lesson outside the academic year;
- transactional, class-serialised placement writes.

## 9. Resources and content

The app MUST provide a local versioned resource store:

- upload individual files and folders/ZIPs within streaming limits;
- SHA-256 duplicate detection and safe filenames/storage paths;
- atomic resource + first-version creation and serialised version append;
- metadata: title, kind, MIME, source, attribution, unit/year tags, editability, active state;
- exactly one link target per resource link: course, unit, plan, occurrence, group, or class adaptation;
- preview for safe formats, forced download for active formats such as SVG, and `nosniff` headers;
- extraction from PDF, DOCX, PPTX, ODT, and text with strict size/character budgets;
- editable Markdown/block documents for slides, worksheets, answers, support sheets, and TA notes;
- Word export and full-screen presentation;
- image extraction/placeholders with signed, expiring access for limited roles;
- source attribution shown on imported resources;
- usage view and archive rather than unsafe deletion;
- matching database/file backup and deletion lifecycle.

AI resource generation MUST use relevant lesson materials only with visible teacher consent and MUST avoid feeding AI-generated output back as source material.

## 10. Pupil worksheet experience

The pupil workspace MUST:

- start at class code → name choice → PIN, with generic failure messages and rate limits;
- enforce a bounded class-code session binding before PIN attempts;
- present current eligible lessons only, suppressing cancelled/free/off-timetable lessons;
- render shared blocks plus the pupil's Support/Core/Challenge slice without displaying the level name;
- support multiple worksheets and stable per-worksheet field prefixes;
- support text, blanks, choices, tick/checklist, matching, Parson's ordering, code reading/writing, trace/truth tables, and raster screenshot answers;
- validate every submitted field key against the actual rendered worksheet version;
- autosave each interaction with saving/saved/failure status and assistive announcements;
- buffer typed answers locally for at most 24 hours, restore/retry after transient failure, prefer conflicting non-empty server data, and clear confirmed data;
- keep an active pupil session alive only after genuine visible interaction, not passive polling;
- allow Done/undo Done and a 1–4 face/activity/comment feedback widget;
- provide read-aloud, text scaling, easy-read font, contrast/theme, and reduced-motion controls before paint;
- provide screenshot-paste help and a non-uploading practice area;
- show released, confirmed results only;
- support revocable, term-bounded remembered devices only when separately enabled;
- receive live teacher slide position and lock state while retaining local navigation when unlocked or disconnected.

## 11. Assessment, ATL, and feedback

The teacher MUST be able to:

- assign or edit a mark scheme per worksheet version;
- use exact, numeric, keyword, choice, tick, and open marking kinds;
- deterministically mark objective answers;
- send only anonymous, per-question open-answer batches to AI;
- withhold guard-matched pupil text from AI and raise it for teacher review;
- view pupil answer beside model/accepted answer in a modal;
- navigate previous/next pupil and multiple worksheets;
- see only questions that pupil was actually assigned, while retaining previously answered questions after a level change;
- accept confident suggestions in bulk, confirm per pupil, override marks, and add comments;
- choose automatic-on-Done or manual marking;
- choose instant-after-confirmation or held-until-release results;
- default to ticks-only, with optional score display and no class comparison;
- export class marks to CSV and print an answer pack with class statistics;
- generate a cohort work summary and optional pupil “what works for me” profile through the safe AI boundary;
- record ATL 1–4 per pupil per lesson from the modal or a live class grid;
- use marks/misconceptions/feedback as evidence for future lesson adaptation.

## 12. Tasks, focus, time, and recurrence

The teacher MUST be able to:

- create tasks with title, detail, source, due timestamp or before-next-lesson rule, urgency, estimate, cognitive load, context, and links;
- triage, schedule, start, complete, drop, and mark as a current interest;
- paste task lists and break a task into substeps manually or with AI;
- define recurring weekly, monthly, every-N-weeks, and per-lesson tasks;
- generate recurrence idempotently, including two lessons on the same day and crash-resume cursors;
- assign existing/new tasks to a specific free period and complete them there;
- compute genuine work windows from timetable, events, and exceptions while excluding break/lunch;
- plan a work block and preserve planned versus actual task/note/status;
- run one task/activity timer at a time and accumulate actual seconds;
- use focus mode to select one fitting next action from urgency, available minutes, energy/load, and interests;
- see estimate-versus-actual calibration and weekly time allocation.

## 13. Notes, capture, events, and search

The app MUST support:

- lesson/general/oversight/plan-change/captured/TA-summary notes;
- optional links to occurrence, class, course, pupil, task, and event;
- follow-ups that can become tasks;
- fast routed note capture from anywhere, with preview before AI-proposed filing is applied;
- safeguarding/private capture that bypasses AI entirely;
- captured categories, interest, resurface date, promotion to task, and archive;
- events/deadlines with type, dates/times, all-day flag, availability effect, lead days, status, and links;
- IMAP intake from a dedicated mailbox with atomic claim/destination/complete semantics and fallback to a plain task when AI is unavailable;
- extracted fact chips and raw provenance for imported email;
- full-text search across lessons, notes, tasks, resources, pupils, and events with ranked results and safe empty queries.

## 14. Teaching intelligence

The app MUST support:

- course and class teaching contexts restricted to cohort-level content;
- class ability midpoint and guided access prompts;
- a teaching-concepts library, global or course-specific;
- the NCCE computing pedagogy principles as shared planning guidance;
- equipment inventory with stock, working count, location, tags, stale check, archive, and CSV import;
- course specification points, document upload/extraction, lesson mappings, coverage percentages, and exam-risk view;
- spaced retrieval from taught history and misconception-driven retrieval starters;
- advisory lesson/scheme reviews that are off by default, cost-capped, and never auto-apply.

## 15. Safety, lifecycle, and operations

The application MUST:

- implement all controls in `08_AI_PRIVACY_SECURITY_AND_SAFEGUARDING.md`;
- maintain session epoch revocation for pupils and TAs;
- provide complete pupil subject-access export including screenshot files and a manifest while excluding safeguarding data for case-by-case handling;
- provide audited anonymise and erase actions, including free-text scrubbing and durable file deletion;
- expose a teacher-only safeguarding handling register and AI-call audit log/export;
- use database migrations serialised by an advisory lock;
- provide encrypted, checksummed, matched DB+file backups and a destructive restore that verifies before replacement;
- refuse unsafe production defaults;
- log structured failures without logging secrets, raw pupil answers, or unredacted AI requests;
- remain deployable as one application process, one PostgreSQL database, one resource volume, and one reverse proxy.

## 16. Explicit non-goals for the parity rebuild

- multi-teacher tenancy or shared cross-subject pupil profiles;
- a full MIS, attendance system, behaviour/sanctions system, parent communication platform, or public website;
- automated release of unconfirmed AI marks;
- semantic/vector search unless a separate DPIA/provider decision is approved;
- outbound email;
- direct browser calls to any AI provider;
- native mobile applications.

