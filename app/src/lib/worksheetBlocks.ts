// Phase 3 (worksheets v2) — the block model behind the WYSIWYG editor. A worksheet is stored as
// Markdown (so auto-marking, which derives field keys from that Markdown, is unaffected); the editor
// works on a list of typed BLOCKS. `parseBlocks` turns Markdown into blocks; `serialiseBlocks` turns
// blocks back into Markdown. The contract that MUST hold: serialiseBlocks(parseBlocks(md)) yields
// Markdown whose `renderWorksheet().fields` are identical to the original's (same keys + kinds) — the
// round-trip test in tests/worksheetBlocks.test.ts is the oracle. Anything not cleanly modelled is
// kept verbatim in a `raw`/`rawtable` block, so the round-trip is lossless even when parsing is coarse.
import * as z from 'zod/v4';

// A Q&A table row: a typed answer, a screenshot paste, a single-/multi-choice pick, or a 1–N slider.
// `options` is present on choice/multichoice rows; `scale` only on scale rows — so the editor can edit
// them and serialise round-trips the cell exactly (the round-trip oracle guards drift vs worksheetForm).
export interface QRow {
  q: string;
  kind: 'text' | 'screenshot' | 'choice' | 'multichoice' | 'scale';
  options?: string[];
  scale?: { min: number; max: number; minLabel?: string; maxLabel?: string };
  // The teacher's correct/model answer (choice → one option; multichoice → the correct set). Editor-only:
  // it is NEVER serialised into the pupil worksheet Markdown — it's written to the mark scheme on save.
  answer?: string | string[];
}

export type Block =
  | { type: 'heading'; depth: number; text: string }
  | { type: 'text'; text: string } // prose / numbered steps — instructions, etc. (verbatim run)
  | { type: 'qtable'; rows: QRow[] } // a clean Q&A answer table (typed / screenshot / multiple-choice)
  | { type: 'rawtable'; md: string } // any other table (name/date, reference, ragged) — verbatim
  | { type: 'checklist'; items: string[] } // - [ ] success criteria
  | { type: 'note'; text: string } // > callout / key idea
  | { type: 'image'; alt: string; url: string } // ![alt](url)
  | { type: 'placeholder'; desc: string } // > 🖼️ [show: ...] — an image to add
  | { type: 'raw'; md: string }; // fenced code or anything else — verbatim

export const blockSchema: z.ZodType<Block> = z.union([
  z.object({ type: z.literal('heading'), depth: z.number().int().min(1).max(6), text: z.string() }),
  z.object({ type: z.literal('text'), text: z.string() }),
  z.object({
    type: z.literal('qtable'),
    rows: z.array(
      z.object({
        q: z.string(),
        kind: z.enum(['text', 'screenshot', 'choice', 'multichoice', 'scale']),
        options: z.array(z.string()).optional(),
        scale: z.object({ min: z.number(), max: z.number(), minLabel: z.string().optional(), maxLabel: z.string().optional() }).optional(),
        answer: z.union([z.string(), z.array(z.string())]).optional(),
      }),
    ),
  }),
  z.object({ type: z.literal('rawtable'), md: z.string() }),
  z.object({ type: z.literal('checklist'), items: z.array(z.string()) }),
  z.object({ type: z.literal('note'), text: z.string() }),
  z.object({ type: z.literal('image'), alt: z.string(), url: z.string() }),
  z.object({ type: z.literal('placeholder'), desc: z.string() }),
  z.object({ type: z.literal('raw'), md: z.string() }),
]);
export const blocksSchema = z.array(blockSchema);

const HEADING = /^(#{1,6})\s+(.*)$/;
const TABLE_ROW = /^\s*\|(.+)\|\s*$/;
const TABLE_SEP = /^\s*\|?[\s:|-]+\|?\s*$/;
const TASK = /^\s*[-*]\s+\[( |x|X)\]\s+(.*)$/;
const QUOTE = /^>\s?(.*)$/;
const FENCE = /^\s*(?:```|~~~)/;
const IMAGE_ONLY = /^!\[([^\]]*)\]\(([^)\s]+)\)\s*$/;
const SHOW = /\[show:\s*([^\]]+)\]/i;
const SCREENSHOT = /📷|🖼|\bpaste\b[^|]*\b(?:screenshot|image|picture|photo|work)\b|\b(?:screenshot|image|photo)\b[^|]*\bhere\b/i;
const PROMPT = /^\s*(?:type|write|paste|draw|sketch|enter|fill)\b|\b(?:your|my)\s+answers?\b|\banswer\s*(?:here|below)\b/i;
// A multiple-choice answer cell — kept in sync with worksheetForm.ts (the round-trip oracle guards drift).
const CHOICE_MARK = /\(\s*\)/g;
const isChoiceCell = (s: string): boolean => (s.match(CHOICE_MARK) ?? []).length >= 2;
const choiceOptions = (s: string): string[] => s.split(/\(\s*\)/).map((o) => o.trim()).filter((o) => o !== '');
// Multi-select cell "[  ] a [  ] b" and slider cell "[scale 1-5: low … high]" — kept in sync with
// worksheetForm.ts (the round-trip oracle guards drift).
const MULTI_MARK = /(?<!\[)\[\s*\](?!\])/g;
const isMultiCell = (s: string): boolean => (s.match(MULTI_MARK) ?? []).length >= 2;
const multiOptions = (s: string): string[] => s.split(MULTI_MARK).map((o) => o.trim()).filter((o) => o !== '');
const SCALE_RE = /^\[scale\s+(-?\d+)\s*[-–—]\s*(-?\d+)\s*(?::\s*(.+?))?\]$/i;
const isScaleCell = (s: string): boolean => SCALE_RE.test(s.trim());
function parseScaleCell(s: string): { min: number; max: number; minLabel?: string; maxLabel?: string } | null {
  const m = s.trim().match(SCALE_RE);
  if (!m) return null;
  const min = Number(m[1]);
  const max = Number(m[2]);
  if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) return null;
  let minLabel: string | undefined;
  let maxLabel: string | undefined;
  if (m[3]) {
    const parts = m[3].split(/\s*(?:…|\.{2,})\s*/).map((p) => p.trim()).filter(Boolean);
    minLabel = parts[0];
    maxLabel = parts.length > 1 ? parts[parts.length - 1] : undefined;
  }
  return { min, max, minLabel, maxLabel };
}

const splitCells = (row: string): string[] => row.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|').map((c) => c.trim());

/** A table is a clean Q&A answer table iff: 2 columns, a header naming the answer column LAST (or
 * body answer cells), ≥1 body row, and the answer column's body cells are empty / a placeholder /
 * a screenshot prompt. Then each body row becomes a {q, kind}. Otherwise null (keep it verbatim). */
function asQTable(tableLines: string[]): QRow[] | null {
  const rows = tableLines.map(splitCells);
  if (rows.length < 2) return null;
  const header = rows[0]!;
  if (header.length !== 2) return null;
  const body = rows.slice(1).filter((r) => !r.every((c) => c === '' || /^:?-+:?$/.test(c)));
  if (body.length === 0) return null;
  const headerAnswerLast = PROMPT.test(header[1]!) || SCREENSHOT.test(header[1]!);
  // Every body row must be "question | answer cell" with a NON-EMPTY question and an answer cell that
  // is EMPTY (pupil types here), a screenshot prompt, or a multiple-choice list ("( ) a ( ) b"). A cell
  // pre-filled with a "type … here" placeholder is the name/date layout-A shape (header-as-data) — NOT
  // a Q&A table — so it must NOT be captured here (that would drop the header row + change the field
  // keys); it stays a verbatim rawtable.
  const marked = (a: string): boolean => SCREENSHOT.test(a) || isChoiceCell(a) || isMultiCell(a) || isScaleCell(a);
  const okRows = body.every((r) => {
    const q = (r[0] ?? '').trim();
    const a = (r[1] ?? '').trim();
    return q !== '' && (a === '' || marked(a));
  });
  // A screenshot/choice/multi/scale answer column is self-identifying, so it qualifies even when the header
  // isn't the canonical "type your answer here" — but an all-empty (typed) column still needs that header so
  // a 2-col reference table isn't mistaken for Q&A.
  const bodyMarked = body.every((r) => marked(r[1] ?? ''));
  if (!(headerAnswerLast || bodyMarked) || !okRows) return null;
  return body.map((r): QRow => {
    const a = (r[1] ?? '').trim();
    const q = r[0]!.trim();
    if (isChoiceCell(a)) return { q, kind: 'choice', options: choiceOptions(a) };
    if (isMultiCell(a)) return { q, kind: 'multichoice', options: multiOptions(a) };
    const sc = isScaleCell(a) ? parseScaleCell(a) : null;
    if (sc) return { q, kind: 'scale', scale: sc };
    return { q, kind: SCREENSHOT.test(a) ? 'screenshot' : 'text' };
  });
}

/** Markdown → blocks. Fence-aware; unmodellable content falls back to verbatim `raw`/`rawtable`. */
export function parseBlocks(src: string): Block[] {
  const lines = (src ?? '').replace(/\r\n/g, '\n').split('\n');
  const opensFence = (idx: number): boolean => {
    for (let j = idx + 1; j < lines.length; j++) if (FENCE.test(lines[j]!)) return true;
    return false;
  };
  const blocks: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i]!;
    if (line.trim() === '') {
      i++;
      continue;
    }
    // Fenced code (or anything fenced) → verbatim raw block (only when it actually closes).
    if (FENCE.test(line) && opensFence(i)) {
      const buf = [line];
      i++;
      while (i < lines.length && !FENCE.test(lines[i]!)) buf.push(lines[i++]!);
      if (i < lines.length) buf.push(lines[i++]!); // closing fence
      blocks.push({ type: 'raw', md: buf.join('\n') });
      continue;
    }
    const h = line.match(HEADING);
    if (h) {
      blocks.push({ type: 'heading', depth: h[1]!.length, text: h[2]!.trim() });
      i++;
      continue;
    }
    const img = line.match(IMAGE_ONLY);
    if (img) {
      blocks.push({ type: 'image', alt: img[1]!, url: img[2]! });
      i++;
      continue;
    }
    if (QUOTE.test(line)) {
      const buf: string[] = [];
      while (i < lines.length && QUOTE.test(lines[i]!)) buf.push(lines[i++]!.match(QUOTE)![1]!);
      const text = buf.join('\n');
      const show = text.match(SHOW);
      if (show) blocks.push({ type: 'placeholder', desc: show[1]!.trim() });
      else blocks.push({ type: 'note', text: text.trim() });
      continue;
    }
    if (TASK.test(line)) {
      const items: string[] = [];
      while (i < lines.length && TASK.test(lines[i]!)) items.push(lines[i++]!.match(TASK)![2]!.trim());
      blocks.push({ type: 'checklist', items });
      continue;
    }
    if (TABLE_ROW.test(line) && i + 1 < lines.length && (TABLE_SEP.test(lines[i + 1]!) || TABLE_ROW.test(lines[i + 1]!))) {
      const buf: string[] = [];
      while (i < lines.length && TABLE_ROW.test(lines[i]!)) buf.push(lines[i++]!);
      const q = asQTable(buf);
      blocks.push(q ? { type: 'qtable', rows: q } : { type: 'rawtable', md: buf.join('\n') });
      continue;
    }
    // a prose run: consecutive plain lines (instructions, paragraphs, plain/numbered lists)
    const buf = [line];
    i++;
    while (
      i < lines.length &&
      lines[i]!.trim() !== '' &&
      !HEADING.test(lines[i]!) &&
      !QUOTE.test(lines[i]!) &&
      !TASK.test(lines[i]!) &&
      !FENCE.test(lines[i]!) &&
      !IMAGE_ONLY.test(lines[i]!) &&
      !TABLE_ROW.test(lines[i]!)
    ) {
      buf.push(lines[i++]!);
    }
    blocks.push({ type: 'text', text: buf.join('\n').trim() });
  }
  return blocks;
}

/** Blocks → Markdown. Q&A tables are emitted in the canonical "question | Type your answer here"
 * shape (answer in the last column) so renderTable keys them identically (t{n}.r{1..}.c2). */
export function serialiseBlocks(blocks: Block[]): string {
  const parts: string[] = [];
  for (const b of blocks) {
    switch (b.type) {
      case 'heading':
        parts.push(`${'#'.repeat(b.depth)} ${b.text}`);
        break;
      case 'text':
        parts.push(b.text);
        break;
      case 'note':
        parts.push(
          b.text
            .split('\n')
            .map((l) => `> ${l}`)
            .join('\n'),
        );
        break;
      case 'placeholder':
        parts.push(`> 🖼️ [show: ${b.desc}]`);
        break;
      case 'image':
        parts.push(`![${b.alt}](${b.url})`);
        break;
      case 'checklist':
        parts.push(b.items.map((it) => `- [ ] ${it}`).join('\n'));
        break;
      case 'qtable': {
        const answerCell = (r: QRow): string => {
          if (r.kind === 'screenshot') return '📷 Paste a screenshot here';
          if (r.kind === 'choice') return (r.options ?? []).map((o) => `( ) ${o}`).join(' ');
          if (r.kind === 'multichoice') return (r.options ?? []).map((o) => `[ ] ${o}`).join(' ');
          if (r.kind === 'scale' && r.scale) {
            const { min, max, minLabel, maxLabel } = r.scale;
            const lbl = minLabel || maxLabel ? `: ${minLabel ?? ''} … ${maxLabel ?? ''}` : '';
            return `[scale ${min}-${max}${lbl}]`;
          }
          return '';
        };
        parts.push(['| Question | Type your answer here |', '|---|---|', ...b.rows.map((r) => `| ${r.q} | ${answerCell(r)} |`)].join('\n'));
        break;
      }
      case 'rawtable':
      case 'raw':
        parts.push(b.md);
        break;
    }
  }
  return parts.join('\n\n') + '\n';
}
