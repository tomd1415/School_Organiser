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
import { getLessonWorksheet, getLessonWorksheetMeta, getLessonSlidesMarkdown } from '../services/worksheet';
import { renderWorksheet, savedTick, type Level } from '../lib/worksheetForm';
import { renderMarkdown } from '../lib/markdown';
import { sliceSlidesForLevel } from '../lib/slideDeck';
import { requireAuth } from '../auth/guard';
import { ensureTestPupil } from '../repos/pupils';
import { readStored, storeBuffer } from '../lib/resourceStore';
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

// Who the pupil surface is acting for: a real logged-in pupil, OR a teacher driving the fictitious
// TEST pupil (an overlay — the teacher's own session/role is untouched, so "exit" returns them to
// the app). The test pupil bypasses the DPIA access gate and the time gate (see /me).
interface ActingPupil {
  id: number;
  isTest: boolean;
}
function actingPupil(req: FastifyRequest): ActingPupil | null {
  if (req.session.get('role') === 'pupil') {
    const id = Number(req.session.get('pupilId') ?? 0);
    return id ? { id, isTest: false } : null;
  }
  // A teacher with an active test-pupil session.
  if (req.session.get('authed') && req.session.get('role') !== 'ta') {
    const id = Number(req.session.get('testPupilId') ?? 0);
    return id ? { id, isTest: true } : null;
  }
  return null;
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

// The pupil's slide deck (left pane) — their ability's slides, one shown at a time, Prev/Next driven
// by pupil.js. The pupil follows the lesson on the board with a simplified deck matching their level.
function renderSlideDeck(md: string, deckId: string, level: Level): string {
  const slides = sliceSlidesForLevel(md, level);
  if (slides.length === 0) return '';
  const html = slides.map((s, i) => `<div class="pslide${i === 0 ? ' on' : ''}" data-slide="${i}">${renderMarkdown(s)}</div>`).join('');
  return `<section class="pupil-slides" data-deck="${esc(deckId)}" aria-label="Lesson slides">
    <div class="pslide-head"><span class="pslide-title">📊 Slides</span><span class="pslide-count">Slide <b class="pslide-n">1</b> / ${slides.length}</span></div>
    <div class="pslide-stage">${html}</div>
    <div class="pslide-nav">
      <button type="button" class="btn-soft pslide-prev" aria-label="Previous slide">◀ Back</button>
      <span class="muted pslide-hint">Follow along on the board</span>
      <button type="button" class="btn-soft pslide-next" aria-label="Next slide">Next ▶</button>
    </div>
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
    const acting = actingPupil(req);
    if (!acting) {
      reply.redirect(req.session.get('role') === 'pupil' ? '/pupil' : '/');
      return;
    }
    const pupilId = acting.id;
    const isTest = acting.isTest;
    // Real pupils need the DPIA access gate ON; the fictitious test pupil bypasses it (no real
    // child's data) so the teacher can test the pupil surface before/without sign-off.
    if (!isTest && !(await pupilAccessEnabled())) {
      req.session.delete();
      return reply.redirect('/pupil');
    }
    const csrf = reply.generateCsrf();
    const groupId = Number(req.session.get('pupilGroupId') ?? 0);
    const name = isTest ? 'Test Pupil' : (await getPupilName(pupilId)) ?? 'you';
    const testLevel = ((req.session.get('testLevel') as Level) || 'core') as Level;
    const todayLabel = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }).format(new Date());
    let body: string;
    try {
      const ctx = await getClockContext();
      const state = resolveNow(new Date(), ctx);
      let lesson: { lessonId: number; date: string } | null = null;
      if (isTest) {
        // Test pupil: the teacher picked the exact lesson + date — ANY lesson, ANY time, no clock gate.
        const lid = Number(req.session.get('testLessonId') ?? 0);
        const d = String(req.session.get('testDate') ?? '');
        if (lid && /^\d{4}-\d{2}-\d{2}$/.test(d)) lesson = { lessonId: lid, date: d };
      } else {
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
      }

      // "Stay signed in on this computer" — only when auto-marking is on and the class allows it,
      // and not already remembered on this device. Never for the test pupil.
      const canRemember = !isTest && !req.cookies?.[DEVICE_COOKIE] && (await marksEnabled()) && groupId > 0 && (await devicesEnabledForGroup(groupId));
      const remember = canRemember
        ? `<button class="pupil-remember" hx-post="/me/remember" hx-target="this" hx-swap="outerHTML">Stay signed in on this computer</button>`
        : '';
      const levelBtns = (['support', 'core', 'challenge'] as Level[])
        .map((lv) => `<button type="button" class="link${lv === testLevel ? ' on' : ''}" hx-post="/test-pupil/level" hx-vals='{"level":"${lv}"}' hx-swap="none">${lv}</button>`)
        .join(' ');
      const head = isTest
        ? `<header class="pupil-top test-banner"><span class="pupil-hi">🧪 Test pupil <span class="muted">— not a real pupil</span></span>
            <span class="test-level">Level: ${levelBtns}</span>
            <form hx-post="/test-pupil/exit" hx-swap="none" class="inline"><button class="link">✕ exit test</button></form></header>`
        : `<header class="pupil-top"><span class="pupil-hi">Hi ${esc(name)}</span>
        ${remember}
        <form method="post" action="/logout" class="inline"><input type="hidden" name="_csrf" value="${esc(csrf)}"><button class="pupil-logout">Log out</button></form></header>`;

      if (!lesson) {
        body = isTest
          ? `${head}<section class="pupil-card"><h1>No lesson chosen</h1><p class="pupil-note">Open a lesson on any date, then tap “🧪 Test as pupil”.</p></section>`
          : `${head}<section class="pupil-card"><h1>No lesson right now</h1>
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
              // Worksheet + slides for this section, resolved together (class copy preferred).
              const [ws, slidesMd] = await Promise.all([
                getLessonWorksheet(Number(s.groupCourseId), Number(s.lessonPlanId)),
                getLessonSlidesMarkdown(Number(s.groupCourseId), Number(s.lessonPlanId)),
              ]);
              if (ws) {
                // independent per-section reads — run them together, not one after another
                const [level, values, done, fb] = await Promise.all([
                  isTest ? Promise.resolve(testLevel) : getPupilLevel(pupilId, Number(s.groupCourseId)),
                  getAnswers(pupilId, oc),
                  isDone(pupilId, oc),
                  getPupilFeedback(pupilId, oc),
                ]);
                // Online the name/date are auto-filled (the pupil never types them) — pass who + today.
                const rendered = renderWorksheet(ws.markdown, { mode: 'form', level, values, action: `/me/answer?oc=${oc}`, autofill: { name, date: todayLabel } });
                const results = (await marksEnabled()) ? await pupilLessonResults(pupilId, oc) : null;
                // 10.13: an encouraging "X of Y done" chip, filled + kept current client-side (pupil.js).
                const work = `${results ? resultsCard(results) : ''}<p class="ws-progress" aria-live="polite"></p><div class="ws-doc">${rendered.html}</div>${doneBlock(oc, done)}${feedbackWidget(oc, fb)}`;
                // Two-pane: the pupil's ability-matched slides on the left, the worksheet on the right —
                // follow the board while you work. No slides bound → the worksheet uses the full width.
                const deck = slidesMd ? renderSlideDeck(slidesMd, String(oc), level) : '';
                // On a phone/narrow screen the panes stack, so a sticky Slides/Worksheet toggle keeps
                // the pupil's own work one tap away (default = Worksheet; the board shows the slides too).
                // pupil.js flips data-pane; on a wide screen the toggle is hidden and both panes show.
                inner = deck
                  ? `<div class="pupil-twopane" data-pane="work">
                       <div class="pane-toggle" role="tablist" aria-label="Show slides or worksheet">
                         <button type="button" class="pane-tab" role="tab" data-pane-btn="slides" aria-selected="false">📊 Slides</button>
                         <button type="button" class="pane-tab is-on" role="tab" data-pane-btn="work" aria-selected="true">📝 My worksheet</button>
                       </div>
                       <div class="pupil-pane pupil-pane-slides">${deck}</div>
                       <div class="pupil-pane pupil-pane-work">${work}</div>
                     </div>`
                  : work;
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
    const acting = actingPupil(req);
    if (!acting) return reply.code(401).send('');
    const pupilId = acting.id;
    const q = z.object({ oc: z.coerce.number().int().positive(), key: z.string().min(1).max(60) }).safeParse(req.query);
    if (!q.success) return reply.code(400).send('');
    // The pupil may only write to a lesson their group is enrolled in (defence in depth). The test
    // pupil isn't enrolled anywhere — it's allowed any lesson (teacher-only, fictitious).
    if (!acting.isTest && !(await pupilCanAccessOc(pupilId, q.data.oc))) return reply.code(403).send('');
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
    const acting = actingPupil(req);
    if (!acting) return reply.code(401).send('');
    const pupilId = acting.id;
    const q = z.object({ oc: z.coerce.number().int().positive() }).safeParse(req.query);
    const b = z.object({ done: z.enum(['true', 'false']) }).safeParse(req.body);
    if (!q.success || !b.success) return reply.code(400).send('');
    if (!acting.isTest && !(await pupilCanAccessOc(pupilId, q.data.oc))) return reply.code(403).send('');
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
    const acting = actingPupil(req);
    if (!acting) return reply.code(401).send('');
    const pupilId = acting.id;
    const q = z.object({ oc: z.coerce.number().int().positive() }).safeParse(req.query);
    if (!q.success) return reply.code(400).send('');
    if (!acting.isTest && !(await pupilCanAccessOc(pupilId, q.data.oc))) return reply.code(403).send('');
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

  // ── Pupil screenshot paste: store a pasted/dropped image of the pupil's work as their answer.
  const IMG_EXT: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif' };
  app.post('/me/answer-image', { preHandler: app.csrfProtection }, async (req, reply) => {
    const acting = actingPupil(req);
    if (!acting) return reply.code(401).send('');
    const q = z.object({ oc: z.coerce.number().int().positive(), key: z.string().min(1).max(60) }).safeParse(req.query);
    if (!q.success) return reply.code(400).send('');
    if (!acting.isTest && !(await pupilCanAccessOc(acting.id, q.data.oc))) return reply.code(403).send('');
    const data = await req.file();
    if (!data) return reply.code(400).type('text/html').send('<span class="ws-saved show">no image</span>');
    const ext = IMG_EXT[data.mimetype];
    if (!ext) return reply.code(400).type('text/html').send('<span class="ws-saved show">that file type isn’t allowed</span>'); // raster only; no SVG
    const buf = await data.toBuffer();
    if (buf.length > 12 * 1024 * 1024) return reply.code(413).type('text/html').send('<span class="ws-saved show">that image is too big</span>');
    const safeKey = q.data.key.replace(/[^a-z0-9._-]/gi, '_');
    const rel = `pupil-work/${q.data.oc}/${acting.id}/${safeKey}.${ext}`;
    await storeBuffer(rel, buf);
    const ws = await worksheetForOccurrenceCourse(q.data.oc);
    await saveAnswer({ pupilId: acting.id, occurrenceCourseId: q.data.oc, resourceId: ws?.resourceId ?? null, versionNo: ws?.versionNo ?? null, fieldKey: q.data.key, value: `img:${rel}` });
    const url = `/pupil-image?p=${encodeURIComponent(rel)}&t=${Date.now()}`; // cache-bust so a replacement shows
    return reply.type('text/html').send(`<img class="ws-shot" src="${url}" alt="your screenshot">`);
  });

  // Serve a pupil-pasted image. A pupil sees only their own; a teacher (incl. the test overlay) any;
  // TAs are denied. Raster only + nosniff (paths are validated — no traversal, must be under pupil-work).
  app.get('/pupil-image', async (req, reply) => {
    const q = z.object({ p: z.string().min(1).max(300) }).safeParse(req.query);
    if (!q.success) return reply.code(400).send('');
    const p = q.data.p;
    if (!p.startsWith('pupil-work/') || p.includes('..')) return reply.code(400).send('');
    const role = req.session.get('role');
    if (role === 'pupil') {
      if (Number(p.split('/')[2] ?? 0) !== Number(req.session.get('pupilId') ?? 0)) return reply.code(403).send('');
    } else if (role === 'ta' || !req.session.get('authed')) {
      return reply.code(403).send('');
    } // teacher (and the test overlay) → allowed
    const ext = (p.split('.').pop() ?? '').toLowerCase();
    const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : ext === 'gif' ? 'image/gif' : 'image/jpeg';
    try {
      const buf = await readStored(p);
      return reply.header('X-Content-Type-Options', 'nosniff').header('Content-Disposition', 'inline').type(mime).send(buf);
    } catch {
      return reply.code(404).send('');
    }
  });

  // ── Test pupil (teacher-only) — open the REAL pupil surface for any lesson, any time, at any level.
  // An overlay on the teacher's session (testPupilId): role stays 'teacher', so "exit" just clears it.
  app.post('/test-pupil/open', { preHandler: [requireAuth, app.csrfProtection] }, async (req, reply) => {
    const b = z
      .object({ lesson: z.coerce.number().int().positive(), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), level: z.enum(['support', 'core', 'challenge']).default('core') })
      .safeParse(req.body);
    if (!b.success) return reply.code(400).type('text/html').send('Bad test-pupil request.');
    const tp = await ensureTestPupil();
    req.session.set('testPupilId', tp.id);
    req.session.set('testLessonId', b.data.lesson);
    req.session.set('testDate', b.data.date);
    req.session.set('testLevel', b.data.level);
    reply.header('HX-Redirect', '/me');
    return reply.send('');
  });

  app.post('/test-pupil/level', { preHandler: [requireAuth, app.csrfProtection] }, async (req, reply) => {
    const b = z.object({ level: z.enum(['support', 'core', 'challenge']) }).safeParse(req.body);
    if (b.success) req.session.set('testLevel', b.data.level);
    reply.header('HX-Redirect', '/me');
    return reply.send('');
  });

  app.post('/test-pupil/exit', { preHandler: [requireAuth, app.csrfProtection] }, async (req, reply) => {
    req.session.set('testPupilId', 0); // back to a plain teacher session (role untouched throughout)
    reply.header('HX-Redirect', '/');
    return reply.send('');
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
