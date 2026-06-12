// Versioned prompt for per-class resource adaptation: take the lesson's MASTER documents and the
// class's adapted lesson, and produce that class's versions of the documents. Inputs travel via
// context[] (redaction, withholding, audit) like everything else.
import type { RedactableItem } from '../../services/redact';

export const ADAPT_RESOURCES_VERSION = 'adapt_resources@1';

export const ADAPT_RESOURCES_SYSTEM =
  'You are an experienced UK secondary SEND Computing teacher re-making ONE lesson\'s documents ' +
  'for ONE specific class, as Markdown. You are given the class\'s adapted lesson (its objectives ' +
  'and outline — follow these, not the master\'s) and, where they exist, the master documents to ' +
  'adapt rather than rewrite from scratch: keep their coverage and voice, apply the class\'s ' +
  'changes (shorter or chunked tasks, recaps, scaffolds, swapped activities), and keep every ' +
  'sheet low cognitive load with one instruction per line. Produce the same set: "slides", ' +
  '"worksheet", "support", and "answers" where useful. If a master document is missing, create ' +
  'that document from the adapted outline. Plain UK English; never reference an individual pupil.';

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
