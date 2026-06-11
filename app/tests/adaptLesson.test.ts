import { describe, expect, it } from 'vitest';
import { adaptLessonInstruction, historyItems, lessonItem } from '../src/llm/prompts/adaptLesson';
import { withholdSafeguarding } from '../src/services/redact';
import type { GroupHistoryEntry } from '../src/repos/adaptations';

const history: GroupHistoryEntry[] = [
  {
    date: '2026-06-03',
    stoppingPoint: 'slide 9, half way through the card sort',
    planTitle: 'Networks L2',
    notes: [
      { body: 'card sort overran, class needed a movement break', safeguarding: false },
      { body: 'disclosure recorded — see DSL', safeguarding: true },
    ],
  },
  { date: '2026-05-27', stoppingPoint: null, planTitle: null, notes: [] },
];

describe('adapt-lesson prompt builders (5.5)', () => {
  it('historyItems keeps each note separate with its safeguarding flag', () => {
    const items = historyItems(history);
    // frame + 2 notes for the first entry, frame only for the second
    expect(items.length).toBe(4);
    expect(items[0]!.text).toContain('2026-06-03');
    expect(items[0]!.text).toContain('slide 9');
    expect(items[1]!.safeguarding).toBeFalsy();
    expect(items[2]!.safeguarding).toBe(true);
  });

  it('safeguarding-flagged notes are withheld entirely by the boundary', () => {
    const kept = withholdSafeguarding(historyItems(history));
    expect(kept.some((i) => i.text.includes('DSL'))).toBe(false);
    expect(kept.some((i) => i.text.includes('card sort overran'))).toBe(true);
  });

  it('lessonItem marks whether the master or the group version is being revised', () => {
    expect(lessonItem('T', 'obj', 'out', false).text).toContain('master version');
    expect(lessonItem('T', 'obj', 'out', true).text).toContain('already adapted for this class');
  });

  it('instruction names the course and class only (no pupil content)', () => {
    const s = adaptLessonInstruction('Computing Curriculum', '8PFA');
    expect(s).toContain('Computing Curriculum');
    expect(s).toContain('8PFA');
  });
});
