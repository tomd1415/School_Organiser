// Structured output for "generate this lesson's resources" — a small, fixed set of ready-to-use
// Markdown documents per lesson, stored in the resource store and linked to the plan.
import * as z from 'zod/v4';

export const lessonResourcesSchema = z.object({
  resources: z
    .array(
      z.object({
        kind: z.enum(['slides', 'worksheet', 'support', 'answers']).describe(
          'slides = teaching slides outline; worksheet = main pupil task; support = scaffolded version of the same task; answers = teacher answer notes',
        ),
        title: z.string().describe('short human title, e.g. "Slides — Website building blocks"'),
        content: z.string().describe('the complete Markdown document, ready to use'),
      }),
    )
    .min(2)
    .max(4)
    .describe('the lesson resource set, one entry per document'),
});

export type LessonResources = z.infer<typeof lessonResourcesSchema>;
