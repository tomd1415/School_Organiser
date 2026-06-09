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
