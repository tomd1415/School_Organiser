import { esc } from './html';
import { ExceptionEffect } from '../services/exceptions';
import { GridCell, GridLesson } from '../services/timetable';
import { DayKind } from '../services/clock';
import { addDays, weekdayOf } from './time';

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

export function renderLesson(l: GridLesson, date: string, ex: ExceptionEffect): string {
  const colour = l.courses[0]?.colour ?? '#94a3b8';
  const flag = l.isSelf ? '' : '⚑ ';
  const heading = l.groupName ? esc(l.groupName) : esc(purposeLabel(l.purpose));
  const courses = l.courses.map((c) => esc(c.name)).join(' · ');
  const exMark = exBadge(ex);
  const inner = `<span class="tt-group">${flag}${heading}${exMark}</span>${courses ? `<span class="tt-course">${courses}</span>` : ''}`;
  const style = `border-left-color:${esc(colour)}`;
  if (l.purpose === 'teaching' || l.purpose === 'free' || l.purpose === 'form') {
    return `<a class="tt-lesson tt-${esc(l.purpose)}" style="${style}" href="/lesson?lesson=${l.lessonId}&date=${esc(date)}">${inner}</a>`;
  }
  return `<span class="tt-lesson tt-${esc(l.purpose)}" style="${style}">${inner}</span>`;
}

export function renderCell(cell: GridCell, date: string, isToday: boolean, exForLesson: (date: string, lessonId: number) => ExceptionEffect): string {
  if (!cell.present) return `<td class="tt-blank${isToday ? ' tt-today' : ''}"></td>`;
  const td = isToday ? '<td class="tt-today">' : '<td>';
  if (cell.lessons.length === 0) {
    return `${isToday ? '<td class="tt-empty tt-today">' : '<td class="tt-empty">'}<span class="tt-band">${esc(cell.periodLabel)}</span></td>`;
  }
  return `${td}${cell.lessons.map((l) => renderLesson(l, date, exForLesson(date, l.lessonId))).join('')}</td>`;
}

export interface TimetableNextData {
  table: string;
  yearLabel: string;
  prev: string;
  next: string;
  yearQ: string;
  explicitYear: number | undefined;
  csrf: string;
}

export function renderTimetableNext(data: TimetableNextData): string {
  const { table, yearLabel, prev, next, yearQ, explicitYear, csrf } = data;
  return `
    <section class="tt tt-overhaul" hx-headers='{"x-csrf-token":"${csrf}"}'>
      <div class="tt-head">
        <h1>Timetable${yearLabel}</h1>
        <nav class="tt-weeknav">
          <a href="/timetable?date=${esc(prev)}${yearQ}" class="chip">◀ Prev</a>
          <a href="/timetable" class="chip">This week</a>
          <a href="/timetable?date=${esc(next)}${yearQ}" class="chip">Next ▶</a>
        </nav>${explicitYear ? ' <a class="tt-exit-preview muted" href="/timetable">exit preview →</a>' : ''}
      </div>
      <div class="tt-grid-container">
        ${table}
      </div>
      <p class="tt-legend"><span class="tt-key tt-free"></span> Free (protected) · <span class="tt-key tt-oversee">⚑</span> Lesson I oversee · <span class="tt-ex-free">Free</span>/<span class="tt-ex-cover">Cover</span> = dated exception · <span class="tt-daykind">Holiday</span> = no teaching · colour = course</p>
    </section>
  `;
}
