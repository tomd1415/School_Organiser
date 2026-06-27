// Phase 16A.1 — the pure Stages & strands roll-up. Given a scheme's criteria (each tagged with its stage
// ordinal + strand) and the set of criterion ids a pupil has evidenced, compute the pupil's CURRENT STAGE
// PER STRAND and an OVERALL roll-up. Kept pure (no DB) so the heat-map, the per-pupil ladder and lesson
// targeting all read one tested source; the roll-up is computed (never stored) to avoid a stale-cache class
// of bug. No pupil identity flows through here as anything but an opaque evidence set — no AI, no PII shape.

export interface ProgCriterion {
  id: number;
  stageOrdinal: number; // the criterion's stage (prog_stages.ordinal)
  strandId: number;
}

export interface StrandStage {
  strandId: number;
  stageOrdinal: number | null; // null = not yet on the ladder for this strand (lowest stage not complete)
}

/**
 * A pupil's current stage in each strand: the highest stage (by ordinal) whose criteria are ALL evidenced,
 * such that every LOWER stage that has criteria for the strand is also complete (a ladder is climbed in
 * order — you are at the top of the contiguous completed run from the bottom). Stages with no criteria for
 * a strand are transparent: they neither block nor can be the reported current stage. A strand whose lowest
 * graded stage is incomplete is `null` (not yet on the ladder).
 */
export function currentStagePerStrand(criteria: ProgCriterion[], evidenced: ReadonlySet<number>): StrandStage[] {
  const byStrand = new Map<number, Map<number, ProgCriterion[]>>();
  for (const c of criteria) {
    let stages = byStrand.get(c.strandId);
    if (!stages) {
      stages = new Map();
      byStrand.set(c.strandId, stages);
    }
    const list = stages.get(c.stageOrdinal) ?? [];
    list.push(c);
    stages.set(c.stageOrdinal, list);
  }
  const out: StrandStage[] = [];
  for (const [strandId, stages] of byStrand) {
    const ordinals = [...stages.keys()].sort((a, b) => a - b);
    let current: number | null = null;
    for (const ord of ordinals) {
      const allMet = stages.get(ord)!.every((c) => evidenced.has(c.id));
      if (!allMet) break; // contiguity stops at the first incomplete stage
      current = ord;
    }
    out.push({ strandId, stageOrdinal: current });
  }
  return out;
}

export interface SpecLink {
  criterionId: number;
  specPointId: number;
}

/**
 * 16A.4 — auto-suggest evidence from marking (NO AI; reads only already-computed in-app spec-point results).
 * Given the spec points a pupil has MASTERED, the criterion↔spec-point links, and what they've already
 * evidenced, return the criterion ids to SUGGEST (deduped, excluding already-evidenced). The teacher
 * confirms before any of these is written — never auto-applied.
 */
export function suggestEvidence(
  masteredSpecPointIds: ReadonlySet<number>,
  links: SpecLink[],
  evidenced: ReadonlySet<number>,
): number[] {
  const out: number[] = [];
  const seen = new Set<number>();
  for (const l of links) {
    if (!masteredSpecPointIds.has(l.specPointId)) continue;
    if (evidenced.has(l.criterionId) || seen.has(l.criterionId)) continue;
    seen.add(l.criterionId);
    out.push(l.criterionId);
  }
  return out;
}

export interface OverallRollUp {
  overallOrdinal: number | null;
  source: 'computed' | 'year_assessment';
}

export interface RollUpOptions {
  // A year-end overall assessment confirms/overrides the computed average (the anchor — Phase 16A.5).
  yearAssessmentOrdinal?: number | null;
  // What a not-yet-on-the-ladder strand (stageOrdinal === null) counts as in the average. When omitted,
  // null strands are EXCLUDED from the mean (overall reflects only strands the pupil is on); pass a number
  // (e.g. the scheme's lowest ordinal minus one) to have weak strands drag the overall down.
  nullAs?: number | null;
}

/**
 * The overall roll-up across strands: the rounded mean of the per-strand stage ordinals — unless a year-end
 * overall assessment is supplied, which anchors/overrides it. Returns `null` when nothing can be computed
 * (no strand on the ladder and no anchor).
 */
export function overallRollUp(perStrand: StrandStage[], opts: RollUpOptions = {}): OverallRollUp {
  if (opts.yearAssessmentOrdinal != null) {
    return { overallOrdinal: opts.yearAssessmentOrdinal, source: 'year_assessment' };
  }
  const vals: number[] = [];
  for (const s of perStrand) {
    const v = s.stageOrdinal ?? opts.nullAs ?? null;
    if (v != null) vals.push(v);
  }
  if (vals.length === 0) return { overallOrdinal: null, source: 'computed' };
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
  return { overallOrdinal: Math.round(mean), source: 'computed' };
}
