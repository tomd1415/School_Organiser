import { esc } from './html';
import type { SafeguardingItem, SgSource } from '../repos/safeguarding';
import { paths } from './paths';

const SOURCE_LABEL: Record<SgSource, string> = { answer: 'pupil answer', captured: 'captured note', ta_feedback: 'TA feedback', assessment_answer: 'assessment answer' };
export const STATUSES = ['recorded', 'actioned', 'referred'] as const;
const STATUS_LABEL: Record<string, string> = { new: 'new', recorded: 'recorded', actioned: 'actioned', referred: 'referred to DSL' };

export function rowId(i: SafeguardingItem): string {
  return `sg-${i.sourceType}-${i.sourceId}`;
}

export function renderItem(i: SafeguardingItem): string {
  const sel = (s: string): string => STATUSES.map((v) => `<option value="${v}"${v === s ? ' selected' : ''}>${esc(STATUS_LABEL[v]!)}</option>`).join('');
  return `<li class="sg-item sg-${i.status}" id="${rowId(i)}">
    <div class="sg-meta">
      <span class="sg-status sg-badge-${i.status}">${esc(STATUS_LABEL[i.status] ?? i.status)}</span>
      <span class="sg-src">${esc(SOURCE_LABEL[i.sourceType])}</span>
      ${i.who ? `<span class="sg-who">${esc(i.who)}</span>` : ''}
      <span class="muted">${esc(i.at)}</span>
    </div>
    <div class="sg-text">${esc(i.text)}</div>
    <form class="sg-action" hx-post="${paths.safeguardingSource(i.sourceType, i.sourceId)}" hx-target="#${rowId(i)}" hx-swap="outerHTML">
      <select name="status">${sel(i.status === 'new' ? 'recorded' : i.status)}</select>
      <input type="text" name="note" maxlength="500" placeholder="what was done (e.g. spoke to DSL, logged on CPOMS)" value="${esc(i.actionNote)}">
      <button type="submit" class="primary">Record</button>
    </form>
  </li>`;
}

export interface SafeguardingPageOptions {
  csrf: string;
  items: SafeguardingItem[];
  open: number;
}

export function renderSafeguardingPage(options: SafeguardingPageOptions): string {
  const { csrf, items, open } = options;
  const itemsHtml = items.map(renderItem).join('') || '<li class="muted">Nothing flagged. 🟢</li>';

  return `
    <section class="card" hx-headers='{"x-csrf-token":"${csrf}"}'>
      <div class="ld-notes-head" style="margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between;">
        <div>
          <p class="eyebrow" style="margin: 0; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted, #666);">Urgency & Safety</p>
          <h1 style="margin: 0; display: flex; align-items: center; gap: 8px;">
            Safeguarding register
            ${open > 0 ? `<span class="sg-count" style="font-size: 14px; background: var(--accent-red, #dc2626); color: #fff; padding: 2px 8px; border-radius: 12px;">${open} new</span>` : ''}
          </h1>
        </div>
      </div>
      <p class="muted">Everything the system has flagged — pupil answers withheld from the AI, and
        safeguarding-flagged captured notes and TA feedback — in one place. <strong>This is a record
        of handling, not a referral system</strong>: follow your school's safeguarding process (CPOMS/DSL)
        and note here what you did. Nothing on this page is ever sent to any AI service.</p>
      <ul class="sg-list" style="list-style: none; padding: 0;">${itemsHtml}</ul>
    </section>
  `;
}
