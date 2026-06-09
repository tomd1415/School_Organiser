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

export function renderUploadForm(): string {
  return `<form class="res-upload" hx-post="/resources" hx-encoding="multipart/form-data" hx-target="#resources-list" hx-swap="afterbegin" hx-on::after-request="this.reset()">
    <input type="file" name="file" required>
    <button type="submit" class="btn-secondary">Upload</button>
  </form>`;
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
