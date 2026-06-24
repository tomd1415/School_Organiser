import { esc } from './html';
import { weekdayName } from '../services/delivery';
import { paths } from './paths';
import type { YearRow, TermRow, PeriodEditRow, NamedRow, StaffRow, CourseRow, GroupRow, EnrolledPupil, EditorLesson } from '../repos/setup';
import type { RosterEntry } from '../repos/pupils';

export type Tab = 'year' | 'day' | 'people' | 'courses' | 'groups' | 'timetable';

const TABS: readonly Tab[] = ['year', 'day', 'people', 'courses', 'groups', 'timetable'];

const TAB_LABELS: Record<Tab, string> = {
  year: 'Year & terms',
  day: 'Day shape',
  people: 'Rooms & staff',
  courses: 'Courses',
  groups: 'Groups & pupils',
  timetable: 'Timetable',
};

function save(url: string, field: string, trigger = 'input changed delay:700ms, blur'): string {
  return `hx-post="${url}" hx-vals='{"field":"${field}"}' hx-trigger="${trigger}" hx-swap="none"`;
}

function yearPicker(years: YearRow[], selected: number, tab: Tab): string {
  const opts = years
    .map((y) => `<option value="${y.id}"${Number(y.id) === selected ? ' selected' : ''}>${esc(y.name)}${y.isCurrent ? ' (current)' : ''}</option>`)
    .join('');
  return `<form method="get" action="${paths.setup()}" class="setup-year">
    <input type="hidden" name="tab" value="${tab}">
    <label>Editing year <select name="year" onchange="this.form.submit()">${opts}</select></label>
    <noscript><button type="submit">Go</button></noscript>
  </form>`;
}

export function yearTab(years: YearRow[], yearId: number, terms: TermRow[]): string {
  const sel = years.find((y) => Number(y.id) === yearId);
  const kindOpts = (k: string) =>
    ['term', 'half_term', 'holiday', 'inset']
      .map((o) => `<option value="${o}"${o === k ? ' selected' : ''}>${o.replace('_', ' ')}</option>`)
      .join('');
  const yearRows = years
    .map(
      (y) => `<tr id="yr-${y.id}">
      <td><input name="value" value="${esc(y.name)}" ${save(paths.setupYear(y.id), 'name')}></td>
      <td><input type="date" name="value" value="${esc(y.startDate)}" ${save(paths.setupYear(y.id), 'start_date', 'change')}></td>
      <td><input type="date" name="value" value="${esc(y.endDate)}" ${save(paths.setupYear(y.id), 'end_date', 'change')}></td>
      <td>${
        y.isCurrent
          ? '<strong class="map-today">current</strong>'
          : `<button type="button" class="link" hx-post="${paths.setupYearMakeCurrent(y.id)}" hx-confirm="Go live with ${esc(y.name)}? The Now screen, timetable and map switch to it immediately; the old year becomes the archive." hx-target="body" hx-swap="none" hx-on::after-request="location.reload()">make current</button>`
      } <span class="note-status" id="yr-${y.id}-status"></span></td>
    </tr>`,
    )
    .join('');
  const termRows = terms
    .map(
      (t) => `<tr id="term-${t.id}">
      <td><input name="value" value="${esc(t.name)}" ${save(paths.setupTerm(t.id), 'name')}></td>
      <td><select name="value" ${save(paths.setupTerm(t.id), 'kind', 'change')}>${kindOpts(t.kind)}</select></td>
      <td><input type="date" name="value" value="${esc(t.startDate)}" ${save(paths.setupTerm(t.id), 'start_date', 'change')}></td>
      <td><input type="date" name="value" value="${esc(t.endDate)}" ${save(paths.setupTerm(t.id), 'end_date', 'change')}></td>
      <td><span class="note-status" id="term-${t.id}-status"></span>
        <button type="button" class="link danger" hx-post="${paths.setupTermDelete(t.id)}" hx-confirm="Delete ${esc(t.name)}?" hx-target="#term-${t.id}" hx-swap="outerHTML">✕</button></td>
    </tr>`,
    )
    .join('');
  return `
    <h2>Academic years</h2>
    <div class="table-scroll"><table class="setup-table">
      <thead><tr><th>Name</th><th>First day</th><th>Last day</th><th></th></tr></thead>
      <tbody>${yearRows}</tbody>
    </table></div>
    <form class="setup-add" hx-post="${paths.setupYearAdd()}" hx-target="closest section" hx-swap="outerHTML">
      <input name="name" placeholder="2026/27" required maxlength="50">
      <input type="date" name="start" required title="first day">
      <input type="date" name="end" required title="last day">
      <button type="submit" class="btn-secondary">＋ add year</button>
      <p class="muted lay-note">A new year starts as a draft — build its terms, day shape, groups and timetable here, then "make current" when September arrives. The guided path is the <a href="${paths.setupRollover()}">September rollover →</a></p>
    </form>
    <h2>Terms, holidays &amp; INSET — ${esc(sel?.name ?? '')}</h2>
    <div class="table-scroll"><table class="setup-table">
      <thead><tr><th>Name</th><th>Kind</th><th>From</th><th>To</th><th></th></tr></thead>
      <tbody>${termRows || '<tr><td colspan="5" class="muted">nothing yet — add the first term below</td></tr>'}</tbody>
    </table></div>
    <form class="setup-add" hx-post="${paths.setupTermAdd(yearId)}" hx-target="closest section" hx-swap="outerHTML">
      <input name="name" placeholder="Autumn term" required maxlength="100">
      <select name="kind">${kindOpts('term')}</select>
      <input type="date" name="start" required>
      <input type="date" name="end" required>
      <button type="submit" class="btn-secondary">＋ add</button>
    </form>`;
}

export function dayTab(years: YearRow[], yearId: number, periods: PeriodEditRow[]): string {
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
        <td><input class="setup-narrow" name="value" value="${esc(p.label)}" ${save(paths.setupPeriod(p.id), 'label')}></td>
        <td><select name="value" ${save(paths.setupPeriod(p.id), 'slot_type', 'change')}>${typeOpts(p.slotType)}</select></td>
        <td><input class="setup-time" type="time" name="value" value="${esc(p.start)}" ${save(paths.setupPeriod(p.id), 'start_time', 'change')}></td>
        <td><input class="setup-time" type="time" name="value" value="${esc(p.end)}" ${save(paths.setupPeriod(p.id), 'end_time', 'change')}></td>
        <td><input class="setup-num" name="value" inputmode="numeric" value="${p.lessonIndex ?? ''}" placeholder="—" title="lesson number (1–6)" ${save(paths.setupPeriod(p.id), 'lesson_index')}></td>
        <td><input type="checkbox" name="value" value="true"${p.teachable ? ' checked' : ''} title="teachable slot"
          hx-post="${paths.setupPeriod(p.id)}" hx-vals='js:{"field":"teachable","value":event.target.checked ? "true" : "false"}' hx-trigger="change" hx-swap="none"></td>
        <td><span class="note-status" id="pd-${p.id}-status"></span>
          <button type="button" class="link danger" title="delete (only when nothing is timetabled on it)" hx-post="${paths.setupPeriodDelete(p.id)}" hx-confirm="Delete this period?" hx-target="#pd-${p.id}" hx-swap="outerHTML">✕</button></td>
      </tr>`,
      )
      .join('');
    return `<h3>${weekdayName(wd)}</h3>
      <div class="table-scroll"><table class="setup-table">
        <thead><tr><th>Label</th><th>Type</th><th>Start</th><th>End</th><th>L#</th><th title="teachable">T</th><th></th></tr></thead>
        <tbody>${rows || `<tr><td colspan="7" class="muted">no periods on ${weekdayName(wd)}</td></tr>`}</tbody>
      </table></div>
      <button type="button" class="link" hx-post="${paths.setupPeriodAdd(yearId, wd)}" hx-target="closest section" hx-swap="outerHTML">＋ period on ${weekdayName(wd)}</button>`;
  });
  const copyFrom = others.length
    ? `<form class="setup-add" hx-post="${paths.setupDayCopy(yearId)}" hx-target="closest section" hx-swap="outerHTML">
        <label>Copy whole day shape from
          <select name="from">${others.map((y) => `<option value="${y.id}">${esc(y.name)}</option>`).join('')}</select>
        </label>
        <button type="submit" class="btn-secondary">copy →</button>
        <p class="muted lay-note">Copies every period that doesn't already exist in this year — then edit the times here.</p>
      </form>`
    : '';
  const dayCount = (wd: number) => periods.filter((p) => p.weekday === wd).length;
  const modelDefault = [1, 2, 3, 4, 5].reduce((best, wd) => (dayCount(wd) > dayCount(best) ? wd : best), 1);
  const modelDay = periods.length
    ? `<form class="setup-add" hx-post="${paths.setupDayApplyModel(yearId)}" hx-target="closest section" hx-swap="outerHTML"
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

export function peopleTab(rooms: NamedRow[], staff: StaffRow[]): string {
  const roomRows = rooms
    .map(
      (r) => `<tr class="${r.active ? '' : 'kit-archived'}"><td>${esc(r.name)}</td>
      <td><button type="button" class="link${r.active ? ' danger' : ''}" hx-post="${paths.setupRoomToggle(r.id, r.active ? 'archive' : 'restore')}" hx-target="closest section" hx-swap="outerHTML">${r.active ? 'archive' : 'restore'}</button></td></tr>`,
    )
    .join('');
  const staffRows = staff
    .map(
      (s) => `<tr class="${s.active ? '' : 'kit-archived'}"><td>${esc(s.name)}${s.isSelf ? ' <strong>(me)</strong>' : ''}</td><td>${esc(s.role)}</td>
      <td>${s.isSelf ? '' : `<button type="button" class="link${s.active ? ' danger' : ''}" hx-post="${paths.setupStaffToggle(s.id, s.active ? 'archive' : 'restore')}" hx-target="closest section" hx-swap="outerHTML">${s.active ? 'archive' : 'restore'}</button>`}</td></tr>`,
    )
    .join('');
  return `
    <h2>Rooms</h2>
    <table class="setup-table"><tbody>${roomRows || '<tr><td class="muted">none yet</td></tr>'}</tbody></table>
    <form class="setup-add" hx-post="${paths.setupRoomAdd()}" hx-target="closest section" hx-swap="outerHTML">
      <input name="name" placeholder="IT1" required maxlength="100"><button type="submit" class="btn-secondary">＋ room</button>
    </form>
    <h2>Staff</h2>
    <table class="setup-table"><tbody>${staffRows}</tbody></table>
    <form class="setup-add" hx-post="${paths.setupStaffAdd()}" hx-target="closest section" hx-swap="outerHTML">
      <input name="name" placeholder="Ms TA Name" required maxlength="100">
      <select name="role"><option value="ta">TA</option><option value="teacher">teacher</option><option value="cover">cover</option></select>
      <button type="submit" class="btn-secondary">＋ staff</button>
    </form>`;
}

export function coursesTab(courses: CourseRow[]): string {
  const rows = courses
    .map(
      (c) => `<tr id="course-${c.id}" class="${c.active ? '' : 'kit-archived'}">
      <td><input name="value" value="${esc(c.name)}" ${save(paths.setupCourse(c.id), 'name')}></td>
      <td><input class="setup-colour" type="color" name="value" value="${esc(c.colour ?? '#94a3b8')}" ${save(paths.setupCourse(c.id), 'colour', 'change')}></td>
      <td><span class="note-status" id="course-${c.id}-status"></span>
        <button type="button" class="link${c.active ? ' danger' : ''}" hx-post="${paths.setupCourseToggle(c.id, c.active ? 'archive' : 'restore')}" hx-target="closest section" hx-swap="outerHTML">${c.active ? 'archive' : 'restore'}</button></td>
    </tr>`,
    )
    .join('');
  return `
    <h2>Courses</h2>
    <p class="muted">Teaching contexts and schemes live on the <a href="${paths.schemes()}">Schemes</a> page; archiving here hides a course from new timetables without touching its history.</p>
    <table class="setup-table"><thead><tr><th>Name</th><th>Colour</th><th></th></tr></thead><tbody>${rows}</tbody></table>
    <form class="setup-add" hx-post="${paths.setupCourseAdd()}" hx-target="closest section" hx-swap="outerHTML">
      <input name="name" placeholder="New course" required maxlength="100"><button type="submit" class="btn-secondary">＋ course</button>
    </form>`;
}

export function groupsTab(
  years: YearRow[],
  yearId: number,
  groups: GroupRow[],
  pupils: RosterEntry[],
  courses: CourseRow[],
  enrolmentsByGroup: Map<number, EnrolledPupil[]>
): string {
  const sel = years.find((y) => Number(y.id) === yearId);
  const rows = groups.map((g) => {
    const enrolled = enrolmentsByGroup.get(Number(g.id)) ?? [];
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
          ${moveOpts ? `<select class="grp-move" title="move to another class" hx-post="${paths.setupEnrolmentMove(e.enrolmentId, yearId)}" hx-vals='js:{"to":event.target.value}' hx-trigger="change" hx-target="closest section" hx-swap="outerHTML"><option value="">move to…</option>${moveOpts}</select>` : ''}
          <button type="button" class="link danger" title="remove from group" hx-post="${paths.setupEnrolmentRemove(e.enrolmentId)}" hx-target="#grp-${g.id}-detail" hx-swap="outerHTML">✕</button></span>`,
      )
      .join(' ');
    const courseTicks = courses
      .filter((c) => c.active)
      .map((c) => {
        const on = (g.courseNames ?? '').split(', ').includes(c.name);
        return `<label class="grp-course"><input type="checkbox"${on ? ' checked' : ''}
          hx-post="${paths.setupGroupCourse(g.id, c.id)}" hx-vals='js:{"on":event.target.checked ? "1" : "0"}' hx-trigger="change" hx-swap="none"> ${esc(c.name)}</label>`;
      })
      .join(' ');
    return `<div class="grp${g.active ? '' : ' kit-archived'}" id="grp-${g.id}">
      <div class="row-head">
        <input class="unit-title" name="value" value="${esc(g.name)}" ${save(paths.setupGroup(g.id), 'name')}>
        <input class="setup-narrow" name="value" value="${esc(g.yearGroup ?? '')}" placeholder="Y8" title="year group" ${save(paths.setupGroup(g.id), 'year_group')}>
        <span class="muted">${g.pupilCount} pupil${g.pupilCount === 1 ? '' : 's'}${g.predecessorName ? ` · was ${esc(g.predecessorName)}` : ''}</span>
        <a class="link" href="${paths.groupHistory(g.id)}" title="this class across the years">history →</a>
        <span class="note-status" id="grp-${g.id}-status"></span>
        <button type="button" class="link${g.active ? ' danger' : ''}" hx-post="${paths.setupGroupToggle(g.id, g.active ? 'archive' : 'restore')}" hx-target="closest section" hx-swap="outerHTML">${g.active ? 'archive' : 'restore'}</button>
      </div>
      <div id="grp-${g.id}-detail">
        <p class="grp-courses">Courses: ${courseTicks || '<span class="muted">none defined</span>'}</p>
        <p class="grp-pupils">${chips || '<span class="muted">no pupils enrolled</span>'}
          ${pupilOpts ? `<select hx-post="${paths.setupGroupEnrol(g.id)}" hx-vals='js:{"pupil":event.target.value}' hx-trigger="change" hx-target="#grp-${g.id}-detail" hx-swap="outerHTML">
            <option value="">＋ add pupil…</option>${pupilOpts}</select>` : ''}
        </p>
      </div>
    </div>`;
  }).join('');
  const others = years.filter((y) => Number(y.id) !== yearId);
  const prev = sel ? others.filter((y) => y.startDate < sel.startDate).sort((a, b) => (a.startDate < b.startDate ? 1 : -1))[0] : undefined;
  const rollUp = others.length
    ? `<p class="grp-rollup"><a class="btn-secondary" href="${paths.setupRolloverRoll(prev ? prev.id : null, yearId)}">${prev ? `Roll ${esc(prev.name)} classes into ${esc(sel?.name ?? 'this year')} →` : 'Roll a previous year into this year →'}</a> <span class="muted">brings classes up with their pupils, courses &amp; context — then rename &amp; move pupils below.</span></p>`
    : '';
  return `
    <h2>Groups — ${esc(sel?.name ?? '')}</h2>
    <p class="muted">Pupil names stay in this app only (never sent to AI). Manage the roster itself on <a href="${paths.pupils()}">Pupils</a>.</p>
    ${rollUp}
    ${rows || '<p class="muted">no groups in this year yet</p>'}
    <form class="setup-add" hx-post="${paths.setupGroupAdd(yearId)}" hx-target="closest section" hx-swap="outerHTML">
      <input name="name" placeholder="7ARO" required maxlength="50">
      <input name="year_group" placeholder="Y7" maxlength="20">
      <button type="submit" class="btn-secondary">＋ group</button>
    </form>`;
}

export function timetableTab(
  yearId: number,
  periods: PeriodEditRow[],
  lessons: EditorLesson[],
  groups: any[],
  rooms: NamedRow[],
  staff: StaffRow[],
  courses: CourseRow[]
): string {
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
              hx-post="${paths.setupLessonCourse(l.id, c.id)}" hx-vals='js:{"on":event.target.checked ? "1" : "0"}' hx-trigger="change" hx-swap="none"> ${esc(c.name)}</label>`,
          )
          .join('')
      : '<span class="muted">pick a group to choose courses</span>';
    return `<div class="tt-ed-lesson" id="tl-${l.id}">
      <select title="purpose" name="value" ${save(paths.setupLesson(l.id), 'purpose', 'change')}>${purposes}</select>
      <select title="group" name="value" hx-post="${paths.setupLesson(l.id)}" hx-vals='js:{"field":"group_id","value":event.target.value}' hx-trigger="change" hx-swap="none" hx-on::after-request="location.reload()">${groupOpts}</select>
      <select title="room" name="value" ${save(paths.setupLesson(l.id), 'room_id', 'change')}>${roomOpts}</select>
      <select title="staff (TA lessons = ones I oversee)" name="value" ${save(paths.setupLesson(l.id), 'staff_id', 'change')}>${staffOpts}</select>
      <span class="note-status" id="tl-${l.id}-status"></span>
      ${l.occurrenceCount > 0
        ? `<span class="muted" title="has taught history — can't delete">🔒</span>`
        : `<button type="button" class="link danger" title="remove from this slot" hx-post="${paths.setupLessonDelete(l.id)}" hx-confirm="Remove this lesson from the slot?" hx-target="#tl-${l.id}" hx-swap="outerHTML">✕</button>`}
      <div class="tt-ed-courses">${courseTicks}</div>
    </div>`;
  };
  const starts = [...new Set(periods.map((x) => x.start))].sort();
  const head = `<tr><th></th>${[1, 2, 3, 4, 5].map((wd) => `<th>${weekdayName(wd)}</th>`).join('')}</tr>`;
  const rows = starts
    .map((start) => {
      const cells = [1, 2, 3, 4, 5]
        .map((wd) => {
          const pd = periods.find((x) => x.weekday === wd && x.start === start);
          if (!pd) return '<td class="tt-empty"></td>';
          const ls = (byPeriod.get(Number(pd.id)) ?? []).map(lessonBlock).join('');
          return `<td class="tt-ed-cell"><div class="tt-ed-period">${esc(pd.label)} <span class="muted">${esc(pd.start)}</span></div>
            ${ls}
            ${pd.teachable ? `<button type="button" class="link" hx-post="${paths.setupLessonAdd(pd.id, yearId)}" hx-target="closest section" hx-swap="outerHTML">＋</button>` : ''}
          </td>`;
        })
        .join('');
      return `<tr><th class="tt-time">${esc(start)}</th>${cells}</tr>`;
    })
    .join('');
  return `
    <h2>Timetable</h2>
    <p class="muted">Each slot can hold several entries (splits, TA lessons you oversee). Lessons with taught history are locked 🔒 — archive the year instead of deleting the past. Day shape (times) is on the <a href="${paths.setupTab('day', yearId)}">Day shape</a> tab.</p>
    <div class="table-scroll"><table class="setup-table tt-ed">${head}${rows}</table></div>`;
}

export interface SetupPageOptions {
  tab: Tab;
  yearId: number;
  csrf: string;
  notice: string;
  years: YearRow[];
  terms: TermRow[];
  periods: PeriodEditRow[];
  rooms: NamedRow[];
  staff: StaffRow[];
  courses: CourseRow[];
  groups: GroupRow[];
  pupils: RosterEntry[];
  lessons: EditorLesson[];
  enrolmentsByGroup: Map<number, EnrolledPupil[]>;
}

export function renderSetupPage(options: SetupPageOptions): string {
  const {
    tab,
    yearId,
    csrf,
    notice,
    years,
    terms,
    periods,
    rooms,
    staff,
    courses,
    groups,
    pupils,
    lessons,
    enrolmentsByGroup,
  } = options;

  const tabs = TABS.map((t) => `<a href="${paths.setupTab(t, yearId)}" class="chip${t === tab ? ' active' : ''}">${TAB_LABELS[t]}</a>`).join(' ');
  const yearScoped = tab === 'year' || tab === 'day' || tab === 'groups' || tab === 'timetable';

  const body =
    tab === 'year' ? yearTab(years, yearId, terms)
    : tab === 'day' ? dayTab(years, yearId, periods)
    : tab === 'people' ? peopleTab(rooms, staff)
    : tab === 'courses' ? coursesTab(courses)
    : tab === 'groups' ? groupsTab(years, yearId, groups, pupils, courses, enrolmentsByGroup)
    : timetableTab(yearId, periods, lessons, groups, rooms, staff, courses);

  return `
    <section class="card setup" hx-headers='{"x-csrf-token":"${csrf}"}' data-tab="${tab}" data-year="${yearId}">
      <div class="ld-notes-head" style="margin-bottom: 12px;">
        <div>
          <p class="eyebrow" style="margin: 0; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted, #666);">Prep & Advanced</p>
          <h1 style="margin: 0;">Setup</h1>
        </div>
      </div>
      <div class="task-chips" style="margin-bottom: 20px; display: flex; gap: 8px; flex-wrap: wrap;">
        ${tabs}
      </div>
      ${yearScoped ? yearPicker(years, yearId, tab) : ''}
      ${notice}
      ${body}
    </section>
  `;
}
