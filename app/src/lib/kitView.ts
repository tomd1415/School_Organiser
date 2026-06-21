import { esc } from './html';
import type { EquipmentRow } from '../repos/equipment';
import { addDays } from '../lib/time';

const CATEGORIES = ['physical-computing', 'robotics', 'computers', 'peripherals', 'av', 'consumables', 'other'];

function staleBefore(today: string): string {
  return addDays(today, -91); // ~a term ago
}

function renderRow(e: EquipmentRow, today: string): string {
  const save = (field: string) =>
    `hx-post="/kit/${e.id}" hx-vals='{"field":"${field}"}' hx-trigger="input changed delay:700ms, blur" hx-swap="none"`;
  const broken = e.qtyTotal != null && e.qtyWorking != null && e.qtyWorking < e.qtyTotal;
  const stale = !e.lastChecked || e.lastChecked < staleBefore(today);
  return `<tr class="kit-row${e.active ? '' : ' kit-archived'}" id="kit-${e.id}">
    <td><input class="kit-name" name="value" value="${esc(e.name)}" ${save('name')}></td>
    <td><input class="kit-qty${broken ? ' kit-broken' : ''}" name="value" inputmode="numeric" value="${e.qtyTotal ?? ''}" placeholder="—" title="how many we own" ${save('qty_total')}></td>
    <td><input class="kit-qty${broken ? ' kit-broken' : ''}" name="value" inputmode="numeric" value="${e.qtyWorking ?? ''}" placeholder="—" title="how many work" ${save('qty_working')}></td>
    <td><input name="value" value="${esc(e.location ?? '')}" placeholder="where…" ${save('location')}></td>
    <td><input name="value" value="${esc(e.notes ?? '')}" placeholder="notes…" ${save('notes')}></td>
    <td><input class="kit-tags" name="value" value="${esc(e.tags ?? '')}" placeholder="tags…" ${save('tags')}></td>
    <td class="kit-checked${stale ? ' kit-stale' : ''}" title="${stale ? 'not checked for over a term' : 'last stock-take'}">
      ${esc(e.lastChecked ?? 'never')}
      <button type="button" class="link" title="Mark counted/tested today" hx-post="/kit/${e.id}/checked" hx-target="#kit-${e.id}" hx-swap="outerHTML">✓ today</button>
    </td>
    <td>
      <span class="note-status" id="kit-${e.id}-status"></span>
      ${e.active
        ? `<button type="button" class="link danger" hx-post="/kit/${e.id}/archive" hx-target="#kit-${e.id}" hx-swap="outerHTML" hx-confirm="Archive ${esc(e.name)}? It stays in the records but leaves the planning list.">archive</button>`
        : `<button type="button" class="link" hx-post="/kit/${e.id}/restore" hx-target="#kit-${e.id}" hx-swap="outerHTML">restore</button>`}
    </td>
  </tr>`;
}

function groupByCategory(rows: EquipmentRow[]): Map<string, EquipmentRow[]> {
  const m = new Map<string, EquipmentRow[]>();
  for (const r of rows) {
    const arr = m.get(r.category) ?? [];
    arr.push(r);
    m.set(r.category, arr);
  }
  return m;
}

export interface KitPageOptions {
  rows: EquipmentRow[];
  today: string;
  q: string;
  showArchived: boolean;
  csrf: string;
  importStatus?: string;
}

export function renderKitPage(options: KitPageOptions): string {
  const { rows, today, q, showArchived, csrf, importStatus = '' } = options;
  const needle = q.trim().toLowerCase();
  const filtered = needle
    ? rows.filter((r) => [r.name, r.category, r.location, r.notes, r.tags].some((f) => f && f.toLowerCase().includes(needle)))
    : rows;
  const groups = [...groupByCategory(filtered).entries()];
  const head = `<tr><th>Item</th><th title="how many we own">Own</th><th title="how many currently work">Work</th><th>Location</th><th>Notes</th><th>Tags</th><th>Checked</th><th></th></tr>`;
  const tables = groups.length
    ? groups
        .map(
          ([cat, items]) => `<h2 class="kit-cat" style="margin-top: 24px; font-size: 16px;">${esc(cat)}</h2>
          <div class="table-scroll"><table class="kit-table"><thead>${head}</thead><tbody>${items.map((e) => renderRow(e, today)).join('')}</tbody></table></div>`,
        )
        .join('')
    : `<p class="muted">${needle ? 'Nothing matches the filter.' : 'No kit recorded yet — add the first item below.'}</p>`;
  const catOpts = CATEGORIES.map((c) => `<option value="${c}">${c}</option>`).join('');
  
  return `
    <section class="card kit" hx-headers='{"x-csrf-token":"${csrf}"}'>
      <div class="ld-notes-head" style="margin-bottom: 12px;">
        <div>
          <p class="eyebrow" style="margin: 0; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted, #666);">Prep & Advanced</p>
          <h1 style="margin: 0;">Kit — classroom equipment</h1>
        </div>
      </div>
      <p class="muted">Referred to while planning, and given to the AI for every planning feature —
        practical work is planned within what's listed here. Archive (don't delete) anything that leaves the room.</p>
      <form method="get" action="/kit" class="kit-filter" style="margin-bottom: 20px;">
        <input type="search" name="q" value="${esc(q)}" placeholder="filter… name, notes, tags">
        <label style="margin-left: 12px;"><input type="checkbox" name="archived" value="1"${showArchived ? ' checked' : ''} onchange="this.form.submit()"> show archived</label>
        <noscript><button type="submit">Go</button></noscript>
      </form>
      ${tables}
      <form class="kit-add" hx-post="/kit/add" hx-target="closest section" hx-swap="outerHTML" style="margin-top: 24px; padding-top: 16px; border-top: 1px solid var(--border-color, #eaeaea);">
        <input type="text" name="name" placeholder="new item… e.g. micro:bit v2" required maxlength="200">
        <select name="category">${catOpts}</select>
        <button type="submit" class="btn-secondary">＋ add</button>
      </form>
      <details class="kit-import"${importStatus ? ' open' : ''} style="margin-top: 20px; padding: 12px; border: 1px dashed var(--border-color, #ccc); border-radius: 6px;">
        <summary style="cursor: pointer; font-weight: 500;">📥 Import kit from a CSV (spreadsheet stock-take)</summary>
        <form hx-post="/kit/import" hx-target="closest section" hx-swap="outerHTML" style="margin-top: 12px;">
          <p class="muted">Paste a CSV with a <strong>name</strong> column (optionally category, total, working, location, notes, tags). Existing items are matched by name and updated — re-importing never duplicates.</p>
          <textarea name="csv" rows="5" placeholder="name,category,total,working,location&#10;micro:bit v2,physical-computing,16,14,cupboard B" style="width: 100%; box-sizing: border-box;"></textarea>
          <div style="margin-top: 10px;">
            <button type="submit" class="btn-secondary">Import</button>
          </div>
        </form>
        ${importStatus}
      </details>
    </section>`;
}
