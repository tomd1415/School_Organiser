// Structured output for "generate a summative end-of-unit assessment" (Phase 1). The shape mirrors the
// Phase-0 DraftQuestion contract in repos/assessments.ts so the validator (services/assessmentValidate.ts)
// maps near-1:1 into materialiseAssessment. `kind` / `responseType` are kept as loose strings here (with
// the allowed set in .describe) and are normalised/restricted in the PURE validator — the single point of
// enforcement, so the model can't widen the DB's widget/mark-kind sets and a hand-built test object can
// still exercise the normalisation. Heavy .describe() use: the SDK surfaces these to the model.
import * as z from 'zod/v4';

// The launch widget set + objective mark-kinds, named here for the prompt's .describe() text only — the
// validator owns the actual restriction (services/assessmentValidate.ts).
export const RESPONSE_TYPES = ['short_text', 'medium_text', 'extended_response', 'multiple_choice', 'tick_box', 'code'] as const;
export const MARK_KINDS = ['tick', 'choice', 'exact', 'numeric', 'keyword', 'open'] as const; // = deterministicMarker.MarkKind

export const generateAssessmentSchema = z.object({
  questions: z
    .array(
      z.object({
        specPointCode: z
          .string()
          .nullable()
          .describe('the EXACT spec-point code this question targets, copied from the provided list; null only for a general/KS3 question with no spec point'),
        isUncovered: z.boolean().describe('true if this targets a NOT-yet-taught spec point (a clearly-flagged stretch question)'),
        commandWord: z.string().nullable().describe('command word, e.g. "state","describe","explain","analyse"; null for a KS3 recall question'),
        archetype: z.string().nullable().describe('a short archetype code, free text (e.g. "define","trace","compare"); null if none'),
        difficultyBand: z.number().int().min(1).max(9).nullable().describe('rough difficulty 1 (easiest) – 9 (hardest); null if unsure'),
        difficultyStep: z.number().int().min(1).max(3).nullable().describe('fine step 1–3 within the band; null if unsure'),
        stem: z.string().describe('the question stem/context shared by its parts (may be empty when each part is self-contained)'),
        modelAnswer: z.string().nullable().describe('a model answer for the whole question, or null when each part carries its own'),
        parts: z
          .array(
            z.object({
              partLabel: z.string().describe('"a","b","i"… — the part label within the question'),
              prompt: z.string().describe('what the pupil is asked to do for this part'),
              marks: z.number().int().min(0).max(20).describe('the marks this part is worth'),
              responseType: z
                .string()
                .describe('one of: short_text, medium_text, extended_response, multiple_choice, tick_box, code — the answer widget'),
              options: z.array(z.string()).describe('the choices for multiple_choice/tick_box; [] for every other responseType'),
              modelAnswer: z.string().nullable().describe('a model answer for this part, or null'),
              markPoints: z
                .array(
                  z.object({
                    text: z.string().describe('one discrete creditworthy point (or marking guidance for an "open" point)'),
                    marks: z.number().int().min(0).max(20).describe('marks this point is worth (usually 1)'),
                    required: z.boolean().describe('true if this point must be present for any credit'),
                    acceptedAlternatives: z.array(z.string()).describe('other accepted answers/spellings/word-forms'),
                    kind: z
                      .string()
                      .describe('one of: tick, choice, exact, numeric, keyword, open. Objective kinds auto-mark; "open" is AI-marked (use it for extended/explain answers needing judgement)'),
                  }),
                )
                .describe('the discrete markable atoms for this part; ≥1 per part; Σ marks should equal the part marks'),
              misconceptions: z
                .array(z.object({ label: z.string(), description: z.string() }))
                .describe('common misconceptions a marker should watch for (may be [])'),
            }),
          )
          .min(1)
          .describe('the parts of this question, in order; at least one'),
      }),
    )
    .min(1)
    .describe('the questions of the paper, in teaching/marks order; at least one'),
});

export type GeneratedAssessment = z.infer<typeof generateAssessmentSchema>;
