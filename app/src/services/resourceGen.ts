// Generate ONE lesson's resource set (slides, worksheet, TA notes, answers) and store each document in
// the resource store, linked to the plan. Re-running creates new VERSIONS, not copies.
//
// This lived inline in routes/schemes.ts; it moved here (a pure service) when generation became an async
// JOB (services/resourceJobs.ts) so the route no longer blocks for the whole multi-minute generation.
// Two reliability properties matter and are handled here, NOT in the route:
//   • COMPLETENESS — the four-doc call shares one token budget and reliably under-invests in later
//     documents, so a "completed" run can ship a thin 🟡 Core / 🔴 Challenge worksheet or a stub deck.
//     After the first pass we assessResourceSet() and regenerate ONLY the deficient documents (the
//     four-doc call for worksheet/ta_notes/answers so they stay coherent with each other; the dedicated
//     deck for slides), keeping the better version per kind, then report what's still imperfect honestly.
//   • PROGRESS — onStage() lets the job surface what it's doing ("Checking everything is complete…") so
//     the teacher's polling UI shows live progress instead of an opaque wait.
import { getPlanContext, getPlanRow } from '../repos/schemes';
import { addVersionWithFile, createResourceWithVersion, linkResourceToPlan, listResourcesForPlan } from '../repos/resources';
import { checksum } from '../lib/resourceStore';
import { safeFilename } from './resource';
import {
  lessonResourcesSchema,
  tidyResourceSet,
  assessResourceSet,
  type TidyResource,
  type ResourceKind,
} from '../llm/schemas/lessonResources';
import { generateLessonDeck } from './slideGen';
import {
  LESSON_RESOURCES_INSTRUCTION,
  LESSON_RESOURCES_SYSTEM,
  LESSON_RESOURCES_VERSION,
  lessonResourceItems,
  lessonImageItems,
  lessonMaterialItems,
  examStyleItems,
} from '../llm/prompts/lessonResources';
import { examProfileForCourse } from './examProfile';
import { ensureSourceImagesForPlan } from './sourceImages';
import { lessonMaterialsForPlan } from './lessonMaterials';
import { listActiveEquipment } from '../repos/equipment';
import { equipmentItem } from '../llm/prompts/equipment';
import { teachingContextItems } from '../llm/prompts/teachingContext';
import { standingPrefItems } from './standingPrefs';
import { conceptItemsFor } from './teachingConcepts';
import { modelForFeature } from '../repos/settings';
import { callLLMStructured } from '../llm/client';

// each file gets a friendly title / a store kind. Re-running adds a VERSION to the same titled resource.
const RES_KIND_LABEL: Record<string, string> = { slides: 'slides', worksheet: 'worksheet', ta_notes: 'TA notes', answers: 'answers', support: 'support worksheet' };
const RES_KIND_STORE: Record<string, string> = { slides: 'slides', worksheet: 'worksheet', ta_notes: 'ta_notes', answers: 'document', support: 'worksheet' };

const MAX_FIX_ROUNDS = 2; // how many completeness-driven regeneration rounds before we save-and-warn

export type StageFn = (stage: string) => void;

export interface GenerateOutcome {
  ok: boolean;
  message: string;
  complete?: boolean; // true ⇒ assessResourceSet found no remaining issues
  warnings?: string[]; // remaining structural issues when we saved an imperfect set anyway
}

// The worksheet, TA notes and answers are generated TOGETHER (the answers are the mark scheme for the
// worksheet's questions, and the TA notes reference both), so they must stay COHERENT — we keep or
// replace them as one trio, never mixing one document from a different generation. The slide deck has no
// such tie (its own call, no separate answer key), so it is merged independently.
const TRIO: ResourceKind[] = ['worksheet', 'ta_notes', 'answers'];
const FINAL_ORDER: ResourceKind[] = ['slides', 'worksheet', 'ta_notes', 'answers'];

/** How many completeness issues a set has among the given kinds (lower is better; 0 = complete). Used to
 *  pick the better WHOLE trio / deck across regeneration rounds. assessResourceSet flags the kinds NOT in
 *  the set as "missing" too, so we only count issues for the kinds we're comparing. */
function issueCountForKinds(docs: TidyResource[], kinds: ResourceKind[]): number {
  return assessResourceSet(docs).issues.filter((i) => kinds.includes(i.kind)).length;
}

/** The worksheet/ta_notes/answers documents from a tidied set, in trio order (omitting any the model
 *  didn't return — assessResourceSet then flags those as missing). */
function trioFrom(docs: TidyResource[]): TidyResource[] {
  return TRIO.map((k) => docs.find((d) => d.kind === k)).filter((d): d is TidyResource => d != null);
}

export async function generateResourcesForPlan(planId: number, useMaterials = true, onStage: StageFn = () => {}): Promise<GenerateOutcome> {
  onStage('Reading the lesson and your class context…');
  const [ctx, row] = await Promise.all([getPlanContext(planId), getPlanRow(planId)]);
  if (!ctx || !row) return { ok: false, message: 'Lesson not found.' };
  if (!(row.objectives ?? '').trim() && !(row.outline ?? '').trim()) {
    return { ok: false, message: 'Write or ✨draft the objectives/outline first — resources are generated from them.' };
  }
  const standing = await standingPrefItems();
  const concepts = await conceptItemsFor(ctx.courseId);
  const modelChoice = await modelForFeature('lesson_resources', 'plan');
  const equipment = await listActiveEquipment();
  // Carry over the source slides' images so the model can embed them where the lesson refers to a
  // visual (best-effort; empty when the plan has no linked Office source). Never blocks generation.
  // (This also backfills unit-level source links onto the plan, so the material read below sees them.)
  const images = await ensureSourceImagesForPlan(planId).catch(() => []);
  // Phase 12 B2: build the worksheet ON the lesson's own prepared materials (extracted text). Runs
  // after the image step so any unit-level sources it linked are visible here. Best-effort; empty ⇒
  // no item, so a lesson with no uploaded materials generates exactly as before. B4: opt-out skips it.
  const materials = useMaterials
    ? await lessonMaterialsForPlan(planId).catch(() => ({ text: '', files: [], truncated: false }))
    : { text: '', files: [], truncated: false };
  // B5: weight OCR GCSE exam-style questions by how close this course is to its exams (KS3 ⇒ none).
  const examProfile = await examProfileForCourse(ctx.courseId, new Date()).catch(
    () => ({ stage: 'foundational', weighting: 'none', monthsToExam: null, label: '' }) as const,
  );
  // One context array, shared by the four-doc call and the dedicated deck call below.
  const contextItems = [
    ...standing,
    ...concepts,
    ...teachingContextItems(ctx.teachingContext),
    ...equipmentItem(equipment),
    ...lessonImageItems(images),
    ...lessonMaterialItems(materials.text),
    ...examStyleItems(examProfile),
    ...lessonResourceItems({ courseName: ctx.courseName, unitTitle: ctx.unitTitle, planTitle: ctx.planTitle, objectives: row.objectives, outline: row.outline }),
  ];
  const callOnce = () =>
    callLLMStructured(
      {
        feature: 'lesson_resources',
        model: modelChoice,
        promptVersion: LESSON_RESOURCES_VERSION,
        system: LESSON_RESOURCES_SYSTEM,
        context: contextItems,
        instruction: LESSON_RESOURCES_INSTRUCTION,
        maxTokens: 32000, // generous: the worksheet/TA-notes/answers set must never truncate (the deck is a separate call)
      },
      lessonResourcesSchema,
    );
  const deckOnce = () => generateLessonDeck({ model: modelChoice, context: contextItems, mode: 'generate' }).catch(() => null);

  // The slide deck is generated in its OWN call: the four-doc call reliably under-invests in the deck
  // (a 2–3 slide stub — the "only the first couple of slides" bug). Run both at once so the dedicated
  // deck adds no wall-time, then override the four-doc call's stub deck with the full one.
  onStage('Generating slides, worksheet, TA notes and answers…');
  const [result, deck] = await Promise.all([callOnce(), deckOnce()]);
  if (result.status !== 'ok' || !result.data) return { ok: false, message: result.message ?? 'AI unavailable — nothing generated.' };

  // Round 0. Keep the worksheet/ta_notes/answers trio together (coherence — see TRIO) and take the deck
  // from its dedicated call, falling back to the four-doc call's stub deck only if the dedicated one failed.
  const tidy0 = tidyResourceSet(result.data.resources);
  let bestTrio = trioFrom(tidy0.docs);
  let bestDeck: TidyResource | null =
    deck && deck.trim() ? { kind: 'slides', title: `Slides — ${ctx.planTitle}`, content: deck } : (tidy0.docs.find((d) => d.kind === 'slides') ?? null);
  const currentDocs = (): TidyResource[] => [...(bestDeck ? [bestDeck] : []), ...bestTrio];

  onStage('Checking every document is complete…');
  let assessment = assessResourceSet(currentDocs());
  for (let round = 1; round <= MAX_FIX_ROUNDS && !assessment.complete; round++) {
    const need = new Set(assessment.regenerate);
    const trioNeeded = TRIO.some((k) => need.has(k));
    const slidesNeeded = need.has('slides');
    onStage(`Filling gaps (attempt ${round}) — ${assessment.regenerate.join(', ')}…`);
    // Re-run only the calls that own a deficient document, in parallel. The four-doc call regenerates the
    // whole trio coherently; we then keep whichever WHOLE trio / deck is more complete (never a per-doc mix).
    const [docsRetry, deckRetry] = await Promise.all([
      trioNeeded ? callOnce() : Promise.resolve(null),
      slidesNeeded ? deckOnce() : Promise.resolve(null),
    ]);
    if (docsRetry && docsRetry.status === 'ok' && docsRetry.data) {
      const candTrio = trioFrom(tidyResourceSet(docsRetry.data.resources).docs);
      if (issueCountForKinds(candTrio, TRIO) < issueCountForKinds(bestTrio, TRIO)) bestTrio = candTrio;
    }
    if (deckRetry && deckRetry.trim()) {
      const candDeck: TidyResource = { kind: 'slides', title: `Slides — ${ctx.planTitle}`, content: deckRetry };
      if (!bestDeck || issueCountForKinds([candDeck], ['slides']) < issueCountForKinds([bestDeck], ['slides'])) bestDeck = candDeck;
    }
    assessment = assessResourceSet(currentDocs());
  }

  // Refuse to save only when a pupil-facing document is entirely ABSENT — a thin tier we save and warn
  // about (the teacher can re-run), but a missing deck or worksheet is not a usable lesson.
  const rank = (k: string): number => {
    const i = (FINAL_ORDER as string[]).indexOf(k);
    return i === -1 ? FINAL_ORDER.length : i;
  };
  const finalDocs: TidyResource[] = currentDocs()
    .filter((d) => d.content.trim().length > 0)
    .sort((a, b) => rank(a.kind) - rank(b.kind));
  const absent = ['slides', 'worksheet'].filter((k) => !finalDocs.some((d) => d.kind === k));
  if (absent.length) return { ok: false, message: `The AI returned an incomplete set (missing: ${absent.join(', ')}) — try again.` };

  onStage(`Saving ${finalDocs.length} document(s)…`);
  const existing = await listResourcesForPlan(planId);
  let created = 0;
  let updated = 0;
  for (const r of finalDocs) {
    const kind = r.kind;
    const filename = `${safeFilename(ctx.planTitle).replace(/\.md$/i, '') || 'lesson'} — ${RES_KIND_LABEL[kind] ?? kind}.md`;
    const buf = Buffer.from(r.content, 'utf8');
    const match = existing.find((e) => e.title === filename);
    if (match) {
      await addVersionWithFile(match.resourceId, { filename, buf, checksum: checksum(buf), author: 'ai', changeNote: 'AI-regenerated' }); // BUG-028
      updated++;
    } else {
      const id = await createResourceWithVersion(
        { title: filename, kind: RES_KIND_STORE[kind] ?? 'document', mimeType: 'text/markdown', source: 'ai_generated' },
        { filename, buf, checksum: checksum(buf), author: 'ai', changeNote: 'AI-generated' },
      ); // BUG-028: atomic row+version+file
      await linkResourceToPlan(id, planId);
      created++;
    }
  }
  const builtOn = materials.files.length ? ` · built on ${materials.files.length} of your file(s)${materials.truncated ? ' (partial)' : ''}` : '';
  const warnings = assessment.complete ? undefined : assessment.issues.map((i) => i.problem);
  const message = assessment.complete
    ? `resources ready ✓ — ${created} new, ${updated} updated${builtOn} (linked below)`
    : `resources saved with gaps ⚠ — ${created} new, ${updated} updated${builtOn}. Still incomplete: ${assessment.issues.map((i) => i.problem).join('; ')}. Re-run to improve.`;
  return { ok: true, message, complete: assessment.complete, warnings };
}
