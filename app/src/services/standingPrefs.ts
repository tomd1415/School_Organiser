// Fetch the two standing-pref settings and turn them into context[] items (idea 3). Kept separate
// from the pure styleItems() builder so the builder stays DB-free and unit-testable; this is the
// thin async seam the generation call sites spread into their context arrays.
import { getSetting } from '../repos/settings';
import { styleItems } from '../llm/prompts/standingPrefs';
import type { RedactableItem } from './redact';

export async function standingPrefItems(): Promise<RedactableItem[]> {
  const [style, feature] = await Promise.all([
    getSetting('ai_style_prefs').catch(() => null),
    getSetting('ai_feature_prefs').catch(() => null),
  ]);
  return styleItems(style, feature);
}
