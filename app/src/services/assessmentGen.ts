// Phase 1 — orchestrate end-to-end generation: blueprint → callLLMStructured → validate → materialise a
// DRAFT assessment. Mirrors services/marking.ts deriveScheme. Degrades cleanly: if the wrapper returns
// unavailable/blocked/error, or validation yields zero usable questions, NOTHING is written and a
// teacher-actionable message is returned. Generation is design-heavy → the `design` role (Opus by default).
import { blueprintForUnit, type BlueprintOpts } from './assessmentBlueprint';
import { validateGenerated } from './assessmentValidate';
import { callLLMStructured } from '../llm/client';
import { modelForFeature } from '../repos/settings';
import { materialiseAssessment } from '../repos/assessments';
import { generateAssessmentSchema } from '../llm/schemas/generateAssessment';
import {
  GENERATE_ASSESSMENT_SYSTEM,
  GENERATE_ASSESSMENT_VERSION,
  generateAssessmentInstruction,
  generateAssessmentItems,
  type GenerateAssessmentOpts,
} from '../llm/prompts/generateAssessment';

export interface GenResult {
  ok: boolean;
  message: string;
  assessmentId?: number;
  warnings?: string[];
}

export interface GenerateOpts extends GenerateAssessmentOpts, BlueprintOpts {}

export async function generateAssessment(unitId: number, groupCourseId: number, opts?: GenerateOpts): Promise<GenResult> {
  const blueprint = await blueprintForUnit(unitId, groupCourseId, new Date(), opts);
  if (!blueprint) return { ok: false, message: 'Could not build a blueprint for this unit — is it still part of a scheme?' };

  const result = await callLLMStructured(
    {
      feature: 'generate_assessment',
      model: await modelForFeature('generate_assessment', 'design'),
      promptVersion: GENERATE_ASSESSMENT_VERSION,
      system: GENERATE_ASSESSMENT_SYSTEM,
      context: generateAssessmentItems(blueprint),
      instruction: generateAssessmentInstruction(blueprint, opts),
      maxTokens: 16000, // a full paper — generous; cost scales with use and is pre-reserved against the cap
    },
    generateAssessmentSchema,
  );
  // Degrade: write NOTHING on any non-ok status.
  if (result.status !== 'ok' || !result.data) {
    return { ok: false, message: result.message ?? 'The AI could not generate an assessment right now.' };
  }

  const { questions, warnings } = validateGenerated(result.data, blueprint);
  if (questions.length === 0) {
    return { ok: false, message: 'The AI returned no usable questions — try again.', warnings };
  }

  const coveredSpecPointIds = blueprint.specPoints.filter((s) => s.covered).map((s) => s.id);
  const uncoveredSpecPointIds = blueprint.specPoints.filter((s) => !s.covered).map((s) => s.id);
  const assessmentId = await materialiseAssessment({
    unitId,
    schemeId: blueprint.schemeId,
    courseId: blueprint.courseId,
    title: `${blueprint.unitTitle} — end-of-unit assessment`,
    style: blueprint.style,
    examBoard: blueprint.examBoard,
    blueprint: {
      coveredSpecPointIds,
      uncoveredSpecPointIds,
      groupCourseId,
      style: blueprint.style,
      examBoard: blueprint.examBoard,
      generatedAt: new Date().toISOString(),
    },
    sourceType: 'ai_generated',
    promptVersion: GENERATE_ASSESSMENT_VERSION,
    questions,
  });

  return { ok: true, assessmentId, warnings, message: 'Draft assessment created — review it, then Mark ready.' };
}
