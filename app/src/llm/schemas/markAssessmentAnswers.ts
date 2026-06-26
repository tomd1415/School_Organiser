// Structured output for marking a summative assessment answer against its mark scheme (Phase 4). The batch
// is anonymous — answers are slot-lettered (A, B, C…) and the slot→answer map never leaves the server.
// Same shape as schemas/markAnswers.ts (the lesson marker); kept as its own module per the assessment plan.
import * as z from 'zod/v4';

export const markAssessmentAnswersSchema = z.object({
  results: z
    .array(
      z.object({
        slot: z.string().describe('the answer slot letter exactly as given (A, B, C, …)'),
        marksAwarded: z.number().int().min(0).describe('marks awarded to this answer (0..marksTotal)'),
        evidence: z.string().describe('a SHORT quote copied verbatim FROM THIS ANSWER that justifies the marks (empty if 0)'),
        confidence: z.number().min(0).max(1).describe('your confidence 0.00–1.00'),
        feedback: z.string().describe('one short, kind pupil-facing line: what was good / what to add (≤140 chars)'),
      }),
    )
    .describe('one result per answer slot, in any order'),
});

export type MarkAssessmentAnswersResult = z.infer<typeof markAssessmentAnswersSchema>;
