// Structured output for "generate this lesson's resources" — a small, fixed set of ready-to-use
// Markdown documents per lesson, stored in the resource store and linked to the plan.
import * as z from 'zod/v4';

export const lessonResourcesSchema = z.object({
  resources: z
    .array(
      z.object({
        kind: z.string().describe(
          'exactly one of: "slides" (teaching slides), "worksheet" (main pupil task), "support" (scaffolded version), "answers" (teacher answer notes)',
        ),
        title: z.string().describe('short human title, e.g. "Slides — Website building blocks"'),
        content: z.string().describe('the complete Markdown document, ready to use'),
      }),
    )
    .min(1)
    .max(8) // soft-capped to 4 in code — a hard cap here just fails the whole response
    .describe('the lesson resource set, one entry per document (at most 4)'),
});

export type LessonResources = z.infer<typeof lessonResourcesSchema>;

/** Models occasionally stray from the four kinds ("support worksheet", "answer key"…) — a strict
 * enum then fails the WHOLE response, so we accept any string and normalise here instead. */
export function normaliseResourceKind(kind: string): 'slides' | 'worksheet' | 'support' | 'answers' | 'document' {
  const k = kind.toLowerCase().trim();
  if (k.includes('slide')) return 'slides';
  if (k.includes('support') || k.includes('scaffold')) return 'support';
  if (k.includes('answer') || k.includes('mark')) return 'answers';
  if (k.includes('worksheet') || k.includes('task')) return 'worksheet';
  return 'document';
}
