// Fetch the active teaching concepts for a course (own + global) and turn them into context[] items
// (idea 1.1). Kept separate from the pure conceptItems() builder so the builder stays DB-free.
import { listActiveConceptsForCourse } from '../repos/concepts';
import { conceptItems } from '../llm/prompts/teachingConcepts';
import type { RedactableItem } from './redact';

export async function conceptItemsFor(courseId: number | null): Promise<RedactableItem[]> {
  const rows = await listActiveConceptsForCourse(courseId).catch(() => []);
  return conceptItems(rows.map((r) => ({ title: r.title, body: r.body })));
}
