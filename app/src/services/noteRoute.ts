// Phase 11 idea 12 — smart capture. routeNote() asks the model where a typed note belongs (through the
// one wrapper: names redacted, audited); applyDestinations() creates the confirmed destinations via the
// SAME repos email_triage uses. A safeguarding note is handled by the route (filePrivate), never here.
import { localParts } from '../lib/time';
import { getClockContext } from '../repos/clock';
import { modelForFeature } from '../repos/settings';
import { callLLMStructured, type LlmStructuredResult } from '../llm/client';
import { NOTE_ROUTE_SYSTEM, NOTE_ROUTE_VERSION, noteItems, noteRouteInstruction } from '../llm/prompts/noteRoute';
import { noteRouteSchema, type NoteRoute, type NoteDestination } from '../llm/schemas/noteRoute';
import { createTask, listGroups } from '../repos/tasks';
import { createEventFromIntake } from '../repos/events';
import { fileCaptured } from '../repos/captured';
import { createNote, updateNoteBody } from '../repos/notes';

export async function routeNote(text: string): Promise<LlmStructuredResult<NoteRoute>> {
  const [groups, clock] = await Promise.all([listGroups(), getClockContext()]);
  const today = localParts(new Date(), clock.tz).isoDate;
  return callLLMStructured(
    {
      feature: 'note_route',
      model: await modelForFeature('note_route', 'cheap'),
      promptVersion: NOTE_ROUTE_VERSION,
      system: NOTE_ROUTE_SYSTEM,
      context: noteItems(text),
      instruction: noteRouteInstruction(today, groups.map((g) => g.name)),
      maxTokens: 1200,
    },
    noteRouteSchema,
  );
}

const KIND_LABEL: Record<NoteDestination['kind'], string> = { task: 'a task', event: 'an event', captured: 'a captured item', note: 'a note' };

/** Create each confirmed destination via the existing repos. Returns a label per item created. */
export async function applyDestinations(destinations: NoteDestination[]): Promise<string[]> {
  const groups = await listGroups();
  const groupId = (name: string | null): number | null => (name ? groups.find((g) => g.name === name)?.id ?? null : null);
  const made: string[] = [];
  for (const d of destinations) {
    const title = d.title.trim() || 'Note';
    if (d.kind === 'task') {
      await createTask(title, d.summary || null);
    } else if (d.kind === 'event') {
      await createEventFromIntake({ kind: d.eventKind ?? 'other', title, date: d.dateIso, detail: d.summary || null });
    } else if (d.kind === 'captured') {
      await fileCaptured({ body: d.summary ? `${title} — ${d.summary}` : title, category: d.category, groupId: groupId(d.groupName), safeguarding: false });
    } else {
      const { id } = await createNote({ kind: 'general', groupId: groupId(d.groupName) });
      await updateNoteBody(id, d.summary ? `${title}\n${d.summary}` : title);
    }
    made.push(KIND_LABEL[d.kind]);
  }
  return made;
}

/** The safe default: drop the whole note into general notes (used for AI-off / unsure / plain-add). */
export async function fileGeneralNote(text: string): Promise<void> {
  const { id } = await createNote({ kind: 'general' });
  await updateNoteBody(id, text);
}

/** A note the teacher marked private: filed as a flagged captured item (in the safeguarding register,
 *  withheld from all AI). It is NEVER sent — the route calls this instead of routeNote(). */
export async function filePrivate(text: string): Promise<void> {
  await fileCaptured({ body: text, category: 'safeguarding', groupId: null, safeguarding: true });
}
