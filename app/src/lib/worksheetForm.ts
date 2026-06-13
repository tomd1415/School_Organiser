// Phase 8.4: turn a generated worksheet (Markdown) into a form a pupil fills in — and the same
// thing read-only for the teacher's review. Two design rules make it safe:
//  • Field keys come from the FULL document's structure (table/row/cell index, checklist index),
//    so a slice and the whole sheet agree on keys, and a regenerated version starts cleanly.
//  • A pupil is shown only the shared parts plus their assigned level's section (🟢/🟡/🔴),
//    detected from headings. The slice is UNLABELLED — the level name/colour is never shown.
// Anything that isn't a table answer-cell or a checklist item renders read-only via the existing
// Markdown renderer, so all the usual formatting (headings, prose, images, callouts) still works.
import { esc } from './html';
import { renderMarkdown } from './markdown';

export type Level = 'support' | 'core' | 'challenge';
export type BlockLevel = Level | 'shared';

export interface WorksheetField {
  key: string;
  kind: 'text' | 'check';
  level: BlockLevel;
  label: string;
}

export interface WorksheetRender {
  html: string;
  fields: WorksheetField[];
  hasLevels: boolean;
}

export interface WorksheetOptions {
  mode: 'form' | 'review';
  level?: Level; // slice to this level (+ shared); omit ⇒ whole document
  values?: Map<string, string>;
  action?: string; // POST URL for autosave (the occurrence/resource/version context); form mode only
}

function saveUrl(action: string | undefined, key: string): string {
  const base = action ?? '/me/answer';
  return `${base}${base.includes('?') ? '&' : '?'}key=${encodeURIComponent(key)}`;
}

const HEADING = /^(#{1,6})\s+(.*)$/;
const TABLE_ROW = /^\s*\|(.+)\|\s*$/;
const TABLE_SEP = /^\s*\|?[\s:|-]+\|?\s*$/;
const TASK = /^\s*[-*]\s+\[( |x|X)\]\s+(.*)$/;
const PLACEHOLDER = /type\b[^|]*\bhere/i;

// GFM-aware cell split: a `|` only separates cells when it is NOT escaped (`\|`) and NOT inside an
// inline-code span (`...`). Without this, a cell like "What does `a|b` mean?" splits into phantom
// columns and corrupts the question/answer alignment and the stable field keys.
function cells(row: string): string[] {
  const inner = row.replace(/^\s*\|/, '').replace(/\|\s*$/, '');
  const out: string[] = [];
  let cur = '';
  let inCode = false;
  for (let i = 0; i < inner.length; i++) {
    const ch = inner[i]!;
    if (ch === '\\' && inner[i + 1] === '|') {
      cur += '|';
      i++;
      continue;
    }
    if (ch === '`') {
      inCode = !inCode;
      cur += ch;
      continue;
    }
    if (ch === '|' && !inCode) {
      out.push(cur.trim());
      cur = '';
      continue;
    }
    cur += ch;
  }
  out.push(cur.trim());
  return out;
}

function levelOf(headingText: string): Level | null {
  if (/🟢|\bsupport\b/i.test(headingText)) return 'support';
  if (/🟡|\bcore\b/i.test(headingText)) return 'core';
  if (/🔴|\bchallenge\b/i.test(headingText)) return 'challenge';
  return null;
}

interface Block {
  level: BlockLevel;
  kind: 'md' | 'table' | 'tasks';
  lines: string[];
  isLevelHeading?: boolean; // the "🟢 Support" heading itself — hidden in a sliced (pupil) view
}

/** Segment the document into blocks, each tagged with the differentiation level it belongs to. */
function segment(src: string): { blocks: Block[]; levelDepth: number } {
  const lines = (src ?? '').replace(/\r\n/g, '\n').split('\n');

  // Pre-scan (fence-aware): the heading depth at which level sections live (the shallowest level
  // heading). Skipping fences matters — a `# Challenge: ...` Python comment inside a code block
  // would otherwise be read as a depth-1 level heading and wreck the real `## ` partitioning.
  // A fence delimiter only opens a fence if a matching closing delimiter follows; a stray
  // (unclosed) ``` is treated as a literal line so it can't swallow the rest of the document
  // (which would blank out the level living after it). Balanced fences stay fully opaque.
  const FENCE = /^\s*(?:```|~~~)/;
  const opensFence = (idx: number): boolean => {
    for (let j = idx + 1; j < lines.length; j++) if (FENCE.test(lines[j]!)) return true;
    return false;
  };

  let levelDepth = 0;
  let scanFence = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (FENCE.test(line)) {
      if (scanFence) scanFence = false;
      else if (opensFence(i)) scanFence = true; // stray opener → ignore, keep scanning
      continue;
    }
    if (scanFence) continue;
    const h = line.match(HEADING);
    if (h && levelOf(h[2]!) != null) {
      const d = h[1]!.length;
      levelDepth = levelDepth === 0 ? d : Math.min(levelDepth, d);
    }
  }

  const blocks: Block[] = [];
  let current: BlockLevel = 'shared';
  let buf: string[] = [];
  const flush = (): void => {
    if (buf.length) blocks.push({ level: current, kind: 'md', lines: buf });
    buf = [];
  };

  let i = 0;
  let inFence = false;
  while (i < lines.length) {
    const line = lines[i]!;
    const h = line.match(HEADING);

    // Code fences are opaque: a worksheet's example code is full of `#` (Python comments) and
    // even `|` — none of which are structural. But only a fence that actually CLOSES is opaque;
    // a stray unclosed ``` is kept as a literal line (otherwise it would swallow the next level's
    // heading + table and blank that pupil's slice). Balanced fences stay fully opaque, even when
    // their comments contain a level word like "# Challenge:".
    if (FENCE.test(line)) {
      if (inFence) {
        inFence = false;
      } else if (opensFence(i)) {
        inFence = true;
      } else {
        buf.push(line);
        i++;
        continue;
      }
      buf.push(line);
      i++;
      continue;
    }
    if (inFence) {
      buf.push(line);
      i++;
      continue;
    }

    // A section transition happens ONLY at the exact depth the level headings live at — so a
    // document `# Title` or a stray `# code comment` outside a fence never resets the level.
    if (h && levelDepth > 0 && h[1]!.length === levelDepth) {
      flush();
      const lvl = levelOf(h[2]!);
      current = lvl ?? 'shared';
      blocks.push({ level: current, kind: 'md', lines: [line], isLevelHeading: lvl != null });
      i++;
      continue;
    }

    if (TASK.test(line)) {
      flush();
      const block: Block = { level: current, kind: 'tasks', lines: [] };
      while (i < lines.length && TASK.test(lines[i]!)) {
        block.lines.push(lines[i]!);
        i++;
      }
      blocks.push(block);
      continue;
    }

    // A table is a run of ≥2 pipe rows (the 2nd may be a `|---|` separator, or — when the model
    // omits it — another data row). Recognising separator-less tables stops an answer table
    // silently degrading to literal-pipe prose with no input boxes.
    if (TABLE_ROW.test(line) && i + 1 < lines.length && (TABLE_SEP.test(lines[i + 1]!) || TABLE_ROW.test(lines[i + 1]!))) {
      flush();
      const block: Block = { level: current, kind: 'table', lines: [] };
      while (i < lines.length && TABLE_ROW.test(lines[i]!)) {
        block.lines.push(lines[i]!);
        i++;
      }
      blocks.push(block);
      continue;
    }

    buf.push(line);
    i++;
  }
  flush();
  return { blocks, levelDepth };
}

function textControl(key: string, label: string, placeholder: string, opts: WorksheetOptions): string {
  const value = opts.values?.get(key) ?? '';
  if (opts.mode === 'review') {
    return value.trim() !== ''
      ? `<div class="ws-answer">${esc(value)}</div>`
      : `<div class="ws-answer ws-empty">—</div>`;
  }
  return `<textarea class="ws-input" name="value" rows="2" placeholder="${esc(placeholder || 'Type your answer here')}"
    hx-post="${esc(saveUrl(opts.action, key))}" hx-trigger="input changed delay:600ms, blur" hx-swap="none"
    aria-label="${esc(label || 'answer')}">${esc(value)}</textarea>`;
}

function checkControl(key: string, label: string, opts: WorksheetOptions): string {
  const checked = (opts.values?.get(key) ?? '') === 'x';
  if (opts.mode === 'review') {
    return `<li class="md-task"><input type="checkbox" disabled${checked ? ' checked' : ''}> ${esc(label)}</li>`;
  }
  return `<li class="md-task ws-check"><label><input type="checkbox" name="value" value="x"${checked ? ' checked' : ''}
    hx-post="${esc(saveUrl(opts.action, key))}" hx-trigger="change" hx-swap="none"> ${esc(label)}</label></li>`;
}

const SEP_CELL = /^:?-+:?$/; // one-or-more dashes — matches TABLE_SEP's detection so a single-dash separator row is stripped, not turned into a fillable row
const isSepRow = (row: string[]): boolean => row.length > 0 && row.every((c) => c === '' || SEP_CELL.test(c));

/** Render a table block: answer cells become inputs, everything else stays a read-only table.
 * Two real layouts from the generator:
 *  B (Q&A): header names a "Type your answer here" COLUMN, body answer cells are empty.
 *  A (name/date): a label|value table whose placeholder text sits in the cells themselves.
 * They're told apart by whether the answer column has empty body cells (Q&A) or not (name/date). */
function renderTable(block: Block, tableIdx: number, opts: WorksheetOptions, fields: WorksheetField[]): string {
  const rows = block.lines.map(cells);
  const header = rows[0] ?? [];
  const bodyRows = rows.slice(1).filter((r) => !isSepRow(r));
  const answerCol = header.map((c) => PLACEHOLDER.test(c));
  const anyBodyPlaceholder = bodyRows.some((r) => r.some((c) => PLACEHOLDER.test(c)));
  const isAnswerTable = answerCol.some(Boolean) || anyBodyPlaceholder;

  if (!isAnswerTable) {
    // Not an answer table → render verbatim via the Markdown renderer (read-only).
    return renderMarkdown(block.lines.join('\n'));
  }

  // Layout A (treat the header as a data row too) only when the placeholder is in the header AND
  // the answer column has no empty body cells to fill — i.e. it's a label/value sheet, not Q&A.
  const headerHasPlaceholder = header.some((c) => PLACEHOLDER.test(c));
  const answerColHasEmptyBody = answerCol.some((isA, c) => isA && bodyRows.some((r) => (r[c] ?? '').trim() === ''));
  const headerIsData = headerHasPlaceholder && !answerColHasEmptyBody;

  const inputRows = headerIsData ? [header, ...bodyRows] : bodyRows;
  const theadCells = headerIsData ? null : header;

  const out: string[] = ['<table class="ws-table">'];
  if (theadCells) out.push(`<thead><tr>${theadCells.map((c) => `<th>${esc(c)}</th>`).join('')}</tr></thead>`);
  out.push('<tbody>');
  inputRows.forEach((row, r) => {
    const rowNo = r + 1;
    const tds = row.map((cell, c) => {
      const colNo = c + 1;
      const isInput = answerCol[c] || PLACEHOLDER.test(cell);
      if (!isInput) return `<td>${esc(cell)}</td>`;
      const key = `t${tableIdx}.r${rowNo}.c${colNo}`;
      const label = row.find((x, idx) => idx !== c && !PLACEHOLDER.test(x)) ?? (theadCells?.[c] ?? '');
      fields.push({ key, kind: 'text', level: block.level, label });
      return `<td class="ws-answer-cell">${textControl(key, label, PLACEHOLDER.test(cell) ? cell : '', opts)}</td>`;
    });
    out.push(`<tr>${tds.join('')}</tr>`);
  });
  out.push('</tbody></table>');
  return out.join('');
}

function renderTasks(block: Block, startIdx: number, opts: WorksheetOptions, fields: WorksheetField[]): { html: string; next: number } {
  let idx = startIdx;
  const items = block.lines.map((line) => {
    const m = line.match(TASK)!;
    idx += 1;
    const key = `task.${idx}`;
    const label = m[2]!.trim();
    fields.push({ key, kind: 'check', level: block.level, label });
    return checkControl(key, label, opts);
  });
  return { html: `<ul class="ws-checklist">${items.join('')}</ul>`, next: idx };
}

/**
 * Render a worksheet. Field keys are assigned over the WHOLE document (stable across slices);
 * only blocks in the requested level (+ shared) are emitted, and `fields` lists exactly the
 * fields that were emitted — so completion counts match what the pupil actually saw.
 */
export function renderWorksheet(src: string, opts: WorksheetOptions): WorksheetRender {
  const { blocks, levelDepth } = segment(src);
  const include = opts.level ? new Set<BlockLevel>(['shared', opts.level]) : null;
  const fields: WorksheetField[] = [];
  const out: string[] = [];
  let tableIdx = 0;
  let taskIdx = 0;

  for (const block of blocks) {
    const shown = include === null || include.has(block.level);
    if (block.kind === 'table') {
      tableIdx += 1;
      const collected: WorksheetField[] = [];
      const html = renderTable(block, tableIdx, opts, collected);
      if (shown) {
        fields.push(...collected);
        out.push(html);
      }
    } else if (block.kind === 'tasks') {
      const collected: WorksheetField[] = [];
      const { html, next } = renderTasks(block, taskIdx, opts, collected);
      taskIdx = next;
      if (shown) {
        fields.push(...collected);
        out.push(html);
      }
    } else if (shown) {
      // In a sliced (pupil) view the level's own heading is hidden — the slice is unlabelled.
      if (block.isLevelHeading && include !== null) continue;
      out.push(renderMarkdown(block.lines.join('\n')));
    }
  }

  return { html: out.join('\n'), fields, hasLevels: levelDepth > 0 };
}
