// Phase 9 marking orchestration. Resolves the worksheet's scheme for a lesson instance, marks the
// objective fields deterministically (instant, free), and marks open fields with the AI in
// anonymous per-question batches — guarded and safety-gated. Everything routes through the one LLM
// wrapper, so names never leave and spend is capped/audited. Gated by marksEnabled() at the call site.
import { getLessonWorksheet, getLessonDocMarkdown } from './worksheet';
import { renderWorksheet } from '../lib/worksheetForm';
import { isDeterministic, markField, type MarkPoint } from '../lib/deterministicMarker';
import { gateMark, guardMatch } from '../lib/markSafetyGate';
import {
  answersForMarking,
  alreadyMarkedAnswerIds,
  confirmedMarksForPupil,
  getComment,
  getMarkingSettings,
  getScheme,
  markStatsByField,
  marksReleasedAt,
  occCoursePlan,
  recentMarkedOccurrenceCourses,
  setSchemeStatus,
  upsertScheme,
  writeMark,
  type SchemePoint,
  type MarkingAnswer,
} from '../repos/marking';
import { callLLM, callLLMStructured } from '../llm/client';
import { modelForFeature } from '../repos/settings';
import { marksEnabled } from '../auth/marksGate';
import { pool } from '../db/pool';
import { profileInputs, setProfile } from '../repos/pupilProfiles';
import { PUPIL_PROFILE_SYSTEM, PUPIL_PROFILE_VERSION, PUPIL_PROFILE_INSTRUCTION, pupilProfileItems } from '../llm/prompts/pupilProfile';
import { markAnswersSchema } from '../llm/schemas/markAnswers';
import { MARK_ANSWERS_SYSTEM, MARK_ANSWERS_VERSION, MARK_ANSWERS_INSTRUCTION, markAnswersItems } from '../llm/prompts/markAnswers';
import { markSchemeSchema, normaliseMarkKind } from '../llm/schemas/markScheme';
import { MARK_SCHEME_SYSTEM, MARK_SCHEME_VERSION, MARK_SCHEME_INSTRUCTION, markSchemeItems } from '../llm/prompts/markScheme';

interface Resolved {
  groupCourseId: number;
  resourceId: number;
  versionNo: number;
  schemeVersionNo: number | null; // the version the CHOSEN scheme is for — only answers of that provenance are marked (BUG-015)
  pointsByField: Map<string, SchemePoint[]>;
  labelByKey: Map<string, string>;
}

/** Mark an answer ONLY against the scheme for its own provenance — never an older version's or a
 *  different worksheet's answer against this scheme (BUG-015). Unknown (null) provenance is marked
 *  best-effort against the resolved scheme, preserving pre-provenance behaviour. */
function matchesProvenance(a: MarkingAnswer, r: Resolved): boolean {
  return (a.resourceId == null || a.resourceId === r.resourceId) && (a.versionNo == null || a.versionNo === r.schemeVersionNo);
}

/** The worksheet version the pupils' answers were recorded against (provenance), if any. */
async function answersVersionFor(occurrenceCourseId: number, resourceId: number): Promise<number | null> {
  const { rows } = await pool.query<{ v: number | null }>(
    `SELECT max(version_no) v FROM pupil_answers WHERE occurrence_course_id = $1 AND resource_id = $2 AND version_no IS NOT NULL`,
    [occurrenceCourseId, resourceId],
  );
  return rows[0]?.v ?? null;
}

/** Resolve the worksheet + its ready scheme for a lesson instance. Null if no plan / worksheet / scheme.
 *  Marks against the scheme for the VERSION the pupils actually answered (provenance), falling back
 *  to the current version — so a re-version doesn't silently mark old answers against a new scheme. */
async function resolve(occurrenceCourseId: number): Promise<Resolved | null> {
  const oc = await occCoursePlan(occurrenceCourseId);
  if (!oc || oc.lessonPlanId == null) return null;
  const ws = await getLessonWorksheet(oc.groupCourseId, oc.lessonPlanId);
  if (!ws) return null;
  const answersVer = await answersVersionFor(occurrenceCourseId, ws.resourceId);
  // The scheme for the VERSION the pupils actually answered (provenance), falling back to the current
  // version — recording WHICH version it is so only answers of that provenance are marked (BUG-015).
  let schemeVersionNo = answersVer;
  let scheme = answersVer != null ? await getScheme(ws.resourceId, answersVer) : null;
  if (!scheme) {
    schemeVersionNo = ws.versionNo;
    scheme = await getScheme(ws.resourceId, ws.versionNo);
  }
  if (!scheme || scheme.scheme.status !== 'ready') return null; // never mark against an unreviewed draft
  const pointsByField = new Map<string, SchemePoint[]>();
  for (const p of scheme.points) {
    const arr = pointsByField.get(p.fieldKey) ?? [];
    arr.push(p);
    pointsByField.set(p.fieldKey, arr);
  }
  const labelByKey = new Map(renderWorksheet(ws.markdown, { mode: 'review' }).fields.map((f) => [f.key, f.label]));
  return { groupCourseId: oc.groupCourseId, resourceId: ws.resourceId, versionNo: ws.versionNo, schemeVersionNo, pointsByField, labelByKey };
}

const toMarkPoints = (pts: SchemePoint[]): MarkPoint[] => pts.map((p) => ({ id: p.id, kind: p.kind, expected: p.expected, alternatives: p.alternatives, marks: p.marks, required: p.required }));

// ── 9.1 Derive a mark scheme from the worksheet (+ answers doc) with the AI ────────────────────
export interface DeriveResult {
  ok: boolean;
  message: string;
  points?: number;
}

export async function deriveScheme(occurrenceCourseId: number): Promise<DeriveResult> {
  const oc = await occCoursePlan(occurrenceCourseId);
  if (!oc || oc.lessonPlanId == null) return { ok: false, message: 'No worksheet is bound to this lesson.' };
  const ws = await getLessonWorksheet(oc.groupCourseId, oc.lessonPlanId);
  if (!ws) return { ok: false, message: 'No worksheet to build a scheme from.' };
  // Not auto-marked by the AI scheme: screenshots (image, teacher reviews); ordering (parsons/order) and
  // grouping (sort/label) and trace-table cells (trace) carry their own correct answer and are checked in
  // the marking modal; slider (scale) is uncredited self-assessment.
  const SELF_MARKED = new Set(['image', 'parsons', 'order', 'sort', 'label', 'scale', 'trace']);
  const fields = renderWorksheet(ws.markdown, { mode: 'review' }).fields.filter((f) => !SELF_MARKED.has(f.kind));
  if (fields.length === 0) return { ok: false, message: 'This worksheet has no answerable fields.' };
  const answersMd = await getLessonDocMarkdown(oc.groupCourseId, oc.lessonPlanId, 'answers');

  const result = await callLLMStructured(
    {
      feature: 'mark_scheme',
      model: await modelForFeature('mark_scheme', 'plan'),
      promptVersion: MARK_SCHEME_VERSION,
      system: MARK_SCHEME_SYSTEM,
      context: markSchemeItems({
        worksheetTitle: ws.title,
        worksheetMarkdown: ws.markdown,
        answersMarkdown: answersMd,
        fields: fields.map((f) => ({ key: f.key, label: f.label, kindHint: f.kind === 'choice' || f.kind === 'check' || f.kind === 'blank' ? f.kind : ('text' as const), options: f.options })), // code → open text; image/parsons already filtered out
      }),
      instruction: MARK_SCHEME_INSTRUCTION,
      maxTokens: 6000,
    },
    markSchemeSchema,
  );
  if (result.status !== 'ok' || !result.data) {
    return { ok: false, message: result.message ?? 'The AI could not derive a scheme right now.' };
  }
  const inv = new Set(fields.map((f) => f.key));
  const points = result.data.points
    .filter((p) => inv.has(p.fieldKey))
    .map((p) => ({
      fieldKey: p.fieldKey,
      kind: normaliseMarkKind(p.kind),
      expected: (p.expected ?? '').slice(0, 2000),
      alternatives: (p.alternatives ?? []).map((a) => a.slice(0, 200)).slice(0, 20),
      marks: Math.max(0, Math.min(10, Math.round(p.marks ?? 1))),
      required: !!p.required,
    }));
  if (points.length === 0) return { ok: false, message: 'The AI returned no usable mark points — try again or add them by hand.' };
  await upsertScheme(ws.resourceId, ws.versionNo, 'derived', 'draft', points);
  return { ok: true, points: points.length, message: `Draft scheme with ${points.length} mark point${points.length === 1 ? '' : 's'} — review it, then mark.` };
}

export interface ObjectiveResult {
  marked: number;
  openAnswers: number; // answers left for the AI pass
}

/** Mark every objective answer deterministically (only the not-yet-marked ones). Returns the count
 *  marked and how many open answers remain for the AI pass. Safe to call repeatedly. */
export async function markObjective(occurrenceCourseId: number): Promise<ObjectiveResult> {
  // Defence in depth: like markOpen, refuse to write any per-pupil attainment when the DPIA gate is
  // off — so a future caller can't store marks behind the teacher's back.
  if (!(await marksEnabled())) return { marked: 0, openAnswers: 0 };
  const r = await resolve(occurrenceCourseId);
  if (!r) return { marked: 0, openAnswers: 0 };
  const done = await alreadyMarkedAnswerIds(occurrenceCourseId);
  // BUG-015: only mark answers whose provenance matches the resolved scheme — a switched worksheet or
  // an older saved version is left for the teacher, never evaluated against the wrong scheme.
  const answers = (await answersForMarking(occurrenceCourseId)).filter((a) => matchesProvenance(a, r));
  let marked = 0;
  let openAnswers = 0;
  for (const a of answers) {
    if (done.has(a.pupilAnswerId)) continue;
    const points = r.pointsByField.get(a.fieldKey);
    if (!points || points.length === 0) continue; // no scheme point for this field
    if (!isDeterministic(points)) {
      openAnswers++;
      continue;
    }
    const fm = markField(toMarkPoints(points), a.value);
    await writeMark({
      pupilAnswerId: a.pupilAnswerId,
      marksAwarded: fm.marksAwarded,
      marksTotal: fm.marksTotal,
      pointsHit: fm.pointsHit,
      evidence: fm.evidence,
      marker: 'auto',
      confidence: 1,
      status: 'suggested',
      needsReview: false,
      feedback: '',
      historyAppend: { auto: true },
    });
    marked++;
  }
  return { marked, openAnswers };
}

export interface OpenResult {
  status: 'ok' | 'unavailable' | 'nothing';
  marked: number;
  flagged: number; // guard-withheld or gate-flagged
  message?: string;
}

/** Mark open answers with the AI, one anonymous per-question batch at a time. Guard-matched answers
 *  are withheld from the AI and stored flagged for the teacher. Only marks not-yet-marked answers. */
/** A marking batch is acceptable only if it returns EXACTLY the slots we sent — no empty, missing,
 *  duplicate or unknown slots (BUG-005). Pure, so the all-or-nothing rule is unit-tested directly. */
export function isCompleteBatch(expectedSlots: string[], returnedSlots: string[]): boolean {
  const expected = new Set(expectedSlots);
  return (
    returnedSlots.length === expected.size && // right count: no missing, no extra
    new Set(returnedSlots).size === returnedSlots.length && // no duplicates
    returnedSlots.every((s) => expected.has(s)) // no unknown slots
  );
}

export async function markOpen(occurrenceCourseId: number): Promise<OpenResult> {
  // Re-check the gate here too: the debounced pass can fire minutes after the trigger, by which
  // time the teacher may have turned auto-marking off — no pupil answer goes to the AI then.
  if (!(await marksEnabled())) return { status: 'nothing', marked: 0, flagged: 0 };
  const r = await resolve(occurrenceCourseId);
  if (!r) return { status: 'nothing', marked: 0, flagged: 0 };
  const done = await alreadyMarkedAnswerIds(occurrenceCourseId);
  // BUG-015: provenance filter (see markObjective) — don't mark a different worksheet/version's answers.
  const answers = (await answersForMarking(occurrenceCourseId)).filter((a) => !done.has(a.pupilAnswerId) && matchesProvenance(a, r));

  // Group open answers by field (the question).
  const openByField = new Map<string, typeof answers>();
  for (const a of answers) {
    const points = r.pointsByField.get(a.fieldKey);
    if (!points || isDeterministic(points)) continue; // objective handled elsewhere
    const arr = openByField.get(a.fieldKey) ?? [];
    arr.push(a);
    openByField.set(a.fieldKey, arr);
  }
  if (openByField.size === 0) return { status: 'nothing', marked: 0, flagged: 0 };

  let marked = 0;
  let flagged = 0;
  let aiDown = false;

  for (const [fieldKey, fieldAnswers] of openByField) {
    const points = r.pointsByField.get(fieldKey)!;
    const marksTotal = points.reduce((s, p) => s + p.marks, 0);

    // Guard-screen first — matched answers never reach the AI; they're flagged for the teacher.
    const clean: typeof fieldAnswers = [];
    for (const a of fieldAnswers) {
      const hit = guardMatch(a.value);
      if (hit) {
        await writeMark({
          pupilAnswerId: a.pupilAnswerId, marksAwarded: 0, marksTotal, pointsHit: [], evidence: [],
          marker: 'auto', confidence: null, status: 'suggested', needsReview: true,
          // 10.4: flag distinctly so it surfaces in the safeguarding register, not just the mark grid.
          disclosure: true, feedback: '', historyAppend: { guard: 'withheld from AI — needs your eyes' },
        });
        flagged++;
      } else {
        clean.push(a);
      }
    }
    if (clean.length === 0) continue;

    // Anonymous slots A, B, C… — the slot→pupilAnswerId map never leaves the server.
    const slots = clean.map((a, i) => ({ slot: String.fromCharCode(65 + (i % 26)) + (i >= 26 ? String(Math.floor(i / 26)) : ''), answer: a.value }));
    const slotMap = new Map(slots.map((s, i) => [s.slot, clean[i]!]));

    const result = await callLLMStructured(
      {
        feature: 'mark_answers',
        model: await modelForFeature('mark_answers', 'cheap'),
        promptVersion: MARK_ANSWERS_VERSION,
        system: MARK_ANSWERS_SYSTEM,
        context: markAnswersItems({
          question: r.labelByKey.get(fieldKey) ?? fieldKey,
          marksTotal,
          markPoints: points.map((p) => ({ expected: p.expected, marks: p.marks, alternatives: p.alternatives })),
          slots,
        }),
        instruction: MARK_ANSWERS_INSTRUCTION,
        maxTokens: 2000,
      },
      markAnswersSchema,
    );
    if (result.status !== 'ok' || !result.data) {
      aiDown = true;
      continue; // leave this question's answers unmarked; the teacher can mark/retry
    }
    // BUG-005: accept the batch ONLY if it covers EXACTLY the slots we sent — reject empty, missing,
    // duplicate or unknown slots. A partial/garbled batch must NOT be written as if complete (some
    // pupils silently unmarked, or one answer overwritten twice); leave the question unmarked and
    // re-arm (the queue retries it; the teacher can also mark manually).
    if (!isCompleteBatch(slots.map((s) => s.slot), result.data.results.map((res) => res.slot))) {
      aiDown = true;
      continue;
    }
    for (const res of result.data.results) {
      const a = slotMap.get(res.slot);
      if (!a) continue;
      const verdict = gateMark({ answer: a.value, marksAwarded: res.marksAwarded, marksTotal, evidence: res.evidence, confidence: res.confidence });
      await writeMark({
        pupilAnswerId: a.pupilAnswerId,
        marksAwarded: verdict.marksAwarded,
        marksTotal,
        pointsHit: [],
        evidence: res.evidence ? [res.evidence] : [],
        marker: 'ai',
        confidence: res.confidence,
        status: 'suggested',
        needsReview: verdict.needsReview,
        feedback: res.feedback.slice(0, 200),
        historyAppend: { ai: true, reasons: verdict.reasons },
      });
      marked++;
      if (verdict.needsReview) flagged++;
    }
  }

  // Surface AI trouble even if SOME questions marked — the rest were left for the teacher.
  if (aiDown) return { status: 'unavailable', marked, flagged, message: 'Some written answers could not be marked — they are left for you to mark.' };
  return { status: 'ok', marked, flagged };
}

/** Mark a lesson instance end to end: objective first (instant), then the open AI pass. */
export async function markAll(occurrenceCourseId: number): Promise<{ objective: ObjectiveResult; open: OpenResult }> {
  const objective = await markObjective(occurrenceCourseId);
  const open = await markOpen(occurrenceCourseId);
  return { objective, open };
}

/** The worksheet + its scheme (with labels) for the inline editor / answer pack. Null if no plan/ws. */
// ── 10.15 Retrieval-practice starters: what this class recently got wrong ───────────────────────
export interface MissQuestion {
  question: string;
  full: number;
  partial: number;
  zero: number;
  total: number;
}

/** The questions this class got wrong across its recent marked lessons — anonymous (cohort counts
 *  only, no pupil identity), question text resolved from each lesson's worksheet, merged across
 *  lessons by question, worst first. Empty when there isn't enough marked work yet. */
export async function recentClassMisses(groupCourseId: number, maxOccurrences = 5, maxQuestions = 8): Promise<MissQuestion[]> {
  const ocs = await recentMarkedOccurrenceCourses(groupCourseId, maxOccurrences);
  const byQuestion = new Map<string, MissQuestion>();
  for (const oc of ocs) {
    const [stats, ws] = await Promise.all([markStatsByField(oc), worksheetAndScheme(oc)]);
    if (!ws) continue;
    for (const s of stats) {
      const label = ws.labelByKey.get(s.fieldKey);
      if (!label) continue; // checklist ticks / unmapped keys aren't questions
      const total = s.full + s.partial + s.zero;
      if (total < 2) continue; // too few answers to read anything into
      const key = label.toLowerCase().trim();
      const agg = byQuestion.get(key) ?? { question: label, full: 0, partial: 0, zero: 0, total: 0 };
      agg.full += s.full;
      agg.partial += s.partial;
      agg.zero += s.zero;
      agg.total += total;
      byQuestion.set(key, agg);
    }
  }
  const missWeight = (q: MissQuestion): number => (q.zero + 0.5 * q.partial) / q.total;
  return [...byQuestion.values()]
    .filter((q) => q.full / q.total < 0.6) // fewer than ~60% got it fully right
    .sort((a, b) => missWeight(b) - missWeight(a))
    .slice(0, maxQuestions);
}

export async function worksheetAndScheme(occurrenceCourseId: number): Promise<{
  resourceId: number;
  versionNo: number;
  title: string;
  scheme: Awaited<ReturnType<typeof getScheme>>;
  labelByKey: Map<string, string>;
} | null> {
  const oc = await occCoursePlan(occurrenceCourseId);
  if (!oc || oc.lessonPlanId == null) return null;
  const ws = await getLessonWorksheet(oc.groupCourseId, oc.lessonPlanId);
  if (!ws) return null;
  const scheme = await getScheme(ws.resourceId, ws.versionNo);
  const labelByKey = new Map(renderWorksheet(ws.markdown, { mode: 'review' }).fields.map((f) => [f.key, f.label]));
  return { resourceId: ws.resourceId, versionNo: ws.versionNo, title: ws.title, scheme, labelByKey };
}

/** Mark the occurrence-course's worksheet scheme ready. */
export async function setSchemeReadyForOc(occurrenceCourseId: number): Promise<void> {
  const ws = await worksheetAndScheme(occurrenceCourseId);
  if (ws?.scheme) await setSchemeStatus(ws.scheme.scheme.id, 'ready');
}

// ── 9.8 Build a pupil's "what works for me" digest from their feedback + marks history ─────────
export async function buildPupilProfile(pupilId: number): Promise<{ ok: boolean; message: string; digest?: string }> {
  const inputs = await profileInputs(pupilId);
  if (inputs.liked.length === 0 && inputs.disliked.length === 0 && inputs.ratings.length === 0 && inputs.markPercents.length === 0) {
    return { ok: false, message: 'Not enough feedback or marks yet to build a profile.' };
  }
  const result = await callLLM({
    feature: 'pupil_profile',
    model: await modelForFeature('pupil_profile', 'cheap'),
    promptVersion: PUPIL_PROFILE_VERSION,
    system: PUPIL_PROFILE_SYSTEM,
    context: pupilProfileItems(inputs),
    instruction: PUPIL_PROFILE_INSTRUCTION,
    maxTokens: 300,
  });
  if (result.status !== 'ok' || !result.text) return { ok: false, message: result.message ?? 'The AI could not build the profile right now.' };
  const digest = result.text.trim().slice(0, 600);
  await setProfile(pupilId, digest);
  return { ok: true, message: 'Profile updated.', digest };
}

// ── 9.5 What a pupil may see (only CONFIRMED marks; instant or after Release) ──────────────────
export interface PupilResults {
  showScores: boolean;
  comment: string;
  items: Array<{ fieldKey: string; label: string; awarded: number; total: number; feedback: string }>;
  awarded: number;
  total: number;
}

/** A pupil's visible results for a lesson, or null if nothing is visible yet. Enforces: confirmed
 *  marks only; per-class results_mode (instant vs hold-until-Release); ticks-only unless showScores. */
export async function pupilLessonResults(pupilId: number, occurrenceCourseId: number): Promise<PupilResults | null> {
  const oc = await occCoursePlan(occurrenceCourseId);
  if (!oc) return null;
  const [settings, released] = await Promise.all([getMarkingSettings(oc.groupCourseId), marksReleasedAt(occurrenceCourseId)]);
  if (settings.resultsMode === 'on_release' && released == null) return null; // held back
  const rows = await confirmedMarksForPupil(pupilId, occurrenceCourseId);
  if (rows.length === 0) return null;
  let labelByKey = new Map<string, string>();
  if (oc.lessonPlanId != null) {
    const ws = await getLessonWorksheet(oc.groupCourseId, oc.lessonPlanId);
    if (ws) labelByKey = new Map(renderWorksheet(ws.markdown, { mode: 'review' }).fields.map((f) => [f.key, f.label]));
  }
  const comment = await getComment(pupilId, occurrenceCourseId);
  const items = rows.map((r) => ({ fieldKey: r.fieldKey, label: labelByKey.get(r.fieldKey) ?? r.fieldKey, awarded: r.marksAwarded, total: r.marksTotal, feedback: r.feedback }));
  return {
    showScores: settings.showScores,
    comment,
    items,
    awarded: items.reduce((s, i) => s + i.awarded, 0),
    total: items.reduce((s, i) => s + i.total, 0),
  };
}
