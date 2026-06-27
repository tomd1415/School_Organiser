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
  listAllSlots,
  setPlannerLock,
  type ClassScheduleEntry,
  type GroupCourseSlot,
} from '../repos/delivery';
import { cascadeInsert, layUnit, lostOffWindow, pullForward, upcomingClassSlots, weekdayName, type Placement } from '../services/delivery';
import { resolvePlannerAct, resolvePlannerDrop } from '../lib/plannerDrop';
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
  // The operational window must reach year-end so a cascade has every remaining school slot to absorb
  // a shift — otherwise a drop near a too-short window's end reads as overflow when room actually exists
  // later in the year (15.2b). When year-end is known, span a comfortable full year (the yearEnd filter
  // trims it); with no year configured, keep the conservative view+buffer.
  const want = cols.length * (yearEnd ? 56 : WEEKS + OP_BUFFER_WEEKS);
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
  // ✥ pick-up gives placed lessons a click/keyboard "move" affordance (15.2c) — drag is mouse-only.
  const acts = planned
    ? locked
      ? `<span class="pl-acts"><button type="button" class="pl-mini" data-pl-act="unlock" title="unpin — let it move again">🔒</button></span>`
      : `<span class="pl-acts"><button type="button" class="pl-mini" data-pl-act="pickup" title="pick up to move — then choose a slot" aria-label="Pick up ${esc(entry!.planTitle ?? 'lesson')} to move">✥</button><button type="button" class="pl-mini" data-pl-act="lock" title="pin to this date — cascades flow around it">🔓</button><button type="button" class="pl-mini" data-pl-act="pull" title="remove &amp; pull the rest forward">✕</button></span>`
    : '';
  const inner = planned
    ? `<a class="pl-lesson" href="/lesson?lesson=${tll}&amp;date=${esc(date)}" draggable="false">${esc(entry!.planTitle ?? 'lesson')}</a>${
        locked ? ' <span class="pl-lock" title="pinned to this date">🔒</span>' : ''
      }${entry!.adapted ? ' <span class="pl-adapted" title="adapted for this class">✏</span>' : ''}${
        entry!.kitNeeded ? `<span class="pl-kit" title="kit needed">🔧</span>` : ''
      } ${acts}${unitEnds ? '<span class="pl-unit-end" title="last lesson of its unit">— unit ends —</span>' : ''}`
    : `<span class="pl-empty">+ drop a lesson</span>`;
  // Every real slot is a keyboard/touch drop target (15.2c): focusable + a clear label of what's there and
  // what dropping does. (Pinned slots still describe themselves but a cascade flows around them server-side.)
  const where = `${weekdayName(col.weekday)} ${col.periodLabel}, ${date}`;
  const ariaCell = planned
    ? `${where}: ${entry!.planTitle ?? 'lesson'}${locked ? ', pinned' : ''}. Press Enter to drop a picked-up lesson here.`
    : `${where}: empty. Press Enter to drop a picked-up lesson here.`;
  return `<td class="pl-cell${planned ? ' is-placed' : ' is-empty'}${locked ? ' is-locked' : ''}${unitEnds ? ' is-unit-end' : ''}" tabindex="0" aria-label="${esc(ariaCell)}" data-date="${esc(date)}" data-tll="${tll}"${
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
      .map(
        (l) =>
          `<li class="pl-tray-lesson" draggable="true" tabindex="0" role="button" data-pl-pick data-plan="${l.id}" title="drag — or tap/Enter to pick up — then choose a slot" aria-label="Pick up lesson ${esc(l.title)} to place">${esc(l.title)}</li>`,
      )
      .join('');
    blocks.push(
      `<div class="pl-tray-unit"><h3 class="pl-tray-unit-h" draggable="true" tabindex="0" role="button" data-pl-pick data-unit="${u.id}" title="drag — or tap/Enter to pick up — then choose a slot to lay every lesson from there" aria-label="Pick up whole unit ${esc(u.title)} to lay down">⠿ ${esc(u.title)}</h3><ul class="pl-tray-lessons">${chips}</ul></div>`,
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

// The page script is now a THIN ADAPTER over the pure, unit-tested resolvers (15.2a): it reads the DOM
// into plain state and calls resolvePlannerDrop / resolvePlannerAct (injected verbatim via .toString()).
// It also adds a click-to-place + keyboard path (15.2c) so the planner works by touch and keyboard, not
// just mouse drag — the same resolver drives drag, tap and Enter.
const DRAG_SCRIPT = `
(function(){
  ${resolvePlannerDrop.toString()}
  ${resolvePlannerAct.toString()}
  var grid = document.getElementById('planner');
  if(!grid) return;
  var csrf = grid.getAttribute('data-pl-csrf');
  var gc = grid.getAttribute('data-pl-gc');
  var status = document.getElementById('pl-status');
  function announce(msg){ if(status) status.textContent = msg; }
  function post(op, params){
    var all = {}; for(var k in params) all[k] = params[k]; all.op = op; all.gc = gc;
    var body = Object.keys(all).map(function(k){return encodeURIComponent(k)+'='+encodeURIComponent(all[k]);}).join('&');
    fetch('/planner/place', {method:'POST', headers:{'content-type':'application/x-www-form-urlencoded','x-csrf-token':csrf}, body:body})
      .then(function(r){ if(r.ok){ location.reload(); } else { r.text().then(function(t){ alert(t||'Could not place the lesson.'); }); } });
  }
  function cellTarget(c){ return { date:c.getAttribute('data-date'), tll:c.getAttribute('data-tll'), isNone:c.classList.contains('pl-none') }; }
  function dragStateOf(el){ return { dragPlan:el.getAttribute('data-plan'), dragUnit:el.getAttribute('data-unit'), fromDate:el.getAttribute('data-date'), fromTll:el.getAttribute('data-tll') }; }
  function submitDrop(state, c){ var p = resolvePlannerDrop(state, cellTarget(c)); if(p){ post(p.op, p.params); return true; } return false; }

  // ── mouse drag-and-drop ─────────────────────────────────────────────────────────────────────
  var drag = null; // {dragPlan,dragUnit,fromDate,fromTll}
  document.addEventListener('dragstart', function(e){
    var t = e.target.closest('[draggable=true]'); if(!t) return;
    drag = dragStateOf(t);
    e.dataTransfer.effectAllowed = 'move';
  });
  grid.addEventListener('dragover', function(e){ var c = e.target.closest('.pl-cell'); if(c && !c.classList.contains('pl-none')){ e.preventDefault(); c.classList.add('pl-over'); } });
  grid.addEventListener('dragleave', function(e){ var c = e.target.closest('.pl-cell'); if(c) c.classList.remove('pl-over'); });
  grid.addEventListener('drop', function(e){
    var c = e.target.closest('.pl-cell'); if(!c) return;
    e.preventDefault(); c.classList.remove('pl-over');
    if(drag) submitDrop(drag, c);
    drag = null;
  });

  // ── click-to-place + keyboard (touch / no-mouse friendly) ───────────────────────────────────
  var picked = null;     // {dragPlan,dragUnit,fromDate,fromTll}
  var pickedEl = null;
  function clearPick(){ if(pickedEl) pickedEl.classList.remove('pl-picked'); picked = null; pickedEl = null; grid.classList.remove('pl-placing'); announce(''); }
  function pickUp(el, state, label){ clearPick(); picked = state; pickedEl = el; el.classList.add('pl-picked'); grid.classList.add('pl-placing'); announce('Picked up ' + label + ' — choose a slot to place it, or press Escape to cancel.'); }
  function dropOn(c){ if(!picked) return; var ok = submitDrop(picked, c); if(!ok) clearPick(); }

  function handleActivate(target){
    // an in-cell action button (✥ pick up / ✕ pull / 🔓 / 🔒)
    var actBtn = target.closest('[data-pl-act]');
    if(actBtn){
      var cell = actBtn.closest('.pl-cell');
      var act = actBtn.getAttribute('data-pl-act');
      if(act === 'pickup'){ pickUp(cell, dragStateOf(cell), cell.getAttribute('data-plan') ? 'this lesson' : 'lesson'); return true; }
      var r = resolvePlannerAct(act, { date:cell.getAttribute('data-date'), tll:cell.getAttribute('data-tll') });
      if(r){ post(r.op, r.params); return true; }
      return true;
    }
    // a tray pick-up source (lesson chip or unit header)
    var src = target.closest('[data-pl-pick]');
    if(src){
      if(pickedEl === src){ clearPick(); }
      else { pickUp(src, dragStateOf(src), src.getAttribute('data-unit') ? 'a whole unit' : 'a lesson'); }
      return true;
    }
    // a target cell to drop a picked-up item onto
    if(picked){
      var c = target.closest('.pl-cell');
      if(c && !c.classList.contains('pl-none')){ dropOn(c); return true; }
    }
    return false;
  }

  document.addEventListener('click', function(e){
    if(e.target.closest('a.pl-lesson')) return; // let the "open lesson" link work normally
    handleActivate(e.target);
  });
  document.addEventListener('keydown', function(e){
    if(e.key === 'Escape'){ if(picked){ clearPick(); e.preventDefault(); } return; }
    if(e.key !== 'Enter' && e.key !== ' ') return;
    var el = e.target;
    // only intercept on our interactive elements, so normal controls keep working
    if(el.closest('[data-pl-act]') || el.closest('[data-pl-pick]') || (picked && el.closest('.pl-cell'))){
      e.preventDefault();
      handleActivate(el);
    }
  });

  var undo = document.getElementById('pl-undo');
  if(undo) undo.addEventListener('click', function(){ post('undo', {}); });
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
          const canUndo = lastPlacement.has(chosen.groupCourseId);
          const opts = classes
            .map((c) => `<option value="${c.groupCourseId}"${c.groupCourseId === chosen.groupCourseId ? ' selected' : ''}>${esc(c.label)}</option>`)
            .join('');
          body = `
            <section class="card planner">
              <h1>Planner <span class="muted">— ${esc(chosen.label)}</span></h1>
              <form method="get" action="/planner" class="pl-pick">
                <label>Class <select name="gc" onchange="this.form.submit()">${opts}</select></label>
                <noscript><button type="submit">Go</button></noscript>
                <button type="button" id="pl-undo" class="btn-secondary"${canUndo ? '' : ' disabled'} title="${canUndo ? 'undo the last drop (one step deep, this class only)' : 'nothing to undo yet'}">↶ Undo last</button>
              </form>
              <p class="muted">Drag a lesson from the tray onto a slot to place it — or, without a mouse, <strong>tap (or focus + Enter) a lesson to pick it up, then a slot to drop it</strong> (Escape cancels). Dropping onto a filled slot pushes that lesson and everything after it along one (holidays skipped). Drag/tap a whole unit (⠿) to lay all its lessons from that slot. ✥ picks up a placed lesson to move it; ✕ removes it and pulls the rest forward; 🔓 pins a lesson to its date so cascades flow around it. The next ${WEEKS} school weeks; history is fixed.</p>
              <div id="pl-status" class="pl-status" role="status" aria-live="polite"></div>
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
    return reply.type('text/html').send(layout({ title: 'Planner', body, authed: true, csrfToken: csrf, width: 'wide' }));
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
    const { positions } = await loadWindow(gc, today, cols, ctx.terms, yearEnd);

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

    // Capture the window's pre-state so this drop can be undone in one step — but only ARM it AFTER the
    // write commits (BUG-021), so a failed/rolled-back mutation never leaves a bogus one-step undo.
    const snapshot = new Map(positions.map((p) => [key(p.date, p.timetabledLessonId), { plan: p.lessonPlanId, locked: p.locked ?? false }]));
    const armUndo = (): void => void lastPlacement.set(gc, snapshot);

    // Pin/unpin the target to its date — cascades will then flow around it.
    if (op === 'lock' || op === 'unlock') {
      const ok = await setPlannerLock(gc, tll, date, op === 'lock');
      if (!ok) return reply.code(400).send('Nothing planned there to pin.');
      armUndo();
      reply.header('HX-Redirect', `/planner?gc=${gc}`);
      return reply.send('');
    }

    // A pinned target can't be written over — covers a single drop AND a whole-unit lay-down (BUG-014:
    // unit placement is now lock-aware too); a pinned source can't be moved.
    if (positions[tIdx]!.locked && (op === 'insert' || op === 'replace' || op === 'clear' || op === 'unit')) {
      return reply.code(400).send('That slot is pinned — unpin it first (🔒).');
    }

    // Work on a mutable copy; each pure op returns the positions whose plan changed, which we fold in.
    const work = positions.map((p) => ({ ...p }));
    const fold = (changes: Placement[]) => {
      for (const c of changes) work[indexOf.get(key(c.date, c.timetabledLessonId))!]!.lessonPlanId = c.lessonPlanId;
    };
    // The plan ids a pushing op (insert/move/unit) is obliged to keep on the board — used after the op to
    // detect any lesson the cascade silently dropped past year-end (15.2b). Removing ops (pull/clear) and
    // in-place ops (replace/swap) leave it null: they never overflow the window.
    const beforePlans = positions.map((p) => p.lessonPlanId).filter((id): id is number => id != null);
    let mustRemain: number[] | null = null;

    if (op === 'insert') {
      if (plan == null) return reply.code(400).send('No lesson to place.');
      mustRemain = [...beforePlans, plan];
      fold(cascadeInsert(work, tIdx, plan));
    } else if (op === 'replace') {
      if (plan == null) return reply.code(400).send('No lesson to place.');
      work[tIdx]!.lessonPlanId = plan;
    } else if (op === 'clear') {
      work[tIdx]!.lessonPlanId = null;
    } else if (op === 'unit') {
      // Drop a WHOLE unit: lay its lessons across the class's slots from the target onward, flowing
      // AROUND any pinned slots (BUG-014) and persisting through the same atomic apply path as a single
      // drop (BUG-021) — instead of the old blind overwrite that clobbered pins and wrote row-by-row.
      if (unit == null) return reply.code(400).send('No unit to place.');
      const lessons = await listPlansForUnit(unit);
      if (!lessons.length) return reply.code(400).send('That unit has no lessons.');
      mustRemain = lessons.map((l) => l.id); // every unit lesson must land somewhere in the window
      fold(layUnit(work, tIdx, lessons.map((l) => l.id)));
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
      mustRemain = beforePlans; // the moving lesson is lifted then re-inserted — none may fall off
      fold(pullForward(work, fIdx)); // lift it out, closing the gap
      fold(cascadeInsert(work, tIdx, moving)); // drop it in at the target, pushing as needed
    }

    // 15.2b — refuse a drop that would push a real lesson off the end of the year rather than vanishing
    // it (mirrors /map/shift's year-end overflow message). The window already spans to year-end, so this
    // fires only when the remaining year is genuinely full.
    if (mustRemain) {
      const lost = lostOffWindow(mustRemain, work.map((p) => p.lessonPlanId));
      if (lost.length) {
        const n = lost.length;
        return reply
          .code(409)
          .send(
            `No room: that would push ${n === 1 ? 'a lesson' : `${n} lessons`} past the end of the school year, so nothing was moved. Pin or remove a lesson to make space, or lay the overflow next year.`,
          );
      }
    }

    const changes = positions
      .map((p, i) => ({ ...p, lessonPlanId: work[i]!.lessonPlanId }))
      .filter((p, i) => p.lessonPlanId !== positions[i]!.lessonPlanId);
    await applyPlacements(gc, changes);
    armUndo(); // arm one-step undo only now the write has committed (BUG-021)
    reply.header('HX-Redirect', `/planner?gc=${gc}`);
    return reply.send('');
  });
}
