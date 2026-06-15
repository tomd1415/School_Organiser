// Versioned prompt for per-class resource adaptation: take the lesson's MASTER documents and the
// class's adapted lesson, and produce that class's versions of the documents. Inputs travel via
// context[] (redaction, withholding, audit) like everything else.
import type { RedactableItem } from '../../services/redact';

export const ADAPT_RESOURCES_VERSION = 'adapt_resources@6'; // @6: per-level slides + pupil-only worksheet (typed blocks, screenshot tasks) + separate ta_notes. @5: all slides in one entry.

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
  'two-column table (question | empty "Type your answer here" cell); SCREENSHOT tasks as a table whose ' +
  'right cell is EXACTLY "📷 Paste a screenshot here"; a "- [ ]" success checklist per level. NEVER blank ' +
  'lines/underscores as answer spaces; say "type" not "write"; no name/date header (auto-filled online).\n' +
  '(3) "ta_notes" — SEPARATE TA/teacher guidance (how to support each level, misconceptions, expected ' +
  'answers), never shown to pupils. (4) "answers" — concise teacher answer notes.\n' +
  'If a master document is missing, create it from the adapted outline. Where a visual is needed but ' +
  'absent, use a `> 🖼️ [show: …]` placeholder. Plain UK English; never reference an individual pupil.';

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
