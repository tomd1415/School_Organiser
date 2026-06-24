// Pure HTML for event/deadline items (inline-editable, HTMX). Same pattern as tasks.
import { esc } from './html';
import { EVENT_KINDS, EVENT_KIND_LABELS, type UpcomingEvent } from '../services/event';
import { paths } from './paths';

function kindOptions(current: string): string {
  return EVENT_KINDS.map(
    (k) => `<option value="${k}"${k === current ? ' selected' : ''}>${esc(EVENT_KIND_LABELS[k] ?? k)}</option>`,
  ).join('');
}

export function renderEventItem(e: UpcomingEvent): string {
  const save = (trigger: string) => `hx-post="${paths.event(e.id)}" hx-swap="none" hx-trigger="${trigger}"`;
  return `<li class="event" id="event-${e.id}">
    <input class="event-title" type="text" name="title" value="${esc(e.title)}" placeholder="Event…" ${save('input changed delay:600ms, blur')}>
    <div class="task-controls">
      <select name="kind" ${save('change')}>${kindOptions(e.kind)}</select>
      <input type="date" name="date" value="${esc(e.date ?? '')}" ${save('change')}>
      <input class="event-lead" type="number" name="lead_days" min="0" value="${e.leadDays ?? ''}" placeholder="lead" ${save('input changed delay:600ms, blur')}>
      <select name="affects_availability" ${save('change')}>
        <option value="false"${e.affectsAvailability ? '' : ' selected'}>doesn't block work</option>
        <option value="true"${e.affectsAvailability ? ' selected' : ''}>blocks work</option>
      </select>
      <span class="note-status" id="event-${e.id}-status"></span>
    </div>
    <div class="task-actions">
      <button type="button" class="link" hx-post="${paths.eventDone(e.id)}" hx-target="#event-${e.id}" hx-swap="outerHTML">✓ done</button>
      <button type="button" class="link danger" hx-post="${paths.eventCancel(e.id)}" hx-target="#event-${e.id}" hx-swap="outerHTML">cancel</button>
    </div>
  </li>`;
}

export function renderEventList(events: UpcomingEvent[]): string {
  return `<ul class="tasks-list notes-list" id="events-list">${events.map(renderEventItem).join('')}</ul>`;
}

export function renderNewEventButton(): string {
  return `<button type="button" class="btn-secondary" data-new-note hx-post="${paths.events()}" hx-target="#events-list" hx-swap="beforeend">＋ New event</button>`;
}
