// Structured output for "derive a mark scheme from this worksheet + answers" (Phase 9.1).
import * as z from 'zod/v4';
import type { MarkKind } from '../../lib/deterministicMarker';

export const markSchemeSchema = z.object({
  points: z
    .array(
      z.object({
        fieldKey: z.string().describe('the EXACT field key given in the FIELDS list, e.g. "t2.r1.c2" or "task.3"'),
        kind: z
          .string()
          .describe('one of: tick, choice, exact, numeric, keyword, open. Use "open" for extended/explain answers that need judgement; "exact" for one short right answer; "keyword" when any of several key words earns the mark; "numeric" for a number; "choice" for multiple-choice; "tick" for a success-checklist item'),
        expected: z.string().describe('the creditworthy answer or mark-point, concise. For keyword, the single key word; for open, the marking guidance'),
        alternatives: z.array(z.string()).describe('other accepted answers/spellings/word-forms (e.g. "processor" for "CPU", "four" for "4")'),
        marks: z.number().int().min(0).max(10).describe('marks this point is worth (usually 1)'),
        required: z.boolean().describe('true if this point must be present for any credit'),
      }),
    )
    .describe('one or more mark points per answerable field; several keyword points can share a field key'),
});

export type DerivedScheme = z.infer<typeof markSchemeSchema>;

const KINDS: MarkKind[] = ['tick', 'choice', 'exact', 'numeric', 'keyword', 'open'];
export function normaliseMarkKind(kind: string): MarkKind {
  const k = (kind ?? '').toLowerCase().trim();
  if (KINDS.includes(k as MarkKind)) return k as MarkKind;
  if (k.includes('open') || k.includes('extend') || k.includes('explain')) return 'open';
  if (k.includes('num')) return 'numeric';
  if (k.includes('key')) return 'keyword';
  if (k.includes('choice') || k.includes('multiple')) return 'choice';
  if (k.includes('tick') || k.includes('check')) return 'tick';
  return 'exact';
}
