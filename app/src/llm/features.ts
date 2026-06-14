// Phase 11 idea 5 — the registry of AI features for the per-feature model picker. Each feature can
// override its model in Settings (key `ai_model_feature_<key>`); unset = its role default, i.e.
// today's behaviour exactly. The selectable list is restricted to the priced models so cost
// estimates and the monthly spend cap stay accurate (decided 2026-06-14).
import { PRICE_PENCE_PER_MTOK, type ModelRole } from '../config/llm';

export interface FeatureDef {
  key: string; // the audit/feature label used at the call site
  label: string; // display name in Settings
  role: ModelRole; // the role its model falls back to when unset
  note?: string; // short guidance
}

// Grouped by role for the Settings UI; `key` matches the wrapper `feature` label at each call site.
export const AI_FEATURES: readonly FeatureDef[] = [
  { key: 'author_scheme', label: 'Author a scheme of work', role: 'design', note: 'Heavy curriculum design — Opus by default.' },
  { key: 'draft_lesson', label: 'Draft a lesson', role: 'plan' },
  { key: 'adapt_lesson', label: 'Adapt a lesson for a class', role: 'plan' },
  { key: 'adapt_resources', label: 'Adapt resources for a class', role: 'plan' },
  { key: 'improve_master', label: 'Improve the master lesson', role: 'plan' },
  { key: 'lesson_resources', label: 'Generate lesson resources', role: 'plan' },
  { key: 'convert_unit', label: 'Convert a downloaded unit', role: 'plan' },
  { key: 'generate_resource', label: 'Generate a one-off resource', role: 'plan' },
  { key: 'term_summary', label: "Summarise a term's notes", role: 'plan' },
  { key: 'mark_scheme', label: 'Derive a mark scheme', role: 'plan' },
  { key: 'captured_categorise', label: 'Auto-file a captured note', role: 'cheap' },
  { key: 'task_breakdown', label: 'Break a task into steps', role: 'cheap' },
  { key: 'retrieval_starter', label: 'Retrieval-practice starter', role: 'cheap' },
  { key: 'class_work', label: 'Summarise class answers', role: 'cheap' },
  { key: 'mark_answers', label: 'Mark written answers', role: 'cheap' },
  { key: 'pupil_profile', label: "Pupil 'what works for me' note", role: 'cheap' },
  { key: 'email_triage', label: 'Triage a forwarded email', role: 'cheap' },
  { key: 'note_route', label: 'Smart-file a quick note', role: 'cheap' },
  { key: 'coverage_check', label: 'Suggest coverage for spec gaps', role: 'cheap' },
];

export const FEATURE_KEYS: ReadonlySet<string> = new Set(AI_FEATURES.map((f) => f.key));

export interface ModelOption {
  id: string;
  label: string;
}

// The selectable models — friendly labels for the picker. Ids must stay in sync with the priced set.
export const MODEL_OPTIONS: readonly ModelOption[] = [
  { id: 'claude-opus-4-8', label: 'Opus 4.8 — strongest, priciest' },
  { id: 'claude-sonnet-4-6', label: 'Sonnet 4.6 — balanced' },
  { id: 'claude-haiku-4-5', label: 'Haiku 4.5 — fastest, cheapest' },
];

// Validation set: only models we have pricing for can be chosen (keeps cost + cap accurate).
export const KNOWN_MODEL_IDS: ReadonlySet<string> = new Set(Object.keys(PRICE_PENCE_PER_MTOK));

/** Is this a valid per-feature model-override settings key? (`ai_model_feature_<known feature>`) */
export function isFeatureModelKey(key: string): boolean {
  return key.startsWith('ai_model_feature_') && FEATURE_KEYS.has(key.slice('ai_model_feature_'.length));
}
