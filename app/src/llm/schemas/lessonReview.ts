// Phase 11 Wave 5 (idea 8, lean cut) — structured output for the advisory lesson reviewer. A HARD
// contract: one verdict + at most three findings (worst first), plus a full improved version the
// teacher can Apply through the existing apply-improvement path. The tight cap is deliberate — a long
// list of low-stakes "tweaks" is exactly the ignored-clutter failure mode this feature must avoid.
import * as z from 'zod/v4';

export const lessonReviewSchema = z.object({
  verdict: z
    .enum(['keep', 'tweak', 'rework'])
    .describe("keep = solid as-is; tweak = small worthwhile fixes; rework = a substantial gap to address"),
  findings: z
    .array(
      z.object({
        issue: z.string().describe('one concrete weakness, plainly stated'),
        fix: z.string().describe('a specific, actionable change that addresses it'),
      }),
    )
    .max(3)
    .describe('0 to 3 findings, MOST IMPORTANT FIRST; leave empty when the verdict is keep'),
  suggestedObjectives: z
    .string()
    .describe('the improved objectives IN FULL, one per line (return the lesson unchanged if the verdict is keep)'),
  suggestedOutline: z
    .string()
    .describe('the improved outline IN FULL: numbered steps with rough minutes (unchanged if the verdict is keep)'),
  rationale: z.string().describe('one or two sentences for the teacher: the overall judgement and why'),
});

export type LessonReview = z.infer<typeof lessonReviewSchema>;
