# UI, UX, and accessibility specification

## 1. Visual direction

Use one calm, dark-first interface designed for long school days and projection. It should feel like an operational cockpit, not an analytics dashboard. The content hierarchy is:

1. safety and urgent state;
2. current teaching/task state;
3. next actions;
4. planning and setup detail.

Use a single token palette. Never import a light legacy sheet and repaint it. Print and projector layouts may use their own deliberate palettes.

## 2. Global shell

### 2.1 Navigation

The teacher shell has a compact left navigation with labelled expansion and these sections:

- Safety: Now, Safeguarding, Oversee.
- Daily operations: Timetable, Focus, Marking, Tasks, Captured, Events, Notes.
- Curriculum: Schemes, Coverage, Map, Planner, Resources.
- Advanced/setup: Pupils, Concepts, Kit, Recurring, Time, Setup, Settings.

The navigation model MUST be one data structure used for rendered links, active state, keyboard jumps, labels, and permission filtering. Safeguarding is always visible. Advanced items may collapse, but MUST remain keyboard/touch accessible.

### 2.2 Header

Render page title, current/next context, concise action chips, save/error state, and clock from the initial page view model. Do not add a query-heavy second request to every page. A lightweight time tick may update client-side.

### 2.3 Global actions

- Quick note dialog: keyboard shortcut `n`, native dialog semantics, private/safeguarding option, preview-before-apply for AI routing.
- Search/command palette: accessible dialog/combobox, debounced server search, keyboard results.
- Marking dialog: native dialog or equivalent tested focus trap, previous/next keyboard navigation.
- Accessibility panel: font size, font family, contrast, reduced motion; usable by keyboard, touch, and switch input.
- Persistent save/error toast with `aria-live` and a link to retry where appropriate.

## 3. Responsive behaviour

- Desktop: rail + content stage; lesson may use two/three columns.
- Laptop: collapsible rail; no horizontal clipping of primary controls.
- Tablet: all planner and worksheet operations work without HTML5 drag-and-drop.
- Phone: teacher quick capture and basic Now/task views remain usable; complex setup may use a simpler stacked layout.
- Projector: no teacher/private/pupil-identifying content; large type and minimal controls.
- Print: white background, black text, no navigation, URLs/metadata only where useful.

## 4. Accessibility baseline

Target WCAG 2.2 AA. MUST include:

- semantic landmarks and heading order;
- skip link and visible focus;
- full keyboard operation without timing traps;
- 44×44 CSS-pixel primary touch targets;
- contrast-compliant text/status colours in every theme;
- status never conveyed by colour alone;
- reduced motion, no essential hover-only action;
- screen-reader labels for icon buttons and dynamic status;
- native input labels and error summaries linked with `aria-describedby`;
- dialogs with focus entry/return and Escape handling;
- live updates that are polite and do not repeatedly announce polling;
- reflow at 400% zoom without loss of primary actions;
- Atkinson Hyperlegible or a user-selectable system font;
- automated axe checks plus manual keyboard and screen-reader passes.

## 5. Save interaction standard

Every autosave control uses one shared component/state:

- idle;
- dirty;
- saving;
- saved with timestamp/check;
- failed, value retained, retry available;
- offline, buffered locally if eligible;
- conflict, server value and local value preserved for choice.

Never reset a form merely because an enhanced request returned HTTP 200. Reset only on a domain success result. A read/poll success MUST NOT clear an unrelated failed-write warning.

## 6. Page specifications

### 6.1 Now

Layout:

- hero strip: current state, countdown, current/next link;
- current lesson/free block card;
- “Needs me” ranked list capped with “view more”;
- morning brief/risk card;
- day checklist and current interests.

Empty states distinguish weekend, holiday/INSET, no current year, no timetable, and outside school hours. Safeguarding items use a persistent high-salience treatment without exposing detail in shared projection contexts.

### 6.2 Timetable

- Week grid with date navigation and current-year preview badge.
- Every slot shows purpose, class, course, room, staff, readiness/status dots, and exception state.
- Click routing: teaching → lesson; effective free → free workspace; club → club workspace; non-actionable bands → details/no-op.
- Date/year context persists across navigation.
- Provide an accessible list/table alternative to the visual grid.

### 6.3 Lesson cockpit

Top: class/course/date/period/effective room and exception. For split lessons, an explicit tab bar appears before any course-specific panel.

Primary panels:

- slides/board mirror with teacher notes kept separate;
- lesson flow: objectives, outline/progress, stopping point, edit-scope control;
- resources and pupil preview;
- activity groups and level assignment;
- pupil work/marking summary;
- notes/follow-ups/TA feedback;
- adaptation/review/retrieval/cover actions.

Start Work group locking must be described honestly. Either persist a server-enforced work state or label it as a local presentation lock. Do not imply security from disabled browser buttons.

### 6.4 Pupil workspace

- No teacher navigation.
- Persistent reading-help toolbar.
- On wide screens, slides and worksheet side by side; on narrow screens, a sticky Slides/My work selector with worksheet reachable first.
- One idea/question per visual block; short instructions; inline read-aloud.
- Multiple worksheets use accessible tabs.
- Progress indicator counts actionable fields, including ordered Parson's state.
- Save state appears next to the field/action.
- Done and feedback are obvious but not visually punitive.
- Results use positive language, no leaderboard, and no differentiation label.

### 6.5 Marking

Queue page groups by class/date and shows done/marked/needs-review/released states. The modal shows:

- pupil identity and current level to teacher only;
- worksheet selector;
- question prompt, accepted/model answer, pupil response, suggestion, evidence, confidence/review reason;
- mark control and confirmation state;
- ATL picker and teacher comment;
- previous/next pupil with keyboard arrows.

Never hide a guard-matched disclosure behind ordinary mark controls. It must link to safeguarding handling.

### 6.6 Schemes

- Course tabs/filter.
- Active/draft version badges and explicit activation.
- Tree: units → lessons.
- Shared lesson card presentation with lesson cockpit where safe.
- Inline master edits clearly separated from class adaptations.
- AI actions show inputs, expected cost band, in-progress state, and proposal/result; no double-submit.
- Long schemes use virtualisation/collapsible units only if keyboard/search remains reliable.

### 6.7 Planner and map

- Planner: class selector, chronological grid with weeks/half-terms, unplaced tray, lock state, undo state.
- Drag is enhancement only. Click/tap/keyboard pick-up then target placement is mandatory.
- Before applying large cascade/unit placement, preview affected dates and overflow.
- After apply, announce exactly what moved.
- Map: recent/today/future delivery, stopping points, adaptation, kit, carry-over and drag/click shift.

### 6.8 Tasks, focus, recurring, time

- Tasks: inbox/triaged/scheduled/in-progress, urgency and context filters, compact inline edits, paste import.
- Focus: one task, why it fits, available time, first substep, timer, complete/skip—not a list wall.
- Recurring: human-readable pattern editor and next generation preview.
- Time: calculated work windows, planned blocks, actual/diverted result, weekly rollup.

### 6.9 Captured, notes, events, search

- Captured: low-friction inbox with category, flags, resurface date, promote actions.
- Notes: searchable list/detail, links and follow-ups, safeguarding visibility.
- Events: upcoming/done/cancelled, lead time and availability impact.
- Search: type grouping, highlighted matches, links, no raw sensitive snippet in shared contexts.

### 6.10 Safeguarding

- Teacher-only, always reachable.
- Shows source type, date, minimal necessary context, handling status, and action note.
- Clear statement: record of handling, not referral mechanism.
- New/unhandled count must include flagged lesson notes, captured notes, disclosure answers, and TA feedback.
- Never make an AI request from this page.

### 6.11 Pupils

- Roster grouped by current class, import/add/archive.
- Detail: enrolments, notes, level/unit signals, work/marks/profile, login state, device revoke, export/disposal.
- Destructive actions require typed confirmation and explain exactly what is retained/deleted.
- Safeguarding data is not casually included in export previews.

### 6.12 Resources

- Search/filter list with kind, source, unit/year, version, attribution, usage.
- Staged import preview with duplicate warnings and total limits.
- Edit/preview/version history/usage/download/present.
- Active content warnings and forced download behaviour are explicit.

### 6.13 Setup/settings

- Setup is task-oriented tabs: year/terms, day shape, people/rooms, courses, groups/pupils, timetable, rollover.
- Settings: school, navigation, AI master/key/models/features/budget/reviewer, mailbox, TA accounts, pupil/marks DPIA gates, idle timeouts, password, backup verification, AI audit.
- Secret fields are always blank with configured/not-configured state.
- Access switches show the immediate revocation consequence and require documented acknowledgement.

## 7. Content design

- Use plain British English.
- Explain failures in actionable language without exposing system details.
- Avoid “AI magic” language; label generated content as a draft/proposal.
- For pupils, use short sentences, one instruction at a time, and concrete verbs.
- For safeguarding, avoid promising that the application notified anyone.
- Date/time formatting uses en-GB and the school timezone consistently.

## 8. Browser acceptance matrix

At minimum test current school-managed Chrome/Edge desktop, Chromebook-class browser, tablet touch mode, and one screen-reader/browser pairing. Test each at standard, large, high contrast, reduced motion, and narrow viewport. Projector and print snapshots are separate acceptance targets.

