import { describe, expect, it } from 'vitest';
import { assembleBlueprint } from '../src/services/assessmentBlueprint';

// Phase 1 — the PURE blueprint core: partition covered/uncovered + map exam stage → style/board. No DB.

const specPoints = [
  { id: 1, code: '1.1', title: 'A' },
  { id: 2, code: '1.2', title: 'B' },
  { id: 3, code: '1.3', title: 'C' },
];

const base = {
  unitId: 9,
  schemeId: 3,
  courseId: 2,
  unitTitle: 'Networks',
  courseName: 'GCSE CS',
  examProfileLabel: 'a GCSE class',
  groupCourseId: 5,
  lessonTitles: ['Topologies'],
  lessonObjectives: ['Describe a star topology'],
} as const;

describe('assembleBlueprint', () => {
  it('partitions covered/uncovered and intersects with the course spec points', () => {
    const b = assembleBlueprint({ ...base, specPoints, coveredSpecPointIds: [1, 3, 999], examStage: 'gcse' });
    expect(b.specPoints.map((s) => [s.code, s.covered])).toEqual([
      ['1.1', true],
      ['1.2', false],
      ['1.3', true],
    ]);
    expect(b.coveredCount).toBe(2);
    expect(b.uncoveredCount).toBe(1);
    expect(b.groupCourseId).toBe(5);
  });

  it('gcse stage → style gcse + OCR J277 board', () => {
    const b = assembleBlueprint({ ...base, specPoints, coveredSpecPointIds: [], examStage: 'gcse' });
    expect(b.style).toBe('gcse');
    expect(b.examBoard).toBe('OCR J277');
  });

  it('foundational stage → style ks3 + no board', () => {
    const b = assembleBlueprint({ ...base, specPoints: [], coveredSpecPointIds: [], examStage: 'foundational' });
    expect(b.style).toBe('ks3');
    expect(b.examBoard).toBeNull();
    expect(b.specPoints).toEqual([]);
    expect(b.coveredCount).toBe(0);
    expect(b.uncoveredCount).toBe(0);
  });

  it('building / gcse / exam-soon stages all map to gcse', () => {
    for (const examStage of ['building', 'gcse', 'exam-soon'] as const) {
      expect(assembleBlueprint({ ...base, specPoints, coveredSpecPointIds: [], examStage }).style).toBe('gcse');
    }
  });

  it('zero covered → every point uncovered, still a valid blueprint', () => {
    const b = assembleBlueprint({ ...base, specPoints, coveredSpecPointIds: [], examStage: 'gcse' });
    expect(b.coveredCount).toBe(0);
    expect(b.uncoveredCount).toBe(3);
  });
});
