import { describe, expect, it } from 'vitest';
import { curriculumHistoryItems } from '../src/llm/prompts/curriculumHistory';

describe('curriculumHistoryItems (history-aware scheme authoring)', () => {
  it('formats prior schemes and class coverage as two labelled items', () => {
    const items = curriculumHistoryItems({
      priorSchemes: [{ title: 'Computer Skills — SoW', version: 2, active: true, unitTitles: ['Files', 'Email', 'Spreadsheets'] }],
      classCoverage: [
        { groupName: '8ARO', yearGroup: 'Y8', coveredCount: 23, recentCovered: ['SUM formulas', 'Formatting'] },
        { groupName: '7NEW', yearGroup: 'Y7', coveredCount: 0, recentCovered: [] },
      ],
    });
    expect(items).toHaveLength(2);
    expect(items[0]!.text).toContain('EXISTING SCHEMES');
    expect(items[0]!.text).toContain('Files · Email · Spreadsheets');
    expect(items[1]!.text).toContain('CLASS HISTORY');
    expect(items[1]!.text).toContain('8ARO (Y8): 23 lessons');
    expect(items[1]!.text).not.toContain('7NEW'); // nothing covered → not listed
  });

  it('empty history injects nothing (new courses behave as before)', () => {
    expect(curriculumHistoryItems({ priorSchemes: [], classCoverage: [] })).toHaveLength(0);
    expect(
      curriculumHistoryItems({ priorSchemes: [], classCoverage: [{ groupName: 'X', yearGroup: null, coveredCount: 0, recentCovered: [] }] }),
    ).toHaveLength(0);
  });
});
