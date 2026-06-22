// Phase 8.3–8.5: the pupil surface. One screen — today's lesson for THEIR class, the worksheet as
// a form (sliced to their level, unlabelled), a self-declared Done ✓, and a quick feedback widget.
// Deny-by-default: the global hook keeps pupil sessions on /me; nothing else is reachable.
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { esc } from '../lib/html';
import { pool, withTransaction } from '../db/pool';
import { resolveNow } from '../services/clock';
import { getClockContext } from '../repos/clock';
import { findOccurrence, findOrCreateOccurrence, getOccurrenceCourses } from '../repos/occurrence';
import { listExceptionsBetween } from '../repos/exceptions';
import { indexDayExceptions, exceptionForLesson, describeException } from '../services/exceptions';
import { getLessonSlidesMarkdown, getLessonWorksheets } from '../services/worksheet';
import { renderWorksheet, savedTick, type Level } from '../lib/worksheetForm';
import { renderMarkdown } from '../lib/markdown';
import { sliceSlidesForLevel, splitTeacherNotes } from '../lib/slideDeck';
import { requireAuth } from '../auth/guard';
import { ensureTestPupil } from '../repos/pupils';
import { readStored, removeStored, storeBuffer } from '../lib/resourceStore';
import { enqueueFileDeletion } from '../repos/fileDeletions';
import {
  getAnswers,
  getPupilLevel,
  saveAnswer,
  setDone,
  isDone,
  getPupilFeedback,
  upsertPupilFeedback,
} from '../repos/pupilWork';
import { pupilLayout, pupilAccessEnabled } from './pupilAuth';
import { getPupilName } from '../repos/pupilCredentials';
import { marksEnabled } from '../auth/marksGate';
import { pupilLessonResults } from '../services/marking';
import { onPupilDone } from '../services/markingQueue';
import { devicesEnabledForGroup, rememberDevice, newDeviceSecret } from '../repos/pupilDevices';
import { appConfig } from '../config/app';
import { renderMePage, buildOccurrenceBlock } from '../lib/meView';

const DEVICE_COOKIE = 'pupil_device';

export const ACTIVITY_CHIPS = ['practical', 'typing', 'cards', 'video', 'drawing', 'talking', 'worksheet', 'quiz', 'games', 'reading'];
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

// The pupil's slide deck (left pane) — their ability's slides, one shown at a time, Prev/Next driven
// by pupil.js. The pupil follows the lesson on the board with a simplified deck matching their level.
// `audience` defaults to 'pupil' — which STRIPS every per-slide teacher note, so the pupil surface AND
// the projector board never show them (the safety boundary). Only 'teacher' (the presenter view) renders
// the notes, in a clearly-labelled side panel.
export function renderSlideDeck(md: string, deckId: string, level: Level, audience: 'pupil' | 'teacher' = 'pupil'): string {
  const slides = sliceSlidesForLevel(md, level);
  if (slides.length === 0) return '';
  const html = slides
    .map((s, i) => {
      const { clean, notes } = splitTeacherNotes(s);
      const notesPanel = audience === 'teacher' && notes
        ? `<aside class="pslide-notes" aria-label="Teaching notes — not shown to pupils"><span class="pslide-notes-h">🧑‍🏫 Teaching notes <span class="muted">— only you see these</span></span><div class="pslide-notes-body">${renderMarkdown(notes)}</div></aside>`
        : '';
      return `<div class="pslide${i === 0 ? ' on' : ''}" data-slide="${i}">${renderMarkdown(clean)}${notesPanel}</div>`;
    })
    .join('');
  return `<section class="pupil-slides${audience === 'teacher' ? ' teacher-present' : ''}" data-deck="${esc(deckId)}" aria-label="Lesson slides">
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

      // Honour dated exceptions (BUG-012): a cancelled / free / whole-day off-timetable lesson must NOT
      // show OR materialise an occurrence for the pupil. cover / room-change still run, so they're left.
      if (lesson && !isTest) {
        const dx = indexDayExceptions(await listExceptionsBetween(lesson.date, lesson.date));
        if (describeException(exceptionForLesson(dx, lesson.lessonId)).mode === 'free') lesson = null;
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
        let blocks: string[];
        {
          const marksOn = await marksEnabled();
          blocks = await Promise.all(
            sections.map((s) =>
              buildOccurrenceBlock(
                s,
                pupilId,
                isTest,
                testLevel,
                name,
                todayLabel,
                marksOn,
                () => getPupilLevel(pupilId, Number(s.groupCourseId)),
                (oc) => getAnswers(pupilId, oc),
                (oc) => isDone(pupilId, oc),
                (oc) => getPupilFeedback(pupilId, oc),
                (gc, lp) => getLessonWorksheets(gc, lp),
                (gc, lp) => getLessonSlidesMarkdown(gc, lp),
                (oc) => pupilLessonResults(pupilId, oc)
              )
            )
          );
          body = renderMePage({
            acting,
            name,
            csrf,
            testLevel,
            todayLabel,
            canRemember,
            remember,
            levelBtns,
            head,
            lesson,
            blocks,
          });
        }
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
    // BUG-030: a real pupil may write ONLY to a field of their SESSION group's CURRENT (non-cancelled)
    // lesson — never a guessed historic / future / other-group oc, nor a key not on the worksheet. The
    // test pupil (teacher-only, fictitious, enrolled nowhere) is allowed any lesson/field.
    if (!acting.isTest && !(await pupilMayWriteOc(pupilId, Number(req.session.get('pupilGroupId') ?? 0), q.data.oc))) return reply.code(403).send('');
    const b = z.object({ value: z.string().max(8000).optional() }).safeParse(req.body);
    const value = (b.success && b.data.value) || '';
    // Resolve + VALIDATE the field server-side (BUG-030) — never trust a client-supplied resource id, and
    // reject a key that isn't a real field of the current worksheet. The test pupil (the teacher previewing)
    // is exempt from the rejection, exactly like the access check above; provenance is still recorded when
    // the key resolves.
    const ws = await worksheetForOccurrenceCourse(q.data.oc, q.data.key);
    if (!acting.isTest && !ws) return reply.code(400).send('');
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
    // BUG-030: only the pupil's session group's lesson dated today (not cancelled) is writable.
    if (!acting.isTest && !(await pupilMayWriteOc(pupilId, Number(req.session.get('pupilGroupId') ?? 0), q.data.oc))) return reply.code(403).send('');
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
    // BUG-030: only the pupil's session group's lesson dated today (not cancelled) is writable.
    if (!acting.isTest && !(await pupilMayWriteOc(pupilId, Number(req.session.get('pupilGroupId') ?? 0), q.data.oc))) return reply.code(403).send('');
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
    // BUG-030: only the pupil's session group's lesson dated today (not cancelled) is writable.
    if (!acting.isTest && !(await pupilMayWriteOc(acting.id, Number(req.session.get('pupilGroupId') ?? 0), q.data.oc))) return reply.code(403).send('');
    // BUG-006: a route-level 12 MB cap so busboy stops reading at the limit — never buffer up to the
    // global 500 MB. Type is checked before the body is read; an over-limit file aborts the stream.
    const tooBig = () => reply.code(413).type('text/html').send('<span class="ws-saved show">that image is too big</span>');
    const data = await req.file({ limits: { fileSize: 12 * 1024 * 1024 } });
    if (!data) return reply.code(400).type('text/html').send('<span class="ws-saved show">no image</span>');
    const ext = IMG_EXT[data.mimetype];
    if (!ext) return reply.code(400).type('text/html').send('<span class="ws-saved show">that file type isn’t allowed</span>'); // raster only; no SVG
    let buf: Buffer;
    try {
      buf = await data.toBuffer();
    } catch {
      return tooBig();
    }
    if (data.file.truncated) return tooBig();
    const safeKey = q.data.key.replace(/[^a-z0-9._-]/gi, '_');
    const rel = `pupil-work/${q.data.oc}/${acting.id}/${safeKey}.${ext}`;
    await storeBuffer(rel, buf);
    // BUG-030: validate the field key against the real worksheet before persisting (and remove the file we
    // just staged if it isn't a real field). The test pupil (teacher preview) is exempt, like the access
    // check. BUG-029: if the DB write then fails, remove the file too.
    const ws = await worksheetForOccurrenceCourse(q.data.oc, q.data.key);
    if (!acting.isTest && !ws) {
      await removeStored(rel).catch(() => {});
      return reply.code(400).type('text/html').send('<span class="ws-saved show">that field isn’t on this worksheet</span>');
    }
    let previousValue: string | null;
    try {
      ({ previousValue } = await saveAnswer({ pupilId: acting.id, occurrenceCourseId: q.data.oc, resourceId: ws?.resourceId ?? null, versionNo: ws?.versionNo ?? null, fieldKey: q.data.key, value: `img:${rel}` }));
    } catch (e) {
      await removeStored(rel).catch(() => {});
      throw e;
    }
    // BUG-029: a replacement in a different format lands at a different path (the key embeds the extension),
    // so the old screenshot must be cleaned up. TOMBSTONE it (durable — retried by the deletion sweep)
    // rather than a fire-and-forget unlink that would silently orphan the file if it failed.
    if (previousValue?.startsWith('img:')) {
      const oldRel = previousValue.slice(4);
      if (oldRel && oldRel !== rel) {
        await withTransaction((db) => enqueueFileDeletion(db, oldRel, 'pupil screenshot replaced'));
      }
    }
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

/** Resolve the worksheet a saved field belongs to (for answer provenance), or null. With several
 * worksheets per lesson, the field key's `w{n}.` prefix selects which one. Metadata only — no file
 * read, since this runs on every autosave. */
async function worksheetForOccurrenceCourse(occurrenceCourseId: number, key: string): Promise<{ resourceId: number; versionNo: number; kind: string } | null> {
  const { rows } = await pool.query<{ groupCourseId: number; lessonPlanId: number | null }>(
    `SELECT group_course_id AS "groupCourseId", lesson_plan_id AS "lessonPlanId" FROM occurrence_courses WHERE id = $1`,
    [occurrenceCourseId],
  );
  const r = rows[0];
  if (!r || r.lessonPlanId == null) return null;
  // BUG-030: validate the field key against the ACTUAL rendered worksheet — not just its `w{n}.` prefix —
  // so a crafted POST can neither create an arbitrary answer row nor write a field this version of the
  // worksheet doesn't contain. Pick the worksheet by prefix, render it, require the key to be one of its
  // fields, and return the field kind. (This now reads + renders the worksheet on save — acceptable on a
  // single-teacher LAN; the integrity guarantee is worth the cost.)
  const worksheets = await getLessonWorksheets(Number(r.groupCourseId), Number(r.lessonPlanId));
  const m = key.match(/^w(\d+)\./);
  const ws = worksheets.find((x) => x.index === (m ? Number(m[1]) : 0));
  if (!ws) return null;
  const field = renderWorksheet(ws.markdown, { mode: 'review', keyPrefix: ws.keyPrefix }).fields.find((f) => f.key === key);
  if (!field) return null;
  return { resourceId: ws.resourceId, versionNo: ws.versionNo, kind: field.kind };
}

/** May this pupil WRITE to this occurrence-course right now? Only their SESSION group's lesson, dated
 *  TODAY, and not cancelled — so a guessed/forged historic / future / other-group / cancelled oc is
 *  rejected (BUG-030). Single query + the shared exception check; the field-key inventory and
 *  resource-version checks remain a noted follow-up. */
async function pupilMayWriteOc(pupilId: number, sessionGroupId: number, oc: number): Promise<boolean> {
  if (!sessionGroupId) return false;
  const { rows } = await pool.query<{ lessonId: number; date: string }>(
    `SELECT lo.timetabled_lesson_id AS "lessonId", to_char(lo.date, 'YYYY-MM-DD') AS date
       FROM occurrence_courses oc
       JOIN group_courses gc ON gc.id = oc.group_course_id
       JOIN lesson_occurrences lo ON lo.id = oc.occurrence_id
       JOIN enrolments e ON e.group_id = gc.group_id AND e.active AND e.pupil_id = $2
      WHERE oc.id = $1 AND gc.group_id = $3 AND lo.date = CURRENT_DATE`,
    [oc, pupilId, sessionGroupId],
  );
  const r = rows[0];
  if (!r) return false; // other group / not enrolled / not today (historic or future)
  const dx = indexDayExceptions(await listExceptionsBetween(r.date, r.date));
  return describeException(exceptionForLesson(dx, r.lessonId)).mode !== 'free'; // not cancelled
}
