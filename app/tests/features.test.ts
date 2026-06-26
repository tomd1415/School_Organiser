import { describe, it, expect } from 'vitest';
import { AI_FEATURES, FEATURE_KEYS, MODEL_OPTIONS, KNOWN_MODEL_IDS, isFeatureModelKey } from '../src/llm/features';

// The wrapper feature labels. If a call site's label changes, this list must too — the registry
// is what the Settings picker and the per-feature override validation are built on.
const EXPECTED_KEYS = [
  'author_scheme', 'generate_assessment', 'class_intake', 'draft_lesson', 'adapt_lesson', 'adapt_resources', 'improve_master',
  'lesson_resources', 'convert_unit', 'generate_resource', 'cover_pack', 'resource_import', 'term_summary', 'mark_scheme',
  'captured_categorise', 'task_breakdown', 'retrieval_starter', 'class_work', 'mark_answers',
  'pupil_profile', 'email_triage', 'note_route', 'coverage_check', 'review_lesson',
];

describe('AI feature registry (idea 5)', () => {
  it('lists exactly the known features, with unique keys and valid roles', () => {
    expect(AI_FEATURES).toHaveLength(24);
    expect(new Set(AI_FEATURES.map((f) => f.key))).toEqual(new Set(EXPECTED_KEYS));
    expect(AI_FEATURES.every((f) => ['plan', 'design', 'cheap'].includes(f.role))).toBe(true);
  });

  it('the Wave 5 reviewer defaults to the Planning (Sonnet) role, not Opus', () => {
    expect(AI_FEATURES.find((f) => f.key === 'review_lesson')?.role).toBe('plan');
  });

  it('the design (Opus) role is reserved for the heavy synthesis features', () => {
    expect(AI_FEATURES.filter((f) => f.role === 'design').map((f) => f.key).sort()).toEqual(['author_scheme', 'class_intake', 'generate_assessment']);
  });

  it('isFeatureModelKey accepts ai_model_feature_<known>, rejects unknown features and other keys', () => {
    expect(isFeatureModelKey('ai_model_feature_draft_lesson')).toBe(true);
    expect(isFeatureModelKey('ai_model_feature_bogus')).toBe(false);
    expect(isFeatureModelKey('ai_style_prefs')).toBe(false);
    expect(isFeatureModelKey('ai_model_plan')).toBe(false);
  });

  it('every offered model is one we have pricing for (cost + cap stay accurate)', () => {
    for (const m of MODEL_OPTIONS) expect(KNOWN_MODEL_IDS.has(m.id)).toBe(true);
    expect(FEATURE_KEYS.size).toBe(24);
  });
});
