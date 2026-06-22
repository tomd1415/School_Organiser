import { describe, it, expect } from 'vitest';
import { splitTeacherNotes, stripTeacherNotes } from '../src/lib/slideDeck';
import { renderSlideDeck } from '../src/lib/meView';

// Per-slide teacher notes are PRIVATE. The non-negotiable: they never reach the pupil surface or the
// projector board. These tests guard that boundary (the old `*Say:*` line leaked onto pupil slides).

const SLIDE = `## 1. The CPU

The brain of the computer.

> key idea: fetch, decode, execute

> 🧑‍🏫 Drop in that a modern CPU does billions of these a second. Ask who has overclocked a PC.

*Say:* The CPU is like a chef following a recipe.`;

describe('splitTeacherNotes', () => {
  it('moves the 🧑‍🏫 block and the legacy *Say:* line into notes; the clean half keeps neither', () => {
    const { clean, notes } = splitTeacherNotes(SLIDE);
    expect(clean).toContain('The brain of the computer.');
    expect(clean).toContain('> key idea'); // a pupil-facing callout (no 🧑‍🏫) stays
    expect(clean).not.toContain('🧑‍🏫');
    expect(clean).not.toMatch(/Say:/i);
    expect(clean).not.toContain('overclocked');
    expect(notes).toContain('billions of these a second');
    expect(notes).toContain('The CPU is like a chef following a recipe.'); // *Say:* content kept, markers stripped
    expect(notes).not.toContain('*'); // emphasis markers removed
  });

  it('stripTeacherNotes returns exactly the clean half', () => {
    expect(stripTeacherNotes(SLIDE)).toBe(splitTeacherNotes(SLIDE).clean);
  });

  // Ground truth: the model very often ignores the `> 🧑‍🏫` instruction and emits `*Say:*` talking-points
  // (this is the real format seen in generated decks). The board MUST still come out clean.
  it('strips the *Say:* talking-points the model actually produces, but keeps the pupil > key idea', () => {
    const real = `## Key Word 2 — Bias
🎲

- **Bias** = unfairly favouring one group over another
- AI can learn bias from the data it is trained on

*Say:* If we train a computer with unfair data, it will make unfair decisions — like a broken set of scales.

> key idea: Bias in AI = the AI treats some people unfairly.`;
    const { clean, notes } = splitTeacherNotes(real);
    expect(clean).toContain('unfairly favouring one group'); // pupil bullets kept
    expect(clean).toContain('> key idea'); // pupil callout kept
    expect(clean).not.toMatch(/Say:/i); // NO teacher talk on the board
    expect(clean).not.toContain('broken set of scales');
    expect(notes).toContain('broken set of scales'); // the talk is preserved as a private note
  });

  // Defensive: other teacher-marker forms the model sometimes uses must also be caught.
  it('also strips Teacher: / Teacher’s notes: / Presenter notes: lines and emoji variants', () => {
    const slide = `## A slide

Pupil bullet stays.

Teacher: set the countdown timer to 5 minutes.
**Teacher's notes:** watch for the misconception that AI is "alive".
Presenter notes: pause here for hands-up.

> 👩‍🏫 woman-teacher emoji note: circulate and check books.
> still part of the same teacher block.`;
    const { clean, notes } = splitTeacherNotes(slide);
    expect(clean).toContain('Pupil bullet stays.');
    for (const leak of ['set the countdown timer', 'misconception that AI', 'pause here for hands-up', 'woman-teacher', 'circulate and check', 'still part of the same teacher block']) {
      expect(clean).not.toContain(leak);
    }
    expect(notes).toContain('set the countdown timer');
    expect(notes).toContain('circulate and check');
  });

  it('moves standalone teacher-note sections and their following bullets into private notes', () => {
    const slide = `## Sorting algorithms

- Pupils compare two algorithms

### Teacher notes
- Model the first pass with cards.
- Ask pupils to predict the next swap.`;
    const { clean, notes } = splitTeacherNotes(slide);
    expect(clean).toContain('Pupils compare two algorithms');
    expect(clean).not.toContain('Teacher notes');
    expect(clean).not.toContain('Model the first pass');
    expect(clean).not.toContain('predict the next swap');
    expect(notes).toContain('Model the first pass with cards.');
    expect(notes).toContain('Ask pupils to predict the next swap.');
  });

  it('recognises curly-apostrophe and unquoted teacher emoji lines without removing pupil visuals', () => {
    const slide = `## Networks

🏫

Pupils identify the school network.

**Teacher’s notes:** connect this to the switch in the server room.
🧑‍🏫 Check that WAN is not described as wireless.`;
    const { clean, notes } = splitTeacherNotes(slide);
    expect(clean).toContain('🏫');
    expect(clean).toContain('Pupils identify the school network.');
    expect(clean).not.toContain('server room');
    expect(clean).not.toContain('WAN is not described');
    expect(notes).toContain('server room');
    expect(notes).toContain('WAN is not described');
  });

  it('moves unresolved LLM visual directives out of the pupil slide and into teacher notes', () => {
    // Regression: the generated "The CPU & von Neumann architecture" deck uses both of these
    // private blockquotes. The [show: ...] instruction is an editor to-do, not board content.
    const cpuSlide = `## Starter: Retrieval Quiz
🧠

- What is **hardware**? What is **software**?
- What is the difference between **storage** and **memory**?

> 🖼️ [show: mini whiteboard quiz slide with five numbered questions displayed large]

> 🧑‍🏫 Cold-call or mini-whiteboard reveal — keep it snappy. Good hook:`;
    const { clean, notes } = splitTeacherNotes(cpuSlide);
    expect(clean).toContain('What is **hardware**?');
    expect(clean).not.toContain('[show:');
    expect(clean).not.toContain('Cold-call');
    expect(notes).toContain('Visual to add: mini whiteboard quiz slide');
    expect(notes).toContain('Cold-call or mini-whiteboard reveal');
  });
});

describe('renderSlideDeck audience (the leak fix)', () => {
  const deck = `## 1. Intro\n\nHello world\n\n> 🧑‍🏫 secret teacher tip about pacing the starter`;

  it('the pupil/board render (default audience) NEVER contains a teacher note', () => {
    const html = renderSlideDeck(deck, 'd1', 'core'); // default = 'pupil'
    expect(html).toContain('Hello world');
    expect(html).not.toContain('🧑‍🏫');
    expect(html).not.toContain('secret teacher tip');
    expect(html).not.toContain('pslide-notes');
  });

  it("the teacher presenter render shows the notes in a labelled, private panel", () => {
    const html = renderSlideDeck(deck, 'd1', 'core', 'teacher');
    expect(html).toContain('pslide-notes');
    expect(html).toContain('secret teacher tip');
    expect(html).toContain('only you see these');
    expect(html).toContain('Hello world'); // still shows the slide itself
  });
});
