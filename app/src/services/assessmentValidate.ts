// Phase 1 — the PURE validator. AI output is suggestive, not trusted: map a GeneratedAssessment + the
// blueprint into DraftQuestion[] (the materialiseAssessment input), enforcing the DB's invariants. Pure (no
// I/O) → fully unit-tested. Key rules: resolve spec-point CODES to ids against the blueprint (never invent
// an id); trust the blueprint's covered flag over the model's isUncovered; clamp marks; normalise mark
// kinds; restrict response types to the launch widget set; fold options into partConfig only for the choice
// widgets; require ≥1 mark point per part; drop empty parts/questions; cap counts so a runaway can't bloat.
import type { GeneratedAssessment } from '../llm/schemas/generateAssessment';
import { RESPONSE_TYPES } from '../llm/schemas/generateAssessment';
import { normaliseMarkKind } from '../llm/schemas/markScheme';
import type { AssessmentBlueprint } from './assessmentBlueprint';
import type { DraftMarkPoint, DraftMisconception, DraftPart, DraftQuestion } from '../repos/assessments';

const MAX_QUESTIONS = 40;
const MAX_PARTS = 12;
const MAX_MARK_POINTS = 12;
const MARK_MIN = 0;
const MARK_MAX = 20;
const RESPONSE_SET = new Set<string>(RESPONSE_TYPES);
const DEFAULT_RESPONSE = 'medium_text';

const clampMarks = (n: unknown): number => {
  const v = Math.round(Number(n));
  return Number.isFinite(v) ? Math.max(MARK_MIN, Math.min(MARK_MAX, v)) : 0;
};
const clampOrNull = (n: unknown, lo: number, hi: number): number | null => {
  if (n == null) return null;
  const v = Math.round(Number(n));
  return Number.isFinite(v) ? Math.max(lo, Math.min(hi, v)) : null;
};
const str = (s: unknown): string => (typeof s === 'string' ? s.trim() : '');
const strOrNull = (s: unknown): string | null => str(s) || null;
const letterFor = (i: number): string => String.fromCharCode(97 + (i % 26));

export interface ValidateResult {
  questions: DraftQuestion[];
  warnings: string[];
}

/** Map the AI output into clamped/normalised DraftQuestion[]. Zero usable questions → an empty array (the
 *  caller treats that as a failed generation and writes nothing). */
export function validateGenerated(data: GeneratedAssessment, blueprint: AssessmentBlueprint): ValidateResult {
  const warnings: string[] = [];
  // code (lowercased) → { id, covered } from the blueprint — the ONLY source of spec-point ids.
  const byCode = new Map<string, { id: number; covered: boolean }>();
  for (const sp of blueprint.specPoints) byCode.set(sp.code.trim().toLowerCase(), { id: sp.id, covered: sp.covered });

  const questions: DraftQuestion[] = [];
  for (const q of data.questions ?? []) {
    if (questions.length >= MAX_QUESTIONS) {
      warnings.push(`Capped at ${MAX_QUESTIONS} questions; the rest were dropped.`);
      break;
    }
    // assessment_question_parts has UNIQUE (question_id, part_label) — the AI labels are free strings with
    // no uniqueness guarantee, so dedupe within the question (an empty or repeated label gets the next free
    // letter). Without this a paper with two parts labelled "a" would crash materialiseAssessment.
    const usedLabels = new Set<string>();

    // Resolve the spec-point code → id; drop/null an unknown code (never invent an id).
    let specPointId: number | null = null;
    let coveredFlag: boolean | null = null;
    const rawCode = str(q.specPointCode);
    if (rawCode) {
      const hit = byCode.get(rawCode.toLowerCase());
      if (hit) {
        specPointId = hit.id;
        coveredFlag = hit.covered;
      } else {
        warnings.push(`Unknown spec-point code "${rawCode}" — left untagged.`);
      }
    }
    // Trust the blueprint's covered flag when we resolved a spec point; otherwise trust the model.
    const isUncovered = coveredFlag != null ? !coveredFlag : !!q.isUncovered;

    const parts: DraftPart[] = [];
    for (const p of q.parts ?? []) {
      if (parts.length >= MAX_PARTS) {
        warnings.push(`A question had more than ${MAX_PARTS} parts; the rest were dropped.`);
        break;
      }
      const prompt = str(p.prompt);
      if (!prompt) {
        warnings.push('Dropped a part with an empty prompt.');
        continue;
      }
      const rawType = str(p.responseType);
      const responseType = RESPONSE_SET.has(rawType) ? rawType : DEFAULT_RESPONSE;
      if (rawType && !RESPONSE_SET.has(rawType)) warnings.push(`Unknown response type "${rawType}" → ${DEFAULT_RESPONSE}.`);
      const marks = clampMarks(p.marks);

      // Options fold into partConfig ONLY for the choice widgets; null for everything else.
      const options = Array.isArray(p.options) ? p.options.map(str).filter(Boolean) : [];
      const partConfig =
        (responseType === 'multiple_choice' || responseType === 'tick_box') && options.length ? { options } : null;

      let markPoints: DraftMarkPoint[] = [];
      for (const mp of p.markPoints ?? []) {
        if (markPoints.length >= MAX_MARK_POINTS) {
          warnings.push('A part had more than ' + MAX_MARK_POINTS + ' mark points; the rest were dropped.');
          break;
        }
        const text = str(mp.text);
        if (!text) continue;
        markPoints.push({
          text,
          marks: clampMarks(mp.marks),
          isRequired: !!mp.required,
          acceptedAlternatives: Array.isArray(mp.acceptedAlternatives) ? mp.acceptedAlternatives.map(str).filter(Boolean).slice(0, 20) : [],
          kind: normaliseMarkKind(str(mp.kind)),
        });
      }
      if (markPoints.length === 0) {
        // Every part needs ≥1 mark point — synthesise a single open one worth the part marks so the part
        // stays markable (and so the paper can pass the Mark-ready guard).
        markPoints = [{ text: 'Award by marker judgement against the model answer.', marks, isRequired: false, acceptedAlternatives: [], kind: 'open' }];
        warnings.push('A part had no usable mark points — added one open mark point.');
      }

      const misconceptions: DraftMisconception[] = Array.isArray(p.misconceptions)
        ? p.misconceptions.map((m) => ({ label: str(m.label), description: str(m.description) })).filter((m) => m.label || m.description)
        : [];

      let partLabel = str(p.partLabel);
      if (!partLabel || usedLabels.has(partLabel)) {
        let i = parts.length;
        while (usedLabels.has(letterFor(i))) i++;
        partLabel = letterFor(i);
      }
      usedLabels.add(partLabel);

      parts.push({
        partLabel,
        prompt,
        marks,
        expectedResponseType: responseType,
        partConfig,
        modelAnswer: strOrNull(p.modelAnswer),
        markPoints,
        misconceptions,
      });
    }

    if (parts.length === 0) {
      warnings.push('Dropped a question with no usable parts.');
      continue;
    }

    questions.push({
      stem: str(q.stem),
      specPointId,
      isUncovered,
      commandWordCode: strOrNull(q.commandWord),
      archetypeCode: strOrNull(q.archetype),
      difficultyBand: clampOrNull(q.difficultyBand, 1, 9),
      difficultyStep: clampOrNull(q.difficultyStep, 1, 3),
      modelAnswer: strOrNull(q.modelAnswer),
      parts,
    });
  }

  return { questions, warnings };
}
