// Phase 6.2: the Setup area — everything the seed used to hard-code, editable in-app.
// Tabs: Year & terms · Day shape · Rooms & staff · Courses · Groups & pupils.
// Year-scoped tabs carry an explicit ?year= so next September is built as a DRAFT alongside the
// live year: nothing the user does here touches the current year until "make current" (go-live).
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../auth/guard';
import { esc, layout } from '../lib/html';
import { renderSavedStatus } from '../lib/notesView';
import { weekdayName } from '../services/delivery';
import {
  applyModelDay,
  copyDayShape,
  createCourse,
  createGroup,
  createPeriod,
  createRoom,
  createStaff,
  createTerm,
  createYear,
  deletePeriod,
  deleteTerm,
  enrolPupil,
  getCurrentYearId,
  listAllCourses,
  listEnrolled,
  listGroups,
  listPeriods,
  listRooms,
  listStaff,
  listTerms,
  listYears,
  makeYearCurrent,
  moveEnrolment,
  setCourseActive,
  setGroupActive,
  setGroupCourse,
  setRoomActive,
  setStaffActive,
  unenrolPupil,
  updateCourseField,
  updateGroupField,
  updatePeriodField,
  updateTermField,
  updateYearField,
  createLessonOnPeriod,
  deleteLesson,
  listEditorLessons,
  toggleLessonCourse,
  updateLessonField,
  type ApplyModelDayResult,
  type EditorLesson,
  type YearRow,
} from '../repos/setup';
import { listPupils } from '../repos/pupils';

const idParam = z.object({ id: z.coerce.number().int().positive() });
const TABS = ['year', 'day', 'people', 'courses', 'groups', 'timetable'] as const;
type Tab = (typeof TABS)[number];
const TAB_LABELS: Record<Tab, string> = {
  year: 'Year & terms',
  day: 'Day shape',
  people: 'Rooms & staff',
  courses: 'Courses',
  groups: 'Groups & pupils',
  timetable: 'Timetable',
};
const DATE = /^\d{4}-\d{2}-\d{2}$/;

function save(url: string, field: string, trigger = 'input changed delay:700ms, blur'): string {
  return `hx-post="${url}" hx-vals='{"field":"${field}"}' hx-trigger="${trigger}" hx-swap="none"`;
}

function yearPicker(years: YearRow[], selected: number, tab: Tab): string {
  const opts = years
    .map((y) => `<option value="${y.id}"${Number(y.id) === selected ? ' selected' : ''}>${esc(y.name)}${y.isCurrent ? ' (current)' : ''}</option>`)
    .join('');
  return `<form method="get" action="/setup" class="setup-year">
    <input type="hidden" name="tab" value="${tab}">
    <label>Editing year <select name="year" onchange="this.form.submit()">${opts}</select></label>
    <noscript><button type="submit">Go</button></noscript>
  </form>`;
}

// ── tab bodies ───────────────────────────────────────────────────────────────────────────────

async function yearTab(years: YearRow[], yearId: number): Promise<string> {
  const terms = await listTerms(yearId);
  const sel = years.find((y) => Number(y.id) === yearId);
  const kindOpts = (k: string) =>
    ['term', 'half_term', 'holiday', 'inset']
      .map((o) => `<option value="${o}"${o === k ? ' selected' : ''}>${o.replace('_', ' ')}</option>`)
      .join('');
  const yearRows = years
    .map(
      (y) => `<tr id="yr-${y.id}">
      <td><input name="value" value="${esc(y.name)}" ${save(`/setup/year/${y.id}`, 'name')}></td>
      <td><input type="date" name="value" value="${esc(y.startDate)}" ${save(`/setup/year/${y.id}`, 'start_date', 'change')}></td>
      <td><input type="date" name="value" value="${esc(y.endDate)}" ${save(`/setup/year/${y.id}`, 'end_date', 'change')}></td>
      <td>${
        y.isCurrent
          ? '<strong class="map-today">current</strong>'
          : `<button type="button" class="link" hx-post="/setup/year/${y.id}/make-current" hx-confirm="Go live with ${esc(y.name)}? The Now screen, timetable and map switch to it immediately; the old year becomes the archive." hx-target="body" hx-swap="none" hx-on::after-request="location.reload()">make current</button>`
      } <span class="note-status" id="yr-${y.id}-status"></span></td>
    </tr>`,
    )
    .join('');
  const termRows = terms
    .map(
      (t) => `<tr id="term-${t.id}">
      <td><input name="value" value="${esc(t.name)}" ${save(`/setup/term/${t.id}`, 'name')}></td>
      <td><select name="value" ${save(`/setup/term/${t.id}`, 'kind', 'change')}>${kindOpts(t.kind)}</select></td>
      <td><input type="date" name="value" value="${esc(t.startDate)}" ${save(`/setup/term/${t.id}`, 'start_date', 'change')}></td>
      <td><input type="date" name="value" value="${esc(t.endDate)}" ${save(`/setup/term/${t.id}`, 'end_date', 'change')}></td>
      <td><span class="note-status" id="term-${t.id}-status"></span>
        <button type="button" class="link danger" hx-post="/setup/term/${t.id}/delete" hx-confirm="Delete ${esc(t.name)}?" hx-target="#term-${t.id}" hx-swap="outerHTML">✕</button></td>
    </tr>`,
    )
    .join('');
  return `
    <h2>Academic years</h2>
    <div class="table-scroll"><table class="setup-table">
      <thead><tr><th>Name</th><th>First day</th><th>Last day</th><th></th></tr></thead>
      <tbody>${yearRows}</tbody>
    </table></div>
    <form class="setup-add" hx-post="/setup/year/add" hx-target="closest section" hx-swap="outerHTML">
      <input name="name" placeholder="2026/27" required maxlength="50">
      <input type="date" name="start" required title="first day">
      <input type="date" name="end" required title="last day">
      <button type="submit" class="btn-secondary">＋ add year</button>
      <p class="muted lay-note">A new year starts as a draft — build its terms, day shape, groups and timetable here, then "make current" when September arrives. The guided path is the <a href="/setup/rollover">September rollover →</a></p>
    </form>
    <h2>Terms, holidays &amp; INSET — ${esc(sel?.name ?? '')}</h2>
    <div class="table-scroll"><table class="setup-table">
      <thead><tr><th>Name</th><th>Kind</th><th>From</th><th>To</th><th></th></tr></thead>
      <tbody>${termRows || '<tr><td colspan="5" class="muted">nothing yet — add the first term below</td></tr>'}</tbody>
    </table></div>
    <form class="setup-add" hx-post="/setup/term/add?year=${yearId}" hx-target="closest section" hx-swap="outerHTML">
      <input name="name" placeholder="Autumn term" required maxlength="100">
      <select name="kind">${kindOpts('term')}</select>
      <input type="date" name="start" required>
      <input type="date" name="end" required>
      <button type="submit" class="btn-secondary">＋ add</button>
    </form>`;
}

async function dayTab(years: YearRow[], yearId: number): Promise<string> {
  const periods = await listPeriods(yearId);
  const others = years.filter((y) => Number(y.id) !== yearId);
  const typeOpts = (t: string) =>
    ['before_school', 'briefing', 'form_am', 'lesson', 'break', 'lunch', 'form_pm', 'after_school']
      .map((o) => `<option value="${o}"${o === t ? ' selected' : ''}>${o.replace('_', ' ')}</option>`)
      .join('');
  const days = [1, 2, 3, 4, 5].map((wd) => {
    const rows = periods
      .filter((p) => p.weekday === wd)
      .sort((a, b) => a.start.localeCompare(b.start) || a.slotOrder - b.slotOrder)
      .map(
        (p) => `<tr id="pd-${p.id}">
        <td><input class="setup-narrow" name="value" value="${esc(p.label)}" ${save(`/setup/period/${p.id}`, 'label')}></td>
        <td><select name="value" ${save(`/setup/period/${p.id}`, 'slot_type', 'change')}>${typeOpts(p.slotType)}</select></td>
        <td><input class="setup-time" type="time" name="value" value="${esc(p.start)}" ${save(`/setup/period/${p.id}`, 'start_time', 'change')}></td>
        <td><input class="setup-time" type="time" name="value" value="${esc(p.end)}" ${save(`/setup/period/${p.id}`, 'end_time', 'change')}></td>
        <td><input class="setup-num" name="value" inputmode="numeric" value="${p.lessonIndex ?? ''}" placeholder="—" title="lesson number (1–6)" ${save(`/setup/period/${p.id}`, 'lesson_index')}></td>
        <td><input type="checkbox" name="value" value="true"${p.teachable ? ' checked' : ''} title="teachable slot"
          hx-post="/setup/period/${p.id}" hx-vals='js:{"field":"teachable","value":event.target.checked ? "true" : "false"}' hx-trigger="change" hx-swap="none"></td>
        <td><span class="note-status" id="pd-${p.id}-status"></span>
          <button type="button" class="link danger" title="delete (only when nothing is timetabled on it)" hx-post="/setup/period/${p.id}/delete" hx-confirm="Delete this period?" hx-target="#pd-${p.id}" hx-swap="outerHTML">✕</button></td>
      </tr>`,
      )
      .join('');
    return `<h3>${weekdayName(wd)}</h3>
      <div class="table-scroll"><table class="setup-table">
        <thead><tr><th>Label</th><th>Type</th><th>Start</th><th>End</th><th>L#</th><th title="teachable">T</th><th></th></tr></thead>
        <tbody>${rows || `<tr><td colspan="7" class="muted">no periods on ${weekdayName(wd)}</td></tr>`}</tbody>
      </table></div>
      <button type="button" class="link" hx-post="/setup/period/add?year=${yearId}&weekday=${wd}" hx-target="closest section" hx-swap="outerHTML">＋ period on ${weekdayName(wd)}</button>`;
  });
  const copyFrom = others.length
    ? `<form class="setup-add" hx-post="/setup/day/copy?year=${yearId}" hx-target="closest section" hx-swap="outerHTML">
        <label>Copy whole day shape from
          <select name="from">${others.map((y) => `<option value="${y.id}">${esc(y.name)}</option>`).join('')}</select>
        </label>
        <button type="submit" class="btn-secondary">copy →</button>
        <p class="muted lay-note">Copies every period that doesn't already exist in this year — then edit the times here.</p>
      </form>`
    : '';
  // "Model day": build one day fully, then stamp its shape (times/labels/types — never classes)
  // onto every other weekday, and tweak per day afterwards.
  const dayCount = (wd: number) => periods.filter((p) => p.weekday === wd).length;
  const modelDefault = [1, 2, 3, 4, 5].reduce((best, wd) => (dayCount(wd) > dayCount(best) ? wd : best), 1);
  const modelDay = periods.length
    ? `<form class="setup-add" hx-post="/setup/day/apply-model?year=${yearId}" hx-target="closest section" hx-swap="outerHTML"
          hx-confirm="Replace the period structure on the other weekdays with this day's? Times, labels and slot types are copied — never classes. Any weekday that already has classes assigned is left untouched.">
        <label>Model day — use
          <select name="model">${[1, 2, 3, 4, 5].map((wd) => `<option value="${wd}"${wd === modelDefault ? ' selected' : ''}>${weekdayName(wd)}</option>`).join('')}</select>
          and apply it to the whole week</label>
        <button type="submit" class="btn-secondary">apply to all days →</button>
        <p class="muted lay-note">Stamps that day's times, labels and slot types onto every other weekday; classes are never copied, so you just fill those in per day afterwards.</p>
      </form>`
    : '';
  return `<h2>Day shape — periods &amp; times</h2>${modelDay}${copyFrom}${days.join('')}`;
}

/** Banner shown after a "model day" apply, summarising what changed and what was protected. */
function applyModelNotice(r: ApplyModelDayResult): string {
  if (r.modelPeriods === 0)
    return `<p class="muted lay-note">${weekdayName(r.model)} has no periods yet — add some before applying it to the week.</p>`;
  const names = (ds: number[]) => ds.map(weekdayName).join(', ');
  const applied = r.applied.length
    ? `Applied <strong>${weekdayName(r.model)}</strong>'s day shape to ${names(r.applied)}.`
    : 'No other days were changed.';
  const blocked = r.blocked.length
    ? ` Left ${names(r.blocked)} untouched — ${r.blocked.length === 1 ? 'it already has classes' : 'they already have classes'} assigned (clear those on the Timetable tab to include them).`
    : '';
  return `<p class="muted lay-note">${applied}${blocked}</p>`;
}

async function peopleTab(): Promise<string> {
  const [rooms, staff] = await Promise.all([listRooms(), listStaff()]);
  const roomRows = rooms
    .map(
      (r) => `<tr class="${r.active ? '' : 'kit-archived'}"><td>${esc(r.name)}</td>
      <td><button type="button" class="link${r.active ? ' danger' : ''}" hx-post="/setup/room/${r.id}/${r.active ? 'archive' : 'restore'}" hx-target="closest section" hx-swap="outerHTML">${r.active ? 'archive' : 'restore'}</button></td></tr>`,
    )
    .join('');
  const staffRows = staff
    .map(
      (s) => `<tr class="${s.active ? '' : 'kit-archived'}"><td>${esc(s.name)}${s.isSelf ? ' <strong>(me)</strong>' : ''}</td><td>${esc(s.role)}</td>
      <td>${s.isSelf ? '' : `<button type="button" class="link${s.active ? ' danger' : ''}" hx-post="/setup/staff/${s.id}/${s.active ? 'archive' : 'restore'}" hx-target="closest section" hx-swap="outerHTML">${s.active ? 'archive' : 'restore'}</button>`}</td></tr>`,
    )
    .join('');
  return `
    <h2>Rooms</h2>
    <table class="setup-table"><tbody>${roomRows || '<tr><td class="muted">none yet</td></tr>'}</tbody></table>
    <form class="setup-add" hx-post="/setup/room/add" hx-target="closest section" hx-swap="outerHTML">
      <input name="name" placeholder="IT1" required maxlength="100"><button type="submit" class="btn-secondary">＋ room</button>
    </form>
    <h2>Staff</h2>
    <table class="setup-table"><tbody>${staffRows}</tbody></table>
    <form class="setup-add" hx-post="/setup/staff/add" hx-target="closest section" hx-swap="outerHTML">
      <input name="name" placeholder="Ms TA Name" required maxlength="100">
      <select name="role"><option value="ta">TA</option><option value="teacher">teacher</option><option value="cover">cover</option></select>
      <button type="submit" class="btn-secondary">＋ staff</button>
    </form>`;
}

async function coursesTab(): Promise<string> {
  const courses = await listAllCourses();
  const rows = courses
    .map(
      (c) => `<tr id="course-${c.id}" class="${c.active ? '' : 'kit-archived'}">
      <td><input name="value" value="${esc(c.name)}" ${save(`/setup/course/${c.id}`, 'name')}></td>
      <td><input class="setup-colour" type="color" name="value" value="${esc(c.colour ?? '#94a3b8')}" ${save(`/setup/course/${c.id}`, 'colour', 'change')}></td>
      <td><span class="note-status" id="course-${c.id}-status"></span>
        <button type="button" class="link${c.active ? ' danger' : ''}" hx-post="/setup/course/${c.id}/${c.active ? 'archive' : 'restore'}" hx-target="closest section" hx-swap="outerHTML">${c.active ? 'archive' : 'restore'}</button></td>
    </tr>`,
    )
    .join('');
  return `
    <h2>Courses</h2>
    <p class="muted">Teaching contexts and schemes live on the <a href="/schemes">Schemes</a> page; archiving here hides a course from new timetables without touching its history.</p>
    <table class="setup-table"><thead><tr><th>Name</th><th>Colour</th><th></th></tr></thead><tbody>${rows}</tbody></table>
    <form class="setup-add" hx-post="/setup/course/add" hx-target="closest section" hx-swap="outerHTML">
      <input name="name" placeholder="New course" required maxlength="100"><button type="submit" class="btn-secondary">＋ course</button>
    </form>`;
}

async function groupsTab(years: YearRow[], yearId: number): Promise<string> {
  const [groups, pupils, courses] = await Promise.all([listGroups(yearId, true), listPupils(), listAllCourses()]);
  const sel = years.find((y) => Number(y.id) === yearId);
  const rows = await Promise.all(
    groups.map(async (g) => {
      const enrolled = await listEnrolled(g.id);
      const pupilOpts = pupils
        .filter((p) => p.active && !enrolled.some((e) => Number(e.pupilId) === Number(p.id)))
        .map((p) => `<option value="${p.id}">${esc(p.displayName)}</option>`)
        .join('');
      const moveOpts = groups
        .filter((o) => Number(o.id) !== Number(g.id) && o.active)
        .map((o) => `<option value="${o.id}">${esc(o.name)}</option>`)
        .join('');
      const chips = enrolled
        .map(
          (e) => `<span class="grp-chip">${esc(e.displayName)}
            ${moveOpts ? `<select class="grp-move" title="move to another class" hx-post="/setup/enrolment/${e.enrolmentId}/move?year=${yearId}" hx-vals='js:{"to":event.target.value}' hx-trigger="change" hx-target="closest section" hx-swap="outerHTML"><option value="">move to…</option>${moveOpts}</select>` : ''}
            <button type="button" class="link danger" title="remove from group" hx-post="/setup/enrolment/${e.enrolmentId}/remove" hx-target="#grp-${g.id}-detail" hx-swap="outerHTML">✕</button></span>`,
        )
        .join(' ');
      const courseTicks = courses
        .filter((c) => c.active)
        .map((c) => {
          const on = (g.courseNames ?? '').split(', ').includes(c.name);
          return `<label class="grp-course"><input type="checkbox"${on ? ' checked' : ''}
            hx-post="/setup/group/${g.id}/course/${c.id}" hx-vals='js:{"on":event.target.checked ? "1" : "0"}' hx-trigger="change" hx-swap="none"> ${esc(c.name)}</label>`;
        })
        .join(' ');
      return `<div class="grp${g.active ? '' : ' kit-archived'}" id="grp-${g.id}">
        <div class="row-head">
          <input class="unit-title" name="value" value="${esc(g.name)}" ${save(`/setup/group/${g.id}`, 'name')}>
          <input class="setup-narrow" name="value" value="${esc(g.yearGroup ?? '')}" placeholder="Y8" title="year group" ${save(`/setup/group/${g.id}`, 'year_group')}>
          <span class="muted">${g.pupilCount} pupil${g.pupilCount === 1 ? '' : 's'}${g.predecessorName ? ` · was ${esc(g.predecessorName)}` : ''}</span>
          <a class="link" href="/group/${g.id}/history" title="this class across the years">history →</a>
          <span class="note-status" id="grp-${g.id}-status"></span>
          <button type="button" class="link${g.active ? ' danger' : ''}" hx-post="/setup/group/${g.id}/${g.active ? 'archive' : 'restore'}" hx-target="closest section" hx-swap="outerHTML">${g.active ? 'archive' : 'restore'}</button>
        </div>
        <div id="grp-${g.id}-detail">
          <p class="grp-courses">Courses: ${courseTicks || '<span class="muted">none defined</span>'}</p>
          <p class="grp-pupils">${chips || '<span class="muted">no pupils enrolled</span>'}
            ${pupilOpts ? `<select hx-post="/setup/group/${g.id}/enrol" hx-vals='js:{"pupil":event.target.value}' hx-trigger="change" hx-target="#grp-${g.id}-detail" hx-swap="outerHTML">
              <option value="">＋ add pupil…</option>${pupilOpts}</select>` : ''}
          </p>
        </div>
      </div>`;
    }),
  );
  // Surface the September rollover transfer from where classes are renamed/repopulated: a one-click
  // jump into the wizard, pre-targeted from the previous year into this one.
  const others = years.filter((y) => Number(y.id) !== yearId);
  const prev = sel ? others.filter((y) => y.startDate < sel.startDate).sort((a, b) => (a.startDate < b.startDate ? 1 : -1))[0] : undefined;
  const rollUp = others.length
    ? `<p class="grp-rollup"><a class="btn-secondary" href="/setup/rollover?${prev ? `from=${prev.id}&` : ''}to=${yearId}">${prev ? `Roll ${esc(prev.name)} classes into ${esc(sel?.name ?? 'this year')} →` : 'Roll a previous year into this year →'}</a> <span class="muted">brings classes up with their pupils, courses &amp; context — then rename &amp; move pupils below.</span></p>`
    : '';
  return `
    <h2>Groups — ${esc(sel?.name ?? '')}</h2>
    <p class="muted">Pupil names stay in this app only (never sent to AI). Manage the roster itself on <a href="/pupils">Pupils</a>.</p>
    ${rollUp}
    ${rows.join('') || '<p class="muted">no groups in this year yet</p>'}
    <form class="setup-add" hx-post="/setup/group/add?year=${yearId}" hx-target="closest section" hx-swap="outerHTML">
      <input name="name" placeholder="7ARO" required maxlength="50">
      <input name="year_group" placeholder="Y7" maxlength="20">
      <button type="submit" class="btn-secondary">＋ group</button>
    </form>`;
}


async function timetableTab(yearId: number): Promise<string> {
  const [periods, lessons, groups, rooms, staff, courses] = await Promise.all([
    listPeriods(yearId),
    listEditorLessons(yearId),
    listGroups(yearId),
    listRooms(),
    listStaff(),
    listAllCourses(),
  ]);
  const byPeriod = new Map<number, EditorLesson[]>();
  for (const l of lessons) {
    const arr = byPeriod.get(Number(l.periodId)) ?? [];
    arr.push(l);
    byPeriod.set(Number(l.periodId), arr);
  }
  const opt = (v: string, label: string, sel: boolean) => `<option value="${v}"${sel ? ' selected' : ''}>${esc(label)}</option>`;
  const lessonBlock = (l: EditorLesson): string => {
    const purposes = ['teaching', 'free', 'duty', 'meeting', 'club', 'open_room', 'form']
      .map((x) => opt(x, x.replace('_', ' '), l.purpose === x))
      .join('');
    const groupOpts = opt('', '— no group —', l.groupId == null) + groups.map((g) => opt(String(g.id), g.name, Number(g.id) === Number(l.groupId))).join('');
    const roomOpts = opt('', '— room —', l.roomId == null) + rooms.filter((r) => r.active).map((r) => opt(String(r.id), r.name, Number(r.id) === Number(l.roomId))).join('');
    const staffOpts = staff.filter((x) => x.active || Number(x.id) === Number(l.staffId)).map((x) => opt(String(x.id), x.isSelf ? `${x.name} (me)` : x.name, Number(x.id) === Number(l.staffId))).join('');
    const courseTicks = l.groupId
      ? courses
          .filter((c) => c.active)
          .map(
            (c) => `<label class="tt-ed-course"><input type="checkbox"${l.courseIds.map(Number).includes(Number(c.id)) ? ' checked' : ''}
              hx-post="/setup/lesson/${l.id}/course/${c.id}" hx-vals='js:{"on":event.target.checked ? "1" : "0"}' hx-trigger="change" hx-swap="none"> ${esc(c.name)}</label>`,
          )
          .join('')
      : '<span class="muted">pick a group to choose courses</span>';
    return `<div class="tt-ed-lesson" id="tl-${l.id}">
      <select title="purpose" name="value" ${save(`/setup/lesson/${l.id}`, 'purpose', 'change')}>${purposes}</select>
      <select title="group" name="value" hx-post="/setup/lesson/${l.id}" hx-vals='js:{"field":"group_id","value":event.target.value}' hx-trigger="change" hx-swap="none" hx-on::after-request="location.reload()">${groupOpts}</select>
      <select title="room" name="value" ${save(`/setup/lesson/${l.id}`, 'room_id', 'change')}>${roomOpts}</select>
      <select title="staff (TA lessons = ones I oversee)" name="value" ${save(`/setup/lesson/${l.id}`, 'staff_id', 'change')}>${staffOpts}</select>
      <span class="note-status" id="tl-${l.id}-status"></span>
      ${l.occurrenceCount > 0
        ? `<span class="muted" title="has taught history — can't delete">🔒</span>`
        : `<button type="button" class="link danger" title="remove from this slot" hx-post="/setup/lesson/${l.id}/delete" hx-confirm="Remove this lesson from the slot?" hx-target="#tl-${l.id}" hx-swap="outerHTML">✕</button>`}
      <div class="tt-ed-courses">${courseTicks}</div>
    </div>`;
  };
  const orders = [...new Set(periods.map((x) => x.slotOrder))].sort((a, b) => a - b);
  const head = `<tr><th></th>${[1, 2, 3, 4, 5].map((wd) => `<th>${weekdayName(wd)}</th>`).join('')}</tr>`;
  const rows = orders
    .map((ord) => {
      const cells = [1, 2, 3, 4, 5]
        .map((wd) => {
          const pd = periods.find((x) => x.weekday === wd && x.slotOrder === ord);
          if (!pd) return '<td class="tt-empty"></td>';
          const ls = (byPeriod.get(Number(pd.id)) ?? []).map(lessonBlock).join('');
          return `<td class="tt-ed-cell"><div class="tt-ed-period">${esc(pd.label)} <span class="muted">${esc(pd.start)}</span></div>
            ${ls}
            ${pd.teachable ? `<button type="button" class="link" hx-post="/setup/lesson/add?period=${pd.id}&year=${yearId}" hx-target="closest section" hx-swap="outerHTML">＋</button>` : ''}
          </td>`;
        })
        .join('');
      return `<tr>${cells}</tr>`.replace('<tr>', `<tr><th class="tt-time">${ord}</th>`);
    })
    .join('');
  return `
    <h2>Timetable</h2>
    <p class="muted">Each slot can hold several entries (splits, TA lessons you oversee). Lessons with taught history are locked 🔒 — archive the year instead of deleting the past. Day shape (times) is on the <a href="/setup?tab=day&year=${yearId}">Day shape</a> tab.</p>
    <div class="table-scroll"><table class="setup-table tt-ed">${head}${rows}</table></div>`;
}

// ── the page + all POST handlers ─────────────────────────────────────────────────────────────

export function registerSetupRoutes(app: FastifyInstance): void {
  const guard = { preHandler: [requireAuth, app.csrfProtection] };

  async function renderSetup(tab: Tab, yearId: number, csrf: string, notice = ''): Promise<string> {
    const years = await listYears();
    const tabs = TABS.map((t) => `<a href="/setup?tab=${t}&year=${yearId}"${t === tab ? ' class="active"' : ''}>${TAB_LABELS[t]}</a>`).join(' ');
    const yearScoped = tab === 'year' || tab === 'day' || tab === 'groups' || tab === 'timetable';
    const body =
      tab === 'year' ? await yearTab(years, yearId)
      : tab === 'day' ? await dayTab(years, yearId)
      : tab === 'people' ? await peopleTab()
      : tab === 'courses' ? await coursesTab()
      : tab === 'groups' ? await groupsTab(years, yearId)
      : await timetableTab(yearId);
    return `
      <section class="card setup" hx-headers='{"x-csrf-token":"${csrf}"}' data-tab="${tab}" data-year="${yearId}">
        <h1>Setup</h1>
        <nav class="task-tabs">${tabs}</nav>
        ${yearScoped ? yearPicker(years, yearId, tab) : ''}
        ${notice}
        ${body}
      </section>`;
  }

  app.get('/setup', { preHandler: requireAuth }, async (req, reply) => {
    const q = z
      .object({ tab: z.enum(TABS).optional(), year: z.coerce.number().int().positive().optional() })
      .safeParse(req.query);
    const csrf = reply.generateCsrf();
    let body: string;
    try {
      const tab: Tab = (q.success && q.data.tab) || 'year';
      const years = await listYears();
      const yearId = (q.success && q.data.year) || (await getCurrentYearId()) || (years[0] ? Number(years[0].id) : 0);
      if (!yearId && tab !== 'year') {
        body = '<section class="card"><h1>Setup</h1><p class="muted">No academic year yet — create one on <a href="/setup?tab=year">Year &amp; terms</a> first.</p></section>';
      } else {
        body = await renderSetup(tab, Number(yearId), csrf);
      }
    } catch (err) {
      app.log.error({ err }, 'page render failed (shown as unavailable)');
      body = '<section class="card"><h1>Setup</h1><p class="muted">Unavailable — the database is not reachable.</p></section>';
    }
    return reply.type('text/html').send(layout({ title: 'Setup', body, authed: true, csrfToken: csrf }));
  });

  // Re-render the whole section after a structural add (simplest correct swap).
  const section = async (req: { query: unknown; headers: Record<string, unknown> }, reply: { generateCsrf: () => string }, tab: Tab, yearId?: number, notice = '') => {
    const y = yearId ?? (await getCurrentYearId());
    return renderSetup(tab, Number(y), reply.generateCsrf(), notice);
  };

  // years
  app.post('/setup/year/add', guard, async (req, reply) => {
    const b = z.object({ name: z.string().trim().min(1).max(50), start: z.string().regex(DATE), end: z.string().regex(DATE) }).safeParse(req.body);
    if (!b.success) return reply.code(400).send('');
    const id = await createYear(b.data.name, b.data.start, b.data.end);
    return reply.type('text/html').send(await section(req, reply, 'year', id));
  });
  app.post('/setup/year/:id', guard, async (req, reply) => {
    const p = idParam.safeParse(req.params);
    const b = z.object({ field: z.string(), value: z.string().max(100) }).safeParse(req.body);
    if (!p.success || !b.success || !(await updateYearField(p.data.id, b.data.field, b.data.value))) return reply.code(400).send('');
    return reply.type('text/html').send(renderSavedStatus(`yr-${p.data.id}-status`));
  });
  app.post('/setup/year/:id/make-current', guard, async (req, reply) => {
    const p = idParam.safeParse(req.params);
    if (!p.success) return reply.code(400).send('');
    await makeYearCurrent(p.data.id);
    return reply.send('');
  });

  // terms
  app.post('/setup/term/add', guard, async (req, reply) => {
    const q = z.object({ year: z.coerce.number().int().positive() }).safeParse(req.query);
    const b = z
      .object({ name: z.string().trim().min(1).max(100), kind: z.enum(['term', 'half_term', 'holiday', 'inset']), start: z.string().regex(DATE), end: z.string().regex(DATE) })
      .safeParse(req.body);
    if (!q.success || !b.success) return reply.code(400).send('');
    await createTerm(q.data.year, b.data.name, b.data.start, b.data.end, b.data.kind);
    return reply.type('text/html').send(await section(req, reply, 'year', q.data.year));
  });
  app.post('/setup/term/:id', guard, async (req, reply) => {
    const p = idParam.safeParse(req.params);
    const b = z.object({ field: z.string(), value: z.string().max(100) }).safeParse(req.body);
    if (!p.success || !b.success || !(await updateTermField(p.data.id, b.data.field, b.data.value))) return reply.code(400).send('');
    return reply.type('text/html').send(renderSavedStatus(`term-${p.data.id}-status`));
  });
  app.post('/setup/term/:id/delete', guard, async (req, reply) => {
    const p = idParam.safeParse(req.params);
    if (!p.success) return reply.code(400).send('');
    await deleteTerm(p.data.id);
    return reply.send('');
  });

  // day shape
  app.post('/setup/period/add', guard, async (req, reply) => {
    const q = z.object({ year: z.coerce.number().int().positive(), weekday: z.coerce.number().int().min(1).max(7) }).safeParse(req.query);
    if (!q.success) return reply.code(400).send('');
    await createPeriod(q.data.year, q.data.weekday);
    return reply.type('text/html').send(await section(req, reply, 'day', q.data.year));
  });
  app.post('/setup/period/:id', guard, async (req, reply) => {
    const p = idParam.safeParse(req.params);
    const b = z.object({ field: z.string(), value: z.string().max(100).optional() }).safeParse(req.body);
    if (!p.success || !b.success || !(await updatePeriodField(p.data.id, b.data.field, b.data.value ?? null))) return reply.code(400).send('');
    return reply.type('text/html').send(renderSavedStatus(`pd-${p.data.id}-status`));
  });
  app.post('/setup/period/:id/delete', guard, async (req, reply) => {
    const p = idParam.safeParse(req.params);
    if (!p.success) return reply.code(400).send('');
    const ok = await deletePeriod(p.data.id);
    if (!ok) return reply.code(409).type('text/html').send(`<tr id="pd-${p.data.id}"><td colspan="7" class="error">Can't delete — lessons are timetabled on this period. Clear them in the timetable editor first.</td></tr>`);
    return reply.send('');
  });
  app.post('/setup/day/copy', guard, async (req, reply) => {
    const q = z.object({ year: z.coerce.number().int().positive() }).safeParse(req.query);
    const b = z.object({ from: z.coerce.number().int().positive() }).safeParse(req.body);
    if (!q.success || !b.success) return reply.code(400).send('');
    await copyDayShape(b.data.from, q.data.year);
    return reply.type('text/html').send(await section(req, reply, 'day', q.data.year));
  });

  app.post('/setup/day/apply-model', guard, async (req, reply) => {
    const q = z.object({ year: z.coerce.number().int().positive() }).safeParse(req.query);
    const b = z.object({ model: z.coerce.number().int().min(1).max(5) }).safeParse(req.body);
    if (!q.success || !b.success) return reply.code(400).send('');
    let notice: string;
    try {
      notice = applyModelNotice(await applyModelDay(q.data.year, b.data.model));
    } catch (err) {
      if ((err as { code?: string }).code === '23503')
        notice = `<p class="muted lay-note">Couldn't replace some days — they have records linked to their periods. Clear those first, then try again.</p>`;
      else throw err;
    }
    return reply.type('text/html').send(await section(req, reply, 'day', q.data.year, notice));
  });

  // rooms / staff / courses
  app.post('/setup/room/add', guard, async (req, reply) => {
    const b = z.object({ name: z.string().trim().min(1).max(100) }).safeParse(req.body);
    if (!b.success) return reply.code(400).send('');
    await createRoom(b.data.name);
    return reply.type('text/html').send(await section(req, reply, 'people'));
  });
  for (const [verb, active] of [['archive', false], ['restore', true]] as const) {
    app.post(`/setup/room/:id/${verb}`, guard, async (req, reply) => {
      const p = idParam.safeParse(req.params);
      if (!p.success) return reply.code(400).send('');
      await setRoomActive(p.data.id, active);
      return reply.type('text/html').send(await section(req, reply, 'people'));
    });
    app.post(`/setup/staff/:id/${verb}`, guard, async (req, reply) => {
      const p = idParam.safeParse(req.params);
      if (!p.success) return reply.code(400).send('');
      await setStaffActive(p.data.id, active);
      return reply.type('text/html').send(await section(req, reply, 'people'));
    });
    app.post(`/setup/course/:id/${verb}`, guard, async (req, reply) => {
      const p = idParam.safeParse(req.params);
      if (!p.success) return reply.code(400).send('');
      await setCourseActive(p.data.id, active);
      return reply.type('text/html').send(await section(req, reply, 'courses'));
    });
  }
  app.post('/setup/staff/add', guard, async (req, reply) => {
    const b = z.object({ name: z.string().trim().min(1).max(100), role: z.string().max(20) }).safeParse(req.body);
    if (!b.success) return reply.code(400).send('');
    await createStaff(b.data.name, b.data.role);
    return reply.type('text/html').send(await section(req, reply, 'people'));
  });
  app.post('/setup/course/add', guard, async (req, reply) => {
    const b = z.object({ name: z.string().trim().min(1).max(100) }).safeParse(req.body);
    if (!b.success) return reply.code(400).send('');
    await createCourse(b.data.name);
    return reply.type('text/html').send(await section(req, reply, 'courses'));
  });
  app.post('/setup/course/:id', guard, async (req, reply) => {
    const p = idParam.safeParse(req.params);
    const b = z.object({ field: z.string(), value: z.string().max(100).optional() }).safeParse(req.body);
    if (!p.success || !b.success || !(await updateCourseField(p.data.id, b.data.field, b.data.value ?? null))) return reply.code(400).send('');
    return reply.type('text/html').send(renderSavedStatus(`course-${p.data.id}-status`));
  });

  // groups & enrolments
  app.post('/setup/group/add', guard, async (req, reply) => {
    const q = z.object({ year: z.coerce.number().int().positive() }).safeParse(req.query);
    const b = z.object({ name: z.string().trim().min(1).max(50), year_group: z.string().trim().max(20).optional() }).safeParse(req.body);
    if (!q.success || !b.success) return reply.code(400).send('');
    await createGroup(q.data.year, b.data.name, b.data.year_group || null, null);
    return reply.type('text/html').send(await section(req, reply, 'groups', q.data.year));
  });
  app.post('/setup/group/:id', guard, async (req, reply) => {
    const p = idParam.safeParse(req.params);
    const b = z.object({ field: z.string(), value: z.string().max(100).optional() }).safeParse(req.body);
    if (!p.success || !b.success || !(await updateGroupField(p.data.id, b.data.field, b.data.value ?? null))) return reply.code(400).send('');
    return reply.type('text/html').send(renderSavedStatus(`grp-${p.data.id}-status`));
  });
  for (const [verb, active] of [['archive', false], ['restore', true]] as const) {
    app.post(`/setup/group/:id/${verb}`, guard, async (req, reply) => {
      const p = idParam.safeParse(req.params);
      if (!p.success) return reply.code(400).send('');
      await setGroupActive(p.data.id, active);
      const g = await poolGroupYear(p.data.id);
      return reply.type('text/html').send(await section(req, reply, 'groups', g ?? undefined));
    });
  }
  app.post('/setup/group/:id/course/:courseId', guard, async (req, reply) => {
    const p = z.object({ id: z.coerce.number().int().positive(), courseId: z.coerce.number().int().positive() }).safeParse(req.params);
    const b = z.object({ on: z.string() }).safeParse(req.body);
    if (!p.success || !b.success) return reply.code(400).send('');
    await setGroupCourse(p.data.id, p.data.courseId, b.data.on === '1');
    return reply.send('');
  });
  app.post('/setup/group/:id/enrol', guard, async (req, reply) => {
    const p = idParam.safeParse(req.params);
    const b = z.object({ pupil: z.coerce.number().int().positive() }).safeParse(req.body);
    if (!p.success || !b.success) return reply.code(400).send('');
    await enrolPupil(b.data.pupil, p.data.id);
    return reply.type('text/html').send(await groupDetail(p.data.id));
  });
  app.post('/setup/enrolment/:id/remove', guard, async (req, reply) => {
    const p = idParam.safeParse(req.params);
    if (!p.success) return reply.code(400).send('');
    const g = await pool_enrolmentGroup(p.data.id);
    await unenrolPupil(p.data.id);
    return reply.type('text/html').send(g ? await groupDetail(g) : '');
  });
  app.post('/setup/enrolment/:id/move', guard, async (req, reply) => {
    const p = idParam.safeParse(req.params);
    const q = z.object({ year: z.coerce.number().int().positive() }).safeParse(req.query);
    const b = z.object({ to: z.coerce.number().int().positive() }).safeParse(req.body);
    if (!p.success || !q.success || !b.success) return reply.code(400).send('');
    await moveEnrolment(p.data.id, b.data.to);
    return reply.type('text/html').send(await section(req, reply, 'groups', q.data.year));
  });


  // timetable editor (6.3)
  app.post('/setup/lesson/add', guard, async (req, reply) => {
    const q = z.object({ period: z.coerce.number().int().positive(), year: z.coerce.number().int().positive() }).safeParse(req.query);
    if (!q.success) return reply.code(400).send('');
    await createLessonOnPeriod(q.data.period);
    return reply.type('text/html').send(await section(req, reply, 'timetable', q.data.year));
  });
  app.post('/setup/lesson/:id', guard, async (req, reply) => {
    const p = idParam.safeParse(req.params);
    const b = z.object({ field: z.string(), value: z.string().max(50).optional() }).safeParse(req.body);
    if (!p.success || !b.success || !(await updateLessonField(p.data.id, b.data.field, b.data.value ?? null))) return reply.code(400).send('');
    return reply.type('text/html').send(renderSavedStatus(`tl-${p.data.id}-status`));
  });
  app.post('/setup/lesson/:id/delete', guard, async (req, reply) => {
    const p = idParam.safeParse(req.params);
    if (!p.success) return reply.code(400).send('');
    const ok = await deleteLesson(p.data.id);
    if (!ok) return reply.code(409).type('text/html').send(`<div class="tt-ed-lesson error" id="tl-${p.data.id}">has taught history — can't delete</div>`);
    return reply.send('');
  });
  app.post('/setup/lesson/:id/course/:courseId', guard, async (req, reply) => {
    const p = z.object({ id: z.coerce.number().int().positive(), courseId: z.coerce.number().int().positive() }).safeParse(req.params);
    const b = z.object({ on: z.string() }).safeParse(req.body);
    if (!p.success || !b.success) return reply.code(400).send('');
    await toggleLessonCourse(p.data.id, p.data.courseId, b.data.on === '1');
    return reply.send('');
  });

  // helpers that need one-off SQL
  async function poolGroupYear(groupId: number): Promise<number | null> {
    const { pool } = await import('../db/pool');
    const { rows } = await pool.query<{ y: number }>(`SELECT academic_year_id AS y FROM groups WHERE id = $1`, [groupId]);
    return rows[0]?.y ?? null;
  }
  async function pool_enrolmentGroup(enrolmentId: number): Promise<number | null> {
    const { pool } = await import('../db/pool');
    const { rows } = await pool.query<{ g: number }>(`SELECT group_id AS g FROM enrolments WHERE id = $1`, [enrolmentId]);
    return rows[0]?.g ?? null;
  }
  async function groupDetail(groupId: number): Promise<string> {
    const [enrolled, pupils] = await Promise.all([listEnrolled(groupId), listPupils()]);
    const pupilOpts = pupils
      .filter((p) => p.active && !enrolled.some((e) => Number(e.pupilId) === Number(p.id)))
      .map((p) => `<option value="${p.id}">${esc(p.displayName)}</option>`)
      .join('');
    const chips = enrolled
      .map(
        (e) => `<span class="grp-chip">${esc(e.displayName)}
          <button type="button" class="link danger" title="remove from group" hx-post="/setup/enrolment/${e.enrolmentId}/remove" hx-target="#grp-${groupId}-detail" hx-swap="outerHTML">✕</button></span>`,
      )
      .join(' ');
    return `<div id="grp-${groupId}-detail">
      <p class="grp-pupils">${chips || '<span class="muted">no pupils enrolled</span>'}
        ${pupilOpts ? `<select hx-post="/setup/group/${groupId}/enrol" hx-vals='js:{"pupil":event.target.value}' hx-trigger="change" hx-target="#grp-${groupId}-detail" hx-swap="outerHTML">
          <option value="">＋ add pupil…</option>${pupilOpts}</select>` : ''}
      </p>
    </div>`;
  }
}
