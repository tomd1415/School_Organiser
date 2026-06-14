// Structured output for "author a scheme of work" (4.4). A sequence of units, each with an
// ordered list of lesson titles — the skeleton the teacher then fleshes out (per-lesson with the
// 4.3 drafter). zod/v4 for the SDK's zodOutputFormat helper.
import * as z from 'zod/v4';

export const authorSchemeSchema = z.object({
  units: z
    .array(
      z.object({
        title: z.string().describe('the unit title'),
        lessons: z
          .array(
            z.object({
              title: z.string().describe('the lesson title'),
              specPoints: z
                .array(z.string())
                .describe('the spec-point CODES this lesson covers, taken EXACTLY from the provided spec-point list (e.g. ["1.1.1","1.1.2"]); use [] when the course has no spec points or the lesson covers none'),
            }),
          )
          .describe('ordered lessons for this unit'),
      }),
    )
    .describe('the units of the scheme, in teaching order'),
});

export type AuthoredScheme = z.infer<typeof authorSchemeSchema>;
