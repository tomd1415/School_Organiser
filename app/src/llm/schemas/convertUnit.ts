// Structured output for "convert a downloaded unit into my adapted master lessons" (5.3).
// Full lessons (not just titles): the source unit's structure gives enough grounding to draft
// objectives + outline in one pass, ready to teach and edit. zod/v4 for zodOutputFormat.
import * as z from 'zod/v4';

export const convertUnitSchema = z.object({
  unitTitle: z.string().describe('the adapted unit title, concise'),
  lessons: z
    .array(
      z.object({
        title: z.string().describe('the adapted lesson title'),
        objectives: z.string().describe('2–4 short learning objectives, one per line'),
        outline: z.string().describe('the lesson outline: numbered steps with rough minutes'),
      }),
    )
    .describe('the adapted lessons, in teaching order — one per source lesson'),
});

export type ConvertedUnit = z.infer<typeof convertUnitSchema>;
