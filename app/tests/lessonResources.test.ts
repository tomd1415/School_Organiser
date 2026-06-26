import { describe, it, expect } from 'vitest';
import { tidyResourceSet, mergeResourceContents, normaliseResourceKind, assessResourceSet, type TidyResource } from '../src/llm/schemas/lessonResources';

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
      { kind: 'ta_notes', title: 'TA', content: 'ta' },
      { kind: 'answers', title: 'Ans', content: 'ans' },
    ]);
    expect(docs.map((d) => d.kind)).toEqual(['slides', 'worksheet', 'ta_notes', 'answers']);
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
      { kind: 'ta_notes', title: 'TA', content: 'ta' },
      { kind: 'answers', title: 'Ans', content: 'ans' },
      { kind: 'worksheet', title: 'W', content: 'ws' },
    ];
    const { docs, missing } = tidyResourceSet(r);
    const kinds = docs.map((d) => d.kind);
    expect(kinds).toContain('worksheet'); // core kept...
    expect(kinds).toContain('slides');
    expect(kinds).toContain('ta_notes');
    expect(kinds).not.toContain('document'); // ...the extra is what's dropped
    expect(missing).toEqual([]); // and missing is computed from the kept docs, so it can't lie
  });

  it('normaliseResourceKind maps the strays the model produces', () => {
    expect(normaliseResourceKind('answer key')).toBe('answers');
    expect(normaliseResourceKind('teaching slides')).toBe('slides');
    // The separate TA document, however the model labels it — checked before "answers" (TA notes
    // contain the answers), and never confused with an "answers" doc.
    expect(normaliseResourceKind('ta_notes')).toBe('ta_notes');
    expect(normaliseResourceKind('TA notes')).toBe('ta_notes');
    expect(normaliseResourceKind('Teaching Assistant guidance')).toBe('ta_notes');
    expect(normaliseResourceKind('answers')).toBe('answers'); // not mistaken for ta_notes
    expect(normaliseResourceKind('Support worksheet')).toBe('support'); // legacy kind still recognised
  });
});

describe('assessResourceSet — "completed but incomplete" (the reported thin Core/Challenge)', () => {
  // A structurally COMPLETE set: deck with all three `# ` level sections (≥5 slides), worksheet with
  // three substantive `## 🟢/🟡/🔴` tiers, and non-trivial ta_notes + answers.
  const goodDeck =
    '## Starter\n\n🚀\n\n- hook\n\n## Big idea\n\n💡\n\n- idea\n' +
    '# 🟢 Support\n\n## Support slide\n\n🟢\n\n- easier\n' +
    '# 🟡 Core\n\n## Core slide\n\n🟡\n\n- core\n' +
    '# 🔴 Challenge\n\n## Challenge slide\n\n🔴\n\n- stretch';
  const goodWorksheet =
    'How to use this sheet: type your answers in the boxes.\n\n' +
    '## 🟢 Support\n\nFollow these steps and answer the questions about the CPU and memory in full.\n\n' +
    '## 🟡 Core\n\nExplain what the CPU does and how RAM differs from storage, with examples.\n\n' +
    '## 🔴 Challenge\n\nEvaluate why cache exists and how it speeds the fetch-execute cycle.';
  const complete: TidyResource[] = [
    { kind: 'slides', title: 'S', content: goodDeck },
    { kind: 'worksheet', title: 'W', content: goodWorksheet },
    { kind: 'ta_notes', title: 'TA', content: 'Support pupils at each level; watch for the RAM/ROM mix-up.' },
    { kind: 'answers', title: 'Ans', content: 'CPU processes instructions; RAM is volatile working memory.' },
  ];

  it('passes a structurally complete set with no issues', () => {
    const a = assessResourceSet(complete);
    expect(a.complete).toBe(true);
    expect(a.issues).toEqual([]);
    expect(a.regenerate).toEqual([]);
  });

  it('flags the worksheet (for regeneration) when the 🔴 Challenge tier is absent', () => {
    const docs = complete.map((d) =>
      d.kind === 'worksheet'
        ? { ...d, content: '## 🟢 Support\n\nfull support task here for pupils to type answers into.\n\n## 🟡 Core\n\nfull core task here for pupils to complete.' }
        : d,
    );
    const a = assessResourceSet(docs);
    expect(a.complete).toBe(false);
    expect(a.regenerate).toEqual(['worksheet']);
    expect(a.issues.some((i) => i.kind === 'worksheet' && /Challenge/.test(i.problem))).toBe(true);
  });

  it('flags the worksheet when a tier is present but a stub (truncated mid-generation)', () => {
    const docs = complete.map((d) =>
      d.kind === 'worksheet'
        ? { ...d, content: goodWorksheet.replace('Evaluate why cache exists and how it speeds the fetch-execute cycle.', 'Eval') }
        : d,
    );
    const a = assessResourceSet(docs);
    expect(a.regenerate).toContain('worksheet');
    expect(a.issues.some((i) => /too thin/.test(i.problem))).toBe(true);
  });

  it('flags the deck when it is a stub with no level sections (the slides-stub bug)', () => {
    const docs = complete.map((d) => (d.kind === 'slides' ? { ...d, content: '## Intro\n\n🙂\n\n- one\n\n## Recap\n\n✅\n\n- two' } : d));
    const a = assessResourceSet(docs);
    expect(a.complete).toBe(false);
    expect(a.regenerate).toContain('slides');
    expect(a.issues.some((i) => /level section/.test(i.problem))).toBe(true);
    expect(a.issues.some((i) => /stub/.test(i.problem))).toBe(true);
  });

  it('reports a missing document as needing regeneration', () => {
    const docs = complete.filter((d) => d.kind !== 'answers');
    const a = assessResourceSet(docs);
    expect(a.regenerate).toEqual(['answers']);
    expect(a.issues).toEqual([{ kind: 'answers', problem: 'answers is missing' }]);
  });

  it('orders the regenerate list slides → worksheet → ta_notes → answers (pupil-facing first)', () => {
    const a = assessResourceSet([
      { kind: 'answers', title: 'A', content: 'x' }, // too short
      { kind: 'ta_notes', title: 'T', content: 'y' }, // too short
      { kind: 'worksheet', title: 'W', content: '## 🟢 Support\n\nonly support here, the rest is missing entirely.' },
      { kind: 'slides', title: 'S', content: '## one\n\n## two' }, // stub, no levels
    ]);
    expect(a.regenerate).toEqual(['slides', 'worksheet', 'ta_notes', 'answers']);
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
