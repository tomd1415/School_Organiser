// Fetch a class's guided-access answers and turn them into context[] items (idea 7). Thin async seam
// over the pure accessConstraintItems() builder; spread into the class-scoped generators.
import { getGuidedAccess } from '../repos/adaptations';
import { accessConstraintItems } from '../llm/prompts/accessConstraints';
import type { RedactableItem } from './redact';

export async function accessItemsFor(groupCourseId: number): Promise<RedactableItem[]> {
  const answers = await getGuidedAccess(groupCourseId).catch(() => null);
  return accessConstraintItems(answers);
}
