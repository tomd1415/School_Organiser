// Structured output for "draft next lesson" (4.3). Uses zod/v4 because the SDK's
// zodOutputFormat helper is built against it; the schema stays isolated to the AI layer.
import * as z from 'zod/v4';

export const draftLessonSchema = z.object({
  objectives: z.array(z.string()).describe('2–4 concise, age-appropriate learning objectives'),
  outline: z
    .string()
    .describe(
      'the lesson outline as numbered steps, ONE STEP PER LINE, each "N. Name (M min) — what happens", e.g. "1. Arrival routine (5 min) — slide up, register" — covering starter, whole-class teaching, the three levelled tasks (Support/Core/Challenge) and plenary',
    ),
  durationMin: z.number().int().describe('estimated lesson length in minutes (e.g. 50 or 60)'),
});

export type DraftLesson = z.infer<typeof draftLessonSchema>;
