// Pure HTML for checklist items (per-lesson prep + the day checklist). HTMX toggle.
import { esc } from './html';
import type { PrepItem } from '../repos/prep';

export function renderPrepItem(item: PrepItem, toggleBase: string, domPrefix: string): string {
  const dom = `${domPrefix}-${item.id}`;
  return `<li id="${dom}" class="fu${item.done ? ' done' : ''}"><label><input type="checkbox" ${item.done ? 'checked' : ''} hx-post="${toggleBase}/${item.id}/toggle" hx-target="#${dom}" hx-swap="outerHTML"> ${esc(item.text)}</label></li>`;
}

export function renderPrepList(items: PrepItem[], toggleBase: string, domPrefix: string, listId: string): string {
  return `<ul class="followups" id="${esc(listId)}">${items.map((i) => renderPrepItem(i, toggleBase, domPrefix)).join('')}</ul>`;
}

/** 10.20 — an inline "+ add" input that appends a new prep/day-checklist item (Enter to add). */
export function renderPrepAdd(action: string, hidden: Record<string, string | number>, listId: string): string {
  const fields = Object.entries(hidden)
    .map(([k, v]) => `<input type="hidden" name="${esc(k)}" value="${esc(String(v))}">`)
    .join('');
  return `<form class="prep-add" hx-post="${esc(action)}" hx-target="#${esc(listId)}" hx-swap="beforeend" hx-on::after-request="if(window.htmxSaved(event))this.reset()">${fields}<input type="text" name="text" placeholder="+ add an item" autocomplete="off" maxlength="200"></form>`;
}
