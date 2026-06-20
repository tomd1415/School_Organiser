# School Organiser UI developer guide

**Status:** Target design direction  
**Last updated:** 20 June 2026  
**Audience:** Developers extending or migrating the teacher-facing UI

This guide defines how to develop the rest of the School Organiser interface using the selected
**Option 2 dark, task-first workspace** direction. It describes the intended product behavior and
implementation standards; the static prototypes are visual references, not production templates to
copy verbatim.

## Reference material

- [Expanded dark Option 2 prototype](../../ui-overhaul-prototypes/option-2-task-first-dark/index.html)
- [Live lesson cockpit](../../ui-overhaul-prototypes/option-2-task-first-dark/lesson.html)
- [Pupil-safe board display](../../ui-overhaul-prototypes/option-2-task-first-dark/presentation.html)
- [Marking page and modal](../../ui-overhaul-prototypes/option-2-task-first-dark/marking.html)
- [Weekly Plan view](../../ui-overhaul-prototypes/option-2-task-first-dark/plan.html)
- [Original design rationale](../../ui-overhaul-prototypes/DESIGN_PLANS.md)

The current application uses server-rendered TypeScript templates, HTMX, a shared layout in
`app/src/lib/html.ts`, navigation in `app/src/lib/nav.ts`, client behavior in `app/public/app.js`, and
a largely monolithic stylesheet in `app/public/styles.css`. Retain that architecture during the
redesign. Do not convert the application to a client-side SPA solely to reproduce the prototypes.

## 1. Product principles

### 1.1 Design around the teacher's next decision

The interface should answer these questions in order:

1. What should I be doing now?
2. What do I need while teaching this lesson?
3. What needs my judgement or preparation next?
4. Where can I find everything else when I deliberately look for it?

The application is not primarily a database administration interface. During the school day, the
teacher is frequently interrupted and may use the interface while speaking, moving around a room, or
watching pupils. Prioritise recognition, large targets, short labels, and reversible actions over dense
configuration.

### 1.2 Keep the primary information architecture task-first

The five primary areas are:

| Area | Purpose | Typical content |
|---|---|---|
| **Today** | Immediate context | Now, daily timeline, Focus, current lesson, next preparation, quick capture |
| **Teach** | Deliver and monitor learning | Lesson cockpit, slides, pupils, activity groups, resources, lesson notes, stopping point |
| **Plan** | Prepare future teaching | Timetable, schemes, curriculum map, planner, coverage, lesson authoring |
| **Assess** | Apply teacher judgement | Marking queue, per-pupil marking modal, feedback, release and progress evidence |
| **Organise** | Maintain supporting information | Tasks, events, notes, captured items, resources, pupils, setup, settings and advanced tools |

Keep existing URLs where practical. The task-first areas are an information-architecture layer, not a
requirement to rewrite routing or repositories.

Safeguarding must remain directly reachable and visually distinct. Do not bury it inside Organise,
hide it behind an “advanced” preference, or rely only on search to find it.

### 1.3 Use progressive disclosure

Show the common action first. Reveal settings, bulk actions, explanations, audit history, and unusual
states only when they become relevant. A page should not expose every capability merely because the
backend supports it.

Examples:

- Now shows the current lesson and the next preparation action, not the full resource library.
- The lesson cockpit shows the three pupils most likely to need attention, with a route to the full
  roster.
- The marking queue shows lesson-level status; pupil answers appear only in the marking dialog.
- Class-level marking settings live behind a labelled disclosure, not beside every answer.

### 1.4 Preserve teacher control over automation

AI output is advisory until the teacher explicitly accepts it. The UI must visually and textually
distinguish:

- not marked;
- AI suggested;
- needs a closer look;
- teacher checked;
- released to the pupil.

Never use the same appearance for “AI suggested” and “teacher checked”. Never confirm, release, move a
pupil, or change a lesson plan merely because a dialog was opened or dismissed.

### 1.5 Keep public and private displays separate

A live lesson is a two-screen workflow:

- the **board display** contains pupil-safe slides, shared instructions, and an optional timer;
- the **teacher cockpit** contains names, activity groups, progress, adaptations, private notes,
  answers, and teacher-only resources.

Do not render private content and hide it with CSS on the board screen. The server response for the
board route should not contain the private data at all.

## 2. Page shell and navigation

### 2.1 Desktop shell

Use a compact sticky header containing:

1. product identity linking to Now;
2. global search/command input;
3. Today, Teach, Plan, Assess, and Organise task navigation;
4. accessibility/density controls and the account menu.

The active task must use `aria-current="page"` or `aria-current="location"` and a visual treatment
that does not depend on colour alone. The page itself starts with a clear eyebrow, one `h1`, a short
purpose statement where needed, and a small set of page-level actions.

### 2.2 Mobile shell

Below approximately 820 CSS pixels:

- move the five task areas to a persistent bottom navigation bar;
- keep labels visible; icons alone are insufficient;
- place search on its own row or behind a labelled search action;
- keep DOM order aligned with reading and keyboard order;
- do not horizontally squeeze desktop tables or three-column workspaces.

Where content is genuinely tabular, provide a card/list presentation or a scrollable table with a
clear accessible name. Do not change semantic table markup into arbitrary `div` grids solely for
visual styling.

### 2.3 Page widths

Use three content measures:

- **reading:** about 45–70 characters per line for settings guidance, notes, and documentation;
- **working:** about 960–1180 pixels for forms, marking and ordinary pages;
- **workspace:** up to roughly 1540 pixels for Now, timetable, planner and the lesson cockpit.

Do not make every page full width. Width should follow the task.

## 3. Visual foundation

### 3.1 Dark theme tokens

Use semantic custom properties rather than hard-coded colours inside route-specific CSS. These values
are the starting palette from the approved prototype:

| Token | Starting value | Purpose |
|---|---:|---|
| `--bg` | `#080b12` | Page background |
| `--bg-soft` | `#0c111a` | Recessed controls and rows |
| `--surface` | `#111824` | Primary card/dialog surface |
| `--surface-2` | `#172131` | Raised controls and secondary cards |
| `--surface-3` | `#1d293b` | Hover/active raised state |
| `--line` | `#2a3749` | Normal boundary |
| `--line-strong` | `#3b4b62` | Emphasised boundary |
| `--text` | `#f3f7fc` | Primary text |
| `--muted` | `#aab5c5` | Secondary text |
| `--quiet` | `#7f8b9d` | Low-priority metadata; verify contrast before use at small sizes |
| `--violet` | `#9a8fff` | Selected task, AI suggestion, current step |
| `--teal` | `#5de0d0` | Primary action, live state, successful progress |
| `--amber` | `#ffc06a` | Attention required |
| `--red` | `#ff8f9b` | Destructive action, error or safeguarding emphasis |
| `--blue` | `#76b7ff` | Informational link/support state |
| `--green` | `#83dfa2` | Teacher-checked success |

Also define soft semantic backgrounds for each state. Do not express state with text colour alone; use
a label, boundary, icon shape, or supporting copy.

The dark theme is dark-first, not pure black. Layered surfaces and visible boundaries provide spatial
hierarchy. Preserve the existing high-contrast preference and offer a light/standard theme if user
testing demonstrates a need. Theme changes must happen before first paint to avoid flashing.

### 3.2 Typography

- Continue using the self-hosted Atkinson Hyperlegible font by default.
- Keep the system-font accessibility preference.
- Use one expressive display size for the page/current-lesson title; keep operational text restrained.
- Body text should normally be at least 16–17 CSS pixels.
- Avoid content text below approximately 14 CSS pixels.
- Use uppercase only for short eyebrows and state labels, with increased letter spacing.
- Do not truncate essential instructions, pupil names, lesson titles, or error messages.

### 3.3 Spacing and shape

Use a 4-pixel-derived spacing scale:

`4, 8, 12, 16, 24, 32, 48, 64`

Prefer 16-pixel card radii and 9–12-pixel control radii. Shadows should be restrained and should not be
the only boundary between surfaces. Every interactive target should be at least 44 × 44 CSS pixels,
including close buttons, icon controls, checkboxes, and mobile navigation.

### 3.4 Icons

Use a small reviewed SVG icon set. Decorative icons use `aria-hidden="true"`; icon-only buttons require
an accessible name. Emoji may supplement a text label but must not be the only indication of meaning.

## 4. Core components

### 4.1 Buttons and links

Use four button levels:

| Level | Use |
|---|---|
| Primary | The single most likely next action, such as “Open lesson cockpit” or “Confirm & next” |
| Secondary | Useful alternative actions, such as “Open board screen” |
| Ghost | Low-priority actions, disclosures and navigation within a card |
| Danger | Destructive actions requiring clear confirmation |

Use a link for navigation and a button for an action. Button text starts with a verb and states the
result. Avoid generic labels such as “Go”, “OK”, “Submit”, “Manage”, or unlabeled chevrons.

Only one primary button should normally compete for attention within a card or dialog footer.

### 4.2 Cards

A card represents one bounded decision or information group. It contains:

- an optional eyebrow;
- a heading;
- an optional status/action aligned to the heading;
- concise content;
- no more actions than the teacher can reasonably compare at once.

Do not create cards around every paragraph. Nested cards should be rare; use recessed rows or a simple
divider inside a parent card.

### 4.3 Badges and status labels

Badges must contain meaningful text such as `Live`, `2 need a look`, `AI suggested`, or `Checked`.
Do not use an unexplained coloured dot. Counts need an adjacent noun or an accessible label.

Use consistent semantics:

- violet: selected/current or AI-suggested;
- teal: live/active workflow;
- green: teacher-checked/successful terminal state;
- amber: attention required but operation can continue;
- red: failure, destructive action, or sensitive safeguarding state.

### 4.4 Forms

- Every field has a persistent label. Placeholder text is an example, never the only label.
- Put help text before the error when both exist.
- Associate help and error text using `aria-describedby`.
- Mark invalid fields with `aria-invalid="true"` and provide an error summary for long forms.
- Preserve entered values after validation, server, network, or HTMX failures.
- Use native field types and `autocomplete` values where applicable.
- Do not autosave destructive or identity-changing settings.

For autosave fields, show operation-specific `Saving`, `Saved`, or `Not saved` status. Correlate status
to a stable unique field/operation ID, not a common HTML name such as `title`, `text`, or `value`.

### 4.5 Dialogs and modals

Use a native `dialog` for short, bounded tasks that belong to the current context:

- marking one pupil;
- adjusting activity groups before work starts;
- capturing a quick note;
- confirming a destructive action.

Do not use a modal for long setup, multi-page planning, broad resource browsing, or anything that needs
a stable URL and browser history.

Every dialog requires:

- an accessible name via `aria-labelledby`;
- an explicit close button;
- Escape-to-close unless closing would discard an irreversible operation;
- focus placed on the first useful control or heading after opening;
- focus returned to the opener after closing;
- a scrollable body and visible footer actions at high zoom;
- no accidental close from clicking inside the dialog;
- confirmation before discarding substantial unsaved work.

When HTMX loads dialog content, open the dialog only after a successful response and move focus after
the swap. Do not treat an HTTP failure as a successful response merely to render an error fragment.

### 4.6 Tabs and disclosures

Use tabs only for peer views of the same object. Implement the complete ARIA tabs keyboard model,
including arrow-key movement and managed `tabindex`. Use `details`/`summary` for optional settings and
explanation. Do not make ordinary navigation look like tabs.

### 4.7 Tables and lists

Use semantic tables for comparable records and ordered lists for timelines/sequences. At narrow widths:

- preserve the table when comparison is important and provide controlled horizontal scrolling;
- otherwise render an equivalent server-side card/list view;
- repeat labels in card layouts so values remain understandable;
- never rely on visual column position alone in the accessible reading order.

### 4.8 Empty, loading, success and failure states

Every data surface must define:

- initial loading or HTMX busy state;
- empty state explaining why it is empty;
- ordinary populated state;
- partial/incomplete state;
- permission-disabled state;
- recoverable failure with retry;
- terminal success where applicable.

Skeletons must not replace accessible loading text. Use `aria-busy` on the affected region and one
polite live announcement, not repeated announcements for every row.

## 5. Page composition

### 5.1 Today / Now

Now is the teacher's normal daytime home. Its priority order is:

1. current lesson or current work window;
2. one clear primary action;
3. next time-sensitive preparation;
4. current class pulse;
5. a short “Needs me” list;
6. quick capture;
7. the rest of the day as a semantic timeline.

Avoid turning Now into a general dashboard. Routine metrics and administrative totals remain hidden
unless they change the teacher's next decision.

The timeline is an ordered list with real `time` elements. “Current”, “Next” and “Finished” are written
as text, not communicated only by node colour.

### 5.2 Live lesson cockpit

The desktop cockpit uses three columns in this order:

1. **Slides:** thumbnails, a readable small board mirror, controls, and private per-slide teacher notes.
2. **Teaching flow:** Lesson flow, Fast capture, then Activity groups.
3. **Live tools:** pupils who may need attention, timer, and resources.

At tablet/mobile widths these collapse into that same logical DOM order. Do not use CSS reordering that
causes keyboard or screen-reader order to disagree with the visual layout.

#### Slides and per-slide notes

The selected thumbnail updates the teacher-side preview. The current slide number and title remain
visible. Per-slide teacher notes are a planned feature and should support prompts, explanations,
questions to ask, and reminders. Notes:

- are private and must never enter the pupil-facing board response;
- belong to a stable slide/resource version, not merely a visual index;
- need an explicit stale/version policy when slides change;
- should autosave only with reliable per-slide status and failure recovery;
- remain accessible from keyboard-operated slide selection.

Until persistence exists, label the control `Future feature` and disable its save action rather than
implying that typed notes are stored.

#### Lesson flow

Show completed, current, and upcoming stages. The current stage is prominent; later stages remain
quiet. Starting independent work is a deliberate state transition because it affects activity-group
editing. Record stopping point without forcing the teacher away from the cockpit.

#### Fast capture

Provide quick note categories such as Learning, Support, Behaviour and Safeguarding. Category selection
must be visible and keyboard-operable. Safeguarding notes are private, clearly identified, and must not
enter AI routing. Saving a note keeps the teacher in the lesson and adds it to a compact recent list.

#### Activity groups

Show Support, Core and Extend with textual headings and counts. The teacher can adjust assignments
before pupils begin independent work. When work starts:

- lock group/version changes for the current activity;
- state that the groups are locked and why;
- do not merely disable the button without explanation;
- provide a deliberate audited override only if the product later requires one.

Suggested moves must remain suggestions. Saving the group dialog applies one coherent change set, not a
series of visibly partial updates.

#### Pupils needing attention

Show a deliberately small ranked set with the reason each pupil is surfaced. Avoid opaque risk scores.
The full roster remains one action away. Do not expose sensitive information on the board display.

### 5.3 Board display

The board view is intentionally minimal:

- lesson title;
- current slide content;
- previous/next controls;
- slide position;
- optional timer;
- full-screen and return-to-teacher-screen controls.

It must not contain pupil names, groups, progress, private notes, marking, alerts, hidden teacher
answers, or confidential metadata in markup, data attributes, scripts, or preloaded JSON.

### 5.4 Assess / marking

The marking landing page presents taught lessons with pupil work, most recent first. Each row includes
class, lesson, number of pupils with work, textual status, and one Mark/Review action.

The per-pupil dialog follows the current marking implementation:

- one pupil and one lesson at a time;
- pupil position in the roster;
- question wording followed by model and pupil answers side by side on wide screens;
- one-click correct/not-yet controls for one-mark questions;
- bounded numeric entry for multi-mark questions;
- clear AI confidence/suggestion and “needs a look” labels;
- running score and checked count;
- a short pupil-visible comment;
- Previous, Confirm all, Confirm & next, and Skip actions.

At narrow widths, model answer, pupil answer and mark control stack in that order. Confirmation must be
explicit. Opening, navigating, or closing the dialog must never confirm marks. Preserve the teacher's
place when a save fails.

### 5.5 Plan

Plan combines timetable and readiness rather than exposing unrelated authoring tools at once. The
weekly view should make these states immediately visible in text:

- ready;
- teaching/current;
- needs preparation;
- cover or room change;
- missing resources;
- draft/unpublished changes.

Use a semantic agenda alternative to the spatial week grid. Keep scheme, map, planner and coverage
tools contextually linked from a course/lesson rather than presenting all of them as equal primary
actions.

### 5.6 Organise and advanced administration

Organise is where deliberate maintenance happens. Group related pages rather than reproducing the old
flat navigation list:

- **Work:** Tasks, recurring tasks, events, captured items and time planning;
- **Knowledge:** Notes, resources and concepts;
- **People:** Pupils, groups and access;
- **System:** Setup, kit, settings, imports, backup/restore status and advanced tools.

Do not make daily actions harder merely to achieve a clean taxonomy. Search and contextual links may
open an Organise page directly without forcing the teacher through an intermediate landing page.

### 5.7 Pupil and TA interfaces

Do not inherit the full teacher shell. Use role-appropriate language, fewer choices, and deny-by-default
routes. Pupil pages should focus on current work, saved status, completion and released feedback. TA
pages should focus on the lessons and pupils they are supporting, effective room/cover information, and
appropriate support notes.

## 6. Server-rendered and HTMX implementation

### 6.1 Shared render helpers

Move repeated markup into typed server-side helpers rather than copying HTML strings between routes.
Suggested primitives include:

- `renderAppShell`
- `renderPageHeader`
- `renderButton` / `renderLinkButton`
- `renderBadge`
- `renderCardHeader`
- `renderStatusRegion`
- `renderEmptyState`
- `renderDialogShell`
- `renderField` / `renderErrorSummary`
- `renderLessonTimeline`

Helpers must escape untrusted values by default. Raw HTML should require an explicit reviewed type or
function, not a convention that every caller remembers.

### 6.2 Stylesheet structure

Migrate incrementally from the monolithic stylesheet toward:

```text
public/styles/
├── tokens.css
├── foundations.css
├── shell.css
├── components.css
├── utilities.css
└── routes/
    ├── now.css
    ├── lesson.css
    ├── marking.css
    ├── plan.css
    └── organise.css
```

If the build continues to serve one CSS file, concatenate/bundle these files rather than returning to
one unstructured source file. Route styles may compose shared classes but must not silently redefine
global button, field, or badge semantics.

### 6.3 HTMX request lifecycle

For every write:

1. Disable only controls that would duplicate that operation.
2. Set `aria-busy="true"` on the affected region.
3. Show a concise operation-specific saving message.
4. On success, swap the smallest stable region and restore deliberate focus.
5. On failure, retain all entered data, keep a non-2xx status, show a useful error, and offer retry.
6. Announce one final status through an appropriate live region.

Do not reset a form merely because `afterRequest` fired. Reset only after a response explicitly proves
that the intended write succeeded. Do not convert server failures to HTTP 200 to make HTMX display
them; configure the error swap behavior instead.

Prefer stable element IDs and `hx-target` boundaries. Avoid whole-page swaps for small actions. A swap
must not duplicate IDs, destroy an open dialog unexpectedly, or move keyboard focus to the document
start.

### 6.4 Client JavaScript

Use client JavaScript for interaction coordination that HTML/HTMX cannot express cleanly:

- dialog opening, close and focus return;
- accessible tabs;
- command palette behavior;
- density/theme preferences;
- timer/presentation controls;
- preserving focus and selection across swaps.

Keep business rules, authorization, mark calculations, group eligibility and persistence on the
server. JavaScript enhancement must not be the only enforcement of a security or data-integrity rule.

## 7. Accessibility requirements

Target WCAG 2.2 AA. At minimum:

- include a skip link and meaningful landmarks;
- use one `h1` and a logical heading hierarchy;
- maintain visible focus with at least a 3-pixel treatment;
- support complete keyboard operation without shortcut knowledge;
- keep targets at least 44 × 44 CSS pixels where practical;
- provide text for every status represented by colour or shape;
- support 200% zoom without lost controls and test key journeys at 400%;
- honor `prefers-reduced-motion`;
- support Windows High Contrast/forced-colours behavior;
- preserve Atkinson, system font, and text-size preferences;
- use polite live regions for routine updates and assertive announcements only for urgent failures;
- avoid focus theft from background refreshes;
- provide a non-drag alternative for every drag-and-drop action;
- ensure charts, heat maps and timetable grids have a textual/table alternative.

Keyboard shortcuts are optional accelerators. They must be documented, avoid form-field conflicts,
and never replace ordinary navigation.

## 8. Privacy, safety and permissions

- Render only the data permitted for the current role and context.
- Never place private teacher data in board/pupil markup and rely on CSS to hide it.
- Keep safeguarding capture visibly private and outside AI-bound workflows.
- Do not put reusable credentials, secret settings or full tokens into the DOM.
- Avoid exposing sequential internal IDs when a scoped capability is required.
- Confirm destructive actions with the affected object named in plain language.
- Show permission-disabled features as unavailable only when that explanation helps; otherwise omit
  actions the user cannot perform.
- Log and audit sensitive state changes server-side; a visual toast is not an audit record.

Use fictional records in prototypes, screenshots, visual tests and documentation.

## 9. Content and language

Write for a busy teacher:

- use short concrete headings: `Now`, `What comes next`, `Who may need you`;
- lead with the action or result;
- prefer `2 need a closer look` to `2 exceptions detected`;
- prefer `Not saved — try again` to `Request failed`;
- explain why an action is disabled;
- distinguish `not started`, `in progress`, `done`, `checked`, and `released`;
- avoid internal database, route, AI-model and migration terminology in ordinary UI copy.

Do not use cheerful success language for safeguarding, behavior, failure, or destructive operations.

## 10. Testing and acceptance

### 10.1 Automated coverage

For each migrated journey, add:

- route tests for semantic structure, active navigation, permissions and important states;
- interaction tests for HTMX success, validation and server failure;
- accessibility checks with Axe or equivalent;
- visual regression at desktop, tablet and mobile widths;
- tests for empty, long-content, loading, partial, error and disabled states;
- dialog tests covering focus, Escape, close button, HTMX swaps and focus return;
- keyboard tests for tabs, menus, marking and group editing.

Do not make tests depend only on CSS class names. Prefer roles, labels, headings and visible action text.

### 10.2 Manual acceptance matrix

Test at least:

| Dimension | Required cases |
|---|---|
| Input | Mouse, touch and keyboard only |
| Viewport | Wide desktop, typical laptop, tablet and narrow phone |
| Zoom | 100%, 200% and key journeys at 400% |
| Theme | Dark, high contrast and any retained light theme |
| Motion | Normal and reduced motion |
| Assistive technology | NVDA/Firefox or Chrome and VoiceOver/Safari |
| Content | Empty, realistic, very long and error states |
| Network | Fast, slow, disconnected and server failure |
| Lesson | No active lesson, teaching, work not started, work started and lesson ended |
| Displays | Teacher-only, board-only and real dual-monitor workflow |

### 10.3 Definition of done for a migrated page

- [ ] It has one clear task and belongs to a primary area.
- [ ] It uses shared tokens and components rather than one-off styling.
- [ ] It supports every relevant state, not only the ideal populated state.
- [ ] Keyboard order matches visual and DOM order.
- [ ] Focus and announcements remain correct after HTMX swaps.
- [ ] Failed writes preserve user input and return a truthful HTTP status.
- [ ] Status is understandable without colour.
- [ ] The page works at 200% zoom and a narrow viewport.
- [ ] Private data is absent from unauthorized/public responses.
- [ ] Automated route, interaction and accessibility tests pass.
- [ ] The page has been checked with realistic teacher content, not only short fixtures.

## 11. Recommended migration sequence

1. **Foundations:** finalise tokens, shared components, error/status behavior, dialog focus handling and
   accessibility preferences.
2. **Feature-flagged shell:** add the task-first navigation without deleting the existing Rail & Stage
   shell. Keep a safe rollback path.
3. **Today / Now:** establish the task-first daily workflow and timeline.
4. **Teach:** build the teacher cockpit and separate pupil-safe board response; add per-slide notes only
   when persistence/version semantics are designed.
5. **Assess:** migrate the existing marking queue/modal without changing its teacher-confirmation
   semantics.
6. **Plan:** bring timetable, scheme, map, planner and coverage journeys under one readiness-oriented
   area.
7. **Organise:** group lower-frequency pages and preserve direct contextual/search routes.
8. **Role surfaces:** redesign TA and pupil journeys independently under their existing deny-by-default
   authorization model.
9. **Retirement:** remove old shell/CSS only after journey parity, accessibility acceptance, user
   testing and rollback sign-off.

Ship complete journeys behind a feature flag rather than mixing two design systems unpredictably on a
single page. Keep the old implementation available until the replacement has demonstrated functional,
privacy and accessibility parity.
