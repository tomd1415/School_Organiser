import { describe, expect, it } from 'vitest';
import { parseProgressionDoc } from '../src/services/progressionParse';

// 16A.2 — the year-ladder source parser. Fixture mirrors the real doc's grammar (stage / strand / unit /
// objective with optional also-strands / indented "I can…" criteria).
const fixture = `# Computing progression

| **Stage 6** | Year 1 · age 5–6 | KS1 |

## Stage 6 — Year 1 · age 5–6 (KS1)

*36 learning objectives · 108 "I can…" success criteria.*

### Computing systems (CS)
**Computing systems and networks – Technology around us**

- **To identify technology**  *(also: IT)*
    - I can explain how these technology examples help us
    - I can locate examples of technology in the classroom
- **To identify a computer and its main parts**
    - I can name the main parts of a computer

### Programming (PG)
**Programming A – Moving a robot**

- **To combine forwards and backwards commands**
    - I can compare forwards and backwards movements

## Stage 7 — Year 2 · age 6–7 (KS1)

### Programming (PG)
**Programming B – An introduction to quizzes**

- **To explain that projects can have code and artwork**  *(also: DD, PG)*
    - I can add artwork to my project
`;

describe('parseProgressionDoc', () => {
  const stages = parseProgressionDoc(fixture);

  it('parses two stages with ordinal, year, age and key stage', () => {
    expect(stages.map((s) => s.ordinal)).toEqual([6, 7]);
    const s6 = stages[0]!;
    expect(s6.yearGroup).toBe(1);
    expect([s6.ageLow, s6.ageHigh]).toEqual([5, 6]);
    expect(s6.keyStage).toBe('KS1');
  });

  it('groups units under strands with their codes', () => {
    const s6 = stages[0]!;
    expect(s6.strands.map((st) => st.strandCode)).toEqual(['CS', 'PG']);
    expect(s6.strands[0]!.units[0]!.title).toBe('Computing systems and networks – Technology around us');
    expect(s6.strands[1]!.units[0]!.title).toBe('Programming A – Moving a robot');
  });

  it('captures lessons (objectives) and their indented "I can…" criteria', () => {
    const cs = stages[0]!.strands[0]!;
    expect(cs.units[0]!.lessons.map((l) => l.objective)).toEqual([
      'To identify technology',
      'To identify a computer and its main parts',
    ]);
    expect(cs.units[0]!.lessons[0]!.criteria.map((c) => c.descriptor)).toEqual([
      'I can explain how these technology examples help us',
      'I can locate examples of technology in the classroom',
    ]);
  });

  it('parses also-strands on a lesson and strips them from the objective', () => {
    expect(stages[0]!.strands[0]!.units[0]!.lessons[0]!.alsoStrands).toEqual(['IT']);
    const s7lesson = stages[1]!.strands[0]!.units[0]!.lessons[0]!;
    expect(s7lesson.objective).toBe('To explain that projects can have code and artwork');
    expect(s7lesson.alsoStrands).toEqual(['DD', 'PG']);
  });

  it('counts the whole fixture: 2 stages, 3 strand-groups, every criterion attached to a lesson', () => {
    const totalCriteria = stages.flatMap((s) => s.strands).flatMap((st) => st.units).flatMap((u) => u.lessons).flatMap((l) => l.criteria);
    expect(totalCriteria).toHaveLength(5); // CS: 2+1, PG: 1, Stage7 PG: 1
  });
});
