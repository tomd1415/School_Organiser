# Option 2 dark — task-first teacher workspace

This is an isolated static expansion of Option 2. It assumes the teacher's main daytime entry point is
**Now**, and treats a live lesson as a two-screen workflow:

- the board screen shows pupil-safe slides and a timer;
- the teacher screen shows a small mirror of those slides plus private group, progress, support, note,
  resource, and lesson-flow controls.

No application code, database, network request, external font, image, or analytics service is used.
All people and lesson data are fictional.

## Pages

- [Now](index.html) — current lesson, next preparation, live class pulse, quick capture, and only the
  most important attention items.
- [Live lesson cockpit](lesson.html) — slide mirror, sequence, pre-work Support/Core/Extend grouping,
  quick typed notes, pupils needing attention, timer, and resources.
- [Pupil-safe board](presentation.html) — the paired second-screen slide view. It deliberately contains
  no pupil names, groups, private notes, or marking.
- [Marking](marking.html) — lesson queue and the current one-pupil marking dialog.
- [Plan](plan.html) — a low-noise weekly readiness view.

## Current marking alignment

The marking mockup reflects the in-progress application design reviewed on 20 June 2026:

- one pupil in a modal rather than an expanded page section;
- question wording, model answer, and pupil answer shown together;
- one-click ticks for one-mark questions and numeric controls for larger questions;
- AI suggestions remain visibly unconfirmed until the teacher checks them;
- warnings receive stronger emphasis than ordinary suggestions;
- a short pupil comment and Confirm, Confirm & next, Skip, and previous/next movement remain available.

The prototype does not copy the application route code. It demonstrates the intended information
hierarchy and local interactions only.

## Usability and accessibility decisions

- Dark mode uses non-black raised surfaces and visible boundaries to retain hierarchy.
- Status always has a text label; colour is supplementary.
- Interactive targets are generally at least 44 CSS pixels.
- Native links, buttons, fields, ordered lists, headings, landmarks, and `dialog` elements are used.
- Dialogs close with Escape, restore browser-managed modal focus behavior, and can be closed explicitly.
- High-contrast and compact-density controls are included in each application page.
- Layout collapses to a single logical DOM sequence, while primary task navigation becomes a fixed
  mobile bar.
- Reduced-motion and print rules are supplied.
- The board page intentionally excludes confidential teacher-side context.

Before production implementation, test keyboard-only operation, focus return after HTMX dialog swaps,
screen-reader dialog announcements, 200–400% zoom, Windows High Contrast, long names/content, and real
dual-display behavior.
