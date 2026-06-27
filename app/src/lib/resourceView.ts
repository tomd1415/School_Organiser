import { esc } from './html';
import { paths } from './paths';
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

// §10 kind badge: a tone-tinted label per resource kind (SLIDES teal · SHEET green · QUIZ amber · the
// rest grey). Reuses the shared .badge tones. The friendly label is also used for the filter pills.
const KIND_BADGE: Record<string, { cls: string; label: string }> = {
  slides: { cls: 'live', label: 'Slides' },
  worksheet: { cls: 'good', label: 'Worksheet' },
  quiz: { cls: 'warn', label: 'Quiz' },
  document: { cls: '', label: 'Document' },
  image: { cls: '', label: 'Image' },
  link: { cls: '', label: 'Link' },
  note: { cls: '', label: 'Note' },
};
function kindBadge(kind: string): { cls: string; label: string } {
  return KIND_BADGE[kind] ?? { cls: '', label: kind.charAt(0).toUpperCase() + kind.slice(1) };
}

// Linked resources are grouped into three buckets so a lesson's resource list reads cleanly:
// images, the teacher's own ORIGINAL uploads/imports, and what the AI GENERATED. Empty buckets hide.
type ResGroupKey = 'images' | 'original' | 'generated';
const RES_GROUP_META: ReadonlyArray<{ key: ResGroupKey; label: string; icon: string }> = [
  { key: 'images', label: 'Images', icon: '🖼' },
  { key: 'original', label: 'Original resources', icon: '📎' },
  { key: 'generated', label: 'Generated resources', icon: '✨' },
];

function resGroupOf(r: LinkedResource): ResGroupKey {
  if (r.kind === 'image') return 'images';
  if (r.source === 'ai_generated') return 'generated';
  return 'original'; // uploaded / imported / anything else the teacher brought in
}

/** Render linked resources split into the three labelled groups, each item via `item`. */
function renderResourceGroups(rows: LinkedResource[], item: (r: LinkedResource) => string): string {
  const by: Record<ResGroupKey, LinkedResource[]> = { images: [], original: [], generated: [] };
  for (const r of rows) by[resGroupOf(r)].push(r);
  return RES_GROUP_META.filter((g) => by[g.key].length > 0)
    .map(
      (g) =>
        `<div class="res-group res-group-${g.key}"><span class="res-group-label">${g.icon} ${g.label}</span>` +
        `<ul class="res-linked">${by[g.key].map(item).join('')}</ul></div>`,
    )
    .join('');
}

function fmtSize(bytes: number | null): string {
  if (bytes == null) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function renderResourceItem(r: ResourceRow): string {
  // §10 resource card: kind badge · version (mono) · title · meta (🔗 used · size · source) · Open /
  // Present↗ (slides) / download. Stays an <li> so the upload/generate/version POSTs can prepend it
  // straight into the #resources-list grid.
  const badge = kindBadge(r.kind);
  const view = paths.resourceViewUrl(r.id);
  const used =
    r.usedCount > 0
      ? `<button type="button" class="link res-used" title="where this resource is used"
          hx-get="${paths.resourceUsage(r.id)}" hx-target="#res-${r.id}-usage" hx-swap="innerHTML">🔗 ${r.usedCount}</button>`
      : '';
  const meta = [used, r.byteSize ? fmtSize(r.byteSize) : '', esc(r.source)].filter(Boolean).join(' · ');
  return `<li class="card res-card" id="res-${r.id}">
    <div class="res-card-head">
      <span class="badge ${badge.cls}">${esc(badge.label)}</span>
      ${r.versionNo ? `<span class="res-ver">v${r.versionNo}</span>` : ''}
      ${r.unit || r.yearGroup ? `<span class="res-unit" title="year group · unit">${[r.yearGroup, r.unit].filter(Boolean).map((x) => esc(x as string)).join(' · ')}</span>` : ''}
    </div>
    <a class="res-card-title" href="${view}" target="_blank" rel="noopener">${esc(r.title)}</a>
    <div class="res-card-meta muted">${meta}</div>
    <span class="res-usage" id="res-${r.id}-usage"></span>
    <div class="res-card-actions">
      <a class="button small" href="${view}" target="_blank" rel="noopener">Open</a>
      ${r.kind === 'slides' ? `<a class="link" href="${paths.resourcePresent(r.id)}" target="_blank" rel="noopener">Present ↗</a>` : ''}
      <a class="link" href="${paths.resourceDownload(r.id)}">download</a>
    </div>
    ${r.sourceAttribution ? `<div class="res-attrib muted" title="attribution / licence">⚖ ${esc(r.sourceAttribution)}</div>` : ''}
  </li>`;
}

// Search box + kind filter. Submits q + kind via hx-get on every keystroke (debounced)
// and on filter change, swapping just the #res-list partial.
export function renderSearchBar(kinds: string[], q: string, kind: string): string {
  // Filter pills as radio inputs so the kind survives every live-search submit (the form serialises the
  // checked radio on each keyup/change) — no JS, and they style as a segmented pill row.
  const pill = (val: string, label: string) =>
    `<label class="res-pill${val === kind ? ' is-on' : ''}"><input type="radio" name="kind" value="${esc(val)}"${val === kind ? ' checked' : ''}>${esc(label)}</label>`;
  const pills = [pill('', 'All')].concat(kinds.map((k) => pill(k, kindBadge(k).label))).join('');
  return `<form class="res-search" hx-get="${paths.resourcesList()}" hx-target="#res-list" hx-swap="outerHTML" hx-trigger="keyup changed delay:300ms, change">
    <input type="search" name="q" value="${esc(q)}" placeholder="Search resources by name…" autocomplete="off">
    <div class="res-pills">${pills}</div>
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
      ? `<a class="link" hx-get="${paths.resourcesListQuery(p.q, p.kind, pg)}" hx-target="#res-list" hx-swap="outerHTML">${label}</a>`
      : `<span class="muted">${label}</span>`;
  const note = p.q || p.kind ? ` matching ${[p.q && `“${esc(p.q)}”`, p.kind && esc(kindBadge(p.kind).label)].filter(Boolean).join(' · ')}` : '';
  return `<div id="res-list">
    <p class="muted res-count">${p.total} resource${p.total === 1 ? '' : 's'}${note}</p>
    <ul class="res-grid" id="resources-list">${items}</ul>
    <div class="res-pager">${link(page - 1, '‹ prev', page > 1)} <span class="muted">page ${page} / ${pages}</span> ${link(page + 1, 'next ›', page < pages)}</div>
  </div>`;
}

export function renderUploadForm(): string {
  return `<form class="res-upload" hx-post="${paths.resources()}" hx-encoding="multipart/form-data" hx-target="#resources-list" hx-swap="afterbegin" hx-on::after-request="if(window.htmxSaved(event))this.reset()">
    <input type="file" name="file" required>
    <button type="submit" class="primary">Upload</button>
  </form>`;
}

// Generate a new resource with AI (4.7) — saved as an editable Markdown resource (a new version).
export function renderGenerateForm(): string {
  return `<details class="res-generate">
    <summary>✨ Generate a resource with AI</summary>
    <form hx-post="${paths.resourcesGenerate()}" hx-target="#resources-list" hx-swap="afterbegin" hx-disabled-elt="find button" hx-on::after-request="if(window.htmxSaved(event))this.reset()">
      <textarea name="brief" rows="3" required placeholder="Describe it — e.g. 'A one-page Year 7 worksheet on binary addition: 6 questions building up, lots of answer space, minimal text, for autistic pupils.'"></textarea>
      <button type="submit" class="primary">Generate (Markdown)</button>
      <span class="muted res-generate-hint">saved as an editable .md resource</span>
    </form>
  </details>`;
}

// The editable resource block inside a lesson plan: linked resources (each detachable) plus
// a live search to attach more. Swapped wholesale on attach/detach (hx-swap="outerHTML").
export function renderPlanResourcesBlock(planId: number, linked: LinkedResource[]): string {
  const items = linked.length
    ? renderResourceGroups(
        linked,
        (r) =>
          `<li><span class="res-kind">${KIND_ICON[r.kind] ?? '📄'}</span>
              <a href="${paths.resourceViewUrl(r.resourceId)}" target="_blank" rel="noopener">${esc(r.title)}</a>
              <a class="link" href="${paths.resourceDownload(r.resourceId)}">↓</a>
              <button type="button" class="link danger" title="unlink" hx-post="${paths.schemesPlanResourceDetach(planId, r.resourceId)}" hx-target="#plan-${planId}-res" hx-swap="outerHTML">✕</button></li>`,
      )
    : '<span class="muted">no resources linked</span>';
  return `<div class="plan-res" id="plan-${planId}-res">
    ${items}
    <div class="res-attach">
      <input type="search" name="q" placeholder="attach a resource by name…" autocomplete="off"
        hx-get="${paths.schemesPlanResourcesSearch(planId)}" hx-trigger="keyup changed delay:300ms" hx-target="#plan-${planId}-attach">
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
        `<li><button type="button" class="link" title="attach" hx-post="${paths.schemesPlanResources(planId)}" hx-vals='{"resource_id":${r.id}}' hx-target="#plan-${planId}-res" hx-swap="outerHTML">＋</button>
          <span class="res-kind">${KIND_ICON[r.kind] ?? '📄'}</span> ${esc(r.title)}</li>`,
    )
    .join('')}</ul>`;
}

export function renderLinkedResources(rows: LinkedResource[]): string {
  if (rows.length === 0) return '<span class="muted">no resources linked</span>';
  return renderResourceGroups(
    rows,
    (r) =>
      `<li><span class="res-kind">${KIND_ICON[r.kind] ?? '📄'}</span> <a href="${paths.resourceViewUrl(r.resourceId)}" target="_blank" rel="noopener">${esc(r.title)}</a> <a class="link" href="${paths.resourceDownload(r.resourceId)}">↓</a></li>`,
  );
}
