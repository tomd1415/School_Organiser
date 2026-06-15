// Phase 11 idea 10 slice 2 — the coverage gap-filler. Gathers a scheme's uncovered points + its
// lessons, asks the model (cheap) which lesson best covers each, and maps the answer back to real ids
// for the teacher to confirm. Through the one wrapper; degrades cleanly when AI is off.
import { modelForFeature } from '../repos/settings';
import { callLLMStructured } from '../llm/client';
import { COVERAGE_CHECK_SYSTEM, COVERAGE_CHECK_VERSION, COVERAGE_CHECK_INSTRUCTION, coverageItems } from '../llm/prompts/coverageCheck';
import { coverageCheckSchema } from '../llm/schemas/coverageCheck';
import { schemeCoverage, schemeLessonsDetailed } from '../repos/specPoints';

export interface CoverageSuggestion {
  pointId: number;
  pointLabel: string;
  lessonId: number | null; // null = the model says a new lesson is needed
  lessonLabel: string;
  why: string;
}

export interface SuggestResult {
  status: 'ok' | 'none' | 'unavailable' | 'error';
  suggestions?: CoverageSuggestion[];
  message?: string;
}

const label = (code: string, title: string): string => (code === title ? title : `${code} ${title}`);

export async function suggestCoverage(schemeId: number): Promise<SuggestResult> {
  const coverage = await schemeCoverage(schemeId);
  const uncovered = coverage.filter((c) => !c.covered);
  if (uncovered.length === 0) return { status: 'none', message: 'Everything is already covered — nothing to suggest.' };
  const lessons = await schemeLessonsDetailed(schemeId);

  const r = await callLLMStructured(
    {
      feature: 'coverage_check',
      model: await modelForFeature('coverage_check', 'cheap'),
      promptVersion: COVERAGE_CHECK_VERSION,
      system: COVERAGE_CHECK_SYSTEM,
      context: coverageItems({
        uncovered: uncovered.map((u) => ({ code: u.code, title: u.title })),
        lessons: lessons.map((l, i) => ({ ref: `L${i + 1}`, title: l.title, objectives: l.objectives })),
      }),
      instruction: COVERAGE_CHECK_INSTRUCTION,
      maxTokens: 2000,
    },
    coverageCheckSchema,
  );
  if (r.status !== 'ok' || !r.data) {
    return { status: r.status === 'unavailable' ? 'unavailable' : 'error', message: r.message };
  }

  const byCode = new Map(uncovered.map((u) => [u.code.trim().toLowerCase(), u]));
  const byRef = new Map(lessons.map((l, i) => [`l${i + 1}`, l]));
  // The model sometimes echoes a code WITH its title ("1.1.1 — Binary" or "1.1.1 Binary") instead of
  // the bare code — match the exact code first, else the leading code token, else any code that's a
  // prefix, so a formatted echo no longer silently drops the whole suggestion.
  const resolvePoint = (raw: string): (typeof uncovered)[number] | undefined => {
    const p = (raw ?? '').trim().toLowerCase();
    if (!p) return undefined;
    const exact = byCode.get(p);
    if (exact) return exact;
    const lead = p.split(/[\s—–:-]+/)[0];
    if (lead && byCode.get(lead)) return byCode.get(lead);
    for (const [code, u] of byCode) if (p.startsWith(code)) return u;
    return undefined;
  };
  const seen = new Set<number>();
  const suggestions: CoverageSuggestion[] = [];
  for (const s of r.data.suggestions) {
    const pt = resolvePoint(s.point ?? '');
    if (!pt || seen.has(pt.id)) continue; // ignore unknown/duplicate points
    seen.add(pt.id);
    const lessRef = (s.lesson ?? '').trim().toLowerCase();
    const less = lessRef && lessRef !== 'new' ? byRef.get(lessRef) : undefined;
    suggestions.push({
      pointId: pt.id,
      pointLabel: label(pt.code, pt.title),
      lessonId: less?.id ?? null,
      lessonLabel: less?.title ?? '(needs a new lesson)',
      why: s.why ?? '',
    });
  }
  return { status: 'ok', suggestions };
}
