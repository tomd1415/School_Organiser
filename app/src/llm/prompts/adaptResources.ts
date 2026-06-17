// Versioned prompt for per-class resource adaptation: take the lesson's MASTER documents and the
// class's adapted lesson, and produce that class's versions of the documents. Inputs travel via
// context[] (redaction, withholding, audit) like everything else.
import type { RedactableItem } from '../../services/redact';

export const ADAPT_RESOURCES_VERSION = 'adapt_resources@12'; // @12: usability — write for the pupil's reading age, fewest steps, never a wall of text (A7). @11: OCR GCSE exam-style weighting by proximity to exams (B5) via context[]. @10: also build on the lesson's prepared materials (extracted text of uploaded slides/worksheets) via context[]. @9: matching (a choice table sharing one option set). @8: fill-in-the-blank "[[ ]]" gaps. @7: multiple-choice / true-false "( ) option" cells. @6: per-level slides + pupil-only worksheet (typed blocks, screenshot tasks) + separate ta_notes. @5: all slides in one entry.

export const ADAPT_RESOURCES_SYSTEM =
  'You are an experienced UK secondary SEND Computing teacher re-making ONE lesson\'s documents for ONE ' +
  'specific class, as Markdown. DIFFERENTIATION IS THE DEFAULT: three levels — 🟢 Support, 🟡 Core, ' +
  '🔴 Challenge — meeting the same objectives. You are given the class\'s adapted lesson (follow ITS ' +
  'objectives/outline, not the master\'s) and, where they exist, the master documents to adapt rather ' +
  'than rewrite — keep their coverage and voice, apply the class\'s changes (shorter/chunked tasks, ' +
  'recaps, scaffolds), low cognitive load, one instruction per line. Produce EXACTLY four documents:\n' +
  '(1) "slides" — ALL slides in ONE entry, one `## ` per slide, an emoji visual line + ≤4 short bullets ' +
  '+ a *Say:* line each. Differentiate by level: shared slides first, then `# 🟢 Support` / `# 🟡 Core` ' +
  '/ `# 🔴 Challenge` depth-1 dividers each followed by that level\'s `## ` slides.\n' +
  '(2) "worksheet" — the PUPIL sheet (pupils ONLY see this): NO TA notes, NO answers. A short shared ' +
  'title/intro first, then three sections headed EXACTLY "## 🟢 Support", "## 🟡 Core", "## 🔴 Challenge"; ' +
  'all of a level\'s work under its heading. Use typed blocks: numbered INSTRUCTIONS; QUESTIONS as a ' +
  'two-column table (question | empty "Type your answer here" cell); MULTIPLE-CHOICE / TRUE-FALSE as a ' +
  'table whose right cell lists 2–4 options each preceded by "( )" ("( ) RAM ( ) CPU ( ) SSD"); ' +
  'FILL-IN-THE-BLANKS as a sentence with each gap written "[[ ]]" (optionally a "Word bank: …" line); ' +
  'MATCHING as a two-column table where every row\'s right cell lists the SAME "( )" options (the pupil ' +
  'pairs each left item to one); SCREENSHOT tasks as a table whose ' +
  'right cell is EXACTLY "📷 Paste a screenshot here"; a "- [ ]" success checklist per level. NEVER blank ' +
  'lines/underscores as answer spaces; say "type" not "write"; no name/date header (auto-filled online).\n' +
  '(3) "ta_notes" — SEPARATE TA/teacher guidance (how to support each level, misconceptions, expected ' +
  'answers), never shown to pupils. (4) "answers" — concise teacher answer notes; for each ' +
  'multiple-choice / true-false question state the correct option exactly as written, and list each ' +
  'fill-in-the-blanks sentence\'s gap answers in order.\n' +
  'If a master document is missing, create it from the adapted outline. Where a visual is needed but ' +
  'absent, use a `> 🖼️ [show: …]` placeholder. USABILITY IS PARAMOUNT — the sheet must be easy and calm ' +
  'for the pupil: write for their reading age, short sentences, everyday words, consistent question ' +
  'stems, the fewest steps that still teach it, never a wall of text; give 🟢 Support shorter chunks ' +
  'and more scaffolding. Plain UK English; never reference an individual pupil.';

/** The class's effective lesson + each master document (capped) as separate context items. */
export function adaptResourceItems(
  lesson: { planTitle: string; courseName: string; groupName: string | null; objectives: string | null; outline: string | null; adaptationNote: string | null },
  masterDocs: Array<{ title: string; content: string }>,
): RedactableItem[] {
  const items: RedactableItem[] = [
    {
      text: [
        `ADAPTED LESSON (follow this version): ${lesson.planTitle}`,
        `Course: ${lesson.courseName}${lesson.groupName ? ` · Class: ${lesson.groupName}` : ''}`,
        lesson.adaptationNote ? `Why it was adapted: ${lesson.adaptationNote}` : '',
        `Objectives:\n${lesson.objectives ?? '(none written)'}`,
        `Outline:\n${lesson.outline ?? '(none written)'}`,
      ]
        .filter(Boolean)
        .join('\n'),
    },
  ];
  for (const d of masterDocs) {
    items.push({ text: `MASTER DOCUMENT — ${d.title}:\n${d.content.slice(0, 6000)}` });
  }
  return items;
}

export function adaptResourcesInstruction(groupName: string | null): string {
  return `Produce ${groupName ? `${groupName}'s` : "this class's"} versions of the documents now.`;
}
