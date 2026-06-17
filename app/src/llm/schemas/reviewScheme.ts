// Phase 12 E2 — schema for the scheme-level (sequence) review: a higher-level second opinion on a
// whole unit's lesson SEQUENCE (coherence, progression, spec-coverage gaps), not a per-lesson rewrite.
import * as z from 'zod/v4';

export const reviewSchemeSchema = z.object({
  verdict: z.enum(['coherent', 'tweak', 'gaps']).describe('coherent = a sound sequence; tweak = minor reorder/balance; gaps = a real coverage or progression gap'),
  findings: z
    .array(z.object({ issue: z.string().describe('one sequence-level issue — a gap, a jump, a missed spec area, poor ordering'), fix: z.string().describe('a concrete fix') }))
    .max(5)
    .describe('at most five, most important first; empty when the sequence is sound'),
  rationale: z.string().describe('a short overall read of the unit as a sequence'),
});

export type ReviewScheme = z.infer<typeof reviewSchemeSchema>;
