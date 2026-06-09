import { esc } from './html';
import type { LinkedResource, ResourceRow } from '../repos/resources';

const KIND_ICON: Record<string, string> = {
  slides: '🖥',
  document: '📄',
  worksheet: '📝',
  quiz: '❓',
  image: '🖼',
  link: '🔗',
  note: '🗒',
};

function fmtSize(bytes: number | null): string {
  if (bytes == null) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function renderResourceItem(r: ResourceRow): string {
  return `<li class="res" id="res-${r.id}">
    <span class="res-kind">${KIND_ICON[r.kind] ?? '📄'}</span>
    <a href="/resources/${r.id}/view" target="_blank" rel="noopener">${esc(r.title)}</a>
    <span class="muted res-meta">${esc(r.source)}${r.versionNo ? ` · v${r.versionNo}` : ''}${r.byteSize ? ' · ' + fmtSize(r.byteSize) : ''}</span>
    <a class="link" href="/resources/${r.id}/download">download</a>
  </li>`;
}

export function renderResourceList(rows: ResourceRow[]): string {
  const items = rows.length ? rows.map(renderResourceItem).join('') : '';
  return `<ul class="res-list" id="resources-list">${items}</ul>`;
}

// Search box + kind filter. Submits q + kind via hx-get on every keystroke (debounced)
// and on filter change, swapping just the #res-list partial.
export function renderSearchBar(kinds: string[], q: string, kind: string): string {
  const opts = ['<option value="">All types</option>']
    .concat(
      kinds.map(
        (k) => `<option value="${esc(k)}"${k === kind ? ' selected' : ''}>${KIND_ICON[k] ?? '📄'} ${esc(k)}</option>`,
      ),
    )
    .join('');
  return `<form class="res-search" hx-get="/resources/list" hx-target="#res-list" hx-swap="outerHTML" hx-trigger="keyup changed delay:300ms, change">
    <input type="search" name="q" value="${esc(q)}" placeholder="Search resources by name…" autocomplete="off">
    <select name="kind">${opts}</select>
  </form>`;
}

export interface PagedResources {
  rows: ResourceRow[];
  total: number;
  page: number;
  pageSize: number;
  q: string;
  kind: string;
}

// The #res-list partial: a count line, the page of items, and prev/next. Swapped wholesale
// by the search bar and the pager links (hx-swap="outerHTML").
export function renderResourceListPaged(p: PagedResources): string {
  const pages = Math.max(1, Math.ceil(p.total / p.pageSize));
  const page = Math.min(Math.max(1, p.page), pages);
  const items = p.rows.length
    ? p.rows.map(renderResourceItem).join('')
    : '<li class="muted">No matching resources.</li>';
  const link = (pg: number, label: string, on: boolean): string =>
    on
      ? `<a class="link" hx-get="/resources/list?q=${encodeURIComponent(p.q)}&kind=${encodeURIComponent(p.kind)}&page=${pg}" hx-target="#res-list" hx-swap="outerHTML">${label}</a>`
      : `<span class="muted">${label}</span>`;
  const note = p.q || p.kind ? ` matching ${[p.q && `“${esc(p.q)}”`, p.kind && esc(p.kind)].filter(Boolean).join(' · ')}` : '';
  return `<div id="res-list">
    <p class="muted res-count">${p.total} resource${p.total === 1 ? '' : 's'}${note}</p>
    <ul class="res-list" id="resources-list">${items}</ul>
    <div class="res-pager">${link(page - 1, '‹ prev', page > 1)} <span class="muted">page ${page} / ${pages}</span> ${link(page + 1, 'next ›', page < pages)}</div>
  </div>`;
}

export function renderUploadForm(): string {
  return `<form class="res-upload" hx-post="/resources" hx-encoding="multipart/form-data" hx-target="#resources-list" hx-swap="afterbegin" hx-on::after-request="this.reset()">
    <input type="file" name="file" required>
    <button type="submit" class="btn-secondary">Upload</button>
  </form>`;
}

// The editable resource block inside a lesson plan: linked resources (each detachable) plus
// a live search to attach more. Swapped wholesale on attach/detach (hx-swap="outerHTML").
export function renderPlanResourcesBlock(planId: number, linked: LinkedResource[]): string {
  const items = linked.length
    ? `<ul class="res-linked">${linked
        .map(
          (r) =>
            `<li><span class="res-kind">${KIND_ICON[r.kind] ?? '📄'}</span>
              <a href="/resources/${r.resourceId}/view" target="_blank" rel="noopener">${esc(r.title)}</a>
              <a class="link" href="/resources/${r.resourceId}/download">↓</a>
              <button type="button" class="link danger" title="unlink" hx-post="/schemes/plan/${planId}/resources/${r.resourceId}/detach" hx-target="#plan-${planId}-res" hx-swap="outerHTML">✕</button></li>`,
        )
        .join('')}</ul>`
    : '<span class="muted">no resources linked</span>';
  return `<div class="plan-res" id="plan-${planId}-res">
    ${items}
    <div class="res-attach">
      <input type="search" name="q" placeholder="attach a resource by name…" autocomplete="off"
        hx-get="/schemes/plan/${planId}/resources/search" hx-trigger="keyup changed delay:300ms" hx-target="#plan-${planId}-attach">
      <div class="res-attach-results" id="plan-${planId}-attach"></div>
    </div>
  </div>`;
}

// Search hits for the attach picker — each with a ＋ that links it to the plan.
export function renderAttachResults(planId: number, rows: ResourceRow[]): string {
  if (rows.length === 0) return '<span class="muted">no matches</span>';
  return `<ul class="res-attach-list">${rows
    .map(
      (r) =>
        `<li><button type="button" class="link" title="attach" hx-post="/schemes/plan/${planId}/resources" hx-vals='{"resource_id":${r.id}}' hx-target="#plan-${planId}-res" hx-swap="outerHTML">＋</button>
          <span class="res-kind">${KIND_ICON[r.kind] ?? '📄'}</span> ${esc(r.title)}</li>`,
    )
    .join('')}</ul>`;
}

export function renderLinkedResources(rows: LinkedResource[]): string {
  if (rows.length === 0) return '<span class="muted">no resources linked</span>';
  return `<ul class="res-linked">${rows
    .map(
      (r) =>
        `<li><a href="/resources/${r.resourceId}/view" target="_blank" rel="noopener">${esc(r.title)}</a> <a class="link" href="/resources/${r.resourceId}/download">↓</a></li>`,
    )
    .join('')}</ul>`;
}
