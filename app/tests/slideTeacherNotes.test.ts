import { describe, it, expect } from 'vitest';
import { splitTeacherNotes, stripTeacherNotes } from '../src/lib/slideDeck';
import { renderSlideDeck } from '../src/routes/me';

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
