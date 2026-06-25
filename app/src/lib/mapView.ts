import { esc } from './html';
import { paths } from './paths';
import { weekdayName } from '../services/delivery';
import type { ScheduleEntry, SlotOption } from '../repos/delivery';

// Curriculum map (SPEC §8): one class's weekly slot as a vertical term-calendar timeline rail — past
// occurrences (green, with stopping points), today (teal), and the holiday-aware future weeks (plain;
// empty weeks dashed). Read-only: editing stays on the lesson screen. Carry-over (↻ continue next week)
// and drag-to-move future weeks are preserved (the rail carries data-map-slot/-csrf + draggable rows;
// public/app.js drives the drag).

export function slotKey(s: SlotOption): string {
  return `${s.lessonId}:${s.groupCourseId}`;
}
export function slotLabel(s: SlotOption): string {
  return `${s.groupName ?? 'group'} · ${s.courseName} · ${weekdayName(s.weekday)} ${s.periodLabel}`;
}

function renderRow(
  date: string,
  e: ScheduleEntry | undefined,
  kind: 'past' | 'today' | 'future',
  lessonId: number,
  courseId: number,
  shift?: { slotKey: string; today: string },
  dragSlot?: string,
): string {
  const open = paths.lessonOpen(lessonId, date);
  const kit = e?.planTitle && e.kitNeeded ? `<span class="map-kit" title="kit this lesson needs">🔧 ${esc(e.kitNeeded)}</span>` : '';
  const empty = !e?.planTitle;
  const title = e?.planTitle
    ? `<a class="map-title" href="${open}">${esc(e.planTitle)}</a>${e.adapted ? ' <span class="map-adapted">✏ adapted</span>' : ''}` +
      ` <a class="map-master" href="${paths.schemesCourse(courseId)}" title="edit the master lesson on the Schemes page">master ↗</a>${kit}`
    : `<a href="${open}" class="muted map-nothing">— nothing planned</a>`;
  // 5.9: carry-over — a recent lesson that didn't finish repeats next week; the rest shift back.
  const canShift = shift && e?.planTitle && kind !== 'future';
  const shiftBtn = canShift
    ? `<button type="button" class="link map-shift" hx-post="${paths.mapShift()}" hx-vals='{"slot":"${shift!.slotKey}","date":"${esc(date)}"}'
        hx-confirm="Continue this lesson next week? Everything after it shifts back one school week (holidays still skipped)." title="didn't finish — repeat next week, shift the rest">↻ continue next week</button>`
    : '';
  const status =
    kind === 'past'
      ? e?.stoppingPoint
        ? `<span class="map-stop">stopped at ${esc(e.stoppingPoint)}</span>${shiftBtn}`
        : `<span class="muted">no record</span>${shiftBtn}`
      : kind === 'today'
        ? `<strong class="map-today">today</strong>${shiftBtn}`
        : '';
  // C3: future weeks are drag-to-shift targets; a future week WITH a lesson can be picked up and dropped
  // on another week (they swap, or move into an empty week). History (past/today) is fixed.
  const drag = kind === 'future' && dragSlot ? ` data-date="${esc(date)}"${e?.planTitle ? ' draggable="true"' : ''}` : '';
  const handle = kind === 'future' && dragSlot && e?.planTitle ? '<span class="map-grip" title="drag to another week" aria-hidden="true">⠿</span> ' : '';
  return `<li class="map-row map-${kind}${empty ? ' map-empty' : ''}"${drag}>
    <div class="map-rail"><time class="map-date">${esc(date)}</time><span class="map-node"></span></div>
    <div class="map-card">
      <div class="map-card-main">${handle}${title}</div>
      ${status ? `<div class="map-card-status">${status}</div>` : ''}
    </div>
  </li>`;
}

export interface MapPageData {
  slots: SlotOption[];
  chosen: SlotOption;
  entries: ScheduleEntry[];
  futureDates: string[];
  today: string;
  upcomingKit: Array<{ date: string; kit: string }>;
  pastWeeks: number;
  futureWeeks: number;
  csrf: string;
}

export function renderMapPage(data: MapPageData): string {
  const { slots, chosen, entries, futureDates, today, upcomingKit, pastWeeks, futureWeeks, csrf } = data;
  const byDate = new Map(entries.map((e) => [e.date, e]));
  const shift = { slotKey: slotKey(chosen), today };
  const pastRows = entries
    .filter((e) => e.date < today)
    .map((e) => renderRow(e.date, e, 'past', chosen.lessonId, chosen.courseId, shift));
  const todayRow = byDate.has(today) ? [renderRow(today, byDate.get(today), 'today', chosen.lessonId, chosen.courseId, shift)] : [];
  const futureRows = futureDates.map((d) => renderRow(d, byDate.get(d), 'future', chosen.lessonId, chosen.courseId, undefined, slotKey(chosen)));
  const rows = [...pastRows, ...todayRow, ...futureRows].join('');

  const opts = slots
    .map((s) => `<option value="${slotKey(s)}"${slotKey(s) === slotKey(chosen) ? ' selected' : ''}>${esc(slotLabel(s))}</option>`)
    .join('');

  const kitSummary = upcomingKit.length
    ? `<details class="map-kit-summary"><summary>🔧 Kit needed across the next weeks (${upcomingKit.length})</summary>
        <ul>${upcomingKit.map((k) => `<li><span class="map-date">${esc(k.date)}</span> — ${esc(k.kit)}</li>`).join('')}</ul></details>`
    : '';

  return `
    <section class="card map" hx-headers='{"x-csrf-token":"${csrf}"}'>
      <h1>Curriculum map</h1>
      <form method="get" action="${paths.map()}" class="map-pick">
        <label>Group &amp; weekly slot
          <select name="slot" onchange="this.form.submit()">${opts}</select>
        </label>
        <noscript><button type="submit">Go</button></noscript>
      </form>
      <p class="muted">Last ${pastWeeks} weeks taught, then the next ${futureWeeks} school weeks (holidays skipped). ✏ = adapted for this group.
        <a href="${paths.schemesCourse(chosen.courseId)}">fill this slot from a downloaded unit →</a></p>
      ${kitSummary}
      <p class="muted map-drag-hint">Tip: drag a future lesson (⠿) onto another week to move it — they swap, or it fills an empty week.</p>
      <ol class="map-timeline" data-map-slot="${slotKey(chosen)}" data-map-csrf="${csrf}">
        ${rows || '<li class="muted">nothing recorded or planned in this window</li>'}
      </ol>
    </section>`;
}
