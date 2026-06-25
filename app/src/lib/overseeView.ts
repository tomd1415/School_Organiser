// Rail & Stage rebuild — Oversee (SPEC §13): the TA-led / non-specialist lessons you prepare + oversee
// rather than teach, grouped by day. Each row is a tone-left-border card with the slot, ⚑ class, course,
// TA name, plan-set/resources status pills (from lessonReadiness), and an Open action (the lesson page is
// where you set the plan, attach resources and add the oversight note). A missing plan turns the row red.
// Extracted from the route's inline render (now a pure data → HTML view). Read-only: no POSTs/CSRF.
import { esc } from './html';
import { paths } from './paths';

export interface OverseeRow {
  lessonId: number;
  date: string;
  start: string;
  end: string;
  groupName: string | null;
  purpose: string;
  courseNames: string[];
  staffName: string;
  noPlan: boolean; // → "plan missing" (red) + red left border
  needsEdit: boolean; // a bound resource still has an image placeholder to fill → "resources ⚠"
}

export interface OverseeDay {
  name: string; // Mon … Fri
  dateLabel: string; // e.g. "23 Jun"
  isToday: boolean;
  rows: OverseeRow[];
}

export interface OverseePageData {
  days: OverseeDay[];
  prevDate: string;
  nextDate: string;
}

function row(r: OverseeRow): string {
  const heading = r.groupName ?? r.purpose;
  const planPill = r.noPlan ? '<span class="badge red">plan missing</span>' : '<span class="badge good">plan set ✓</span>';
  const resPill = r.needsEdit ? '<span class="badge warn">resources ⚠</span>' : '<span class="badge good">resources ✓</span>';
  return `<li class="ov-card${r.noPlan ? ' ov-missing' : ''}">
    <div class="ov-card-head">
      <span class="ov-slot">${esc(r.start)}–${esc(r.end)}</span>
      <span class="ov-class">⚑ ${esc(heading)}</span>
      ${r.courseNames.length ? `<span class="ov-course muted">${esc(r.courseNames.join(' · '))}</span>` : ''}
      <span class="ov-spacer"></span>
      ${r.staffName ? `<span class="ov-ta">${esc(r.staffName)}</span>` : ''}
    </div>
    <div class="ov-card-foot">
      ${planPill} ${resPill}
      <span class="ov-spacer"></span>
      <a class="button small" href="${paths.lessonOpen(r.lessonId, r.date)}">Open · plan · resources · note →</a>
    </div>
  </li>`;
}

export function renderOverseePage(data: OverseePageData): string {
  const daysHtml = data.days.length
    ? data.days
        .map(
          (d) => `<section class="ov-day${d.isToday ? ' ov-today' : ''}">
        <h2 class="ov-day-head">${esc(d.name)} <span class="muted">${esc(d.dateLabel)}</span></h2>
        <ul class="ov-list">${d.rows.map(row).join('')}</ul>
      </section>`,
        )
        .join('')
    : '<p class="muted">No lessons to oversee this week.</p>';

  return `
    <section class="card">
      <div class="tt-head">
        <h1>Lessons I oversee</h1>
        <nav class="tt-weeknav">
          <a class="chip" href="${paths.overseeWeek(data.prevDate)}">◀ Prev</a>
          <a class="chip" href="${paths.oversee()}">This week</a>
          <a class="chip" href="${paths.overseeWeek(data.nextDate)}">Next ▶</a>
        </nav>
      </div>
      <p class="muted">TA-led lessons you supervise rather than teach. Set the plan, attach resources and log
        an oversight note on each lesson's page. A red row needs a plan.</p>
      ${daysHtml}
    </section>`;
}
