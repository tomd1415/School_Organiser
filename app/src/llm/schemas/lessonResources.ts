// Structured output for "generate this lesson's resources" — a small, fixed set of ready-to-use
// Markdown documents per lesson, stored in the resource store and linked to the plan.
import * as z from 'zod/v4';

export const lessonResourcesSchema = z.object({
  resources: z
    .array(
      z.object({
        kind: z.string().describe(
          'exactly one of: "slides" (level-differentiated teaching slides), "worksheet" (the PUPIL task sheet — no TA notes or answers in it), "ta_notes" (separate teaching-assistant/teacher guidance + answers, never shown to pupils), "answers" (concise teacher answer notes)',
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

// NB: the slide deck is NOT one of these four documents. It is generated separately as a PLAIN-TEXT
// completion (services/slideGen.ts → generateLessonDeck) and overrides whatever deck this four-doc call
// returns. Reason: the four-doc call reliably under-invests in the deck (a 2–3 slide stub — the "only
// the first couple of slides" bug), and forcing the deck into a single JSON string field makes it WORSE
// (a 1-slide stub, structured-output brevity bias). Free-text generation returns the whole deck.

/** Models occasionally stray from the four kinds ("support worksheet", "answer key"…) — a strict
 * enum then fails the WHOLE response, so we accept any string and normalise here instead. */
export function normaliseResourceKind(kind: string): 'slides' | 'worksheet' | 'support' | 'answers' | 'ta_notes' | 'document' {
  const k = kind.toLowerCase().trim();
  if (k.includes('slide')) return 'slides';
  // TA/teacher guidance — check before "answers" (TA notes contain the answers). \bta\b matches
  // "ta notes"/"ta guidance"; the underscore form is matched explicitly (\b doesn't split ta_notes).
  if (/\bta\b/.test(k) || k.includes('ta_notes') || k.includes('teaching assistant')) return 'ta_notes';
  if (k.includes('support') || k.includes('scaffold')) return 'support';
  if (k.includes('answer') || k.includes('mark')) return 'answers';
  if (k.includes('worksheet') || k.includes('task')) return 'worksheet';
  return 'document';
}

export interface TidyResource {
  kind: 'slides' | 'worksheet' | 'support' | 'answers' | 'ta_notes' | 'document';
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
  const CORE = ['slides', 'worksheet', 'ta_notes', 'answers'];
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

// ── Completeness check ───────────────────────────────────────────────────────────────────────────
// A resource set can PARSE cleanly (every kind present, so tidyResourceSet reports nothing missing)
// yet still be DEFICIENT in ways the teacher only spots later: the worksheet missing its 🔴 Challenge
// tier, the deck a 2–3 slide stub with no level sections, an empty answers doc. The four-doc call shares
// one token budget across all of slides/worksheet/ta_notes/answers and reliably under-invests in the
// LATER documents (the same pathology slideGen.ts already splits the deck out to fix), so a "completed"
// run can quietly ship a thin Core/Challenge. assessResourceSet inspects the STRUCTURE of each document
// and reports which ones are deficient so the job can regenerate exactly those — never a name, never AI.
export type ResourceKind = 'slides' | 'worksheet' | 'ta_notes' | 'answers';
export interface ResourceIssue {
  kind: ResourceKind;
  problem: string; // human-readable, for the job's status line
}
export interface ResourceAssessment {
  complete: boolean;
  issues: ResourceIssue[];
  regenerate: ResourceKind[]; // distinct kinds to re-run, slides/worksheet first (most important to pupils)
}

// Lenient floors — these catch GROSS deficiencies (a missing tier, a stub deck, an empty doc), not
// stylistic thinness, so a legitimately short-but-complete document is never flagged.
const MIN_DOC_CHARS = 20; // a ta_notes/answers doc with less than this is effectively empty
const MIN_TIER_BODY_CHARS = 40; // a worksheet level (🟢/🟡/🔴) with less body than this is a stub/truncated
const MIN_SLIDE_COUNT = 5; // a real differentiated deck is 14–24 slides; fewer than this is the stub bug

/** The body text under a `## ` worksheet TIER heading, sliced to the NEXT tier heading (not the next
 *  `## ` — a tier may itself contain `## `-level blocks). Keyed on the tier emoji in the heading line.
 *  Returns null when that tier's heading is absent entirely. */
function worksheetTierBodies(content: string): Record<'support' | 'core' | 'challenge', string | null> {
  const norm = content.replace(/\r\n/g, '\n');
  const tiers: Array<['support' | 'core' | 'challenge', string]> = [
    ['support', '🟢'],
    ['core', '🟡'],
    ['challenge', '🔴'],
  ];
  const found = tiers
    .map(([tier, emoji]) => {
      const m = new RegExp(`^##\\s+.*${emoji}`, 'm').exec(norm); // the emoji on a depth-2 heading line
      return m ? { tier, idx: m.index } : null;
    })
    .filter((x): x is { tier: 'support' | 'core' | 'challenge'; idx: number } => x !== null)
    .sort((a, b) => a.idx - b.idx);
  const bodies: Record<'support' | 'core' | 'challenge', string | null> = { support: null, core: null, challenge: null };
  for (let i = 0; i < found.length; i++) {
    const start = found[i]!.idx;
    const end = i + 1 < found.length ? found[i + 1]!.idx : norm.length;
    bodies[found[i]!.tier] = norm.slice(start, end).replace(/^##.*\n?/, '').trim(); // drop the heading line
  }
  return bodies;
}

/** The number of slides a teacher would actually see — the deck splits on depth-2 `## ` headings. */
function slideCount(content: string): number {
  return content
    .replace(/\r\n/g, '\n')
    .split(/\n(?=##\s)/)
    .filter((s) => /^##\s/.test(s.trim()))
    .length;
}

/** Inspect a tidied resource set for structural completeness (see the block comment above). Pure —
 *  no AI, no DB. The caller regenerates `regenerate` (its dedicated per-document call) and re-checks. */
export function assessResourceSet(docs: TidyResource[]): ResourceAssessment {
  const by = new Map<string, TidyResource>(docs.map((d) => [d.kind, d]));
  const issues: ResourceIssue[] = [];

  // 1. Every kind must be present and non-empty.
  for (const kind of ['slides', 'worksheet', 'ta_notes', 'answers'] as ResourceKind[]) {
    const d = by.get(kind);
    if (!d || !d.content.trim()) issues.push({ kind, problem: `${kind} is missing` });
  }

  // 2. Worksheet — all three differentiation tiers present, each with real content.
  const ws = by.get('worksheet');
  if (ws && ws.content.trim()) {
    const bodies = worksheetTierBodies(ws.content);
    const tierLabels: Array<['support' | 'core' | 'challenge', string]> = [
      ['support', '🟢 Support'],
      ['core', '🟡 Core'],
      ['challenge', '🔴 Challenge'],
    ];
    for (const [tier, label] of tierLabels) {
      const body = bodies[tier];
      if (body == null) issues.push({ kind: 'worksheet', problem: `worksheet missing the ${label} tier` });
      else if (body.length < MIN_TIER_BODY_CHARS) issues.push({ kind: 'worksheet', problem: `worksheet ${label} tier is too thin (likely truncated)` });
    }
  }

  // 3. Slides — all three level dividers present (depth-1 `# `) and not a stub.
  const slides = by.get('slides');
  if (slides && slides.content.trim()) {
    for (const [emoji, label] of [
      ['🟢', '🟢 Support'],
      ['🟡', '🟡 Core'],
      ['🔴', '🔴 Challenge'],
    ] as const) {
      if (!new RegExp(`^#\\s+.*${emoji}`, 'm').test(slides.content)) {
        issues.push({ kind: 'slides', problem: `deck missing the ${label} level section` });
      }
    }
    if (slideCount(slides.content) < MIN_SLIDE_COUNT) issues.push({ kind: 'slides', problem: 'deck is only a stub (too few slides)' });
  }

  // 4. ta_notes / answers — present-but-trivial is as bad as absent.
  for (const kind of ['ta_notes', 'answers'] as ResourceKind[]) {
    const d = by.get(kind);
    if (d && d.content.trim() && d.content.trim().length < MIN_DOC_CHARS) issues.push({ kind, problem: `${kind} is too short to be usable` });
  }

  // Distinct kinds to regenerate, slides/worksheet first (they matter most to pupils).
  const order: ResourceKind[] = ['slides', 'worksheet', 'ta_notes', 'answers'];
  const regenerate = order.filter((k) => issues.some((i) => i.kind === k));
  return { complete: issues.length === 0, issues, regenerate };
}
