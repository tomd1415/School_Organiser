// The per-pupil marking modal (a redesign of the bottom-of-page read-back). One pupil, one screen:
// every question as worded, its MODEL answer (from the mark scheme) and the pupil's answer side by
// side, with a tick/number to mark — pre-filled from the AI marks and kept clearly distinct until the
// teacher confirms. Colour-coded; a Prev / Next walks the class roster. Opened from the work grid,
// the /marking page and the Now screen (all target the shared <dialog id="mark-modal">).
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../auth/guard';
import { esc } from '../lib/html';
import { pool } from '../db/pool';
import { getLessonWorksheets } from '../services/worksheet';
import { getOccurrenceHeader } from '../repos/occurrence';
import { pupilWorkRows, getAnswers, getPupilLevel, pupilCanAccessOc } from '../repos/pupilWork';
import { marksEnabled } from '../auth/marksGate';
import {
  getScheme, marksForPupil, overrideMark, writeMark, confirmMarksForPupil, getComment,
} from '../repos/marking';
import { getPupilAtl } from '../repos/atl';
import { renderMarkModal } from '../lib/markModalView';

interface OcInfo {
  occurrenceId: number;
  groupCourseId: number;
  lessonPlanId: number | null;
  courseName: string;
}
async function ocInfo(occurrenceCourseId: number): Promise<OcInfo | null> {
  const { rows } = await pool.query<OcInfo>(
    `SELECT oc.occurrence_id AS "occurrenceId", oc.group_course_id AS "groupCourseId",
            oc.lesson_plan_id AS "lessonPlanId", c.name AS "courseName"
     FROM occurrence_courses oc JOIN group_courses gc ON gc.id = oc.group_course_id
     JOIN courses c ON c.id = gc.course_id WHERE oc.id = $1`,
    [occurrenceCourseId],
  );
  return rows[0] ?? null;
}

/** Read a worksheet index (`ws`) from a query/body, default 0. */
function wsOf(src: unknown): number {
  const v = (src as { ws?: unknown } | null)?.ws;
  const n = typeof v === 'string' || typeof v === 'number' ? Number(v) : 0;
  return Number.isInteger(n) && n >= 0 ? n : 0;
}

// Shared "open the marking modal" attributes — load a pupil's body into the dialog and show it.
// Used by the work grid, the /marking page and the Now screen so every entry point behaves the same.
const SHOW = `hx-on::after-request="if(event.detail.successful){var d=document.getElementById('mark-modal');if(d&&!d.open)d.showModal();}"`;
export function markOpenAttrs(url: string): string {
  return `hx-get="${esc(url)}" hx-target="#mark-modal-body" hx-swap="innerHTML" ${SHOW}`;
}

// Shared "open the worksheet quick-peek modal" attributes — load the worksheet body into the
// <dialog id="worksheet-modal"> and show it (mirrors markOpenAttrs). `url` is a paths.worksheetModal(...)
// value, already in HTML-attribute form (&amp; joiners), so it is NOT re-escaped here.
const WS_SHOW = `hx-on::after-request="if(event.detail.successful){var d=document.getElementById('worksheet-modal');if(d&&!d.open)d.showModal();}"`;
export function worksheetModalOpenAttrs(url: string): string {
  return `hx-get="${url}" hx-target="#worksheet-modal-body" hx-swap="innerHTML" ${WS_SHOW}`;
}

/** Build the inner HTML of #mark-modal-body for one pupil. `wsIndex` picks which worksheet (a lesson
 * may have several). Null if the oc/pupil/worksheet is missing. */
async function buildModal(oc: number, pid: number, marking: boolean, wsIndex = 0): Promise<string | null> {
  const info = await ocInfo(oc);
  if (!info || info.lessonPlanId == null) return null;
  if (!(await pupilCanAccessOc(pid, oc))) return null;

  const [header, worksheets, roster, level, atlScore] = await Promise.all([
    getOccurrenceHeader(info.occurrenceId),
    getLessonWorksheets(info.groupCourseId, info.lessonPlanId),
    pupilWorkRows(oc, info.groupCourseId),
    getPupilLevel(pid, info.groupCourseId),
    getPupilAtl(pid, oc),
  ]);
  const idx = roster.findIndex((r) => r.pupilId === pid);
  const me = roster[idx];
  if (!me) return null;
  const wi = Math.max(0, Math.min(wsIndex, worksheets.length - 1));
  const ws = worksheets[wi];

  if (!ws) {
    return `<div class="mm"><header class="mm-head"><div class="mm-htop"><span class="mm-name">${esc(me.displayName)}</span>
      <button type="button" class="mm-x" onclick="this.closest('dialog').close()" aria-label="Close">✕</button></div></header>
      <p class="muted mm-empty">No worksheet is bound to this lesson, so there's nothing to mark.</p></div>`;
  }

  // The scheme supplies model answers + per-question marks. renderMarkModal re-derives the per-pupil
  // question rows itself (sliced to the pupil's level), so buildModal only fetches the data it threads in.
  const scheme = await getScheme(ws.resourceId, ws.versionNo);

  // pupil answers (with ids, so we can mark even an as-yet-unmarked answer) + their marks
  const ansRows = (await pool.query<{ id: number; field_key: string; value: string }>(
    `SELECT id, field_key, value FROM pupil_answers WHERE pupil_id = $1 AND occurrence_course_id = $2`,
    [pid, oc],
  )).rows;
  const marks = marking ? await marksForPupil(pid, oc) : [];

  const comment = marking ? await getComment(pid, oc) : '';

  return renderMarkModal({
    oc,
    pid,
    marking,
    wsIndex,
    header,
    worksheets,
    roster,
    level,
    atlScore,
    ansRows,
    marks,
    comment,
    scheme,
  });
}

export function registerMarkModalRoutes(app: FastifyInstance): void {
  const guard = { preHandler: [requireAuth, app.csrfProtection] };
  const params = z.object({ id: z.coerce.number().int().positive(), pid: z.coerce.number().int().positive() });

  // open at the first pupil with work (the /marking + Now entry points use this — no pid needed)
  app.get('/lesson/oc/:id/mark', { preHandler: requireAuth }, async (req, reply) => {
    const p = z.object({ id: z.coerce.number().int().positive() }).safeParse(req.params);
    if (!p.success) return reply.code(400).type('text/html').send('<p class="muted mm-empty">Bad reference.</p>');
    const info = await ocInfo(p.data.id);
    if (!info) return reply.type('text/html').send('<p class="muted mm-empty">Nothing to mark here.</p>');
    const roster = await pupilWorkRows(p.data.id, info.groupCourseId);
    const start = roster.find((r) => r.filled > 0) ?? roster[0];
    if (!start) return reply.type('text/html').send('<p class="muted mm-empty">No pupils in this class yet.</p>');
    const body = await buildModal(p.data.id, start.pupilId, await marksEnabled());
    return reply.type('text/html').send(body ?? '<p class="muted mm-empty">Nothing to mark here.</p>');
  });

  // open / navigate: render the modal body for one pupil
  app.get('/lesson/oc/:id/pupil/:pid/mark', { preHandler: requireAuth }, async (req, reply) => {
    const p = params.safeParse(req.params);
    if (!p.success) return reply.code(400).type('text/html').send('<p class="muted mm-empty">Bad reference.</p>');
    const body = await buildModal(p.data.id, p.data.pid, await marksEnabled(), wsOf(req.query));
    return reply.type('text/html').send(body ?? '<p class="muted mm-empty">Nothing to mark here.</p>');
  });

  // set one mark (tick/number). Updates an existing mark, or creates a teacher mark on an unmarked
  // answer. Either way it becomes a CHECKED (confirmed, teacher) mark. Returns the refreshed body.
  app.post('/lesson/oc/:id/pupil/:pid/mark/save', guard, async (req, reply) => {
    const p = params.safeParse(req.params);
    const b = z.object({ answerId: z.coerce.number().int().positive(), marks: z.coerce.number().int().min(0), total: z.coerce.number().int().min(1) }).safeParse(req.body);
    if (!p.success || !b.success) return reply.code(400).type('text/html').send('');
    if (!(await marksEnabled())) return reply.code(403).type('text/html').send('');
    const awarded = Math.min(b.data.marks, b.data.total);
    const updated = await overrideMark(b.data.answerId, p.data.pid, p.data.id, awarded, null);
    if (updated === 0) {
      // no mark row yet — record a fresh teacher-confirmed mark (FK guards the answer belongs here)
      const owns = await pool.query(`SELECT 1 FROM pupil_answers WHERE id = $1 AND pupil_id = $2 AND occurrence_course_id = $3`, [b.data.answerId, p.data.pid, p.data.id]);
      if (owns.rowCount) {
        await writeMark({ pupilAnswerId: b.data.answerId, marksAwarded: awarded, marksTotal: b.data.total, pointsHit: [], evidence: [], marker: 'teacher', confidence: null, status: 'confirmed', needsReview: false, feedback: '' });
      }
    }
    const body = await buildModal(p.data.id, p.data.pid, true, wsOf(req.body));
    return reply.type('text/html').send(body ?? '');
  });

  // confirm every suggested mark for this pupil (accept the AI). Optional ?next advances to the next pupil.
  app.post('/lesson/oc/:id/pupil/:pid/mark/confirm', guard, async (req, reply) => {
    const p = params.safeParse(req.params);
    if (!p.success) return reply.code(400).type('text/html').send('');
    if (!(await marksEnabled())) return reply.code(403).type('text/html').send('');
    await confirmMarksForPupil(p.data.pid, p.data.id);
    const nextRaw = (req.body as { next?: unknown })?.next;
    const nextPid = typeof nextRaw === 'string' || typeof nextRaw === 'number' ? Number(nextRaw) : NaN;
    const target = Number.isInteger(nextPid) && nextPid > 0 && (await pupilCanAccessOc(nextPid, p.data.id)) ? nextPid : p.data.pid;
    const body = await buildModal(p.data.id, target, true, wsOf(req.body));
    return reply.type('text/html').send(body ?? '');
  });
}
