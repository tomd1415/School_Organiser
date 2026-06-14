// Phase 11 — per-class lesson adaptation, extracted so it runs both on demand (one lesson) and as a
// batch across a whole scheme. Adapts from recent lessons WHERE THEY EXIST, otherwise from the class's
// context (teaching context, ability, access needs). Everything goes through the one wrapper.
import { callLLMStructured } from '../llm/client';
import { ADAPT_LESSON_SYSTEM, ADAPT_LESSON_VERSION, adaptLessonInstruction, lessonItem, historyItems } from '../llm/prompts/adaptLesson';
import { adaptLessonSchema } from '../llm/schemas/adaptLesson';
import { groupContextItems, abilityItem, coveredItems } from '../llm/prompts/teachingContext';
import { equipmentItem } from '../llm/prompts/equipment';
import { missesItem } from '../llm/prompts/retrievalStarter';
import { standingPrefItems } from './standingPrefs';
import { conceptItemsFor } from './teachingConcepts';
import { accessItemsFor } from './accessConstraints';
import { paceItemsFor } from './pacing';
import { recentClassMisses } from './marking';
import { marksEnabled } from '../auth/marksGate';
import { modelForFeature } from '../repos/settings';
import { listActiveEquipment } from '../repos/equipment';
import {
  getEffectiveLesson,
  getGroupCourseInfo,
  getGroupAbility,
  getGroupTeachingContext,
  getGuidedAccess,
  recentGroupHistory,
  upsertAdaptation,
  groupCourseAutoAdapted,
  setGroupCourseAutoAdapted,
  getCoveredSummary,
} from '../repos/adaptations';
import { getActiveScheme, getCourseTeachingContext, getLessonPlan } from '../repos/schemes';
import { schemeLessons } from '../repos/specPoints';

export type AdaptStatus = 'ok' | 'skip' | 'blocked' | 'unavailable' | 'error' | 'notfound';
export interface AdaptOutcome {
  status: AdaptStatus;
  hadHistory: boolean;
  message?: string;
}

/** Adapt ONE master lesson for one class. Pure of HTTP — the route renders from the outcome. */
export async function adaptLessonForClass(gc: number, lp: number): Promise<AdaptOutcome> {
  const [master, info, history, groupCtx, ability, guided, covered] = await Promise.all([
    getLessonPlan(lp),
    getGroupCourseInfo(gc),
    recentGroupHistory(gc),
    getGroupTeachingContext(gc),
    getGroupAbility(gc),
    getGuidedAccess(gc),
    getCoveredSummary(gc),
  ]);
  if (!master || !info) return { status: 'notfound', hadHistory: false };
  const hadHistory = history.length > 0;

  const hasClassContext = !!((groupCtx && groupCtx.trim()) || (covered && covered.trim()) || (ability && ability.trim()) || (guided && Object.keys(guided).length > 0));
  if (!hadHistory && !hasClassContext) return { status: 'skip', hadHistory };

  const eff = await getEffectiveLesson(gc, lp, { objectives: master.objectives, outline: master.outline });
  const misses = (await marksEnabled()) ? await recentClassMisses(gc) : [];
  const courseCtx = await getCourseTeachingContext(info.courseId);

  const result = await callLLMStructured(
    {
      feature: 'adapt_lesson',
      model: await modelForFeature('adapt_lesson', 'plan'),
      promptVersion: ADAPT_LESSON_VERSION,
      system: ADAPT_LESSON_SYSTEM,
      context: [
        ...(await standingPrefItems()),
        ...(await conceptItemsFor(info.courseId)),
        ...(await accessItemsFor(gc)),
        ...(await paceItemsFor(gc)),
        ...groupContextItems(courseCtx, groupCtx),
        ...coveredItems(covered),
        ...abilityItem(ability),
        ...equipmentItem(await listActiveEquipment()),
        lessonItem(master.title, eff.objectives, eff.outline, eff.adapted),
        ...historyItems(history),
        ...(misses.length ? [missesItem(misses)] : []),
      ],
      instruction: adaptLessonInstruction(info.courseName, info.groupName),
      maxTokens: 4000,
    },
    adaptLessonSchema,
  );
  if (result.status === 'blocked') return { status: 'blocked', hadHistory, message: result.message };
  if (result.status === 'unavailable') return { status: 'unavailable', hadHistory, message: result.message };
  if (result.status !== 'ok' || !result.data) return { status: 'error', hadHistory, message: result.message };

  await upsertAdaptation({
    groupCourseId: gc,
    lessonPlanId: lp,
    objectives: result.data.objectives.trim() || null,
    outline: result.data.outline.trim() || null,
    adaptationNote: result.data.adaptationNote.trim() || null,
    changeSummary: `AI: ${result.data.changeSummary.trim() || (hadHistory ? 'adapted from recent lessons' : 'adapted from class context')}`,
    author: 'ai',
  });
  return { status: 'ok', hadHistory };
}

export interface SchemeAdaptResult {
  total: number;
  adapted: number;
  skipped: number;
  stopped: boolean; // true if we stopped early (AI off / monthly cap reached)
}

/** Adapt every lesson of the class's active scheme. Stops early if AI is off or the £ cap is hit
 *  (each call self-checks the cap via the wrapper), so it can't blow the budget. */
export async function adaptSchemeForClass(gc: number): Promise<SchemeAdaptResult> {
  const info = await getGroupCourseInfo(gc);
  const scheme = info ? await getActiveScheme(info.courseId) : null;
  const lessons = scheme ? await schemeLessons(scheme.id) : [];
  let adapted = 0;
  let skipped = 0;
  let stopped = false;
  for (const l of lessons) {
    const o = await adaptLessonForClass(gc, l.id);
    if (o.status === 'ok') adapted += 1;
    else if (o.status === 'blocked' || o.status === 'unavailable') {
      stopped = true; // no point continuing — the cap is reached or there's no key
      break;
    } else skipped += 1; // 'skip' (nothing to adapt) / 'error' (transient) — keep going
  }
  return { total: lessons.length, adapted, skipped, stopped };
}

/** Auto-adapt a class's scheme the FIRST time it has both a scheme and teaching context. One-shot
 *  (flag-gated) so it never re-fires on its own; the teacher can re-run by hand any time. */
export async function maybeAutoAdaptScheme(gc: number): Promise<void> {
  if (await groupCourseAutoAdapted(gc)) return;
  const info = await getGroupCourseInfo(gc);
  const scheme = info ? await getActiveScheme(info.courseId) : null;
  if (!scheme) return;
  const lessons = await schemeLessons(scheme.id);
  if (lessons.length === 0) return;
  await setGroupCourseAutoAdapted(gc, true); // set BEFORE running so rapid context-saves can't double-fire
  await adaptSchemeForClass(gc);
}
