// Phase 11 — class-intake service. Run a free-text class description through Opus (the one wrapper)
// and apply the structured result to the class's per-class fields. Cohort-level; the route fires the
// one-shot auto scheme-adapt afterwards (context is now set).
import { callLLMStructured, type LlmStructuredResult } from '../llm/client';
import { CLASS_INTAKE_SYSTEM, CLASS_INTAKE_VERSION, CLASS_INTAKE_INSTRUCTION, classIntakeItems } from '../llm/prompts/classIntake';
import { classIntakeSchema, type ClassIntake } from '../llm/schemas/classIntake';
import { modelForFeature } from '../repos/settings';
import { setGroupTeachingContext, setGroupAbility, setGuidedAccess, setCoveredSummary } from '../repos/adaptations';
import type { GuidedAccess } from '../llm/prompts/accessConstraints';

export async function runClassIntake(text: string): Promise<LlmStructuredResult<ClassIntake>> {
  return callLLMStructured(
    {
      feature: 'class_intake',
      model: await modelForFeature('class_intake', 'design'), // Opus — careful synthesis of a class
      promptVersion: CLASS_INTAKE_VERSION,
      system: CLASS_INTAKE_SYSTEM,
      context: classIntakeItems(text),
      instruction: CLASS_INTAKE_INSTRUCTION,
      maxTokens: 2000,
    },
    classIntakeSchema,
  );
}

/** Fill the class's fields from the intake result. Teaching context + covered summary are set; ability
 *  and access needs are filled only where the model found them (so a blank field doesn't wipe a real one). */
export async function applyClassIntake(gc: number, data: ClassIntake): Promise<void> {
  await setGroupTeachingContext(gc, data.teachingContext ?? '');
  await setCoveredSummary(gc, data.coveredSummary ?? '');
  if (data.abilityMidpoint && data.abilityMidpoint.trim()) await setGroupAbility(gc, data.abilityMidpoint.trim());
  const g = data.guidedAccess;
  const ga: GuidedAccess = {};
  if (g) {
    if (typeof g.viFont === 'number' && g.viFont > 0) ga.viFont = Math.round(g.viFont);
    if (g.shortAttention) ga.shortAttention = true;
    if (g.readingAge && g.readingAge.trim()) ga.readingAge = g.readingAge.trim();
    if (g.eal) ga.eal = true;
    if (g.dyslexiaFriendly) ga.dyslexiaFriendly = true;
    if (g.lowTyping) ga.lowTyping = true;
  }
  if (Object.keys(ga).length > 0) await setGuidedAccess(gc, ga); // only overwrite access when the model found some
}
