import { describe, expect, it } from 'vitest';
import { currentStagePerStrand, overallRollUp, placedPerStrand, suggestEvidence, type ProgCriterion } from '../src/services/progression';

// 16A.1 — the pure Stages & strands roll-up. A criterion is reached when evidenced; a stage is reached for
// a strand when ALL its criteria are; the current stage is the top of the contiguous completed run.

// A GCSE two-strand scheme: Programming (strand 1) and Theory (strand 2), grades 3,4,5 (ordinals), two
// criteria per (strand, grade).
const gcse: ProgCriterion[] = [
  { id: 1, stageOrdinal: 3, strandId: 1 }, { id: 2, stageOrdinal: 3, strandId: 1 },
  { id: 3, stageOrdinal: 4, strandId: 1 }, { id: 4, stageOrdinal: 4, strandId: 1 },
  { id: 5, stageOrdinal: 5, strandId: 1 }, { id: 6, stageOrdinal: 5, strandId: 1 },
  { id: 11, stageOrdinal: 3, strandId: 2 }, { id: 12, stageOrdinal: 3, strandId: 2 },
  { id: 13, stageOrdinal: 4, strandId: 2 }, { id: 14, stageOrdinal: 4, strandId: 2 },
  { id: 15, stageOrdinal: 5, strandId: 2 }, { id: 16, stageOrdinal: 5, strandId: 2 },
];
const stageOf = (res: ReturnType<typeof currentStagePerStrand>, strandId: number) =>
  res.find((s) => s.strandId === strandId)?.stageOrdinal ?? null;

describe('currentStagePerStrand', () => {
  it('null per strand when even the lowest stage is incomplete', () => {
    const res = currentStagePerStrand(gcse, new Set([1])); // only one of grade-3 programming met
    expect(stageOf(res, 1)).toBeNull();
    expect(stageOf(res, 2)).toBeNull();
  });

  it('a strand reaches a grade only when ALL its criteria are evidenced (independent strands)', () => {
    // Programming: grades 3 + 4 complete (5 not); Theory: only grade 3 complete.
    const ev = new Set([1, 2, 3, 4, /* 5,6 missing */ 11, 12 /* 13.. missing */]);
    const res = currentStagePerStrand(gcse, ev);
    expect(stageOf(res, 1)).toBe(4); // Programming at grade 4
    expect(stageOf(res, 2)).toBe(3); // Theory at grade 3 — strands advance independently
  });

  it('stops at a GAP (contiguity): grade 5 complete but grade 4 not ⇒ current is grade 3', () => {
    const ev = new Set([1, 2, /* grade 4 (3,4) missing */ 5, 6]); // programming
    expect(stageOf(currentStagePerStrand(gcse, ev), 1)).toBe(3);
  });

  it('tops out at the highest grade when everything is evidenced', () => {
    const all = new Set(gcse.map((c) => c.id));
    const res = currentStagePerStrand(gcse, all);
    expect(stageOf(res, 1)).toBe(5);
    expect(stageOf(res, 2)).toBe(5);
  });
});

describe('currentStagePerStrand — long year ladder', () => {
  // One strand, stages 6..14 (the year ladder), one criterion each.
  const ladder: ProgCriterion[] = Array.from({ length: 9 }, (_, i) => ({ id: 100 + i, stageOrdinal: 6 + i, strandId: 7 }));
  it('places a pupil at their highest contiguous completed stage', () => {
    const ev = new Set([100, 101, 102, 103, 104, 105, 106]); // stages 6..12 complete (Year-7-ish floor at 12)
    expect(stageOf(currentStagePerStrand(ladder, ev), 7)).toBe(12);
  });
  it('a stage with no criteria for the strand is transparent (does not block higher)', () => {
    // remove stage 9's criterion (id 103) entirely — stage 9 simply isn't graded for this strand
    const sparse = ladder.filter((c) => c.id !== 103);
    const ev = new Set([100, 101, 102, /* no 103 */ 104, 105]); // 6,7,8 then 10,11
    expect(stageOf(currentStagePerStrand(sparse, ev), 7)).toBe(11);
  });
});

describe('overallRollUp', () => {
  it('averages the per-strand ordinals and rounds', () => {
    expect(overallRollUp([{ strandId: 1, stageOrdinal: 5 }, { strandId: 2, stageOrdinal: 4 }]).overallOrdinal).toBe(5); // 4.5 → 5
    expect(overallRollUp([{ strandId: 1, stageOrdinal: 4 }, { strandId: 2, stageOrdinal: 4 }])).toEqual({ overallOrdinal: 4, source: 'computed' });
  });

  it('a year-end overall assessment anchors/overrides the computed mean', () => {
    const r = overallRollUp([{ strandId: 1, stageOrdinal: 5 }, { strandId: 2, stageOrdinal: 5 }], { yearAssessmentOrdinal: 4 });
    expect(r).toEqual({ overallOrdinal: 4, source: 'year_assessment' });
  });

  it('excludes not-on-the-ladder strands by default, or floors them with nullAs', () => {
    const perStrand = [{ strandId: 1, stageOrdinal: 6 }, { strandId: 2, stageOrdinal: null }];
    expect(overallRollUp(perStrand).overallOrdinal).toBe(6); // null strand excluded
    expect(overallRollUp(perStrand, { nullAs: 4 }).overallOrdinal).toBe(5); // (6+4)/2 = 5
  });

  it('null overall when nothing is reached and no anchor', () => {
    expect(overallRollUp([{ strandId: 1, stageOrdinal: null }]).overallOrdinal).toBeNull();
    expect(overallRollUp([]).overallOrdinal).toBeNull();
  });
});

describe('suggestEvidence (16A.4 — auto-suggest from mastered spec points)', () => {
  const links = [
    { criterionId: 10, specPointId: 100 },
    { criterionId: 11, specPointId: 100 }, // same spec point → both criteria candidates
    { criterionId: 12, specPointId: 200 },
    { criterionId: 13, specPointId: 300 },
  ];
  it('suggests criteria linked to mastered spec points', () => {
    expect(suggestEvidence(new Set([100]), links, new Set()).sort()).toEqual([10, 11]);
  });
  it('excludes already-evidenced criteria', () => {
    expect(suggestEvidence(new Set([100, 200]), links, new Set([10])).sort()).toEqual([11, 12]);
  });
  it('ignores spec points that were not mastered', () => {
    expect(suggestEvidence(new Set([300]), links, new Set())).toEqual([13]);
    expect(suggestEvidence(new Set([999]), links, new Set())).toEqual([]);
  });
  it('dedupes a criterion linked to several mastered spec points', () => {
    const multi = [{ criterionId: 20, specPointId: 1 }, { criterionId: 20, specPointId: 2 }];
    expect(suggestEvidence(new Set([1, 2]), multi, new Set())).toEqual([20]);
  });
});

describe('placedPerStrand (16A.8 — per-unit stage placement record)', () => {
  const unit: ProgCriterion[] = [
    { id: 1, stageOrdinal: 12, strandId: 7 }, { id: 2, stageOrdinal: 12, strandId: 7 },
    { id: 3, stageOrdinal: 12, strandId: 8 },
  ];
  it('reshapes the roll-up into {strandId: ordinal|null}', () => {
    expect(placedPerStrand(unit, new Set([1, 2, 3]))).toEqual({ 7: 12, 8: 12 });
    expect(placedPerStrand(unit, new Set([1, 3]))).toEqual({ 7: null, 8: 12 }); // strand 7 incomplete
  });
});
