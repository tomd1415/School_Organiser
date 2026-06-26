// Pure domain logic for per-unit summative assessments (no DB, no AI) — unit-tested.
// Row shapes are returned by repos/assessments.ts; the tree assembly + scoring + per-spec-point
// attribution live here so they can be tested in isolation (mirrors services/scheme.ts buildSchemeTree).
import type { MarkKind } from '../lib/deterministicMarker';

export type AssessmentStyle = 'ks3' | 'gcse';
export type AssessmentStatus = 'draft' | 'ready' | 'archived';
export type ResponseType = 'short_text' | 'medium_text' | 'extended_response' | 'multiple_choice' | 'tick_box' | 'code';

export interface MarkPointRow {
  id: number;
  partId: number;
  displayOrder: number;
  text: string;
  marks: number;
  isRequired: boolean;
  acceptedAlternatives: string[];
  kind: MarkKind;
}
export interface MisconceptionRow {
  id: number;
  partId: number;
  label: string;
  description: string;
}
export interface PartRow {
  id: number;
  questionId: number;
  partLabel: string;
  displayOrder: number;
  prompt: string;
  marks: number;
  expectedResponseType: string;
  partConfig: unknown | null;
  modelAnswer: string | null;
}
export interface QuestionRow {
  id: number;
  assessmentId: number;
  displayOrder: number;
  commandWordCode: string | null;
  archetypeCode: string | null;
  stem: string;
  specPointId: number | null;
  isUncovered: boolean;
  difficultyBand: number | null;
  difficultyStep: number | null;
  marksTotal: number;
  modelAnswer: string | null;
}
export interface AssessmentRow {
  id: number;
  unitId: number;
  schemeId: number;
  courseId: number;
  title: string;
  style: AssessmentStyle;
  examBoard: string | null;
  status: AssessmentStatus;
  marksTotal: number;
  blueprint: unknown;
  sourceType: string;
  promptVersion: string | null;
}

export interface AssessmentPart extends PartRow {
  markPoints: MarkPointRow[];
  misconceptions: MisconceptionRow[];
}
export interface AssessmentQuestion extends QuestionRow {
  parts: AssessmentPart[];
}
export interface AssessmentTree extends AssessmentRow {
  questions: AssessmentQuestion[];
}

/** Assemble the flat rows into the ordered question→part→mark-point/misconception tree. */
export function buildAssessmentTree(
  assessment: AssessmentRow,
  questions: QuestionRow[],
  parts: PartRow[],
  markPoints: MarkPointRow[],
  misconceptions: MisconceptionRow[],
): AssessmentTree {
  const mpByPart = new Map<number, MarkPointRow[]>();
  for (const m of markPoints) (mpByPart.get(m.partId) ?? mpByPart.set(m.partId, []).get(m.partId)!).push(m);
  const miscByPart = new Map<number, MisconceptionRow[]>();
  for (const m of misconceptions) (miscByPart.get(m.partId) ?? miscByPart.set(m.partId, []).get(m.partId)!).push(m);
  const partsByQ = new Map<number, AssessmentPart[]>();
  for (const p of parts) {
    const ap: AssessmentPart = {
      ...p,
      markPoints: (mpByPart.get(p.id) ?? []).slice().sort(byOrder),
      misconceptions: miscByPart.get(p.id) ?? [],
    };
    (partsByQ.get(p.questionId) ?? partsByQ.set(p.questionId, []).get(p.questionId)!).push(ap);
  }
  const qs: AssessmentQuestion[] = questions
    .slice()
    .sort(byOrder)
    .map((q) => ({ ...q, parts: (partsByQ.get(q.id) ?? []).slice().sort(byOrder) }));
  return { ...assessment, questions: qs };
}

const byOrder = (a: { displayOrder: number }, b: { displayOrder: number }): number => a.displayOrder - b.displayOrder;

/** A part is objectively markable (auto-marked, attributable to a spec point) when it has mark points and
 * none is an 'open' (AI-marked) point — same rule as deterministicMarker.isDeterministic. */
export function isObjectivePart(part: AssessmentPart): boolean {
  return part.markPoints.length > 0 && part.markPoints.every((mp) => mp.kind !== 'open');
}

/** One awarded mark, keyed by the answer's part. */
export interface AwardedForPart {
  partId: number;
  marksAwarded: number;
  marksTotal: number;
}

/** Per-spec-point breakdown from OBJECTIVE parts only (defensible, deterministic). Open/exam-style parts
 * contribute to the attempt total + per-question view but are not auto-attributed to a spec point. */
export function computeSpecPointResults(tree: AssessmentTree, awarded: AwardedForPart[]): Map<number, { awarded: number; total: number }> {
  const awardedByPart = new Map<number, AwardedForPart>(awarded.map((a) => [a.partId, a]));
  const partMeta = new Map<number, { specPointId: number | null; objective: boolean }>();
  for (const q of tree.questions) for (const p of q.parts) partMeta.set(p.id, { specPointId: q.specPointId, objective: isObjectivePart(p) });

  const out = new Map<number, { awarded: number; total: number }>();
  for (const [partId, a] of awardedByPart) {
    const meta = partMeta.get(partId);
    if (!meta || !meta.objective || meta.specPointId == null) continue;
    const cur = out.get(meta.specPointId) ?? { awarded: 0, total: 0 };
    cur.awarded += a.marksAwarded;
    cur.total += a.marksTotal;
    out.set(meta.specPointId, cur);
  }
  return out;
}

/** The attempt's score = sum of awarded ÷ sum of total across every answered part (objective + open). */
export function scoreOfAttempt(awarded: AwardedForPart[]): { awarded: number; total: number } {
  return awarded.reduce((acc, a) => ({ awarded: acc.awarded + a.marksAwarded, total: acc.total + a.marksTotal }), { awarded: 0, total: 0 });
}

export interface AssessmentReadiness {
  ok: boolean;
  reasons: string[]; // why it CAN'T be marked ready (empty when ok)
  marksTotal: number; // computed from part marks (the authoritative tariff)
}

/** Can this draft be flipped to `ready`? A paper needs ≥1 question, every part needs ≥1 mark point, and the
 *  total marks must be > 0. Pure → unit-tested; the route uses it both to guard the flip and to render the
 *  "what's missing" note. Marks are computed from the parts (the materialiser's source of truth), not the
 *  stored marks_total, so an un-recomputed tree can't pass on a stale total. */
export function assessmentReadiness(tree: AssessmentTree): AssessmentReadiness {
  const reasons: string[] = [];
  if (tree.questions.length === 0) reasons.push('Add at least one question.');
  let partCount = 0;
  let marksTotal = 0;
  tree.questions.forEach((q, qi) => {
    q.parts.forEach((p) => {
      partCount += 1;
      marksTotal += p.marks || 0;
      if (p.markPoints.length === 0) reasons.push(`Q${qi + 1}${p.partLabel} has no mark points.`);
    });
  });
  if (tree.questions.length > 0 && partCount === 0) reasons.push('Add at least one part.');
  if (marksTotal <= 0) reasons.push('The paper is worth zero marks.');
  return { ok: reasons.length === 0, reasons, marksTotal };
}
