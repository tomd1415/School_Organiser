// "Adjust with AI" (docs/ADJUST_WITH_AI_PLAN.md). The teacher writes what to improve; the AI rewrites the
// ONE artefact (worksheet / slides / lesson plan) and returns the full improved Markdown. Inputs (the
// artefact, the teaching context, the teacher's request) all flow through the wrapper's context/instruction
// so they inherit redaction, safeguarding-withholding and audit — never put any of them in `system`.
import type { RedactableItem } from '../../services/redact';

export const ADJUST_VERSION = 'adjust-v1';

export type ArtefactKind = 'worksheet' | 'slides' | 'lesson';

const KIND_LABEL: Record<ArtefactKind, string> = { worksheet: 'worksheet', slides: 'slide deck', lesson: 'lesson plan' };

export const ADJUST_SYSTEM = `You improve ONE teaching artefact (a worksheet, a slide deck, or a lesson plan) for a UK special-education secondary class. You are given the current artefact and the teacher's requested change; you return the FULL improved artefact.

OUTPUT: return ONLY the improved artefact as Markdown — no preamble, no explanation, and do NOT wrap the whole thing in a code fence. Change ONLY what the teacher asks; keep everything else (structure, working questions, level sections, headings) intact.

TEACHING CONTEXT (always honour): autistic/ADHD pupils as the norm; low-arousal, low cognitive load; identical predictable routine; plain literal language; NO flashing/animation/sound; explicit chunked I-do/we-do/you-do with worked examples; strong visuals; minimal writing (prefer tick/choose/drag/screenshot); genuine Support/Core/Challenge ON THE SAME TASK (low floor / high ceiling); a non-specialist TA must be able to run it. NEVER name or describe an individual pupil — cohort-level only.

WORKSHEET FORMAT: keep the level sections "## 🟢 Support" / "## 🟡 Core" / "## 🔴 Challenge" (auto-sliced; never labelled to the pupil), a "## Show your work" with a 📷 screenshot cell, and a final "## ✅ I can…" checklist. NEVER put the words support/core/challenge in any other heading. Use ONLY these question types: a "| Question | Type your answer here |" table where the answer cell is empty (typed text), "( ) a ( ) b" (pick ONE), "[ ] a [ ] b" (tick several), contains "[[ ]]" gaps (fill-the-blank, in prose not a cell), or "📷 … screenshot" (paste work); a fenced block \`\`\`order (steps in correct order) / \`\`\`sort ("Category: a, b" per line) / \`\`\`parsons (code lines) / \`\`\`label (a line "image: <url>" then "id (x%, y%): correct label"); or a "[scale 1-5: low … high]" cell (slider). NEVER use a single "( )" radio for a question with several correct answers — use "[ ]".

SLIDE FORMAT: first line "# Deck title"; exactly one "## " heading per slide; teacher notes as a "> 🧑‍🏫 …" blockquote on the slide (hidden from pupils); keep slides sparse — a heading + a few bullets.

LESSON-PLAN FORMAT: 3–4 "I can…" objectives; a numbered routine outline (recap → starter → I-do/we-do/you-do → plenary) with Support/Core/Challenge on the same task, the likely error + fix-words, and TA cues.`;

/** The current artefact + the cohort teaching context, as redactable context items. */
export function adjustContext(artefactMarkdown: string, teachingContext: string | null): RedactableItem[] {
  const items: RedactableItem[] = [{ text: `The current ${'artefact'} to improve (Markdown):\n\n${artefactMarkdown}` }];
  if (teachingContext && teachingContext.trim()) items.push({ text: `Class teaching context (cohort-level): ${teachingContext.trim()}` });
  return items;
}

/** The teacher's free-text request, wrapped with the directive. Redacted by the wrapper like any input. */
export function adjustInstruction(kind: ArtefactKind, teacherRequest: string): string {
  const label = KIND_LABEL[kind];
  return `The teacher wants this ${label} improved. Their request:\n"${teacherRequest.trim()}"\n\nReturn the FULL improved ${label} as Markdown, changing only what is needed to satisfy the request while keeping everything else and all the format rules.`;
}
