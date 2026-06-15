import { describe, expect, it } from 'vitest';
import { sliceSlidesForLevel, slidesAreLevelled } from '../src/lib/slideDeck';

// Slides are `## ` per slide; an ability-levelled deck adds `# 🟢/🟡/🔴` depth-1 sections so a pupil
// follows the board on a simplified version matching their level. A plain deck is shared by all.
describe('slideDeck — per-ability slicing', () => {
  const shared = `## Slide 1\n- a\n## Slide 2\n- b\n## Slide 3\n- c\n`;

  it('a non-levelled deck gives every level the same slides', () => {
    expect(slidesAreLevelled(shared)).toBe(false);
    expect(sliceSlidesForLevel(shared, 'support')).toHaveLength(3);
    expect(sliceSlidesForLevel(shared, 'core')).toEqual(sliceSlidesForLevel(shared, 'challenge'));
  });

  it('a levelled deck returns the shared slides + ONLY the chosen level', () => {
    const md = `## Welcome\nintro\n# 🟢 Support\n## S1\neasy\n## S2\neasy2\n# 🟡 Core\n## C1\nmid\n# 🔴 Challenge\n## X1\nhard\n`;
    expect(slidesAreLevelled(md)).toBe(true);

    const sup = sliceSlidesForLevel(md, 'support'); // Welcome + S1 + S2
    expect(sup).toHaveLength(3);
    expect(sup.join('\n')).toContain('Welcome');
    expect(sup.join('\n')).toContain('S1');
    expect(sup.join('\n')).not.toContain('C1');
    expect(sup.join('\n')).not.toContain('X1');

    expect(sliceSlidesForLevel(md, 'core').join('\n')).toContain('C1'); // Welcome + C1
    expect(sliceSlidesForLevel(md, 'core')).toHaveLength(2);
    expect(sliceSlidesForLevel(md, 'challenge').join('\n')).toContain('X1');
  });

  it('the level divider lines are not shown to pupils', () => {
    expect(sliceSlidesForLevel(`# 🟢 Support\n## S1\nx\n`, 'support').join('\n')).not.toContain('Support');
  });

  it('empty / no-slide input yields nothing', () => {
    expect(sliceSlidesForLevel('', 'core')).toEqual([]);
    expect(sliceSlidesForLevel('just a paragraph, no slides', 'core')).toHaveLength(1); // a single preamble slide
  });
});
