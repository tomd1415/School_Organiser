import { describe, it, expect } from 'vitest';
import { tidyResourceSet, mergeResourceContents, normaliseResourceKind } from '../src/llm/schemas/lessonResources';

// The slide viewer splits a slides document on `## ` headings (routes/resources.ts), so the count of
// slides a teacher actually sees is this:
const slideCount = (content: string): number =>
  content.replace(/\r\n/g, '\n').split(/\n(?=## )/).filter((s) => s.trim() !== '').length;

describe('tidyResourceSet — the reported "only the first slide" bug', () => {
  it('rebuilds a deck the model split across one-slide-per-entry', () => {
    // Mirrors ai_calls #298: four `slides` entries, one `## ` slide each, plus a full worksheet.
    const resources = [
      { kind: 'slides', title: 'Slides — Pins and Radio', content: '## Connecting pins\n\n🔌\n\n- a' },
      { kind: 'slides', title: 'Slides — Pins and Radio', content: '## Radio basics\n\n📡\n\n- b' },
      { kind: 'slides', title: 'Slides — Pins and Radio', content: '## Sending a message\n\n📨\n\n- c' },
      { kind: 'slides', title: 'Slides — Pins and Radio', content: '## Recap\n\n✅\n\n- d' },
      { kind: 'worksheet', title: 'Worksheet', content: '## 🟢 Support\n\ntask\n\n## 🟡 Core\n\ntask' },
    ];
    const { docs, missing } = tidyResourceSet(resources);
    const slides = docs.filter((d) => d.kind === 'slides');
    expect(slides).toHaveLength(1); // one merged slides document, not four entries
    expect(slideCount(slides[0]!.content)).toBe(4); // ...and the teacher sees all FOUR slides
    expect(slides[0]!.content).toContain('## Connecting pins');
    expect(slides[0]!.content).toContain('## Recap');
    expect(missing).not.toContain('slides');
    expect(docs.find((d) => d.kind === 'worksheet')).toBeTruthy();
  });

  it('still keeps the superset when same-kind entries are cumulative drafts (no duplication)', () => {
    const d1 = '## A\n\n- one';
    const d2 = '## A\n\n- one\n\n## B\n\n- two'; // a fuller draft that contains d1
    const { docs } = tidyResourceSet([
      { kind: 'slides', title: 'S', content: d1 },
      { kind: 'slides', title: 'S', content: d2 },
    ]);
    const slides = docs.find((d) => d.kind === 'slides')!;
    expect(slides.content).toBe(d2); // d1 dropped as a fragment, not appended (no duplicated slide A)
    expect(slideCount(slides.content)).toBe(2);
  });

  it('leaves a clean one-per-kind set unchanged and reports nothing missing', () => {
    const { docs, missing } = tidyResourceSet([
      { kind: 'slides', title: 'S', content: '## A\n\n## B' },
      { kind: 'worksheet', title: 'W', content: 'ws' },
      { kind: 'support', title: 'Sup', content: 'sup' },
      { kind: 'answers', title: 'Ans', content: 'ans' },
    ]);
    expect(docs.map((d) => d.kind)).toEqual(['slides', 'worksheet', 'support', 'answers']);
    expect(slideCount(docs[0]!.content)).toBe(2);
    expect(missing).toEqual([]);
  });

  it('drops empty entries and reports missing core docs', () => {
    const { docs, missing } = tidyResourceSet([
      { kind: 'slides', title: 'S', content: '   ' },
      { kind: 'answer key', title: 'A', content: 'a' }, // normalises to "answers"
    ]);
    expect(docs.map((d) => d.kind)).toEqual(['answers']);
    expect(missing).toEqual(['slides', 'worksheet']);
  });

  it('caps the set at four documents', () => {
    const r = ['slides', 'worksheet', 'support', 'answers', 'document'].map((k) => ({ kind: k, title: k, content: `# ${k}` }));
    expect(tidyResourceSet(r).docs).toHaveLength(4);
  });

  it('keeps the core kinds past the cap (never silently drops the worksheet while reporting complete)', () => {
    // The model returns an extra 'document' FIRST and the worksheet LAST. The cap must drop the extra,
    // not a core doc — and `missing` must reflect what was actually kept.
    const r = [
      { kind: 'reference doc', title: 'Doc', content: 'extra' }, // normalises to 'document'
      { kind: 'slides', title: 'S', content: '## A' },
      { kind: 'support', title: 'Sup', content: 'sup' },
      { kind: 'answers', title: 'Ans', content: 'ans' },
      { kind: 'worksheet', title: 'W', content: 'ws' },
    ];
    const { docs, missing } = tidyResourceSet(r);
    const kinds = docs.map((d) => d.kind);
    expect(kinds).toContain('worksheet'); // core kept...
    expect(kinds).toContain('slides');
    expect(kinds).not.toContain('document'); // ...the extra is what's dropped
    expect(missing).toEqual([]); // and missing is computed from the kept docs, so it can't lie
  });

  it('normaliseResourceKind maps the strays the model produces', () => {
    expect(normaliseResourceKind('Support worksheet')).toBe('support');
    expect(normaliseResourceKind('answer key')).toBe('answers');
    expect(normaliseResourceKind('teaching slides')).toBe('slides');
  });
});

describe('mergeResourceContents', () => {
  it('concatenates disjoint pieces with a blank line (preserving `## ` headings)', () => {
    expect(mergeResourceContents(['## A\n\nx', '## B\n\ny'])).toBe('## A\n\nx\n\n## B\n\ny');
  });
  it('drops a cumulative-draft fragment (an earlier draft that is a PREFIX of a fuller one)', () => {
    expect(mergeResourceContents(['## A', '## A\n\n## B'])).toBe('## A\n\n## B');
  });
  it('keeps a distinct piece that is a verbatim substring but NOT a prefix of a longer one', () => {
    // 'Star topology' appears inside the longer slide but is a DIFFERENT slide — dropping it lost a slide.
    const a = 'Star topology';
    const b = '## Topologies\n\nStar topology and Bus';
    expect(mergeResourceContents([a, b])).toBe(a + '\n\n' + b); // both kept
  });
  it('dedupes identical pieces and trims surrounding whitespace', () => {
    expect(mergeResourceContents([' ## A ', '## A'])).toBe('## A');
  });
  it('returns empty for no usable content', () => {
    expect(mergeResourceContents(['', '   '])).toBe('');
  });
});
