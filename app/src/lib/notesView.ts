// Pure HTML builders for notes + follow-ups, shared by the lesson, Now and
// general-notes screens. CSRF is supplied once by an `hx-headers` ancestor, so
// these fragments carry none. Returned by the /notes endpoints for HTMX swaps.
import { esc } from './html';
import { paths } from './paths';

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
  category?: string | null; // BUG-051: lesson-note category + safeguarding flag, preserved so the cockpit
  safeguarding?: boolean; //   badge survives a reload (was dropped in the mapping, defaulting to Learning)
  rev?: string; // 10.10: optimistic-concurrency token; when present, autosave guards against clobber
}

export function renderFollowup(f: FollowupItem): string {
  return `<li id="fu-${f.id}" class="fu${f.done ? ' done' : ''}"><label><input type="checkbox" ${f.done ? 'checked' : ''} hx-post="${paths.followupToggle(f.id)}" hx-target="#fu-${f.id}" hx-swap="outerHTML"> ${esc(f.text)}</label></li>`;
}

export function renderNoteItem(n: NoteItem): string {
  const fus = n.followups.map(renderFollowup).join('');
  // 10.10: when a rev is supplied, carry it in a hidden field the autosave includes, so the server
  // can detect a stale-tab clobber. The OOB response replaces this field with the new rev.
  const revField = n.rev != null ? `<input type="hidden" name="rev" id="note-${n.id}-rev" value="${esc(n.rev)}">` : '';
  const include = n.rev != null ? ` hx-include="#note-${n.id}-rev"` : '';
  return `<li class="note" id="note-${n.id}">
    ${revField}<textarea name="body" rows="2" placeholder="Type a note…" hx-post="${paths.note(n.id)}" hx-trigger="input changed delay:800ms, blur" hx-swap="none"${include}>${esc(n.body)}</textarea>
    <div class="note-meta">
      <span class="note-status" id="note-${n.id}-status"></span>
      <span class="muted note-time">${esc(n.time)}</span>
      <button type="button" class="link danger" hx-post="${paths.noteDelete(n.id)}" hx-target="#note-${n.id}" hx-swap="outerHTML" hx-confirm="Delete this note?">delete</button>
    </div>
    <ul class="followups" id="note-${n.id}-fu">${fus}</ul>
    <form class="fu-form" hx-post="${paths.noteFollowups(n.id)}" hx-target="#note-${n.id}-fu" hx-swap="beforeend" hx-on::after-request="if(window.htmxSaved(event))this.reset()">
      <input type="text" name="text" data-followup placeholder="+ follow-up" autocomplete="off">
    </form>
  </li>`;
}

export function renderNotesList(listId: string, notes: NoteItem[]): string {
  return `<ul class="notes-list" id="${esc(listId)}">${notes.map(renderNoteItem).join('')}</ul>`;
}

export function renderNewNoteButton(listId: string, vals: Record<string, string | number>): string {
  return `<button type="button" class="btn-secondary" data-new-note hx-post="${paths.notes()}" hx-vals='${JSON.stringify(vals)}' hx-target="#${esc(listId)}" hx-swap="beforeend">＋ New note</button>`;
}

// ── Notes knowledge base (Rail & Stage rebuild — SPEC §2) ───────────────────────────────────────────
// The /notes page is a searchable grid of cards: a kind badge (by what the note links to), the date, the
// editable body (autosave, kept inline so the workflow is unchanged) and link chips. New render fns so the
// shared inline renderNoteItem above (Now / cockpit / pupils) is untouched. NoteCard is a UI-owned shape.
export interface NoteCard {
  id: number;
  body: string;
  date: string;
  rev: string;
  courseName: string | null;
  groupName: string | null;
  pupilName: string | null;
  safeguarding: boolean;
}

type NoteLinkKind = 'pupil' | 'group' | 'course' | 'general';
const LINK_BADGE: Record<NoteLinkKind, { cls: string; label: string }> = {
  pupil: { cls: 'warn', label: 'Pupil' }, // amber
  group: { cls: 'live', label: 'Group' }, // teal
  course: { cls: 'good', label: 'Course' }, // green
  general: { cls: '', label: 'General' }, // grey
};
const noteLinkKind = (n: NoteCard): NoteLinkKind => (n.pupilName ? 'pupil' : n.groupName ? 'group' : n.courseName ? 'course' : 'general');

export function renderNoteCard(n: NoteCard): string {
  const b = LINK_BADGE[noteLinkKind(n)];
  const chips = [
    n.courseName ? `<span class="note-chip">📘 ${esc(n.courseName)}</span>` : '',
    n.groupName ? `<span class="note-chip">👥 ${esc(n.groupName)}</span>` : '',
    n.pupilName ? `<span class="note-chip">🧑 ${esc(n.pupilName)}</span>` : '',
  ].filter(Boolean).join('');
  return `<li class="note-card${n.safeguarding ? ' sg' : ''}" id="note-${n.id}">
    <div class="note-card-head"><span class="badge ${b.cls}">${b.label}</span><span class="note-card-date">${esc(n.date)}</span></div>
    <input type="hidden" name="rev" id="note-${n.id}-rev" value="${esc(n.rev)}">
    <textarea class="note-card-body" name="body" rows="3" placeholder="Type a note…" hx-post="${paths.note(n.id)}" hx-trigger="input changed delay:800ms, blur" hx-swap="none" hx-include="#note-${n.id}-rev">${esc(n.body)}</textarea>
    ${chips ? `<div class="note-chips">${chips}</div>` : ''}
    <div class="note-card-foot">
      <span class="note-status" id="note-${n.id}-status"></span>
      <button type="button" class="link danger" hx-post="${paths.noteDelete(n.id)}" hx-target="#note-${n.id}" hx-swap="outerHTML" hx-confirm="Delete this note?">delete</button>
    </div>
  </li>`;
}

export function renderNotesGrid(notes: NoteCard[]): string {
  const cards = notes.map(renderNoteCard).join('');
  return `<ul class="notes-grid" id="notes-grid">${cards || '<li class="muted notes-empty">No notes match.</li>'}</ul>`;
}

/** Search field (live-filters the grid) + New note. The active link filter rides along via a hidden field. */
export function renderNotesSearch(q: string, activeLink: string): string {
  return `<div class="notes-top">
    <label class="notes-search"><span class="notes-search-ico" aria-hidden="true">⌕</span>
      <input type="search" name="q" value="${esc(q)}" placeholder="Search notes…" autocomplete="off" aria-label="Search notes"
        hx-get="${paths.notes()}" hx-trigger="input changed delay:300ms, search" hx-target="#notes-grid" hx-swap="outerHTML" hx-include="[name=link]"></label>
    <input type="hidden" name="link" value="${esc(activeLink)}">
    ${renderNewNoteButton('notes-grid', { kind: 'general' })}
  </div>`;
}

/** Filter chips by link kind, with counts. */
export function renderNotesChips(counts: Readonly<Record<string, number>>, active: string, q: string): string {
  const qs = q ? `&amp;q=${esc(q)}` : '';
  const chip = (link: string, label: string, n: number) =>
    `<a href="${link ? `${paths.notesFiltered(link)}${qs}` : `${paths.notes()}${q ? `?q=${esc(q)}` : ''}`}" class="chip${(active ?? '') === link ? ' active' : ''}">${esc(label)}${n ? ` <span class="chip-count">${n}</span>` : ''}</a>`;
  const total = (counts.course ?? 0) + (counts.group ?? 0) + (counts.pupil ?? 0) + (counts.general ?? 0);
  const order: Array<[string, string]> = [['group', 'Groups'], ['pupil', 'Pupils'], ['course', 'Courses'], ['general', 'General']];
  return `<div class="cap-chips">${[
    chip('', 'All', total),
    ...order.filter(([k]) => (counts[k] ?? 0) > 0 || k === active).map(([k, label]) => chip(k, label, counts[k] ?? 0)),
  ].join('')}</div>`;
}

/** A small "saved" flash, swapped in by an out-of-band update after autosave. */
export function renderSavedStatus(statusId: string): string {
  return `<span class="note-status saved" id="${esc(statusId)}" hx-swap-oob="true">saved ✓</span>`;
}

// Autosave validation failure (e.g. a required title cleared): shown in the same status slot, in red,
// WITHOUT writing — so a NOT NULL column never receives a null and the user gets a useful message
// instead of a generic save-failed toast (BUG-035).
export function renderSaveError(statusId: string, message: string): string {
  return `<span class="note-status save-error" id="${esc(statusId)}" hx-swap-oob="true">${esc(message)}</span>`;
}

/** 10.10: the OOB rev-token update after a successful guarded save (advances the client's token). */
export function renderRevUpdate(noteId: number, rev: string): string {
  return `<input type="hidden" name="rev" id="note-${noteId}-rev" value="${esc(rev)}" hx-swap-oob="true">`;
}

/** 10.10: the conflict flash when a stale tab tried to overwrite a newer edit (rev NOT advanced, so
 *  further edits keep failing until the teacher reloads — their text stays on screen meanwhile). */
export function renderConflictStatus(statusId: string): string {
  return `<span class="note-status conflict" id="${esc(statusId)}" hx-swap-oob="true">⚠ edited elsewhere — your text is kept; reload to merge</span>`;
}
