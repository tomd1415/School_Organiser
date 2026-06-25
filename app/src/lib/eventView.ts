// Rail & Stage rebuild — Events (SPEC §7): upcoming events grouped by how-soon (This week / Next two
// weeks / Later / No date yet). Each event is a card with a tone-coloured date chip, the editable title,
// a kind badge, and an "in N days" line. Editing (kind/date/lead/blocks-work) lives in an Edit disclosure
// so the card stays scannable. renderEvent* is used only by the /events route (the Now screen renders
// events with its own markup), so repurposing these is safe.
import { esc } from './html';
import { EVENT_KINDS, EVENT_KIND_LABELS, daysUntil, type UpcomingEvent } from '../services/event';
import { paths } from './paths';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// kind → tone. Deadlines/exams/data-drops are red; trips amber; parent/open evenings teal; the rest grey.
const EVENT_TONE: Record<string, 'red' | 'amber' | 'teal' | 'quiet'> = {
  report_deadline: 'red', data_drop: 'red', exam: 'red',
  trip: 'amber',
  parents_evening: 'teal', open_evening: 'teal',
  meeting: 'quiet', parent_contact: 'quiet', ehcp_review: 'quiet', inset: 'quiet', other: 'quiet',
};
const BADGE_OF: Record<string, string> = { red: 'red', amber: 'warn', teal: 'live', quiet: '' };
const toneOf = (kind: string): 'red' | 'amber' | 'teal' | 'quiet' => EVENT_TONE[kind] ?? 'quiet';

function kindOptions(current: string): string {
  return EVENT_KINDS.map((k) => `<option value="${k}"${k === current ? ' selected' : ''}>${esc(EVENT_KIND_LABELS[k] ?? k)}</option>`).join('');
}

function dateChip(dateIso: string | null, tone: string): string {
  if (!dateIso) return `<div class="ev-chip ev-none">—</div>`;
  const [, m, d] = dateIso.split('-');
  return `<div class="ev-chip ev-${tone}"><span class="ev-day">${Number(d)}</span><span class="ev-mon">${MONTHS[Number(m) - 1] ?? ''}</span></div>`;
}

function whenLabel(dateIso: string | null, todayIso: string): string {
  if (!dateIso) return 'no date yet';
  const d = daysUntil(dateIso, todayIso);
  if (d < 0) return `${-d} day${-d === 1 ? '' : 's'} ago`;
  if (d === 0) return 'today';
  if (d === 1) return 'tomorrow';
  return `in ${d} days`;
}

export function renderEventCard(e: UpcomingEvent, todayIso: string): string {
  const save = (trigger: string) => `hx-post="${paths.event(e.id)}" hx-swap="none" hx-trigger="${trigger}"`;
  const tone = toneOf(e.kind);
  const overdue = e.date != null && daysUntil(e.date, todayIso) < 0;
  return `<li class="event-card ev-tone-${tone}" id="event-${e.id}">
    ${dateChip(e.date, tone)}
    <div class="ev-main">
      <div class="ev-head">
        <input class="ev-title" type="text" name="title" value="${esc(e.title)}" placeholder="Event…" ${save('input changed delay:600ms, blur')}>
        <span class="badge ${BADGE_OF[tone]}">${esc(EVENT_KIND_LABELS[e.kind] ?? e.kind)}</span>
      </div>
      <div class="ev-meta">
        <span class="ev-when ev-when-${overdue ? 'red' : tone}">${whenLabel(e.date, todayIso)}</span>
        ${e.affectsAvailability ? '<span class="muted ev-blocks">· blocks work</span>' : ''}
        <span class="note-status" id="event-${e.id}-status"></span>
      </div>
      <details class="ev-edit">
        <summary>Edit</summary>
        <div class="ev-edit-row">
          <select name="kind" ${save('change')}>${kindOptions(e.kind)}</select>
          <label>on <input type="date" name="date" value="${esc(e.date ?? '')}" ${save('change')}></label>
          <label>lead <input class="setup-num" style="width:4rem" type="number" name="lead_days" min="0" value="${e.leadDays ?? ''}" placeholder="days" ${save('input changed delay:600ms, blur')}></label>
          <select name="affects_availability" ${save('change')}>
            <option value="false"${e.affectsAvailability ? '' : ' selected'}>doesn't block work</option>
            <option value="true"${e.affectsAvailability ? ' selected' : ''}>blocks work</option>
          </select>
        </div>
      </details>
    </div>
    <div class="ev-actions">
      <button type="button" class="link" hx-post="${paths.eventDone(e.id)}" hx-target="#event-${e.id}" hx-swap="outerHTML" title="mark done">✓</button>
      <button type="button" class="link danger" hx-post="${paths.eventCancel(e.id)}" hx-target="#event-${e.id}" hx-swap="outerHTML" title="cancel">✕</button>
    </div>
  </li>`;
}

/** Group upcoming events by how-soon. The "No date yet" group is always rendered so a new event lands. */
export function renderEventsGrouped(events: UpcomingEvent[], todayIso: string): string {
  const dated = events.filter((e) => e.date);
  const thisWeek = dated.filter((e) => daysUntil(e.date as string, todayIso) <= 7);
  const nextTwo = dated.filter((e) => { const d = daysUntil(e.date as string, todayIso); return d >= 8 && d <= 14; });
  const later = dated.filter((e) => daysUntil(e.date as string, todayIso) >= 15);
  const noDate = events.filter((e) => !e.date);
  const section = (title: string, items: UpcomingEvent[], id?: string): string =>
    items.length || id
      ? `<section class="ev-section">
          <h2 class="ev-group-head">${title} ${items.length ? `<span class="ev-group-n">${items.length}</span>` : ''}</h2>
          <ul class="events-group"${id ? ` id="${id}"` : ''}>${items.map((e) => renderEventCard(e, todayIso)).join('')}</ul>
        </section>`
      : '';
  return `<div id="events-list">
    ${section('This week', thisWeek)}
    ${section('Next two weeks', nextTwo)}
    ${section('Later', later)}
    ${section('No date yet', noDate, 'events-nodate')}
  </div>`;
}

export function renderNewEventButton(): string {
  return `<button type="button" class="button" data-new-note hx-post="${paths.events()}" hx-target="#events-nodate" hx-swap="beforeend">＋ Event</button>`;
}
