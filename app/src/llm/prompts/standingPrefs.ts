// Idea 3 — the teacher's STANDING style & feature preferences, applied to every planning/authoring
// call so intent set once ("plain step-by-step language", "always include a retrieval starter")
// sticks across drafts, adaptations, resources and scheme authoring. Cohort-level prose only — never
// about an individual pupil. Rides the wrapper's context[] like every other input, so it inherits
// redaction/withholding/audit; returns [] when nothing is set (a literal no-op).
import type { RedactableItem } from '../../services/redact';

const MAX = 2000; // generous free text, but bounded so a paste can't dominate the prompt

export function styleItems(stylePrefs: string | null | undefined, featurePrefs: string | null | undefined): RedactableItem[] {
  const items: RedactableItem[] = [];
  const style = (stylePrefs ?? '').trim().slice(0, MAX);
  const feature = (featurePrefs ?? '').trim().slice(0, MAX);
  if (style) {
    items.push({
      text:
        "TEACHER'S STANDING STYLE PREFERENCES — apply to HOW this is written (cohort-level; never about " +
        `an individual pupil):\n${style}`,
    });
  }
  if (feature) {
    items.push({
      text:
        "TEACHER'S STANDING FEATURE REQUIREMENTS — include these where they fit, WITHOUT lengthening the " +
        `lesson (rebalance within the existing time, don't add to it):\n${feature}`,
    });
  }
  return items;
}
