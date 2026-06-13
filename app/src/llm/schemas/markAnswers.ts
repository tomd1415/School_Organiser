// Structured output for "mark the class's open answers to ONE question" (Phase 9.3). The batch is
// anonymous: answers are slot-lettered (A, B, C…) and the slot→pupil map never leaves the server.
import * as z from 'zod/v4';

export const markAnswersSchema = z.object({
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

export type MarkAnswersResult = z.infer<typeof markAnswersSchema>;
