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
        content: z.string().describe(
          'the COMPLETE Markdown document, ready to use. Return EXACTLY ONE entry per kind: the "slides" ' +
            'entry must contain ALL the slides in this single content (multiple `## ` slide headings) — do NOT ' +
            'return one entry per slide, or several "slides" entries. Never a partial or progressive draft, ' +
            'never content repeated from another entry',
        ),
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

export interface TidyResource {
  kind: 'slides' | 'worksheet' | 'support' | 'answers' | 'document';
  title: string;
  content: string;
}

/** Merge same-kind entries into ONE document per kind. Two model pathologies are seen in the wild and
 * BOTH must be handled or a deck silently loses slides:
 *   - cumulative drafts: several same-kind entries, each a fuller version of one doc → keep the superset.
 *   - split pieces: one slide (or section) PER entry → these must be CONCATENATED, not dropped.
 * Earlier this kept only the LONGEST entry per kind, which turned a multi-slide deck returned as
 * one-slide-per-entry into a single slide (the reported bug). We now drop entries wholly contained in
 * a longer one (draft fragments) and join the remaining distinct pieces with a blank line — slides
 * split on `## ` headings, so each piece's heading survives and the whole deck is rebuilt. */
export function mergeResourceContents(contents: string[]): string {
  const trimmed = contents.map((c) => c.trim()).filter(Boolean);
  // Drop a cumulative-draft fragment: an earlier draft is a PREFIX of a fuller later one (drafts grow by
  // appending). Using startsWith — not includes — avoids dropping a DISTINCT slide whose text merely
  // appears verbatim inside a longer slide (data loss is worse than the rare duplicate).
  const kept = trimmed.filter((c, i) => !trimmed.some((o, j) => j !== i && o.length > c.length && o.startsWith(c)));
  const seen = new Set<string>();
  return kept.filter((c) => (seen.has(c) ? false : (seen.add(c), true))).join('\n\n');
}

/** Clean the model's resource set: merge per kind (see mergeResourceContents), drop empties, cap at 4.
 * Returns the cleaned set plus which core documents are missing entirely (caller may retry once). */
export function tidyResourceSet(resources: Array<{ kind: string; title: string; content: string }>): {
  docs: TidyResource[];
  missing: string[];
} {
  const contentsByKind = new Map<string, string[]>();
  const titleByKind = new Map<string, string>();
  for (const r of resources) {
    if (!r.content?.trim()) continue;
    const kind = normaliseResourceKind(r.kind);
    const arr = contentsByKind.get(kind) ?? [];
    arr.push(r.content);
    contentsByKind.set(kind, arr);
    if (!titleByKind.has(kind)) titleByKind.set(kind, r.title);
  }
  // Keep the four core kinds ahead of any stray 'document' before the cap, so an extra entry is what
  // gets dropped — never slides/worksheet. Then compute `missing` from the kept docs (not the raw map),
  // so we can never report a set complete while the slice has silently dropped a core document.
  const CORE = ['slides', 'worksheet', 'support', 'answers'];
  const rank = (k: string): number => (CORE.indexOf(k) === -1 ? CORE.length : CORE.indexOf(k));
  const docs: TidyResource[] = [...contentsByKind.entries()]
    .sort((a, b) => rank(a[0]) - rank(b[0]))
    .slice(0, 4)
    .map(([kind, contents]) => ({
      kind: kind as TidyResource['kind'],
      title: titleByKind.get(kind) ?? kind,
      content: mergeResourceContents(contents),
    }));
  const have = new Set<string>(docs.map((d) => d.kind));
  const missing = ['slides', 'worksheet'].filter((k) => !have.has(k));
  return { docs, missing };
}
