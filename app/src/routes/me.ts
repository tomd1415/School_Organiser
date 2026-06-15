// Phase 8.3–8.5: the pupil surface. One screen — today's lesson for THEIR class, the worksheet as
// a form (sliced to their level, unlabelled), a self-declared Done ✓, and a quick feedback widget.
// Deny-by-default: the global hook keeps pupil sessions on /me; nothing else is reachable.
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { esc } from '../lib/html';
import { pool } from '../db/pool';
import { resolveNow } from '../services/clock';
import { getClockContext } from '../repos/clock';
import { findOccurrence, findOrCreateOccurrence, getOccurrenceCourses } from '../repos/occurrence';
import { getLessonWorksheet, getLessonWorksheetMeta } from '../services/worksheet';
import { renderWorksheet, savedTick } from '../lib/worksheetForm';
import {
  getAnswers,
  getPupilLevel,
  saveAnswer,
  setDone,
  isDone,
  getPupilFeedback,
  upsertPupilFeedback,
  pupilCanAccessOc,
} from '../repos/pupilWork';
import { pupilLayout, pupilAccessEnabled } from './pupilAuth';
import { getPupilName } from '../repos/pupilCredentials';
import { marksEnabled } from '../auth/marksGate';
import { pupilLessonResults, type PupilResults } from '../services/marking';
import { onPupilDone } from '../services/markingQueue';
import { devicesEnabledForGroup, rememberDevice, newDeviceSecret } from '../repos/pupilDevices';
import { appConfig } from '../config/app';

const DEVICE_COOKIE = 'pupil_device';

export const ACTIVITY_CHIPS = ['practical', 'typing', 'cards', 'video', 'drawing', 'talking', 'worksheet', 'quiz', 'games', 'reading'];
const FACES = [
  { v: 1, e: '🙁' },
  { v: 2, e: '😐' },
  { v: 3, e: '🙂' },
  { v: 4, e: '😀' },
];

function requirePupil(req: FastifyRequest, reply: FastifyReply): number | null {
  if (req.session.get('role') !== 'pupil') {
    void reply.redirect('/pupil');
    return null;
  }
  return Number(req.session.get('pupilId') ?? 0) || null;
}

async function groupLessonAt(groupId: number, weekday: number, slotOrder: number): Promise<number | null> {
  // Prefer the teacher's own (is_self) row so the pupil lands on the same occurrence the
  // teacher's Now/lesson view uses, if the group somehow sits in the slot under more than one row.
  const { rows } = await pool.query<{ id: number }>(
    `SELECT tl.id FROM timetabled_lessons tl
     JOIN period_definitions p ON p.id = tl.period_definition_id
     JOIN staff s ON s.id = tl.staff_id
     WHERE tl.group_id = $1 AND tl.purpose IN ('teaching', 'form')
       AND p.weekday = $2 AND p.slot_order = $3
       AND p.academic_year_id = (SELECT id FROM academic_years WHERE is_current)
     ORDER BY s.is_self DESC, tl.id
     LIMIT 1`,
    [groupId, weekday, slotOrder],
  );
  return rows[0]?.id ?? null;
}

function chipRow(group: 'liked' | 'disliked', selected: Set<string>): string {
  return ACTIVITY_CHIPS.map(
    (c) =>
      `<label class="chip${selected.has(c) ? ' on' : ''}"><input type="checkbox" name="${group}" value="${c}"${selected.has(c) ? ' checked' : ''}> ${esc(c)}</label>`,
  ).join('');
}

function feedbackWidget(oc: number, fb: { rating: number | null; liked: string; disliked: string; comment: string } | null): string {
  const liked = new Set((fb?.liked ?? '').split(',').map((s) => s.trim()).filter(Boolean));
  const disliked = new Set((fb?.disliked ?? '').split(',').map((s) => s.trim()).filter(Boolean));
  return `<form class="pupil-feedback" id="fb-${oc}" hx-post="/me/feedback?oc=${oc}" hx-trigger="change delay:400ms" hx-swap="none">
    <h3>How was this lesson?</h3>
    <div class="face-row">
      ${FACES.map((f) => `<label class="face"><input type="radio" name="rating" value="${f.v}"${fb?.rating === f.v ? ' checked' : ''}> <span>${f.e}</span></label>`).join('')}
    </div>
    <p class="fb-q">What did you enjoy?</p><div class="chip-row">${chipRow('liked', liked)}</div>
    <p class="fb-q">What didn't you like?</p><div class="chip-row">${chipRow('disliked', disliked)}</div>
    <label class="fb-comment">Anything else? <textarea name="comment" rows="2" maxlength="500" placeholder="(optional)">${esc(fb?.comment ?? '')}</textarea></label>
    <span class="note-status" id="fb-${oc}-status"></span>
  </form>`;
}

// 9.5 — a pupil's released results: a kind comment, then big ✓/✗/◐ per answer with a "try this"
// line. Ticks-only by default (no scores) — two-stars-and-a-wish, never any class comparison.
function resultsCard(r: PupilResults): string {
  // No mark for a zero-weight / non-markable point (t === 0) — a "✗" there reads as "wrong" when there
  // was nothing to get. ✓ full marks · ✗ scored zero of >0 · ◐ partial.
  const mark = (a: number, t: number): string =>
    t <= 0 ? '' : a >= t ? '<span class="rc-ok">✓</span>' : a <= 0 ? '<span class="rc-no">✗</span>' : '<span class="rc-part">◐</span>';
  const items = r.items
    .map((i) => {
      // Always give a kind line — never a bare ✗. Use the teacher/AI feedback if present, else a
      // gentle default so a wrong answer still reads as encouragement, not just a red cross.
      const fb = i.feedback || (i.awarded <= 0 && i.total > 0 ? 'Have another look at this one next time — you can do it.' : '');
      return `<li class="rc-item">${mark(i.awarded, i.total)} <span class="rc-q">${esc(i.label)}</span>${r.showScores ? ` <span class="rc-score">${i.awarded}/${i.total}</span>` : ''}
        ${fb ? `<div class="rc-fb">${esc(fb)}</div>` : ''}</li>`;
    })
    .join('');
  return `<section class="pupil-results">
    <h2>Your feedback ${r.showScores ? `<span class="rc-total">${r.awarded}/${r.total}</span>` : ''}</h2>
    ${r.comment ? `<p class="rc-comment">💬 ${esc(r.comment)}</p>` : ''}
    <ul class="rc-list">${items}</ul>
  </section>`;
}

function doneBlock(oc: number, done: boolean): string {
  return `<div class="pupil-done" id="done-${oc}">
    ${
      done
        ? `<p class="done-yes">✓ You marked this done — well done!</p>
           <button type="button" class="link" hx-post="/me/done?oc=${oc}" hx-vals='{"done":"false"}' hx-target="#done-${oc}" hx-swap="outerHTML">not finished yet</button>`
        : `<button type="button" class="pupil-go done-btn" hx-post="/me/done?oc=${oc}" hx-vals='{"done":"true"}' hx-target="#done-${oc}" hx-swap="outerHTML">I'm done ✓</button>`
    }
  </div>`;
}

export function registerMeRoutes(app: FastifyInstance): void {
  app.get('/me', async (req, reply) => {
    const pupilId = requirePupil(req, reply);
    if (pupilId == null) return;
    if (!(await pupilAccessEnabled())) {
      req.session.delete();
      return reply.redirect('/pupil');
    }
    const csrf = reply.generateCsrf();
    const groupId = Number(req.session.get('pupilGroupId') ?? 0);
    const name = (await getPupilName(pupilId)) ?? 'you';
    let body: string;
    try {
      const ctx = await getClockContext();
      const state = resolveNow(new Date(), ctx);
      let lesson: { lessonId: number; date: string } | null = null;
      // A lesson slot, or a form/tutor period (which can also carry a bound worksheet).
      const currentTeachable = state.current && (state.current.slotType === 'lesson' || state.current.slotType.startsWith('form'));
      if (state.isSchoolDay && currentTeachable) {
        const id = await groupLessonAt(groupId, state.weekday, state.current!.slotOrder);
        if (id) lesson = { lessonId: id, date: state.isoDate };
      }
      if (!lesson && state.nextTeaching && state.nextTeaching.date === state.isoDate) {
        const id = await groupLessonAt(groupId, state.nextTeaching.weekday, state.nextTeaching.slotOrder);
        if (id) lesson = { lessonId: id, date: state.nextTeaching.date };
      }

      // "Stay signed in on this computer" — only when auto-marking is on and the class allows it,
      // and not already remembered on this device.
      const canRemember = !req.cookies?.[DEVICE_COOKIE] && (await marksEnabled()) && groupId > 0 && (await devicesEnabledForGroup(groupId));
      const remember = canRemember
        ? `<button class="pupil-remember" hx-post="/me/remember" hx-target="this" hx-swap="outerHTML">Stay signed in on this computer</button>`
        : '';
      const head = `<header class="pupil-top"><span class="pupil-hi">Hi ${esc(name)}</span>
        ${remember}
        <form method="post" action="/logout" class="inline"><input type="hidden" name="_csrf" value="${esc(csrf)}"><button class="pupil-logout">Log out</button></form></header>`;

      if (!lesson) {
        body = `${head}<section class="pupil-card"><h1>No lesson right now</h1>
          <p class="pupil-note">${state.isSchoolDay ? 'Check back when your lesson starts.' : 'No school today.'}</p></section>`;
      } else {
        // Read-first: only create+materialise the occurrence if it doesn't exist yet (avoids a
        // write + row lock on every pupil GET once the lesson has been opened once).
        const occId = (await findOccurrence(lesson.lessonId, lesson.date)) ?? (await findOrCreateOccurrence(lesson.lessonId, lesson.date));
        const sections = await getOccurrenceCourses(occId);
        const blocks = await Promise.all(
          sections.map(async (s) => {
            const oc = Number(s.occurrenceCourseId);
            let inner = '';
            if (s.lessonPlanId != null) {
              const ws = await getLessonWorksheet(Number(s.groupCourseId), Number(s.lessonPlanId));
              if (ws) {
                // independent per-section reads — run them together, not one after another
                const [level, values, done, fb] = await Promise.all([
                  getPupilLevel(pupilId, Number(s.groupCourseId)),
                  getAnswers(pupilId, oc),
                  isDone(pupilId, oc),
                  getPupilFeedback(pupilId, oc),
                ]);
                const rendered = renderWorksheet(ws.markdown, { mode: 'form', level, values, action: `/me/answer?oc=${oc}` });
                const results = (await marksEnabled()) ? await pupilLessonResults(pupilId, oc) : null;
                // 10.13: an encouraging "X of Y done" chip, filled + kept current client-side (pupil.js).
                inner = `${results ? resultsCard(results) : ''}<p class="ws-progress" aria-live="polite"></p><div class="ws-doc">${rendered.html}</div>${doneBlock(oc, done)}${feedbackWidget(oc, fb)}`;
              }
            }
            if (!inner) inner = '<p class="pupil-note">Nothing to do here yet — your teacher will add it.</p>';
            return `<section class="pupil-card pupil-work-card"><h1>${esc(s.planTitle ?? s.courseName)}</h1>${inner}</section>`;
          }),
        );
        body = `${head}${blocks.join('') || '<section class="pupil-card"><p class="pupil-note">Nothing set for this lesson yet.</p></section>'}`;
      }
    } catch (err) {
      app.log.error({ err }, 'pupil /me failed');
      body = '<section class="pupil-card"><h1>Just a moment</h1><p class="pupil-note">Something went wrong. Tell your teacher.</p></section>';
    }
    return reply.type('text/html').send(pupilLayout(body, csrf));
  });

  app.post('/me/answer', { preHandler: app.csrfProtection }, async (req, reply) => {
    const pupilId = Number(req.session.get('pupilId') ?? 0);
    if (req.session.get('role') !== 'pupil' || !pupilId) return reply.code(401).send('');
    const q = z.object({ oc: z.coerce.number().int().positive(), key: z.string().min(1).max(60) }).safeParse(req.query);
    if (!q.success) return reply.code(400).send('');
    // The pupil may only write to a lesson their group is enrolled in (defence in depth).
    if (!(await pupilCanAccessOc(pupilId, q.data.oc))) return reply.code(403).send('');
    const b = z.object({ value: z.string().max(8000).optional() }).safeParse(req.body);
    const value = (b.success && b.data.value) || '';
    // Resolve the worksheet server-side for provenance — never trust a client-supplied resource id.
    const ws = await worksheetForOccurrenceCourse(q.data.oc);
    await saveAnswer({
      pupilId,
      occurrenceCourseId: q.data.oc,
      resourceId: ws?.resourceId ?? null,
      versionNo: ws?.versionNo ?? null,
      fieldKey: q.data.key,
      value,
    });
    // OOB tick so the field that just saved reassures the pupil their answer was kept.
    return reply.type('text/html').send(savedTick(q.data.key));
  });

  app.post('/me/done', { preHandler: app.csrfProtection }, async (req, reply) => {
    const pupilId = Number(req.session.get('pupilId') ?? 0);
    if (req.session.get('role') !== 'pupil' || !pupilId) return reply.code(401).send('');
    const q = z.object({ oc: z.coerce.number().int().positive() }).safeParse(req.query);
    const b = z.object({ done: z.enum(['true', 'false']) }).safeParse(req.body);
    if (!q.success || !b.success) return reply.code(400).send('');
    if (!(await pupilCanAccessOc(pupilId, q.data.oc))) return reply.code(403).send('');
    const done = b.data.done === 'true';
    await setDone(pupilId, q.data.oc, done);
    // "Mark as pupils finish" (Q34): tapping Done triggers marking (objective now; open debounced).
    if (done) await onPupilDone(q.data.oc).catch(() => {});
    return reply.type('text/html').send(doneBlock(q.data.oc, done));
  });

  app.post('/me/remember', { preHandler: app.csrfProtection }, async (req, reply) => {
    const pupilId = Number(req.session.get('pupilId') ?? 0);
    if (req.session.get('role') !== 'pupil' || !pupilId) return reply.code(401).send('');
    if (!(await marksEnabled())) return reply.code(403).send('');
    const groupId = Number(req.session.get('pupilGroupId') ?? 0);
    if (!groupId || !(await devicesEnabledForGroup(groupId))) return reply.code(403).send('');
    const secret = newDeviceSecret();
    const ua = String(req.headers['user-agent'] ?? '').slice(0, 40);
    await rememberDevice(pupilId, secret, ua || 'this computer');
    reply.setCookie(DEVICE_COOKIE, secret, { path: '/', httpOnly: true, sameSite: 'strict', secure: appConfig.COOKIE_SECURE, maxAge: 120 * 24 * 60 * 60 });
    return reply.type('text/html').send('<span class="pupil-remembered">✓ This computer will remember you</span>');
  });

  app.post('/me/feedback', { preHandler: app.csrfProtection }, async (req, reply) => {
    const pupilId = Number(req.session.get('pupilId') ?? 0);
    if (req.session.get('role') !== 'pupil' || !pupilId) return reply.code(401).send('');
    const q = z.object({ oc: z.coerce.number().int().positive() }).safeParse(req.query);
    if (!q.success) return reply.code(400).send('');
    if (!(await pupilCanAccessOc(pupilId, q.data.oc))) return reply.code(403).send('');
    const body = (req.body ?? {}) as Record<string, unknown>;
    const toList = (v: unknown): string => {
      const arr = Array.isArray(v) ? v : v != null ? [v] : [];
      return arr.map(String).filter((x) => ACTIVITY_CHIPS.includes(x)).join(',');
    };
    const ratingRaw = Number(body.rating);
    const rating = ratingRaw >= 1 && ratingRaw <= 4 ? ratingRaw : null;
    const comment = typeof body.comment === 'string' ? body.comment.slice(0, 500) : '';
    await upsertPupilFeedback({ pupilId, occurrenceCourseId: q.data.oc, rating, liked: toList(body.liked), disliked: toList(body.disliked), comment });
    return reply.type('text/html').send(`<span class="note-status saved" id="fb-${q.data.oc}-status" hx-swap-oob="true">saved ✓</span>`);
  });
}

/** Resolve the worksheet bound to an occurrence-course (for answer provenance), or null.
 * Metadata only — no file read, since this runs on every autosave. */
async function worksheetForOccurrenceCourse(occurrenceCourseId: number): Promise<{ resourceId: number; versionNo: number } | null> {
  const { rows } = await pool.query<{ groupCourseId: number; lessonPlanId: number | null }>(
    `SELECT group_course_id AS "groupCourseId", lesson_plan_id AS "lessonPlanId" FROM occurrence_courses WHERE id = $1`,
    [occurrenceCourseId],
  );
  const r = rows[0];
  if (!r || r.lessonPlanId == null) return null;
  const meta = await getLessonWorksheetMeta(Number(r.groupCourseId), Number(r.lessonPlanId));
  return meta ? { resourceId: meta.resourceId, versionNo: meta.versionNo } : null;
}
