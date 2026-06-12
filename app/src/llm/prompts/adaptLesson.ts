// Versioned prompt for the per-group feedback loop (5.5): adapt one lesson for one class from
// how its recent lessons actually went. All inputs travel via context[] (redaction + withholding +
// audit); notes keep their safeguarding flags so flagged ones never reach the model.
import type { GroupHistoryEntry } from '../../repos/adaptations';
import type { RedactableItem } from '../../services/redact';

export const ADAPT_LESSON_VERSION = 'adapt_lesson@2'; // 3-level differentiation default

export const ADAPT_LESSON_SYSTEM =
  'DIFFERENTIATION IS THE DEFAULT: every lesson has whole-class teaching, then THREE levels of task — 🟢 Support, 🟡 Core, 🔴 Challenge — all meeting the same objectives, with Core pitched at the class ability midpoint where one is given (Support one step below, Challenge one step above). ' +
  'You are an experienced UK secondary SEND Computing teacher revising YOUR OWN lesson for one ' +
  'specific class, based on how their recent lessons actually went. Keep the lesson\'s coverage ' +
  'and intent, but re-pitch it for this class: pick up exactly where they stopped, recap what the ' +
  'notes say was shaky, drop or shrink what the notes say overran, and keep the structure ' +
  'predictable (same routine, clear numbered steps, rough minutes). Plain UK English. Never ' +
  'reference individual pupils by name — speak about "the class" or "some pupils".';

/** The lesson being adapted (master, or the group's current adaptation where one exists). */
export function lessonItem(title: string, objectives: string | null, outline: string | null, adapted: boolean): RedactableItem {
  return {
    text: [
      `LESSON TO ADAPT${adapted ? " (already adapted for this class — revise this version)" : ' (the master version)'}: ${title}`,
      `Objectives:\n${objectives ?? '(none written)'}`,
      `Outline:\n${outline ?? '(none written)'}`,
    ].join('\n'),
  };
}

/** One item per history entry frame + one per note (notes carry their safeguarding flag). */
export function historyItems(history: GroupHistoryEntry[]): RedactableItem[] {
  const items: RedactableItem[] = [];
  for (const h of history) {
    items.push({
      text: `RECENT LESSON ${h.date}${h.planTitle ? ` — ${h.planTitle}` : ''}${h.stoppingPoint ? `\nStopped at: ${h.stoppingPoint}` : ''}`,
    });
    for (const n of h.notes) items.push({ text: `Note from that lesson: ${n.body}`, safeguarding: n.safeguarding });
  }
  return items;
}

export function adaptLessonInstruction(courseName: string, groupName: string | null): string {
  return (
    `Course: ${courseName}${groupName ? ` · Class: ${groupName}` : ''}\n` +
    'Adapt the lesson above for this class\'s next delivery, using the recent-lesson record. ' +
    'Return the full adapted objectives and outline (not a diff), a short adaptation note, and a ' +
    'one-line change summary.'
  );
}
