// Pure HTML builders for notes + follow-ups, shared by the lesson, Now and
// general-notes screens. CSRF is supplied once by an `hx-headers` ancestor, so
// these fragments carry none. Returned by the /notes endpoints for HTMX swaps.
import { esc } from './html';

export interface FollowupItem {
  id: number;
  text: string;
  done: boolean;
}

export interface NoteItem {
  id: number;
  body: string;
  time: string;
  followups: FollowupItem[];
}

export function renderFollowup(f: FollowupItem): string {
  return `<li id="fu-${f.id}" class="fu${f.done ? ' done' : ''}"><label><input type="checkbox" ${f.done ? 'checked' : ''} hx-post="/followups/${f.id}/toggle" hx-target="#fu-${f.id}" hx-swap="outerHTML"> ${esc(f.text)}</label></li>`;
}

export function renderNoteItem(n: NoteItem): string {
  const fus = n.followups.map(renderFollowup).join('');
  return `<li class="note" id="note-${n.id}">
    <textarea name="body" rows="2" placeholder="Type a note…" hx-post="/notes/${n.id}" hx-trigger="input changed delay:800ms, blur" hx-swap="none">${esc(n.body)}</textarea>
    <div class="note-meta">
      <span class="note-status" id="note-${n.id}-status"></span>
      <span class="muted note-time">${esc(n.time)}</span>
      <button type="button" class="link danger" hx-post="/notes/${n.id}/delete" hx-target="#note-${n.id}" hx-swap="outerHTML" hx-confirm="Delete this note?">delete</button>
    </div>
    <ul class="followups" id="note-${n.id}-fu">${fus}</ul>
    <form class="fu-form" hx-post="/notes/${n.id}/followups" hx-target="#note-${n.id}-fu" hx-swap="beforeend" hx-on::after-request="this.reset()">
      <input type="text" name="text" data-followup placeholder="+ follow-up" autocomplete="off">
    </form>
  </li>`;
}

export function renderNotesList(listId: string, notes: NoteItem[]): string {
  return `<ul class="notes-list" id="${esc(listId)}">${notes.map(renderNoteItem).join('')}</ul>`;
}

export function renderNewNoteButton(listId: string, vals: Record<string, string | number>): string {
  return `<button type="button" class="btn-secondary" data-new-note hx-post="/notes" hx-vals='${JSON.stringify(vals)}' hx-target="#${esc(listId)}" hx-swap="beforeend">＋ New note</button>`;
}

/** A small "saved" flash, swapped in by an out-of-band update after autosave. */
export function renderSavedStatus(statusId: string): string {
  return `<span class="note-status saved" id="${esc(statusId)}" hx-swap-oob="true">saved ✓</span>`;
}
