# UI overhaul design plans

## Shared goals

Both options retain the application's server-rendered HTML and HTMX architecture. Both target WCAG 2.2 AA and build on the existing Atkinson Hyperlegible font, visible focus indicators, minimum target sizes, reduced-motion support, text sizing, contrast controls, and live save feedback.

The production redesign should be accepted only after keyboard-only, 200–400% zoom, Windows High Contrast, reduced-motion, VoiceOver, and NVDA testing. Automated Axe checks and visual-regression tests should cover the main teacher, TA, and pupil journeys.

## Option 1 — Calm Command Centre

### Intent

Modernise the current Rail & Stage design without materially changing where features live. This is the lower-risk option: familiar navigation, clearer hierarchy, consistent components, and a more polished daily dashboard.

### Visual and interaction model

- A calm navy, blue, and teal palette on warm neutral surfaces.
- A collapsible labelled navigation rail and persistent command/search bar.
- Spacious cards with restrained borders and shadows rather than a dense admin-table appearance.
- A prominent current-lesson card, chronological schedule, action inbox, and preparation summary.
- Consistent buttons, fields, badges, status messages, dialogs, tabs, and empty states.
- Desktop rail becomes a proper modal navigation drawer on narrow screens.
- Every drag-and-drop or icon action receives a labelled keyboard alternative.

### Delivery plan

1. Audit current pages and establish accessibility/usability baselines.
2. Extract design tokens and reusable server-side view primitives.
3. Replace the application shell, navigation, search, notifications, and feedback states.
4. Migrate Now, Timetable, Lesson, Planner, Marking, and Settings in that order.
5. Standardise HTMX focus restoration, busy states, save announcements, and error recovery.
6. Remove legacy CSS only after route-level visual and accessibility regression coverage exists.

### Accessibility priorities

- Skip link, landmarks, descriptive page title, breadcrumbs, and `aria-current`.
- Status is expressed in text and shape as well as colour.
- 44 × 44 CSS-pixel targets, visible focus, and non-hover equivalents.
- A semantic agenda alternative to the spatial timetable.
- Error summaries linked to invalid fields.
- Persistent, operation-specific Saving/Saved/Failed messages.
- Contrast, type size, font, motion, and density preferences.

### Cost and risk

Approximately 6–9 developer weeks. Lower implementation and retraining risk, but the existing feature-oriented information architecture remains.

## Option 2 — Task-First Daily Workspace

### Intent

Reorganise the interface around teacher outcomes rather than the current collection of features. The five primary areas become Today, Teach, Plan, Assess, and Organise. This is a larger product and information-architecture change.

### Visual and interaction model

- An energetic indigo and turquoise workspace with a strong top-level task switcher.
- A daily command centre built around a lesson timeline and a contextual working panel.
- Contextual navigation appears only when it is relevant to the selected task.
- The active lesson combines plan, resources, presentation, worksheet, pupils, TA notes, and assessment in one workspace.
- Progressive disclosure keeps secondary controls out of the way until needed.
- On mobile, panels become sequential views with a persistent five-area navigation bar.
- A command palette provides a fast keyboard route to every page and action.

### Delivery plan

1. Map teacher, TA, and pupil journeys and test the new vocabulary with users.
2. Prototype Today and Teach with representative data and task-based usability sessions.
3. Build a feature-flagged task-first shell and shared server-side component layer.
4. Consolidate lesson delivery into Teach, planning surfaces into Plan, and marking into Assess.
5. Move lower-frequency administration into Organise without hiding urgent actions.
6. Run both shells until journey parity, accessibility acceptance, and user sign-off are reached.

### Accessibility priorities

- Logical DOM order remains correct when visual panels move or collapse.
- Focus moves deliberately when the user switches workspace context.
- The timeline has an equivalent ordered list and does not require spatial understanding.
- Context changes and HTMX swaps are announced concisely.
- Keyboard commands are discoverable and never replace ordinary navigation.
- Personalisation includes font, size, contrast, motion, line spacing, reading width, and density.
- Pupil and TA views use role-appropriate language and lower cognitive load rather than inheriting the teacher shell.

### Cost and risk

Approximately 12–18 developer weeks plus user research. Greater improvement to discoverability and workflow, but higher migration, retraining, and scope risk.

## Decision guide

| Consideration | Option 1 | Option 2 |
|---|---|---|
| Navigation change | Small | Substantial |
| Delivery strategy | Route-by-route | Complete journeys behind a feature flag |
| User retraining | Low | Medium to high |
| Visual modernisation | High | High |
| Workflow simplification | Medium | High |
| Implementation risk | Lower | Higher |
| Recommended when | Reliability and incremental delivery dominate | Current information architecture is itself the main problem |

## Production engineering notes

- Do not turn the application into a client-side SPA solely for the redesign.
- Create shared TypeScript render helpers for page headers, controls, status badges, forms, dialogs, data tables, and empty states.
- Split the monolithic stylesheet into tokens, foundations, components, layouts, utilities, and route-specific layers.
- Avoid emoji as the only icon or label; use a small, audited SVG icon set with accessible names where needed.
- Treat focus management, announcements, validation, and request recovery as application infrastructure rather than page-specific enhancements.
- Test real content expansion, long class/course names, empty data, failures, slow AI calls, and 400% zoom—not only the ideal dashboard state shown in these mockups.
