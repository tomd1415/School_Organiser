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

import { normaliseResourceKind } from '../src/llm/schemas/lessonResources';

describe('normaliseResourceKind (model kind drift)', () => {
  it('maps stray labels onto the four kinds', () => {
    expect(normaliseResourceKind('slides')).toBe('slides');
    expect(normaliseResourceKind('Support Worksheet')).toBe('support');
    expect(normaliseResourceKind('answer key')).toBe('answers');
    expect(normaliseResourceKind('pupil task sheet')).toBe('worksheet');
    expect(normaliseResourceKind('starter quiz')).toBe('document');
  });
});

import { tidyResourceSet } from '../src/llm/schemas/lessonResources';

describe('tidyResourceSet (cumulative-draft defence)', () => {
  it('keeps only the longest of same-kind cumulative drafts', () => {
    const { docs, missing } = tidyResourceSet([
      { kind: 'slides', title: 'a', content: '## Slide 1' },
      { kind: 'slides', title: 'b', content: '## Slide 1\n## Slide 2' },
      { kind: 'slides', title: 'c', content: '## Slide 1\n## Slide 2\n## Slide 3' },
      { kind: 'worksheet', title: 'w', content: '| Q | A |' },
    ]);
    expect(docs.filter((d) => d.kind === 'slides')).toHaveLength(1);
    expect(docs.find((d) => d.kind === 'slides')!.content).toContain('Slide 3');
    expect(missing).toHaveLength(0);
  });

  it('reports missing core documents', () => {
    const { missing } = tidyResourceSet([{ kind: 'slides', title: 's', content: 'x' }]);
    expect(missing).toEqual(['worksheet']);
  });

  it('drops empty entries', () => {
    const { docs } = tidyResourceSet([
      { kind: 'worksheet', title: 'w', content: '  ' },
      { kind: 'slides', title: 's', content: 'real' },
    ]);
    expect(docs).toHaveLength(1);
  });
});
