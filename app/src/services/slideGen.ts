// Dedicated slide-deck generation. The lesson_resources / adapt_resources calls produce four documents
// at once and reliably UNDER-INVEST in the deck — measured: the model finishes naturally (end_turn)
// using <20% of the token budget yet returns a 2–3 slide stub with no level sections, having spent its
// effort on the worksheet/answers. That is the "only the first couple of slides" bug. We therefore
// generate the deck in its OWN call, where it has nothing to compete with, and override the four-doc
// call's (stubby) deck with it.
import { callLLM } from '../llm/client';
import type { RedactableItem } from './redact';
import {
  LESSON_SLIDES_SYSTEM,
  LESSON_SLIDES_VERSION,
  LESSON_SLIDES_INSTRUCTION,
  LESSON_SLIDES_ADAPT_INSTRUCTION,
} from '../llm/prompts/lessonResources';
import type { TidyResource } from '../llm/schemas/lessonResources';

/** Tidy a free-text deck: drop any preamble before the first heading and unwrap an outer ```fence the
 *  model occasionally adds despite being told not to. INNER code fences (```python / ```parsons after a
 *  `## ` slide heading) are left untouched — only a wrapper fence that precedes the first heading is
 *  stripped. */
export function cleanDeck(text: string): string {
  let t = text.trim();
  const firstHeading = t.search(/^#{1,2}\s/m);
  const firstFence = t.search(/^```/m);
  // An outer wrapper fence appears BEFORE any slide/level heading — strip its open + matching close.
  if (firstFence !== -1 && (firstHeading === -1 || firstFence < firstHeading)) {
    t = t
      .replace(/^```[a-z]*\s*\n/i, '')
      .replace(/\n```\s*$/i, '')
      .trim();
  }
  // Drop any remaining preamble ("Here is the deck:") before the first slide/level heading.
  const idx = t.search(/^#{1,2}\s/m);
  return (idx > 0 ? t.slice(idx) : t).trim();
}

/** Generate the lesson's full differentiated deck in a dedicated PLAIN-TEXT call (see LESSON_SLIDES_*:
 *  structured output of one big string field makes the model emit a 1-slide stub). Returns the deck
 *  Markdown, or null if the call fails (the caller then keeps whatever deck the four-doc call produced,
 *  so a deck is never lost to a transient failure). `context` is the SAME redactable items the four-doc
 *  call uses, so the deck is built from the same lesson, materials and class context — and inherits the
 *  same redaction, safeguarding-withholding and audit. */
export async function generateLessonDeck(opts: {
  model: string;
  context: RedactableItem[];
  mode: 'generate' | 'adapt';
}): Promise<string | null> {
  const res = await callLLM({
    feature: opts.mode === 'adapt' ? 'adapt_slides' : 'lesson_slides',
    model: opts.model,
    promptVersion: LESSON_SLIDES_VERSION,
    system: LESSON_SLIDES_SYSTEM,
    context: opts.context,
    instruction: opts.mode === 'adapt' ? LESSON_SLIDES_ADAPT_INSTRUCTION : LESSON_SLIDES_INSTRUCTION,
    // A full differentiated deck only — never the worksheet/answers (~5k tokens observed) — ample.
    maxTokens: 16000,
  });
  const deck = res.status === 'ok' && res.text ? cleanDeck(res.text) : '';
  return deck || null;
}

/** Override a tidied resource set's slides document with a dedicated deck (when one was generated), then
 *  recompute which core docs are missing — so the four-doc call's stub deck is replaced, and a missing
 *  slides doc is filled, by the dedicated call. Mutates and returns the same object. */
export function applyDedicatedDeck(
  tidy: { docs: TidyResource[]; missing: string[] },
  deck: string | null,
  planTitle: string,
): { docs: TidyResource[]; missing: string[] } {
  if (deck && deck.trim()) {
    const existing = tidy.docs.find((d) => d.kind === 'slides');
    if (existing) existing.content = deck;
    else tidy.docs.unshift({ kind: 'slides', title: `Slides — ${planTitle}`, content: deck });
  }
  const have = new Set<string>(tidy.docs.filter((d) => d.content.trim()).map((d) => d.kind));
  tidy.missing = ['slides', 'worksheet'].filter((k) => !have.has(k));
  return tidy;
}
