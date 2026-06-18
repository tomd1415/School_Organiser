import { describe, it, expect } from 'vitest';
import { renderLinkedResources, renderPlanResourcesBlock } from '../src/lib/resourceView';
import type { LinkedResource } from '../src/repos/resources';

const r = (resourceId: number, title: string, kind: string, source: string): LinkedResource => ({ resourceId, title, kind, source });

// A messy mix: an image, an uploaded original, an imported original, and two AI-generated docs.
const mixed: LinkedResource[] = [
  r(1, 'diagram.png', 'image', 'uploaded'),
  r(2, 'teacher-notes.docx', 'document', 'uploaded'),
  r(3, 'old-worksheet.pdf', 'document', 'imported'),
  r(4, 'slides.md', 'slides', 'ai_generated'),
  r(5, 'worksheet.md', 'worksheet', 'ai_generated'),
];

describe('renderLinkedResources — grouped into images · original · generated (13.6)', () => {
  const html = renderLinkedResources(mixed);

  it('shows the three group labels in order', () => {
    expect(html).toContain('Images');
    expect(html).toContain('Original resources');
    expect(html).toContain('Generated resources');
    expect(html.indexOf('Images')).toBeLessThan(html.indexOf('Original resources'));
    expect(html.indexOf('Original resources')).toBeLessThan(html.indexOf('Generated resources'));
  });

  it('puts each resource in the right bucket', () => {
    const imagesBlock = html.slice(html.indexOf('res-group-images'), html.indexOf('res-group-original'));
    const originalBlock = html.slice(html.indexOf('res-group-original'), html.indexOf('res-group-generated'));
    const generatedBlock = html.slice(html.indexOf('res-group-generated'));
    expect(imagesBlock).toContain('diagram.png');
    expect(originalBlock).toContain('teacher-notes.docx');
    expect(originalBlock).toContain('old-worksheet.pdf'); // imported counts as original
    expect(generatedBlock).toContain('slides.md');
    expect(generatedBlock).toContain('worksheet.md');
  });

  it('hides empty groups', () => {
    const onlyGenerated = renderLinkedResources([r(9, 'a.md', 'worksheet', 'ai_generated')]);
    expect(onlyGenerated).toContain('Generated resources');
    expect(onlyGenerated).not.toContain('Images');
    expect(onlyGenerated).not.toContain('Original resources');
  });

  it('empty list still reads cleanly', () => {
    expect(renderLinkedResources([])).toContain('no resources linked');
  });
});

describe('renderPlanResourcesBlock — same grouping on the Schemes card', () => {
  it('groups and keeps the per-item unlink button', () => {
    const html = renderPlanResourcesBlock(42, mixed);
    expect(html).toContain('Images');
    expect(html).toContain('Generated resources');
    expect(html).toContain('/schemes/plan/42/resources/4/detach'); // unlink still wired per item
  });
});
