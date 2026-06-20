import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/server';
import { pool } from '../../src/db/pool';
import { getSetting, setSetting } from '../../src/repos/settings';
import { getLessonPlan } from '../../src/repos/schemes';
import {
  applyReview,
  createReview,
  getOpenReviewForPlan,
  getReview,
  hasOpenReviewForPlan,
  openReviewPlanIds,
  randomReviewableLessonId,
  recentAppliedFindings,
  setReviewStatus,
} from '../../src/repos/reviews';
import { reviewLessonMaster, reviewUnitMaster, reviewSchemeSequence, spotCheckCurriculum } from '../../src/services/reviewLesson';

// Wave 5 (idea 8, lean cut) — the advisory reviewer. The integration suite forces an empty API key, so
// NO real AI call is ever made: every "enabled" path here lands on the wrapper's 'unavailable' degrade.
// We prove the gating order (off by default → enabled-but-no-key → wrapper), the data layer, and the
// apply/dismiss + sweep routes. Throwaway scheme/unit/plans; the teacher's real ai_review_enabled is
// captured and restored.
let app: FastifyInstance;
let cookie = '';
let token = '';
let unitId = 0;
let planId = 0;
let planId2 = 0;
let schemeId = 0;
let courseId = 0;
let origReviewSetting: string | null = null;

function firstCookie(setCookie: string | string[] | undefined): string {
  const v = Array.isArray(setCookie) ? setCookie[0] : setCookie;
  return (v ?? '').split(';')[0] ?? '';
}

beforeAll(async () => {
  app = await buildApp();
  await app.ready();
  const page = await app.inject({ method: 'GET', url: '/login' });
  token = /name="_csrf" value="([^"]+)"/.exec(page.body)?.[1] ?? '';
  const pre = firstCookie(page.headers['set-cookie']);
  const res = await app.inject({ method: 'POST', url: '/login', headers: { 'content-type': 'application/x-www-form-urlencoded', cookie: pre }, payload: `_csrf=${encodeURIComponent(token)}&password=test` });
  cookie = firstCookie(res.headers['set-cookie']) || pre;

  origReviewSetting = await getSetting('ai_review_enabled');

  const c = await pool.query<{ id: number }>(`SELECT id FROM courses ORDER BY id LIMIT 1`);
  courseId = Number(c.rows[0]!.id);
  const s = await pool.query<{ id: number }>(
    `INSERT INTO schemes_of_work (course_id, title, version, active) VALUES ($1, 'ZZREV scheme', 97, false) RETURNING id`,
    [courseId],
  );
  schemeId = Number(s.rows[0]!.id);
  const u = await pool.query<{ id: number }>(`INSERT INTO units (scheme_id, title, display_order) VALUES ($1, 'ZZREV unit', 1) RETURNING id`, [schemeId]);
  unitId = Number(u.rows[0]!.id);
  const p = await pool.query<{ id: number }>(
    `INSERT INTO lesson_plans (unit_id, course_id, title, display_order, objectives, outline)
     VALUES ($1, $2, 'ZZREV lesson A', 1, 'MASTER objectives A', 'MASTER outline A') RETURNING id`,
    [unitId, courseId],
  );
  planId = Number(p.rows[0]!.id);
  const p2 = await pool.query<{ id: number }>(
    `INSERT INTO lesson_plans (unit_id, course_id, title, display_order, objectives, outline)
     VALUES ($1, $2, 'ZZREV lesson B', 2, 'MASTER objectives B', 'MASTER outline B') RETURNING id`,
    [unitId, courseId],
  );
  planId2 = Number(p2.rows[0]!.id);
});

afterAll(async () => {
  await pool.query(`DELETE FROM lesson_reviews WHERE lesson_plan_id = ANY($1)`, [[planId, planId2]]);
  await pool.query(`DELETE FROM lesson_plans WHERE id = ANY($1)`, [[planId, planId2]]);
  await pool.query(`DELETE FROM units WHERE id = $1`, [unitId]);
  await pool.query(`DELETE FROM schemes_of_work WHERE id = $1`, [schemeId]);
  await setSetting('ai_review_enabled', origReviewSetting ?? ''); // restore the teacher's real setting
  await app.close();
  await pool.end();
});

describe('the reviewer is OFF by default and gates before any AI work', () => {
  it('disabled → the service refuses without touching the wrapper', async () => {
    await setSetting('ai_review_enabled', 'false');
    const o = await reviewLessonMaster(planId);
    expect(o.status).toBe('disabled');
  });

  it('disabled → the route shows the "turn it on" message', async () => {
    await setSetting('ai_review_enabled', 'false');
    const res = await app.inject({ method: 'POST', url: `/schemes/plan/${planId}/review-ai`, headers: { cookie, 'x-csrf-token': token } });
    expect(res.statusCode).toBe(200);
    expect(res.body.toLowerCase()).toContain('reviewer is off');
  });

  it('enabled but no API key → the wrapper degrades to unavailable (still no real call)', async () => {
    await setSetting('ai_review_enabled', 'true');
    const o = await reviewLessonMaster(planId);
    expect(o.status).toBe('unavailable');
  });
});

describe('the data layer keeps reviews advisory and master-scoped', () => {
  it('createReview / getOpenReviewForPlan / hasOpenReviewForPlan / openReviewPlanIds round-trip', async () => {
    const id = await createReview({
      lessonPlanId: planId,
      groupCourseId: null,
      verdict: 'tweak',
      findings: [{ issue: 'no recap', fix: 'add a 5-min retrieval starter' }],
      suggestedObjectives: 'NEW objectives A',
      suggestedOutline: 'NEW outline A',
      rationale: 'Sound, but open with a recap.',
      model: 'claude-sonnet-4-6',
      promptVersion: 'review_lesson@1',
    });
    expect(id).not.toBeNull();
    expect(id!).toBeGreaterThan(0);
    expect(await hasOpenReviewForPlan(planId)).toBe(true);
    const open = await getOpenReviewForPlan(planId);
    expect(open?.verdict).toBe('tweak');
    expect(open?.findings[0]?.issue).toBe('no recap');
    const flagged = await openReviewPlanIds([planId, planId2]);
    expect(flagged.has(planId)).toBe(true);
    expect(flagged.has(planId2)).toBe(false); // no review on B yet
  });

  it('a second open review for the same plan is refused (partial unique index → race-proof skip)', async () => {
    const dup = await createReview({
      lessonPlanId: planId, // already has an open review from the test above
      groupCourseId: null,
      verdict: 'rework',
      findings: [],
      suggestedObjectives: 'X',
      suggestedOutline: 'Y',
      rationale: 'dup',
      model: null,
      promptVersion: null,
    });
    expect(dup).toBeNull();
  });

  it('a lesson with an open review is SKIPPED by a fresh review (no double-spend)', async () => {
    await setSetting('ai_review_enabled', 'true');
    const o = await reviewLessonMaster(planId); // planId already has the open review from above
    expect(o.status).toBe('skip');
  });
});

describe('apply / dismiss routes', () => {
  it('GET review renders the open review card with an Apply button', async () => {
    const res = await app.inject({ method: 'GET', url: `/schemes/plan/${planId}/review`, headers: { cookie } });
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('tweak');
    expect(res.body).toContain('Sound, but open with a recap.');
    const open = await getOpenReviewForPlan(planId);
    expect(res.body).toContain(`/schemes/review/${open!.id}/apply`);
  });

  it('Apply writes the suggestion to the MASTER and marks the review applied', async () => {
    const open = await getOpenReviewForPlan(planId);
    const res = await app.inject({ method: 'POST', url: `/schemes/review/${open!.id}/apply`, headers: { cookie, 'x-csrf-token': token } });
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('review applied to the master');
    const plan = await getLessonPlan(planId);
    expect(plan?.objectives).toBe('NEW objectives A');
    expect(plan?.outline).toBe('NEW outline A');
    expect((await getReview(open!.id))?.status).toBe('applied');
    expect(await getOpenReviewForPlan(planId)).toBeNull(); // no longer open
  });

  it('Dismiss closes a review without touching the lesson', async () => {
    const id = await createReview({
      lessonPlanId: planId2,
      groupCourseId: null,
      verdict: 'rework',
      findings: [],
      suggestedObjectives: 'X',
      suggestedOutline: 'Y',
      rationale: 'Needs work.',
      model: null,
      promptVersion: null,
    });
    expect(id).not.toBeNull();
    const res = await app.inject({ method: 'POST', url: `/schemes/review/${id!}/dismiss`, headers: { cookie, 'x-csrf-token': token } });
    expect(res.statusCode).toBe(200);
    expect(res.body.toLowerCase()).toContain('dismissed');
    expect((await getReview(id!))?.status).toBe('dismissed');
    const reDismiss = await app.inject({ method: 'POST', url: `/schemes/review/${id!}/dismiss`, headers: { cookie, 'x-csrf-token': token } });
    expect(reDismiss.body).toContain('no longer open'); // guard: can't re-transition a closed review
    const plan = await getLessonPlan(planId2);
    expect(plan?.objectives).toBe('MASTER objectives B'); // untouched
  });

  it('applyReview claims + writes together, and a closed review never rewrites the master (BUG-022)', async () => {
    // a self-contained throwaway plan with a known master, and a review suggesting new content
    const tp = Number(
      (
        await pool.query<{ id: number }>(
          `INSERT INTO lesson_plans (unit_id, course_id, title, display_order, objectives, outline) VALUES ($1, $2, 'ZZREV-022', 5, 'm-obj', 'm-out') RETURNING id`,
          [unitId, courseId],
        )
      ).rows[0]!.id,
    );
    const rid = await createReview({ lessonPlanId: tp, groupCourseId: null, verdict: 'tweak', findings: [], suggestedObjectives: 'applied-obj', suggestedOutline: 'applied-out', rationale: null, model: null, promptVersion: null });
    try {
      // the claim (open→applied) and the master write commit TOGETHER
      expect(await applyReview(rid!)).toBe(tp);
      expect((await getLessonPlan(tp))?.objectives).toBe('applied-obj');
      expect((await getReview(rid!))?.status).toBe('applied');
      // a now-closed review can never re-write the master: applyReview is a null no-op (the claim gates
      // the write — pre-fix, claim and write were separate statements that could diverge).
      await pool.query(`UPDATE lesson_plans SET objectives = 'edited-after' WHERE id = $1`, [tp]);
      expect(await applyReview(rid!)).toBeNull();
      expect((await getLessonPlan(tp))?.objectives).toBe('edited-after');
    } finally {
      await pool.query(`DELETE FROM lesson_reviews WHERE id = $1`, [rid]);
      await pool.query(`DELETE FROM lesson_plans WHERE id = $1`, [tp]);
    }
  });
});

describe('the unit sweep self-stops and skips, never overrunning', () => {
  it('disabled → reports disabled and reviews nothing', async () => {
    await setSetting('ai_review_enabled', 'false');
    const r = await reviewUnitMaster(unitId);
    expect(r.disabled).toBe(true);
    expect(r.reviewed).toBe(0);
  });

  it('enabled but no key → stops at the first unavailable lesson', async () => {
    await setSetting('ai_review_enabled', 'true');
    const r = await reviewUnitMaster(unitId);
    expect(r.disabled).toBe(false);
    expect(r.reviewed).toBe(0);
    expect(r.stopped).toBe(true); // the wrapper is unavailable → break out, don't hammer
  });
});

describe('E — spot-check, scheme-level review and finding re-injection (gated + cost-capped)', () => {
  it('spot-check + scheme review refuse when the reviewer is OFF (no AI work)', async () => {
    await setSetting('ai_review_enabled', 'false');
    expect((await spotCheckCurriculum()).status).toBe('disabled');
    expect((await reviewSchemeSequence(unitId)).status).toBe('disabled');
  });

  it('enabled but no key → both degrade via the wrapper (spot-check picks a real lesson first)', async () => {
    await setSetting('ai_review_enabled', 'true');
    // clear any open reviews so a candidate exists, then spot-check
    await pool.query(`UPDATE lesson_reviews SET status = 'dismissed' WHERE lesson_plan_id = ANY($1) AND status = 'open'`, [[planId, planId2]]);
    const spot = await spotCheckCurriculum();
    expect(['unavailable', 'skip']).toContain(spot.status); // a real candidate → wrapper unavailable (or skip if none)
    expect((await reviewSchemeSequence(unitId)).status).toBe('unavailable'); // 2 written lessons → reaches the wrapper
  });

  it('randomReviewableLessonId only returns lessons WITHOUT an open review', async () => {
    await pool.query(`UPDATE lesson_reviews SET status = 'dismissed' WHERE lesson_plan_id = ANY($1)`, [[planId, planId2]]);
    const id = await randomReviewableLessonId();
    expect(id).not.toBeNull(); // our two written lessons are candidates
  });

  it('recentAppliedFindings returns only APPLIED findings for the course (E3 re-injection source)', async () => {
    const rid = await createReview({
      lessonPlanId: planId,
      verdict: 'tweak',
      findings: [{ issue: 'ZZ no recap', fix: 'ZZ add a 5-min retrieval starter' }],
      suggestedObjectives: 'o',
      suggestedOutline: 'x',
      rationale: 'r',
      model: 'test',
      promptVersion: 'review_lesson@1',
    });
    expect(rid).not.toBeNull();
    // still 'open' → not yet a lesson learned
    expect((await recentAppliedFindings(courseId)).some((f) => f.issue === 'ZZ no recap')).toBe(false);
    await setReviewStatus(rid!, 'applied');
    const applied = await recentAppliedFindings(courseId);
    expect(applied.some((f) => f.issue === 'ZZ no recap' && f.fix.includes('retrieval'))).toBe(true);
  });
});
