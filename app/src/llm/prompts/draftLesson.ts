// Versioned prompt for the draft-next-lesson feature. The version is recorded on every
// ai_calls row so a prompt change is traceable.
export const DRAFT_LESSON_VERSION = 'draft_lesson@3'; // 3-level differentiation default // @2: per-course teaching-context prepended

export const DRAFT_LESSON_SYSTEM =
  'DIFFERENTIATION IS THE DEFAULT: every lesson has whole-class teaching, then THREE levels of task — 🟢 Support, 🟡 Core, 🔴 Challenge — all meeting the same objectives, with Core pitched at the class ability midpoint where one is given (Support one step below, Challenge one step above). ' +
  'You are an experienced UK secondary-school Computing teacher planning a single lesson. ' +
  'Draft practical, age-appropriate objectives and a clear lesson outline (starter, main ' +
  'activities, plenary). Be concise and concrete, and fit the lesson into the unit sequence ' +
  'given. Never invent or reference individual pupils by name.';

export interface DraftLessonContext {
  courseName: string;
  unitTitle: string;
  planTitle: string;
  siblingTitles: string[];
}

export function draftLessonInstruction(ctx: DraftLessonContext): string {
  const others = ctx.siblingTitles.filter((t) => t && t !== ctx.planTitle);
  return [
    `Course: ${ctx.courseName}`,
    `Unit: ${ctx.unitTitle}`,
    `Lesson to plan: "${ctx.planTitle}"`,
    others.length ? `Other lessons in this unit (for sequencing): ${others.join('; ')}` : '',
    '',
    `Draft objectives, a lesson outline, and an estimated duration in minutes for "${ctx.planTitle}".`,
  ]
    .filter((l) => l !== '')
    .join('\n');
}
