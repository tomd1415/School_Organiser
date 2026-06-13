// Phase 8.6/8.7 (teacher side): the "Pupil work" panel on the lesson page — a live completion
// grid, per-pupil level chips (🟢🟡🔴), read-back of any pupil's sheet, mark-seen, and an
// AI "summarise the class's work" action whose output joins the adapt-next-lesson history.
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../auth/guard';
import { esc } from '../lib/html';
import { pool } from '../db/pool';
import { renderMarkdown } from '../lib/markdown';
import { renderWorksheet, type Level } from '../lib/worksheetForm';
import { getLessonWorksheet } from '../services/worksheet';
import {
  pupilWorkRows,
  setPupilLevel,
  getPupilLevel,
  getAnswers,
  markAnswersSeen,
  classAnswers,
  classFeedback,
} from '../repos/pupilWork';
import { getGroupTeachingContext, setGroupTeachingContext } from '../repos/adaptations';
import { pupilAccessEnabled } from './pupilAuth';
import { callLLM } from '../llm/client';
import { modelFor } from '../repos/settings';
import { CLASS_WORK_SYSTEM, CLASS_WORK_VERSION, CLASS_WORK_INSTRUCTION, classWorkItems } from '../llm/prompts/classWork';

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
     FROM occurrence_courses oc
     JOIN group_courses gc ON gc.id = oc.group_course_id
     JOIN courses c ON c.id = gc.course_id
     WHERE oc.id = $1`,
    [occurrenceCourseId],
  );
  return rows[0] ?? null;
}

/** A pupil must be enrolled in the occurrence-course's group before the teacher acts on :pid —
 * so a stray/out-of-class id can't be written to a mis-scoped level row or read back. */
async function pupilInOc(pupilId: number, occurrenceCourseId: number): Promise<boolean> {
  const { rows } = await pool.query<{ n: number }>(
    `SELECT count(*)::int n FROM occurrence_courses oc
     JOIN group_courses gc ON gc.id = oc.group_course_id
     JOIN enrolments e ON e.group_id = gc.group_id AND e.active
     WHERE oc.id = $1 AND e.pupil_id = $2`,
    [occurrenceCourseId, pupilId],
  );
  return (rows[0]?.n ?? 0) > 0;
}

const LEVELS: Level[] = ['support', 'core', 'challenge'];
const LEVEL_DOT: Record<Level, string> = { support: '🟢', core: '🟡', challenge: '🔴' };

function levelChips(oc: number, pid: number, current: Level): string {
  return `<span class="lvl-chips" id="lvl-${oc}-${pid}">${LEVELS.map(
    (l) =>
      `<button type="button" class="lvl-chip${l === current ? ' on' : ''}" title="${l}" hx-post="/lesson/oc/${oc}/pupil/${pid}/level" hx-vals='{"level":"${l}"}' hx-target="#lvl-${oc}-${pid}" hx-swap="outerHTML">${LEVEL_DOT[l]}</button>`,
  ).join('')}</span>`;
}

async function renderGrid(oc: number, info: OcInfo, msg?: string): Promise<string> {
  const rows = await pupilWorkRows(oc, info.groupCourseId);
  // Total fillable fields per level (text inputs), so "n of m" matches the pupil's slice. Parse
  // the document ONCE and bucket fields by level (a slice = shared + that level), rather than
  // rendering it three times.
  const totals: Record<Level, number> = { support: 0, core: 0, challenge: 0 };
  if (info.lessonPlanId != null) {
    const ws = await getLessonWorksheet(info.groupCourseId, info.lessonPlanId);
    if (ws) {
      for (const f of renderWorksheet(ws.markdown, { mode: 'review' }).fields) {
        if (f.kind !== 'text') continue;
        if (f.level === 'shared') { totals.support++; totals.core++; totals.challenge++; }
        else totals[f.level]++;
      }
    }
  }
  if (rows.length === 0) {
    return `<div class="pupil-work" id="pw-${oc}"><h3>Pupil work</h3><p class="muted">No pupils enrolled in this class yet.</p></div>`;
  }
  const totalUnseen = rows.reduce((a, r) => a + r.unseen, 0);
  const body = rows
    .map((r) => {
      const m = totals[r.level];
      return `<tr id="pw-row-${oc}-${r.pupilId}">
        <td><button type="button" class="link" hx-get="/lesson/oc/${oc}/pupil/${r.pupilId}/work" hx-target="#pw-readback-${oc}" hx-swap="innerHTML">${esc(r.displayName)}</button>${r.unseen > 0 ? ` <span class="pw-new" title="${r.unseen} new">●</span>` : ''}</td>
        <td>${levelChips(oc, r.pupilId, r.level)}</td>
        <td class="pw-prog">${r.filled}${m ? ` / ${m}` : ''}</td>
        <td>${r.done ? '✓' : ''}</td>
        <td>${r.rating ? ['', '🙁', '😐', '🙂', '😀'][r.rating] : ''}</td>
        <td class="muted">${r.lastSaved ? esc(r.lastSaved) : ''}</td>
      </tr>`;
    })
    .join('');
  return `<div class="pupil-work" id="pw-${oc}">
    <h3>Pupil work ${totalUnseen > 0 ? `<span class="pw-new-count">${totalUnseen} new</span>` : ''}</h3>
    ${msg ? `<p class="adapt-note">${esc(msg)}</p>` : ''}
    <table class="pw-grid"><thead><tr><th>Pupil</th><th>Level</th><th>Done fields</th><th>Done ✓</th><th>Lesson</th><th>Saved</th></tr></thead><tbody>${body}</tbody></table>
    <div class="pw-actions">
      <button type="button" class="link" hx-post="/lesson/oc/${oc}/seen" hx-target="#pw-${oc}" hx-swap="outerHTML">mark all seen</button>
      <button type="button" class="link fu-ai" hx-post="/lesson/oc/${oc}/summarise" hx-target="#pw-summary-${oc}" hx-swap="innerHTML" hx-disabled-elt="this">✨ Summarise the class's work (AI)</button>
    </div>
    <div id="pw-summary-${oc}"></div>
    <div id="pw-readback-${oc}" class="pw-readback"></div>
  </div>`;
}

export function registerPupilWorkRoutes(app: FastifyInstance): void {
  const guard = { preHandler: [requireAuth, app.csrfProtection] };
  const ocParam = z.object({ id: z.coerce.number().int().positive() });

  // The lazy-loaded panel on the lesson page. Empty (silent) when pupil access is off.
  app.get('/lesson/oc/:id/pupil-work', { preHandler: requireAuth }, async (req, reply) => {
    if (!(await pupilAccessEnabled())) return reply.type('text/html').send('');
    const p = ocParam.safeParse(req.params);
    if (!p.success) return reply.code(400).send('');
    const info = await ocInfo(p.data.id);
    if (!info) return reply.type('text/html').send('');
    return reply.type('text/html').send(await renderGrid(p.data.id, info));
  });

  app.post('/lesson/oc/:id/pupil/:pid/level', guard, async (req, reply) => {
    const p = z.object({ id: z.coerce.number().int().positive(), pid: z.coerce.number().int().positive() }).safeParse(req.params);
    const b = z.object({ level: z.enum(['support', 'core', 'challenge']) }).safeParse(req.body);
    if (!p.success || !b.success) return reply.code(400).send('');
    const info = await ocInfo(p.data.id);
    if (!info) return reply.code(404).send('');
    if (!(await pupilInOc(p.data.pid, p.data.id))) return reply.code(403).send('');
    await setPupilLevel(p.data.pid, info.groupCourseId, b.data.level);
    return reply.type('text/html').send(levelChips(p.data.id, p.data.pid, b.data.level));
  });

  app.get('/lesson/oc/:id/pupil/:pid/work', { preHandler: requireAuth }, async (req, reply) => {
    const p = z.object({ id: z.coerce.number().int().positive(), pid: z.coerce.number().int().positive() }).safeParse(req.params);
    if (!p.success) return reply.code(400).send('');
    const info = await ocInfo(p.data.id);
    if (!info || info.lessonPlanId == null) return reply.type('text/html').send('<p class="muted">No worksheet bound.</p>');
    if (!(await pupilInOc(p.data.pid, p.data.id))) return reply.code(403).type('text/html').send('<p class="muted">Not in this class.</p>');
    const ws = await getLessonWorksheet(info.groupCourseId, info.lessonPlanId);
    if (!ws) return reply.type('text/html').send('<p class="muted">No worksheet for this lesson.</p>');
    const level = await getPupilLevel(p.data.pid, info.groupCourseId);
    const values = await getAnswers(p.data.pid, p.data.id);
    const rendered = renderWorksheet(ws.markdown, { mode: 'review', level, values });
    await markAnswersSeen(p.data.id, p.data.pid); // opening THIS pupil's sheet marks only their answers seen
    return reply.type('text/html').send(`<div class="pw-sheet"><div class="pw-sheet-head"><strong>${esc(ws.title)}</strong>
      <button type="button" class="link" hx-get="/lesson/oc/${p.data.id}/pupil-work" hx-target="#pw-${p.data.id}" hx-swap="outerHTML">↻ refresh grid</button></div>
      <div class="ws-doc ws-review">${rendered.html}</div></div>`);
  });

  app.post('/lesson/oc/:id/seen', guard, async (req, reply) => {
    const p = ocParam.safeParse(req.params);
    if (!p.success) return reply.code(400).send('');
    const info = await ocInfo(p.data.id);
    if (!info) return reply.code(404).send('');
    await markAnswersSeen(p.data.id);
    return reply.type('text/html').send(await renderGrid(p.data.id, info, 'Marked all seen.'));
  });

  // 8.7: aggregate (anonymised) → AI → store as a lesson note (joins recentGroupHistory) → show.
  app.post('/lesson/oc/:id/summarise', guard, async (req, reply) => {
    if (!(await pupilAccessEnabled())) return reply.type('text/html').send('<p class="muted">Pupil access is off.</p>');
    const p = ocParam.safeParse(req.params);
    if (!p.success) return reply.code(400).send('');
    const info = await ocInfo(p.data.id);
    if (!info || info.lessonPlanId == null) return reply.type('text/html').send('<p class="muted">No worksheet bound to summarise.</p>');
    const ws = await getLessonWorksheet(info.groupCourseId, info.lessonPlanId);
    if (!ws) return reply.type('text/html').send('<p class="muted">No worksheet for this lesson.</p>');

    // Map field keys → question labels using the CURRENT worksheet's field inventory. Answers are
    // keyed on the lesson instance and survive a re-version/flip, so a stored key may no longer
    // exist in the current document; drop those (their positional key would otherwise be sent to
    // the AI as a meaningless or mislabelled question). Checklist (task.*) ticks aren't questions.
    const inventory = renderWorksheet(ws.markdown, { mode: 'review' }).fields;
    const labelByKey = new Map(inventory.filter((f) => f.kind === 'text').map((f) => [f.key, f.label]));
    const [answers, feedback] = await Promise.all([classAnswers(p.data.id), classFeedback(p.data.id)]);
    if (answers.length === 0 && feedback.ratings.length === 0 && feedback.liked.length === 0) {
      return reply.type('text/html').send('<p class="muted">No answers or feedback yet to summarise.</p>');
    }
    const questions = answers
      .filter((a) => labelByKey.has(a.fieldKey))
      .map((a) => ({ label: labelByKey.get(a.fieldKey)!, answers: a.answers }));
    const result = await callLLM({
      feature: 'class_work',
      model: await modelFor('cheap'),
      promptVersion: CLASS_WORK_VERSION,
      system: CLASS_WORK_SYSTEM,
      context: classWorkItems({ worksheetTitle: ws.title, questions, ratings: feedback.ratings, liked: feedback.liked, disliked: feedback.disliked, comments: feedback.comments }),
      instruction: CLASS_WORK_INSTRUCTION,
      maxTokens: 1500,
    });
    if (result.status !== 'ok' || !result.text) {
      return reply.type('text/html').send(`<p class="error">${esc(result.message ?? 'AI unavailable right now.')}</p>`);
    }
    // Store as a lesson note so "adapt from recent lessons" picks it up. Never let a note-save
    // failure lose the (already billed) summary — show it regardless.
    try {
      await pool.query(`INSERT INTO notes (kind, body, occurrence_id, course_id) VALUES ('ai_summary', $1, $2, $3)`, [
        `Pupil work summary (${ws.title}):\n\n${result.text}`,
        info.occurrenceId,
        null,
      ]);
    } catch (err) {
      app.log.error({ err }, 'failed to save class-work summary note');
    }
    const fbDigest = feedbackDigest(feedback);
    return reply.type('text/html').send(`<div class="pw-summary adapt-note">
      ${renderMarkdown(result.text)}
      <p class="muted">Saved to this lesson's notes — "adapt from recent lessons" will use it.</p>
      ${fbDigest ? `<button type="button" class="link" hx-post="/lesson/oc/${p.data.id}/context-append" hx-vals='${esc(JSON.stringify({ text: fbDigest }))}' hx-target="this" hx-swap="outerHTML">＋ add "${esc(fbDigest)}" to this class's teaching context</button>` : ''}
    </div>`);
  });

  app.post('/lesson/oc/:id/context-append', guard, async (req, reply) => {
    const p = ocParam.safeParse(req.params);
    const b = z.object({ text: z.string().min(1).max(300) }).safeParse(req.body);
    if (!p.success || !b.success) return reply.code(400).send('');
    const info = await ocInfo(p.data.id);
    if (!info) return reply.code(404).send('');
    const existing = (await getGroupTeachingContext(info.groupCourseId)) ?? '';
    const next = existing.trim() ? `${existing.trim()}\n${b.data.text}` : b.data.text;
    await setGroupTeachingContext(info.groupCourseId, next);
    return reply.type('text/html').send('<span class="note-status saved">added to teaching context ✓</span>');
  });
}

/** A one-line standing digest from the feedback, e.g. "Tends to enjoy practical, cards; rates typing lowest." */
function feedbackDigest(fb: { ratings: number[]; liked: string[]; disliked: string[] }): string | null {
  const top = (xs: string[]): string[] => {
    const m = new Map<string, number>();
    for (const x of xs) m.set(x, (m.get(x) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 2).map(([k]) => k);
  };
  const liked = top(fb.liked);
  const disliked = top(fb.disliked);
  if (liked.length === 0 && disliked.length === 0) return null;
  const parts: string[] = [];
  if (liked.length) parts.push(`tends to enjoy ${liked.join(', ')}`);
  if (disliked.length) parts.push(`less keen on ${disliked.join(', ')}`);
  return `This class ${parts.join('; ')}.`;
}
