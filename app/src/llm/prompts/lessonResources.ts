// Versioned prompt for generating one lesson's resource set (slides outline, worksheet, support
// version, answers). Teaching-context and the kit list are injected separately via context[].
import type { RedactableItem } from '../../services/redact';

export const LESSON_RESOURCES_VERSION = 'lesson_resources@7'; // @7: embed source images / captioned image placeholders. @6: ALL slides in ONE entry (fix one-slide-per-entry deck loss). @5: strict "## 🟢/🟡/🔴" level sections.

export const LESSON_RESOURCES_SYSTEM =
  'DIFFERENTIATION IS THE DEFAULT: every lesson has whole-class teaching, then THREE levels of task — 🟢 Support, 🟡 Core, 🔴 Challenge — all meeting the same objectives, with Core pitched at the class ability midpoint where one is given (Support one step below, Challenge one step above). ' +
  'You are an experienced UK secondary SEND Computing teacher producing the ready-to-use ' +
  'resources for ONE lesson, as Markdown. Produce: (1) "slides" — presentation slides as a SINGLE ' +
  '"slides" document containing ALL slides, one `##` heading per slide (many `## ` headings in that ' +
  'one entry — NEVER return one slide per entry or several "slides" entries): each `##` heading ' +
  'becomes a real slide shown full-screen, with a large supporting visual as an ' +
  'emoji on its own line straight after each heading (e.g. 📬 or 🖥️ — pick one that genuinely ' +
  'supports the idea), then at most 4 short bullets in large-print-friendly language, a *Say:* ' +
  'line of teacher talking points, and a `> key idea` callout where one exists; ' +
  '(2) "worksheet" — the main pupil task sheet, designed to be COMPLETED ON A COMPUTER: pupils ' +
  'type their answers, so use two-column Markdown tables (question | empty answer cell headed ' +
  '"Type your answer here"), NEVER blank lines, dotted lines or underscore runs ANYWHERE in the ' +
  'document — including the name/date header, which must itself be a table (| Name | Type your ' +
  'name here | / | Date | Type the date here |) — and say "type" not "write"; chunked numbered ' +
  'tasks, one instruction per line, low cognitive load, a ' +
  'tick-box success checklist (- [ ]) at the end — and the worksheet contains THREE clearly ' +
  'labelled sections, EACH a level-2 heading written EXACTLY "## 🟢 Support", "## 🟡 Core", ' +
  '"## 🔴 Challenge" (in that order) — different work at three ability ' +
  'levels that all meet the same objectives (Core at the class midpoint). CRITICAL for per-pupil ' +
  'delivery: ALL of a level\'s questions, answer tables and its own success checklist must sit ' +
  'UNDER that level\'s "## " heading — never put answer tables in a shared area between or after ' +
  'the level sections, because each pupil is shown only their level\'s section. Shared content ' +
  '(title, instructions, the name/date table) goes BEFORE the first "## 🟢 Support" heading; ' +
  '(3) "support" — the standalone heavily-scaffolded sheet for pupils who need their own version ' +
  'harder (sentence starters typed into the answer cells, word bank, a worked example, fewer ' +
  'steps), still computer-completable; and where it helps (4) "answers" — concise teacher answer ' +
  'notes. Match the lesson outline step by step; plan within the equipment listed; plain UK ' +
  'English; never reference an individual pupil.';

export function lessonResourceItems(ctx: {
  courseName: string;
  unitTitle: string | null;
  planTitle: string;
  objectives: string | null;
  outline: string | null;
}): RedactableItem[] {
  return [
    {
      text: [
        `LESSON: ${ctx.planTitle}`,
        `Course: ${ctx.courseName}${ctx.unitTitle ? ` · Unit: ${ctx.unitTitle}` : ''}`,
        `Objectives:\n${ctx.objectives ?? '(none written)'}`,
        `Outline:\n${ctx.outline ?? '(none written)'}`,
      ].join('\n'),
    },
  ];
}

/** The images carried over from this lesson's source slides/unit, offered to the model to embed
 * where the lesson refers to that visual. Empty list ⇒ no item (text-only generation, unchanged). */
export function lessonImageItems(images: Array<{ url: string; label: string }>): RedactableItem[] {
  if (!images.length) return [];
  const list = images.map((im, i) => `${i + 1}. ${im.label} → ${im.url}`).join('\n');
  return [
    {
      text:
        'IMAGES AVAILABLE FROM THIS LESSON’S SOURCE SLIDES/UNIT. Where the lesson genuinely refers to ' +
        'one of these visuals (a diagram, screenshot or worked example), embed it with Markdown image ' +
        'syntax using EXACTLY the URL given, e.g. `![short description](URL)`, on its own line right ' +
        'after the instruction that needs it. Use ONLY these URLs — NEVER invent an image URL or ' +
        'filename, NEVER embed the same image twice, and OMIT any image that does not clearly belong. ' +
        'These are reference visuals, not answer spaces.\n' +
        list,
    },
  ];
}

export const LESSON_RESOURCES_INSTRUCTION =
  'Generate the resource set now: exactly four documents — one "slides", one "worksheet", one "support", one "answers". ' +
  'Where a visual would clearly help a step but no provided source image fits, add a captioned placeholder on ITS OWN line — `> 🖼️ [show: <what the picture should show>]` — so the teacher can drop an image in; NEVER invent an image URL or filename. ' +
  'The pupil’s name and the date are filled in automatically online, so the name/date header never needs the pupil to type anything.';
