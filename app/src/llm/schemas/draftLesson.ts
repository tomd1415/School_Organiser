// Structured output for "draft next lesson" (4.3). Uses zod/v4 because the SDK's
// zodOutputFormat helper is built against it; the schema stays isolated to the AI layer.
import * as z from 'zod/v4';

export const draftLessonSchema = z.object({
  objectives: z.array(z.string()).describe('2–4 concise, age-appropriate learning objectives'),
  outline: z.string().describe('a lesson outline: starter, main activities, plenary — concise and concrete'),
  durationMin: z.number().int().describe('estimated lesson length in minutes (e.g. 50 or 60)'),
});

export type DraftLesson = z.infer<typeof draftLessonSchema>;
