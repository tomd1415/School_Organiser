import { esc } from './html';
import { ExceptionEffect } from '../services/exceptions';
import type { LessonReadiness } from '../services/lessonReadiness';
import { GridCell, GridLesson } from '../services/timetable';
import { DayKind } from '../services/clock';
import { addDays, weekdayOf } from './time';
import { paths } from './paths';

const TZ = 'Europe/London';
const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

export function mondayOf(isoDate: string): string {
  const wd = weekdayOf(isoDate);
  return wd >= 6 ? addDays(isoDate, 8 - wd) : addDays(isoDate, 1 - wd);
}

export function fmtShort(iso: string): string {
  return new Intl.DateTimeFormat('en-GB', { timeZone: TZ, day: 'numeric', month: 'short' }).format(
    new Date(`${iso}T12:00:00Z`),
  );
}

export function purposeLabel(purpose: string): string {
  switch (purpose) {
    case 'free':
      return 'Free';
    case 'form':
      return 'Form';
    case 'club':
      return 'Computing Club';
    case 'open_room':
      return 'Open room';
    case 'duty':
      return 'Duty';
    case 'meeting':
      return 'Meeting';
    default:
      return purpose;
  }
}

export function dayKindLabel(kind: DayKind): string {
  switch (kind) {
    case 'holiday':
      return 'Holiday';
    case 'half_term':
      return 'Half-term';
    case 'inset':
      return 'INSET';
    case 'out_of_term':
      return 'Out of term';
    default:
      return '';
  }
}

export function exBadge(ex: ExceptionEffect): string {
  if (ex.mode === 'none') return '';
  const cls = ex.mode === 'free' ? 'tt-ex-free' : ex.mode === 'cover' ? 'tt-ex-cover' : 'tt-ex-room';
  const text = ex.mode === 'free' ? 'Free' : ex.mode === 'cover' ? 'Cover' : ex.roomName ? `→ ${esc(ex.roomName)}` : 'Room';
  const title = [ex.label, ex.detail].filter(Boolean).join(' — ');
  return ` <span class="tt-ex ${cls}" title="${esc(title)}">${text}</span>`;
}

/** Readiness status dots for a teaching cell (a lesson can raise more than one). */
export function readinessDots(r: LessonReadiness | undefined): string {
  if (!r) return '';
  const dots =
    (r.noScheme ? '<span class="tt-dot tt-dot-red" title="No scheme of work for this course"></span>' : '') +
    (r.noPlan ? '<span class="tt-dot tt-dot-purple" title="No fully-developed lesson plan for this date yet"></span>' : '') +
    (r.needsEdit ? '<span class="tt-dot tt-dot-blue" title="A resource needs editing (e.g. an image to add)"></span>' : '');
  return dots ? `<span class="tt-dots">${dots}</span>` : '';
}

export function renderLesson(l: GridLesson, date: string, ex: ExceptionEffect, readiness?: LessonReadiness): string {
  const colour = l.courses[0]?.colour ?? '#94a3b8';
  const flag = l.isSelf ? '' : '⚑ ';
  const heading = l.groupName ? esc(l.groupName) : esc(purposeLabel(l.purpose));
  const courses = l.courses.map((c) => esc(c.name)).join(' · ');
  const exMark = exBadge(ex);
  // Readiness dots only for the teacher's OWN teaching lessons (you don't prep an overseen class).
  const dots = l.isSelf && l.purpose === 'teaching' ? readinessDots(readiness) : '';
  const inner = `<span class="tt-group">${flag}${heading}${exMark}</span>${courses ? `<span class="tt-course">${courses}</span>` : ''}${dots}`;
  const style = `border-left-color:${esc(colour)}`;
  // A club opens its session-record screen; a free slot (permanent 'free' OR a dated free/cancelled
  // exception) opens the free-period workspace; teaching/form open the lesson.
  const isFree = l.purpose === 'free' || ex.mode === 'free';
  if (l.purpose === 'club') {
    return `<a class="tt-lesson tt-club" style="${style}" href="${paths.clubOpen(l.lessonId, date)}">${inner}</a>`;
  }
  if (l.purpose === 'teaching' || l.purpose === 'free' || l.purpose === 'form') {
    const href = isFree ? paths.freeOpen(l.lessonId, date) : paths.lessonOpen(l.lessonId, date);
    // A corner "🧪" jumps into a sandbox of your OWN teaching lesson (Test Lab). Sibling of the cell link
    // (no nested anchors); the <td> is position:relative so it sits in the corner.
    const testLink = !isFree && l.purpose === 'teaching' && l.isSelf
      ? `<a class="tt-test" href="${paths.lessonOpen(l.lessonId, date, { lab: true })}" target="_blank" rel="noopener" title="Test this lesson in the Test Lab (sandbox — no effect on the real class)" aria-label="Test this lesson in the Test Lab">🧪</a>`
      : '';
    return `<a class="tt-lesson tt-${esc(l.purpose)}${isFree ? ' tt-is-free' : ''}" style="${style}" href="${href}">${inner}</a>${testLink}`;
  }
  return `<span class="tt-lesson tt-${esc(l.purpose)}" style="${style}">${inner}</span>`;
}

export function renderCell(
  cell: GridCell,
  date: string,
  isToday: boolean,
  exForLesson: (date: string, lessonId: number) => ExceptionEffect,
  readinessFor: (date: string, lessonId: number) => LessonReadiness | undefined = () => undefined,
): string {
  if (!cell.present) return `<td class="tt-blank${isToday ? ' tt-today' : ''}"></td>`;
  const td = isToday ? '<td class="tt-today">' : '<td>';
  if (cell.lessons.length === 0) {
    return `${isToday ? '<td class="tt-empty tt-today">' : '<td class="tt-empty">'}<span class="tt-band">${esc(cell.periodLabel)}</span></td>`;
  }
  return `${td}${cell.lessons.map((l) => renderLesson(l, date, exForLesson(date, l.lessonId), readinessFor(date, l.lessonId))).join('')}</td>`;
}

export interface TimetableClass {
  id: number;
  name: string;
}

export interface TimetableNextData {
  table: string;
  yearLabel: string;
  prev: string;
  next: string;
  yearQ: string;
  explicitYear: number | undefined;
  csrf: string;
  classes: TimetableClass[];
  awayFrom: string;
  awayTo: string;
}

// "Mark class away" — the missing timetable-level affordance for the existing `free` exception
// (noted_bugs2 #1). Picks a class + a date range and POSTs to /timetable/class-away, which writes a
// `free` exception to every slot that class has in range. HX-Refresh reloads the grid to show the
// "Free (class away)" badges. Hidden behind a disclosure so it doesn't clutter the week at a glance.
export function renderClassAway(classes: TimetableClass[], from: string, to: string): string {
  if (classes.length === 0) return '';
  const opts = classes.map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join('');
  return `<details class="tt-away">
      <summary class="chip">🚌 Mark class away</summary>
      <form class="tt-away-form" hx-post="${paths.timetableClassAway()}" hx-target="#tt-away-status" hx-swap="innerHTML">
        <label>Class <select name="groupId" required><option value="">choose…</option>${opts}</select></label>
        <label>From <input type="date" name="dateFrom" value="${esc(from)}" required></label>
        <label>To <input type="date" name="dateTo" value="${esc(to)}" required></label>
        <label>Note <input name="note" placeholder="trip, exam…" maxlength="200"></label>
        <button type="submit" class="btn-secondary">Mark away</button>
        <span id="tt-away-status" aria-live="polite" class="tt-away-status"></span>
      </form>
      <p class="muted tt-away-hint">Frees every slot this class has on those dates (a trip/exam — you don't teach them). Reverse it from the lesson's exception list.</p>
    </details>`;
}

export function renderTimetableNext(data: TimetableNextData): string {
  const { table, yearLabel, prev, next, yearQ, explicitYear, csrf, classes, awayFrom, awayTo } = data;
  return `
    <section class="tt tt-overhaul" hx-headers='{"x-csrf-token":"${csrf}"}'>
      <div class="tt-head">
        <h1>Timetable${yearLabel}</h1>
        <nav class="tt-weeknav">
          <a href="${paths.timetableDate(prev, yearQ)}" class="chip">◀ Prev</a>
          <a href="${paths.timetable()}" class="chip">This week</a>
          <a href="${paths.timetableDate(next, yearQ)}" class="chip">Next ▶</a>
        </nav>${explicitYear ? ` <a class="tt-exit-preview muted" href="${paths.timetable()}">exit preview →</a>` : ''}
        ${renderClassAway(classes, awayFrom, awayTo)}
      </div>
      <div class="tt-grid-container">
        ${table}
      </div>
      <p class="tt-legend"><span class="tt-dot tt-dot-red"></span> no scheme · <span class="tt-dot tt-dot-purple"></span> plan to develop · <span class="tt-dot tt-dot-blue"></span> resource to edit · <span class="tt-key tt-free"></span> Free (protected) · <span class="tt-key tt-oversee">⚑</span> Lesson I oversee · <span class="tt-ex-free">Free</span>/<span class="tt-ex-cover">Cover</span> = dated exception · <span class="tt-daykind">Holiday</span> = no teaching · colour = course</p>
    </section>
  `;
}
