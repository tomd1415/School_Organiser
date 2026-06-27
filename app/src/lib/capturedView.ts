import { esc } from './html';
import { CAPTURED_CATEGORIES, CATEGORY_LABELS, type CapturedItem } from '../services/captured';
import type { GroupOpt } from '../repos/tasks';
import { paths } from './paths';

// Rail & Stage rebuild — Captured (SPEC §1): a capture bar + category-filter chips + triage cards with a
// tone left-border, a category badge, the captured text, a "resurfaces …" line and a primary action.
// Safeguarding is non-negotiable: a flagged capture is withheld from AI entirely, shows the red flag badge
// + "kept out of AI entirely", and its primary action is "Open register" (never "Make a task").

// category → badge tone class (.badge.<x>) and card left-border tone class (.cap-<category>).
const CATEGORY_BADGE: Record<string, string> = { logistics: 'live', pupil: 'warn', curriculum: 'good', safeguarding: 'red', cpd: 'ai' };
const TONED = new Set(['logistics', 'pupil', 'curriculum', 'safeguarding', 'cpd']); // others → neutral grey

function categoryOptions(current: string | null): string {
  return (
    `<option value=""${current ? '' : ' selected'}>— category —</option>` +
    CAPTURED_CATEGORIES.map((c) => `<option value="${c}"${c === current ? ' selected' : ''}>${esc(CATEGORY_LABELS[c] ?? c)}</option>`).join('')
  );
}

function groupOptions(groups: GroupOpt[], current: number | null): string {
  return (
    `<option value=""${current == null ? ' selected' : ''}>— class —</option>` +
    groups.map((g) => `<option value="${g.id}"${g.id === current ? ' selected' : ''}>${esc(g.name)}</option>`).join('')
  );
}

/** The teal-tinted capture bar: type one line, Capture +, the new card prepends and the input clears. */
export function renderCaptureBar(): string {
  return `<form class="capture-bar" hx-post="${paths.captured()}" hx-target="#captured-list" hx-swap="afterbegin"
            hx-on::after-request="if(window.htmxSaved(event)){this.reset();this.querySelector('input').focus();}">
      <input class="capture-input" type="text" name="body" autocomplete="off" required
        placeholder="Tell me later… e.g. B14 projector being replaced over half term">
      <button type="submit" class="button capture-go primary">Capture +</button>
    </form>
    <p class="capture-help muted">One line is enough — it resurfaces on the day it matters. Re-file to change the category, make it a task, or archive. ⚑ Safeguarding stays out of AI entirely.</p>`;
}

/** Category filter chips with counts. Shows All + every category that has items (plus the active one). */
export function renderCapturedChips(counts: Readonly<Record<string, number>>, active: string | undefined): string {
  const total = CAPTURED_CATEGORIES.reduce((n, c) => n + (counts[c] ?? 0), 0);
  const chip = (cat: string | undefined, label: string, n: number) =>
    `<a href="${cat ? paths.capturedFiltered(cat) : paths.captured()}" class="chip${(cat ?? '') === (active ?? '') ? ' active' : ''}">${esc(label)}${n ? ` <span class="chip-count">${n}</span>` : ''}</a>`;
  const cats = CAPTURED_CATEGORIES.filter((c) => (counts[c] ?? 0) > 0 || c === active);
  return `<div class="cap-chips">${[chip(undefined, 'All', total), ...cats.map((c) => chip(c, CATEGORY_LABELS[c] ?? c, counts[c] ?? 0))].join('')}</div>`;
}

export function renderCapturedItem(item: CapturedItem, groups: GroupOpt[]): string {
  const save = (trigger: string) => `hx-post="${paths.capturedItem(item.id)}" hx-swap="none" hx-trigger="${trigger}"`;
  const flag = (f: string, on: boolean, label: string) =>
    `<button type="button" class="link${on ? ' on' : ''}" hx-post="${paths.capturedFlag(item.id, f)}" hx-target="#cap-${item.id}" hx-swap="outerHTML">${label}</button>`;
  const cat = item.category ?? '';
  const toneClass = item.safeguarding ? 'cap-safeguarding' : TONED.has(cat) ? `cap-${cat}` : '';

  const badge = item.safeguarding
    ? '<span class="badge red">⚑ Flagged · withheld from AI</span>'
    : `<span class="badge ${CATEGORY_BADGE[cat] ?? ''}">${esc(item.category ? (CATEGORY_LABELS[cat] ?? cat) : 'Unfiled')}</span>`;
  const resurface = item.safeguarding
    ? '<span class="cap-resurface">kept out of AI entirely</span>'
    : `<span class="cap-resurface">${item.surfaceOn ? `↳ resurfaces <strong>${esc(item.surfaceOn)}</strong>` : '↳ no resurface date set'}</span>`;
  // Safeguarding lands in the teacher-only register, not the task list (flow 11 / privacy non-negotiable).
  const primary = item.safeguarding
    ? `<a class="button small" href="${paths.safeguarding()}">Open register</a>`
    : `<button type="button" class="button small" hx-post="${paths.capturedToTask(item.id)}" hx-target="#cap-${item.id}" hx-swap="outerHTML">Make a task</button>`;

  return `<li class="captured-card ${toneClass}${item.safeguarding ? ' sg' : ''}" id="cap-${item.id}">
    <div class="cap-head">
      ${badge}
      ${item.groupName ? `<span class="cap-subject">${esc(item.groupName)}</span>` : ''}
      <span class="cap-spacer"></span>
      ${item.addedAt ? `<span class="cap-added">added ${esc(item.addedAt)}</span>` : ''}
      ${flag('interest', item.interest, item.interest ? '⭐' : '☆')}
    </div>
    <textarea class="cap-body" name="body" rows="2" placeholder="Something you were told…" ${save('input changed delay:600ms, blur')}>${esc(item.body)}</textarea>
    <div class="cap-foot">
      ${resurface}
      <span class="cap-spacer"></span>
      <button type="button" class="link" hx-post="${paths.capturedSuggest(item.id)}" hx-target="#cap-${item.id}" hx-swap="outerHTML" hx-disabled-elt="this" title="AI suggests a category, date and class (safeguarding stays local)">✨ Suggest</button>
      ${primary}
      <button type="button" class="link danger" hx-post="${paths.capturedFlag(item.id, 'archived')}" hx-target="#cap-${item.id}" hx-swap="outerHTML">Archive</button>
    </div>
    <details class="cap-refile">
      <summary>Re-file</summary>
      <div class="cap-refile-row">
        <select name="category" ${save('change')}>${categoryOptions(item.category)}</select>
        <label class="cap-when">resurface <input type="date" name="surface_on" value="${esc(item.surfaceOn ?? '')}" ${save('change')}></label>
        <select name="group_id" ${save('change')}>${groupOptions(groups, item.groupId)}</select>
        ${flag('safeguarding', item.safeguarding, item.safeguarding ? '⚑ flagged — withheld' : '⚑ mark safeguarding')}
      </div>
    </details>
    <span class="note-status" id="cap-${item.id}-status"></span>
  </li>`;
}

export function renderCapturedList(items: CapturedItem[], groups: GroupOpt[]): string {
  const cards = items.map((i) => renderCapturedItem(i, groups)).join('');
  return `<ul class="captured-list" id="captured-list">${cards}</ul>${
    items.length ? '' : '<p class="muted cap-empty">Nothing captured here yet — jot the first thing above.</p>'
  }`;
}
