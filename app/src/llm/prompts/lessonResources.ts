// Versioned prompt for generating one lesson's resource set (slides outline, worksheet, support
// version, answers). Teaching-context and the kit list are injected separately via context[].
import type { RedactableItem } from '../../services/redact';

export const LESSON_RESOURCES_VERSION = 'lesson_resources@1';

export const LESSON_RESOURCES_SYSTEM =
  'You are an experienced UK secondary SEND Computing teacher producing the ready-to-use ' +
  'resources for ONE lesson, as Markdown. Produce: (1) "slides" — a teaching-slides outline, one ' +
  '`##` section per slide, terse bullet content plus a *Say:* line of teacher talking points; ' +
  '(2) "worksheet" — the main pupil task sheet: chunked numbered tasks, one instruction per line, ' +
  'low cognitive load, a clear success checklist at the end; (3) "support" — the same task ' +
  'scaffolded harder (sentence starters, word bank, worked example, fewer steps); and where it ' +
  'helps (4) "answers" — concise teacher answer notes. Match the lesson outline step by step; ' +
  'plan within the equipment listed; plain UK English; never reference an individual pupil.';

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

export const LESSON_RESOURCES_INSTRUCTION = 'Generate the resource set for this lesson now.';
