// Phase 13.5 — the class planner. Pick a class → a timeline of weeks (rows) × the class's weekly
// slots (columns), holiday-aware; a tray of the course's not-yet-placed lessons. Drag a tray lesson
// onto a slot to place it ("all move along one" pushes the occupant and the run after it forward); drag
// a placed lesson to another slot to move it. Read of the timeline is server-rendered; every drop posts
// to /planner/place, which rearranges the bindings via the tested cascade primitives and re-renders.
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../auth/guard';
import { esc, layout } from '../lib/html';
import { getClockContext } from '../repos/clock';
import { addDays, localParts, weekdayOf } from '../lib/time';
import {
  applyPlacements,
  classPlacements,
  classSchedule,
  classSlots,
  getCurrentYearEnd,
  layLessonsAcrossClass,
  listAllSlots,
  setPlannerLock,
  type ClassScheduleEntry,
  type GroupCourseSlot,
} from '../repos/delivery';
import { cascadeInsert, pullForward, upcomingClassSlots, weekdayName, type Placement } from '../services/delivery';
import { getActiveScheme, listPlansForUnit, listUnits, unitIdByPlan } from '../repos/schemes';

const WEEKS = 16; // how many school weeks of timeline to show
const OP_BUFFER_WEEKS = 12; // extra positions beyond the view so a cascade always has a trailing gap

// One-step undo: the window's bindings + locks captured just before the last mutating drop, per class.
// In-memory is fine — this is a single-teacher LAN app and undo is intentionally only one step deep.
const lastPlacement = new Map<number, Map<string, { plan: number | null; locked: boolean }>>();

interface ClassOpt {
  groupCourseId: number;
  courseId: number;
  label: string;
}

/** Monday of the week containing `isoDate` (weekday 1 = Mon). */
function weekStart(isoDate: string): string {
  return addDays(isoDate, 1 - weekdayOf(isoDate));
}

/** The distinct classes (group_courses) that teach, for the picker — derived from the slot list. */
function classesFromSlots(slots: Awaited<ReturnType<typeof listAllSlots>>): ClassOpt[] {
  const seen = new Map<number, ClassOpt>();
  for (const s of slots) {
    if (seen.has(s.groupCourseId)) continue;
    seen.set(s.groupCourseId, { groupCourseId: s.groupCourseId, courseId: s.courseId, label: `${s.groupName ?? 'group'} · ${s.courseName}` });
  }
  return [...seen.values()];
}

function key(date: string, tll: number): string {
  return `${date}#${tll}`;
}

/** Build the full placement window (view weeks + a buffer so cascades have room) for a class. */
async function loadWindow(
  groupCourseId: number,
  today: string,
  cols: GroupCourseSlot[],
  terms: Awaited<ReturnType<typeof getClockContext>>['terms'],
  yearEnd: string | null,
): Promise<{ stream: Array<{ date: string; timetabledLessonId: number }>; positions: Placement[]; bound: Map<string, ClassScheduleEntry> }> {
  const want = cols.length * (WEEKS + OP_BUFFER_WEEKS);
  const slots = cols.map((c) => ({ timetabledLessonId: c.timetabledLessonId, weekday: c.weekday, slotOrder: c.slotOrder }));
  const stream = upcomingClassSlots(slots, today, want, terms).filter((s) => !yearEnd || s.date <= yearEnd);
  const positions = await classPlacements(groupCourseId, stream);
  const last = stream.length ? stream[stream.length - 1]!.date : today;
  const sched = await classSchedule(groupCourseId, today, last);
  const bound = new Map(sched.map((e) => [key(e.date, e.timetabledLessonId), e]));
  return { stream, positions, bound };
}

function renderCell(date: string, col: GroupCourseSlot, entry: ClassScheduleEntry | undefined, unitEnds: boolean): string {
  const tll = col.timetabledLessonId;
  const planned = entry?.lessonPlanId != null;
  const locked = planned && entry!.locked;
  const acts = planned
    ? locked
      ? `<span class="pl-acts"><button type="button" class="pl-mini" data-pl-act="unlock" title="unpin — let it move again">🔒</button></span>`
      : `<span class="pl-acts"><button type="button" class="pl-mini" data-pl-act="lock" title="pin to this date — cascades flow around it">🔓</button><button type="button" class="pl-mini" data-pl-act="pull" title="remove &amp; pull the rest forward">✕</button></span>`
    : '';
  const inner = planned
    ? `<a class="pl-lesson" href="/lesson?lesson=${tll}&amp;date=${esc(date)}" draggable="false">${esc(entry!.planTitle ?? 'lesson')}</a>${
        locked ? ' <span class="pl-lock" title="pinned to this date">🔒</span>' : ''
      }${entry!.adapted ? ' <span class="pl-adapted" title="adapted for this class">✏</span>' : ''}${
        entry!.kitNeeded ? `<span class="pl-kit" title="kit needed">🔧</span>` : ''
      } ${acts}${unitEnds ? '<span class="pl-unit-end" title="last lesson of its unit">— unit ends —</span>' : ''}`
    : `<span class="pl-empty">+ drop a lesson</span>`;
  return `<td class="pl-cell${planned ? ' is-placed' : ' is-empty'}${locked ? ' is-locked' : ''}${unitEnds ? ' is-unit-end' : ''}" data-date="${esc(date)}" data-tll="${tll}"${
    planned && !locked ? ` data-plan="${entry!.lessonPlanId}" draggable="true"` : ''
  }>${inner}</td>`;
}

async function renderTray(courseId: number, placed: Set<number>): Promise<string> {
  const scheme = await getActiveScheme(courseId);
  if (!scheme) return '<p class="muted">No active scheme for this course — author one on the Schemes page.</p>';
  const units = await listUnits(scheme.id);
  const blocks: string[] = [];
  for (const u of units) {
    const lessons = (await listPlansForUnit(u.id)).filter((l) => !placed.has(l.id));
    if (!lessons.length) continue;
    const chips = lessons
      .map((l) => `<li class="pl-tray-lesson" draggable="true" data-plan="${l.id}" title="drag onto a slot to place">${esc(l.title)}</li>`)
      .join('');
    blocks.push(
      `<div class="pl-tray-unit"><h3 class="pl-tray-unit-h" draggable="true" data-unit="${u.id}" title="drag the whole unit onto a slot to lay every lesson from there">⠿ ${esc(u.title)}</h3><ul class="pl-tray-lessons">${chips}</ul></div>`,
    );
  }
  if (!blocks.length) return '<p class="muted pl-tray-done">Every lesson in this scheme is placed. 🎉 Drag a placed lesson to move it.</p>';
  return blocks.join('');
}

function renderTimeline(
  cols: GroupCourseSlot[],
  stream: Array<{ date: string; timetabledLessonId: number }>,
  bound: Map<string, ClassScheduleEntry>,
  today: string,
  unitEnds: Set<string>,
): string {
  // Group the holiday-aware stream into week rows (Monday → its positions), capped at WEEKS rows.
  const byWeek = new Map<string, Map<number, string>>(); // weekStart → (tll → date)
  for (const s of stream) {
    const wk = weekStart(s.date);
    if (!byWeek.has(wk)) byWeek.set(wk, new Map());
    byWeek.get(wk)!.set(s.timetabledLessonId, s.date);
  }
  const weeks = [...byWeek.keys()].sort().slice(0, WEEKS);
  const head = `<tr><th class="pl-wk">Week</th>${cols
    .map((c) => `<th>${esc(weekdayName(c.weekday))}<br><span class="muted">${esc(c.periodLabel)}</span></th>`)
    .join('')}</tr>`;
  const thisWeek = weekStart(today);
  const rows = weeks
    .map((wk) => {
      const slotsThisWeek = byWeek.get(wk)!;
      const cells = cols
        .map((c) => {
          const date = slotsThisWeek.get(c.timetabledLessonId);
          if (!date) return '<td class="pl-cell pl-none" title="no lesson that week (holiday or off-timetable)">—</td>';
          const k = key(date, c.timetabledLessonId);
          return renderCell(date, c, bound.get(k), unitEnds.has(k));
        })
        .join('');
      const label = `${esc(wk)}${wk === thisWeek ? ' <span class="pl-now">this week</span>' : ''}`;
      return `<tr${wk === thisWeek ? ' class="pl-thisweek"' : ''}><td class="pl-wk">${label}</td>${cells}</tr>`;
    })
    .join('');
  return `<table class="pl-grid"><thead>${head}</thead><tbody>${rows}</tbody></table>`;
}

const DRAG_SCRIPT = `
(function(){
  var grid = document.getElementById('planner');
  if(!grid) return;
  var csrf = grid.getAttribute('data-pl-csrf');
  var gc = grid.getAttribute('data-pl-gc');
  var dragPlan = null, dragUnit = null, fromDate = null, fromTll = null;
  function post(params){
    params.gc = gc;
    var body = Object.keys(params).map(function(k){return encodeURIComponent(k)+'='+encodeURIComponent(params[k]);}).join('&');
    fetch('/planner/place', {method:'POST', headers:{'content-type':'application/x-www-form-urlencoded','x-csrf-token':csrf}, body:body})
      .then(function(r){ if(r.ok){ location.reload(); } else { r.text().then(function(t){ alert(t||'Could not place the lesson.'); }); } });
  }
  // the tray sits outside the grid element, so listen for tray dragstarts on the document
  document.addEventListener('dragstart', function(e){
    var t = e.target.closest('[draggable=true]'); if(!t) return;
    dragPlan = t.getAttribute('data-plan');
    dragUnit = t.getAttribute('data-unit');
    fromDate = t.getAttribute('data-date'); fromTll = t.getAttribute('data-tll');
    e.dataTransfer.effectAllowed = 'move';
  });
  grid.addEventListener('dragover', function(e){ var c = e.target.closest('.pl-cell'); if(c && !c.classList.contains('pl-none')){ e.preventDefault(); c.classList.add('pl-over'); } });
  grid.addEventListener('dragleave', function(e){ var c = e.target.closest('.pl-cell'); if(c) c.classList.remove('pl-over'); });
  grid.addEventListener('drop', function(e){
    var c = e.target.closest('.pl-cell'); if(!c || c.classList.contains('pl-none')) return;
    e.preventDefault(); c.classList.remove('pl-over');
    var date = c.getAttribute('data-date'), tll = c.getAttribute('data-tll');
    var p = null;
    if(dragUnit){ p = {op:'unit', unit:dragUnit, date:date, tll:tll}; }
    else if(dragPlan!=null){
      p = {date:date, tll:tll, plan:dragPlan};
      if(fromDate){ p.op='move'; p.fromDate=fromDate; p.fromTll=fromTll; } else { p.op='insert'; }
    }
    dragPlan=dragUnit=fromDate=fromTll=null;
    if(p) post(p);
  });
  grid.addEventListener('click', function(e){
    var b = e.target.closest('[data-pl-act]'); if(!b) return;
    var cell = b.closest('.pl-cell');
    var op = b.getAttribute('data-pl-act');
    post({op:op, date:cell.getAttribute('data-date'), tll:cell.getAttribute('data-tll')});
  });
  var undo = document.getElementById('pl-undo');
  if(undo) undo.addEventListener('click', function(){ post({op:'undo'}); });
})();
`;

export function registerPlannerRoutes(app: FastifyInstance): void {
  app.get('/planner', { preHandler: requireAuth }, async (req, reply) => {
    const csrf = reply.generateCsrf();
    let body: string;
    try {
      const slots = await listAllSlots();
      const classes = classesFromSlots(slots);
      if (!classes.length) {
        body = '<section class="card"><h1>Planner</h1><p class="muted">No weekly teaching slots yet — set up the timetable first.</p></section>';
      } else {
        const q = z.object({ gc: z.coerce.number().int().positive().optional() }).safeParse(req.query);
        const chosen = (q.success && q.data.gc && classes.find((c) => c.groupCourseId === q.data.gc)) || classes[0]!;
        const ctx = await getClockContext();
        const today = localParts(new Date(), ctx.tz).isoDate;
        const yearEnd = await getCurrentYearEnd();
        const cols = await classSlots(chosen.groupCourseId);

        if (!cols.length) {
          body = `<section class="card"><h1>Planner</h1><p class="muted">${esc(chosen.label)} has no weekly slots this year.</p></section>`;
        } else {
          const { stream, bound } = await loadWindow(chosen.groupCourseId, today, cols, ctx.terms, yearEnd);
          const placed = new Set<number>([...bound.values()].map((e) => e.lessonPlanId).filter((id): id is number => id != null));
          // Mark each placed position that is the last of its unit's run along the stream (the next
          // placed slot belongs to a different unit, or there is none) — a "what's next" cue.
          const unitOf = await unitIdByPlan([...placed]);
          const unitEnds = new Set<string>();
          const placedSeq = stream.map((s) => ({ s, e: bound.get(key(s.date, s.timetabledLessonId)) })).filter((x) => x.e?.lessonPlanId != null);
          for (let i = 0; i < placedSeq.length; i++) {
            const cur = unitOf.get(placedSeq[i]!.e!.lessonPlanId!);
            const next = i + 1 < placedSeq.length ? unitOf.get(placedSeq[i + 1]!.e!.lessonPlanId!) : undefined;
            if (cur != null && cur !== next) unitEnds.add(key(placedSeq[i]!.s.date, placedSeq[i]!.s.timetabledLessonId));
          }
          const [timeline, tray] = [renderTimeline(cols, stream, bound, today, unitEnds), await renderTray(chosen.courseId, placed)];
          const opts = classes
            .map((c) => `<option value="${c.groupCourseId}"${c.groupCourseId === chosen.groupCourseId ? ' selected' : ''}>${esc(c.label)}</option>`)
            .join('');
          body = `
            <section class="card planner">
              <h1>Planner <span class="muted">— ${esc(chosen.label)}</span></h1>
              <form method="get" action="/planner" class="pl-pick">
                <label>Class <select name="gc" onchange="this.form.submit()">${opts}</select></label>
                <noscript><button type="submit">Go</button></noscript>
                <button type="button" id="pl-undo" class="btn-secondary" title="undo the last drop (one step)">↶ Undo last</button>
              </form>
              <p class="muted">Drag a lesson from the tray onto a slot to place it — dropping onto a filled slot pushes that lesson and everything after it along one (holidays skipped). Drag a whole unit (⠿) to lay all its lessons from that slot. Drag a placed lesson to move it; ✕ removes it and pulls the rest forward; 🔓 pins a lesson to its date so cascades flow around it. The next ${WEEKS} school weeks; history is fixed.</p>
              <div class="pl-layout">
                <div id="planner" class="pl-grid-wrap" data-pl-gc="${chosen.groupCourseId}" data-pl-csrf="${csrf}">${timeline}</div>
                <aside class="pl-tray"><h2>Lessons to place</h2>${tray}</aside>
              </div>
            </section>
            <script>${DRAG_SCRIPT}</script>`;
        }
      }
    } catch (err) {
      app.log.error({ err }, 'planner render failed');
      body = '<section class="card"><h1>Planner</h1><p class="muted">Unavailable — the database is not reachable.</p></section>';
    }
    return reply.type('text/html').send(layout({ title: 'Planner', body, authed: true, csrfToken: csrf }));
  });

  // A drop resolves here: rearrange the class's bindings via the tested cascade primitives, then the
  // client reloads the timeline. All ops stay within today-or-future positions (history is never touched).
  app.post('/planner/place', { preHandler: [requireAuth, app.csrfProtection] }, async (req, reply) => {
    const b = z
      .object({
        gc: z.coerce.number().int().positive(),
        op: z.enum(['insert', 'move', 'replace', 'pull', 'clear', 'swap', 'unit', 'lock', 'unlock', 'undo']),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), // not needed for undo
        tll: z.coerce.number().int().positive().optional(),
        plan: z.coerce.number().int().positive().optional(),
        unit: z.coerce.number().int().positive().optional(),
        fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        fromTll: z.coerce.number().int().positive().optional(),
      })
      .safeParse(req.body);
    if (!b.success) return reply.code(400).send('Bad request.');
    const { gc, op, date, tll, plan, unit, fromDate, fromTll } = b.data;

    const ctx = await getClockContext();
    const today = localParts(new Date(), ctx.tz).isoDate;
    if ((date && date < today) || (fromDate && fromDate < today)) return reply.code(400).send('Can only plan today or later.');
    const yearEnd = await getCurrentYearEnd();
    const cols = await classSlots(gc);
    if (!cols.length) return reply.code(404).send('No slots for this class.');
    const { positions, stream } = await loadWindow(gc, today, cols, ctx.terms, yearEnd);

    // Undo: restore the bindings + locks captured before the last mutating drop (only the differences).
    if (op === 'undo') {
      const snap = lastPlacement.get(gc);
      if (!snap) return reply.code(400).send('Nothing to undo.');
      const planChanges: Placement[] = [];
      for (const p of positions) {
        const s = snap.get(key(p.date, p.timetabledLessonId));
        if (s && s.plan !== p.lessonPlanId) planChanges.push({ ...p, lessonPlanId: s.plan });
      }
      await applyPlacements(gc, planChanges);
      for (const p of positions) {
        const s = snap.get(key(p.date, p.timetabledLessonId));
        if (s && s.locked !== (p.locked ?? false)) await setPlannerLock(gc, p.timetabledLessonId, p.date, s.locked);
      }
      lastPlacement.delete(gc); // undo is one step deep
      reply.header('HX-Redirect', `/planner?gc=${gc}`);
      return reply.send('');
    }

    if (date == null || tll == null) return reply.code(400).send('Bad request.');
    const indexOf = new Map(positions.map((p, i) => [key(p.date, p.timetabledLessonId), i]));
    const tIdx = indexOf.get(key(date, tll));
    if (tIdx == null) return reply.code(400).send('That slot is outside the plannable window.');

    // Snapshot the window before mutating, so this drop can be undone in one step.
    lastPlacement.set(gc, new Map(positions.map((p) => [key(p.date, p.timetabledLessonId), { plan: p.lessonPlanId, locked: p.locked ?? false }])));

    // Pin/unpin the target to its date — cascades will then flow around it.
    if (op === 'lock' || op === 'unlock') {
      const ok = await setPlannerLock(gc, tll, date, op === 'lock');
      if (!ok) return reply.code(400).send('Nothing planned there to pin.');
      reply.header('HX-Redirect', `/planner?gc=${gc}`);
      return reply.send('');
    }

    // Drop a WHOLE unit: lay its lessons sequentially across the class's slots from the target onward
    // (reuses the tested 13.1 lay-down; overwrites those positions). A one-gesture way to place a unit.
    if (op === 'unit') {
      if (unit == null) return reply.code(400).send('No unit to place.');
      const lessons = await listPlansForUnit(unit);
      if (!lessons.length) return reply.code(400).send('That unit has no lessons.');
      await layLessonsAcrossClass(gc, lessons, stream.slice(tIdx));
      reply.header('HX-Redirect', `/planner?gc=${gc}`);
      return reply.send('');
    }

    // A pinned target can't be written over; a pinned source can't be moved.
    if (positions[tIdx]!.locked && (op === 'insert' || op === 'replace' || op === 'clear')) {
      return reply.code(400).send('That slot is pinned — unpin it first (🔒).');
    }

    // Work on a mutable copy; each pure op returns the positions whose plan changed, which we fold in.
    const work = positions.map((p) => ({ ...p }));
    const fold = (changes: Placement[]) => {
      for (const c of changes) work[indexOf.get(key(c.date, c.timetabledLessonId))!]!.lessonPlanId = c.lessonPlanId;
    };

    if (op === 'insert') {
      if (plan == null) return reply.code(400).send('No lesson to place.');
      fold(cascadeInsert(work, tIdx, plan));
    } else if (op === 'replace') {
      if (plan == null) return reply.code(400).send('No lesson to place.');
      work[tIdx]!.lessonPlanId = plan;
    } else if (op === 'clear') {
      work[tIdx]!.lessonPlanId = null;
    } else if (op === 'pull') {
      fold(pullForward(work, tIdx));
    } else if (op === 'swap') {
      const fIdx = fromDate && fromTll != null ? indexOf.get(key(fromDate, fromTll)) : undefined;
      if (fIdx == null) return reply.code(400).send('Nothing to swap with.');
      const a = work[tIdx]!.lessonPlanId;
      work[tIdx]!.lessonPlanId = work[fIdx]!.lessonPlanId;
      work[fIdx]!.lessonPlanId = a;
    } else if (op === 'move') {
      const fIdx = fromDate && fromTll != null ? indexOf.get(key(fromDate, fromTll)) : undefined;
      if (fIdx == null) return reply.code(400).send('Could not find the lesson being moved.');
      if (positions[fIdx]!.locked) return reply.code(400).send('That lesson is pinned — unpin it first (🔒).');
      const moving = work[fIdx]!.lessonPlanId;
      if (moving == null) return reply.code(400).send('Nothing bound on the source slot.');
      fold(pullForward(work, fIdx)); // lift it out, closing the gap
      fold(cascadeInsert(work, tIdx, moving)); // drop it in at the target, pushing as needed
    }

    const changes = positions
      .map((p, i) => ({ ...p, lessonPlanId: work[i]!.lessonPlanId }))
      .filter((p, i) => p.lessonPlanId !== positions[i]!.lessonPlanId);
    await applyPlacements(gc, changes);
    reply.header('HX-Redirect', `/planner?gc=${gc}`);
    return reply.send('');
  });
}
