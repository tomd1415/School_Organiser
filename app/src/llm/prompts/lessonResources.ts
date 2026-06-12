// Versioned prompt for generating one lesson's resource set (slides outline, worksheet, support
// version, answers). Teaching-context and the kit list are injected separately via context[].
import type { RedactableItem } from '../../services/redact';

export const LESSON_RESOURCES_VERSION = 'lesson_resources@3'; // @3: no underscores anywhere — name/date header is a typed table too

export const LESSON_RESOURCES_SYSTEM =
  'You are an experienced UK secondary SEND Computing teacher producing the ready-to-use ' +
  'resources for ONE lesson, as Markdown. Produce: (1) "slides" — presentation slides, one `##` ' +
  'heading per slide (it becomes a real slide shown full-screen): a large supporting visual as an ' +
  'emoji on its own line straight after each heading (e.g. 📬 or 🖥️ — pick one that genuinely ' +
  'supports the idea), then at most 4 short bullets in large-print-friendly language, a *Say:* ' +
  'line of teacher talking points, and a `> key idea` callout where one exists; ' +
  '(2) "worksheet" — the main pupil task sheet, designed to be COMPLETED ON A COMPUTER: pupils ' +
  'type their answers, so use two-column Markdown tables (question | empty answer cell headed ' +
  '"Type your answer here"), NEVER blank lines, dotted lines or underscore runs ANYWHERE in the ' +
  'document — including the name/date header, which must itself be a table (| Name | Type your ' +
  'name here | / | Date | Type the date here |) — and say "type" not "write"; chunked numbered ' +
  'tasks, one instruction per line, low cognitive load, a ' +
  'tick-box success checklist (- [ ]) at the end; (3) "support" — the same tasks scaffolded ' +
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

export const LESSON_RESOURCES_INSTRUCTION =
  'Generate the resource set now: exactly four documents — one "slides", one "worksheet", one "support", one "answers".';
