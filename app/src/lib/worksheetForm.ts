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
  kind: 'text' | 'check' | 'image' | 'choice' | 'multichoice' | 'blank' | 'code' | 'parsons' | 'order' | 'sort' | 'label' | 'scale' | 'trace';
  level: BlockLevel;
  label: string;
  options?: string[]; // choice/multichoice/sort/label fields — the selectable options/categories/labels, in source order
  // Parson's (`parsons`) / sequence (`order`) only: the lines/steps in their CORRECT order. Used to mark the
  // ordering and show the model answer — never emitted into the form-mode HTML (it must not reveal the order).
  solution?: string[];
  // Slider (`scale`) only: the numeric range + optional end labels for the range input.
  scale?: { min: number; max: number; minLabel?: string; maxLabel?: string };
}

export interface WorksheetRender {
  html: string;
  fields: WorksheetField[];
  hasLevels: boolean;
}

export interface WorksheetOptions {
  // 'form' = the live pupil sheet (autosaving inputs); 'review' = read-only with saved values;
  // 'preview' = the teacher sees EXACTLY what a pupil at this level gets — the empty answer boxes,
  // images and all — but inert (disabled, no autosave).
  mode: 'form' | 'review' | 'preview';
  level?: Level; // slice to this level (+ shared); omit ⇒ whole document
  values?: Map<string, string>;
  action?: string; // POST URL for autosave (the occurrence/resource/version context); form mode only
  // Online the pupil's name and the date are known — auto-fill those header cells read-only instead
  // of asking the pupil to type them. Applies in form/preview only.
  autofill?: { name?: string; date?: string };
  // 'preview' is normally inert. With `interactive`, the DRAG widgets (card-sort, matching, Parsons,
  // order, label) render draggable so a teacher can TRY them in a preview — but NO save URL is emitted,
  // so nothing is persisted (pupil.js places/moves the DOM, then skips the save). Bug #1.
  interactive?: boolean;
  // Multiple worksheets per lesson: a per-worksheet prefix prepended to every field key so two sheets
  // bound to the same lesson never collide on a shared key (e.g. both starting at `t1.r1.c2`). The
  // first/only worksheet uses '' (unprefixed) so all existing answers, schemes and marks are untouched.
  keyPrefix?: string;
}

function saveUrl(action: string | undefined, key: string): string {
  const base = action ?? '/me/answer';
  return `${base}${base.includes('?') ? '&' : '?'}key=${encodeURIComponent(key)}`;
}

const HEADING = /^(#{1,6})\s+(.*)$/;
const TABLE_ROW = /^\s*\|(.+)\|\s*$/;
const TABLE_SEP = /^\s*\|?[\s:|-]+\|?\s*$/;
const TASK = /^\s*[-*]\s+\[( |x|X)\]\s+(.*)$/;
// NARROW — the original "type … here" form. Kept ONLY to decide the header-as-data flip (below),
// so a column-label header like "My answer" doesn't get mistaken for the name/date layout.
const PLACEHOLDER = /type\b[^|]*\bhere/i;
// BROAD — a header cell that NAMES an answer column. Real generated worksheets prompt with far more
// than "type … here": "Type the item at that position", "Paste here", "Write your answer", "My
// answer …". Driving answer-column detection off this (not the narrow form) is what stops whole
// answer tables silently degrading to read-only prose with no input boxes.
const PROMPT = /^\s*(?:type|write|paste|draw|sketch|enter|fill)\b|\b(?:your|my)\s+answers?\b|\banswer\s*(?:here|below)\b/i;
// A body cell that is ITSELF a fill-in placeholder ("Type here", "Paste here", "Type your answer
// here"). Deliberately stricter than PROMPT — it must end in a placeholder noun — so a question that
// merely starts with a verb ("Write a sentence about loops") is NOT mistaken for an empty answer box
// and overwritten with an input.
const PLACEHOLDER_CELL = /^\s*(?:type|write|paste|draw|sketch|enter)\b.{0,20}\b(?:here|answer|answers|name|date|below|response|box)\b[\s.)]*$|^\s*(?:your|my)\s+answers?\b/i;
// A SCREENSHOT-paste answer cell: the pupil pastes/drops an image of their work rather than typing.
// Paste-specific so a question that merely mentions "a screenshot" stays a normal text answer.
const SCREENSHOT = /📷|🖼|\bpaste\b[^|]*\b(?:screenshot|image|picture|photo|work)\b|\b(?:screenshot|image|photo)\b[^|]*\bhere\b/i;
// A MULTIPLE-CHOICE / true-false answer cell: ≥2 radio markers "( )" each preceding an option, e.g.
// "( ) RAM ( ) CPU ( ) SSD" or "( ) True ( ) False". An empty "( )" (or "()") is the marker; an
// option may itself contain non-empty parens like "(CPU)" without being mistaken for a marker.
const CHOICE_MARK = /\(\s*\)/g;
function isChoiceCell(s: string): boolean {
  return (s.match(CHOICE_MARK) ?? []).length >= 2;
}
// A MULTIPLE-SELECT ("tick all that apply") answer cell: ≥2 square markers "[ ]" each preceding an option,
// e.g. "[ ] buttons [ ] light sensor [ ] the screen". The pupil ticks SEVERAL (checkboxes), unlike a
// single-radio choice. The marker is a lone "[ ]" (NOT the "[[ ]]" fill-in-blank, nor a "- [ ]" checklist
// item, which is a list line, not a table cell).
const MULTI_MARK = /(?<!\[)\[\s*\](?!\])/g;
function isMultiCell(s: string): boolean {
  return (s.match(MULTI_MARK) ?? []).length >= 2;
}
/** Split a multi-select cell into its options (the text after each "[ ]" marker), in source order. */
function multiOptions(s: string): string[] {
  return s.split(MULTI_MARK).map((o) => o.trim()).filter((o) => o !== '');
}
// A CODE-WRITING answer cell: the pupil types code, so the box is monospaced and roomier. The cell (or
// its column header) names code, e.g. "Type your code here", "Write your program here". Pedagogy P11
// (Use–Modify–Create) — the "Modify"/"Make" answer where pupils write or change code.
const CODE_CELL = /\b(?:code|program|programme|script|pseudocode|algorithm)\b/i;
// A TRACE-table answer cell: `??expected??` renders as an empty input the pupil fills, self-marked
// against `expected` (the value never reaches form/preview HTML — only the mark modal). Used in trace
// tables (line | var… | output) and truth tables, where each cell has one known correct value. §2.7.
const TRACE_CELL = /^\s*\?\?(.+?)\?\?\s*$/;
/** Split a choice cell into its options (the text after each "( )" marker), in source order. */
function choiceOptions(s: string): string[] {
  return s.split(/\(\s*\)/).map((o) => o.trim()).filter((o) => o !== '');
}
// A SLIDER / RATING-SCALE answer cell: "[scale 1-5]" or "[scale 1-5: not sure … very confident]" — a range
// input storing the chosen NUMBER. Distinct from choice/multi/blank (it has content between single brackets,
// not an empty "[ ]"). Default uncredited self-assessment (a plenary "how confident are you?").
const SCALE_RE = /^\[scale\s+(-?\d+)\s*[-–—]\s*(-?\d+)\s*(?::\s*(.+?))?\]$/i;
function isScaleCell(s: string): boolean {
  return SCALE_RE.test(s.trim());
}
function parseScale(s: string): { min: number; max: number; minLabel?: string; maxLabel?: string } | null {
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

// A FILL-IN-THE-BLANK marker inside instruction prose ("The CPU does [[ ]]."): each "[[ ]]" becomes an
// inline input keyed blank.{n} — a global counter across the document, like task.{n}, so keys are
// stable in full vs sliced renders. The answer lives in the answers doc (the worksheet stays blank).
function countBlanks(s: string): number {
  return (s.match(/\[\[\s*\]\]/g) ?? []).length;
}
/** For each blank in order, the sentence with THIS gap marked [BLANK] and the others as ____ — context
 * the AI scheme-deriver uses to set each blank.{n}'s expected word. */
function blankLabels(text: string): string[] {
  const n = countBlanks(text);
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    let k = -1;
    out.push(
      text
        .replace(/\[\[\s*\]\]/g, () => (++k === i ? '[BLANK]' : '____'))
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 200),
    );
  }
  return out;
}

/** Image-gap placeholders the generator leaves where a visual is needed but none was sourced
 * (`> 🖼️ [show: a binary-to-denary diagram]`). Returns the descriptions — the teacher's "add an
 * image before the lesson" to-do list; dropping an image in the editor removes the marker. */
export function findImagePlaceholders(src: string): string[] {
  const out: string[] = [];
  const re = /\[show:\s*([^\]]+)\]/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src ?? '')) !== null) out.push(m[1]!.trim());
  return out;
}

/** A stored pupil screenshot is recorded as `img:<relpath>`; turn it into a same-origin serve URL. */
function imgServeUrl(value: string): string | null {
  return value.startsWith('img:') ? `/pupil-image?p=${encodeURIComponent(value.slice(4))}` : null;
}

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

/** The Markdown for ONE level's pupil sheet (shared content + that level's section, level heading
 * dropped — the slice is unlabelled, exactly what the pupil gets). For per-level print / Word export. */
export function sliceWorksheetMarkdown(src: string, level: Level): string {
  const { blocks } = segment(src);
  const out: string[] = [];
  for (const b of blocks) {
    if (b.level !== 'shared' && b.level !== level) continue;
    if (b.isLevelHeading) continue;
    out.push(b.lines.join('\n'));
  }
  return out.join('\n\n').trim() + '\n';
}

// `compact` ⇒ a single-line input instead of a 2-row textarea — used for the cells of a trace table /
// truth table / wide grid (B5.2c), where many small answers read far better as a tidy row of boxes.
// Keys, autosave wiring and the "saved ✓" span are identical, so marking is unaffected.
function textControl(key: string, label: string, placeholder: string, opts: WorksheetOptions, compact = false): string {
  const value = opts.values?.get(key) ?? '';
  if (opts.mode === 'review') {
    return value.trim() !== ''
      ? `<div class="ws-answer">${esc(value)}</div>`
      : `<div class="ws-answer ws-empty">—</div>`;
  }
  const cls = compact ? 'ws-input ws-input-cell' : 'ws-input';
  const ph = esc(placeholder || (compact ? 'Type here' : 'Type your answer here'));
  const al = esc(label || 'answer');
  if (opts.mode === 'preview') {
    // The pupil's box, shown empty and disabled — the teacher sees the answer space, can't type in it.
    return compact
      ? `<input class="${cls}" type="text" placeholder="${ph}" disabled aria-label="${al}">`
      : `<textarea class="${cls}" rows="2" placeholder="${ph}" disabled aria-label="${al}"></textarea>`;
  }
  // A per-field "saved ✓" reassurance (updated by an OOB swap from /me/answer) — anxious pupils
  // need to see their typing was kept.
  const saved = `<span class="ws-saved" id="ws-sv-${esc(key)}" aria-live="polite"></span>`;
  const field = compact
    ? `<input class="${cls}" type="text" name="value" autocomplete="off" value="${esc(value)}" placeholder="${ph}"
        hx-post="${esc(saveUrl(opts.action, key))}" hx-trigger="input changed delay:600ms, blur" hx-swap="none" aria-label="${al}">`
    : `<textarea class="${cls}" name="value" rows="2" placeholder="${ph}"
        hx-post="${esc(saveUrl(opts.action, key))}" hx-trigger="input changed delay:600ms, blur" hx-swap="none"
        aria-label="${al}">${esc(value)}</textarea>`;
  return `${field}${saved}`;
}

/** A CODE-WRITING answer: a monospaced, roomier textarea so pupils can write/modify code (P11). Same
 * autosave wiring + keys as a typed answer, so marking treats it as open text. Review shows the code
 * in a <pre> so indentation survives. */
function codeControl(key: string, label: string, opts: WorksheetOptions): string {
  const value = opts.values?.get(key) ?? '';
  if (opts.mode === 'review') {
    return value.trim() !== ''
      ? `<pre class="ws-answer ws-code-answer">${esc(value)}</pre>`
      : `<div class="ws-answer ws-empty">—</div>`;
  }
  const al = esc(label || 'your code');
  if (opts.mode === 'preview') {
    return `<textarea class="ws-input ws-code-input" rows="4" placeholder="Type your code here" disabled aria-label="${al}" spellcheck="false"></textarea>`;
  }
  const saved = `<span class="ws-saved" id="ws-sv-${esc(key)}" aria-live="polite"></span>`;
  return `<textarea class="ws-input ws-code-input" name="value" rows="4" placeholder="Type your code here" spellcheck="false" autocapitalize="off" autocomplete="off"
    hx-post="${esc(saveUrl(opts.action, key))}" hx-trigger="input changed delay:600ms, blur" hx-swap="none" aria-label="${al}">${esc(value)}</textarea>${saved}`;
}

/** The OOB "saved ✓" span /me/answer returns so the field that just saved confirms instantly. */
export function savedTick(key: string): string {
  return `<span class="ws-saved show" id="ws-sv-${esc(key)}" aria-live="polite" hx-swap-oob="true">saved ✓</span>`;
}

/** A4: strip light Markdown so a read-aloud button speaks clean words, not symbols. */
function speakText(raw: string): string {
  return (raw ?? '')
    .replace(/\[\[\s*\]\]/g, ' blank ') // a fill-in gap reads as "blank"
    .replace(/[#>*_`|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** A4: an inline 🔊 that reads THIS question/instruction aloud in one tap — no global mode to switch
 * on first (pupil.js handles `.ws-speak` whether or not tap-anywhere read-aloud is enabled). Form
 * mode only (pupils); empty text ⇒ no button. */
function speakBtn(raw: string): string {
  const t = speakText(raw);
  if (!t) return '';
  return `<button type="button" class="ws-speak" aria-label="Read this aloud" title="Read aloud" data-speak-text="${esc(t)}">🔊</button>`;
}

function checkControl(key: string, label: string, opts: WorksheetOptions): string {
  const checked = (opts.values?.get(key) ?? '') === 'x';
  if (opts.mode !== 'form') {
    // review (saved state) or preview (always empty) — a disabled, non-saving checkbox.
    return `<li class="md-task"><input type="checkbox" disabled${checked ? ' checked' : ''}> ${esc(label)}</li>`;
  }
  return `<li class="md-task ws-check"><label><input type="checkbox" name="value" value="x"${checked ? ' checked' : ''}
    hx-post="${esc(saveUrl(opts.action, key))}" hx-trigger="change" hx-swap="none"> ${esc(label)}</label><span class="ws-saved" id="ws-sv-${esc(key)}" aria-live="polite"></span></li>`;
}

/** A screenshot-paste answer: the pupil pastes/drops an image; it's stored and shown back. Never
 * auto-marked (the teacher reviews it). pupil.js wires the paste/drop on `.ws-paste`. */
function imageControl(key: string, label: string, opts: WorksheetOptions): string {
  const value = opts.values?.get(key) ?? '';
  const src = imgServeUrl(value);
  const prompt = label.trim() || 'Paste or drop a screenshot of your work';
  if (opts.mode === 'review') {
    return src
      ? `<div class="ws-answer ws-shot-wrap"><img class="ws-shot" src="${src}" alt="${esc(label || 'screenshot')}" loading="lazy"></div>`
      : `<div class="ws-answer ws-empty">— (no screenshot yet)</div>`;
  }
  if (opts.mode === 'preview') {
    return `<div class="ws-paste ws-paste-preview" aria-hidden="true"><span class="ws-paste-prompt">📷 ${esc(prompt)}</span></div>`;
  }
  // form: a focusable paste/drop zone; pupil.js posts the image to data-paste-url and swaps the shot in.
  const postUrl = saveUrl((opts.action ?? '/me/answer').replace('/me/answer', '/me/answer-image'), key);
  const shot = src ? `<img class="ws-shot" src="${src}" alt="${esc(label || 'your screenshot')}" loading="lazy">` : '';
  return `<div class="ws-paste${src ? ' has-shot' : ''}" data-paste-key="${esc(key)}" data-paste-url="${esc(postUrl)}" tabindex="0" role="button" aria-label="${esc(prompt)}">
    <span class="ws-paste-prompt">📷 ${esc(prompt)} <span class="muted">(Ctrl/⌘+V, or drop a file)</span></span>
    <button type="button" class="ws-paste-help" data-paste-help>❓ how to paste?</button>
    <div class="ws-paste-shot">${shot}</div>
    <span class="ws-saved" id="ws-sv-${esc(key)}" aria-live="polite"></span>
  </div>`;
}

/** A multiple-choice / true-false answer: the pupil picks ONE option (radio). The saved value is the
 * chosen option's TEXT (so marking compares it directly against the scheme's `choice` expected). Each
 * question is its own <form>/<fieldset> so the radio group is scoped and an accessible group name is
 * announced; in form mode a change autosaves via the same /me/answer endpoint as a typed answer. */
function choiceControl(key: string, label: string, options: string[], opts: WorksheetOptions): string {
  const value = (opts.values?.get(key) ?? '').trim();
  const isChosen = (o: string): boolean => o.trim().toLowerCase() === value.toLowerCase() && value !== '';
  if (opts.mode === 'review') {
    if (value === '') return `<div class="ws-answer ws-empty">—</div>`;
    const items = options
      .map((o) => `<li class="ws-choice-opt${isChosen(o) ? ' chosen' : ''}">${isChosen(o) ? '◉' : '○'} ${esc(o)}</li>`)
      .join('');
    return `<ul class="ws-choice ws-choice-review">${items}</ul>`;
  }
  const disabled = opts.mode === 'preview' ? ' disabled' : '';
  const items = options
    .map(
      (o, i) =>
        `<li class="ws-choice-opt"><label><input type="radio" name="value" id="ws-${esc(key)}-${i}" value="${esc(o)}"${
          isChosen(o) ? ' checked' : ''
        }${disabled}> <span>${esc(o)}</span></label></li>`,
    )
    .join('');
  const group = `<fieldset class="ws-choice"><legend class="ws-sr-only">${esc(label || 'Choose one')}</legend><ul class="ws-choice-opts">${items}</ul></fieldset>`;
  if (opts.mode === 'preview') return group;
  // form: a per-question form scopes the radio group and autosaves the chosen option on change.
  return `<form class="ws-choice-form" hx-post="${esc(saveUrl(opts.action, key))}" hx-trigger="change" hx-swap="none">${group}<span class="ws-saved" id="ws-sv-${esc(key)}" aria-live="polite"></span></form>`;
}

/** A MULTIPLE-SELECT ("tick all that apply") answer: the pupil ticks SEVERAL options (checkboxes). The
 * saved value is the chosen options' TEXT joined by ", " (so marking compares the SET against a
 * `multichoice` scheme's expected). An inline aggregator updates a hidden `value` from the ticked boxes,
 * then the same /me/answer autosave (hx-trigger=change) posts it — no endpoint change, like the radio form. */
function multiChoiceControl(key: string, label: string, options: string[], opts: WorksheetOptions): string {
  const value = (opts.values?.get(key) ?? '').trim();
  const chosen = new Set(value.split(/\s*,\s*/).map((s) => s.toLowerCase()).filter(Boolean));
  const isChosen = (o: string): boolean => chosen.has(o.trim().toLowerCase());
  if (opts.mode === 'review') {
    if (value === '') return `<div class="ws-answer ws-empty">—</div>`;
    const items = options.map((o) => `<li class="ws-choice-opt${isChosen(o) ? ' chosen' : ''}">${isChosen(o) ? '☑' : '☐'} ${esc(o)}</li>`).join('');
    return `<ul class="ws-choice ws-choice-review">${items}</ul>`;
  }
  const disabled = opts.mode === 'preview' ? ' disabled' : '';
  const items = options
    .map(
      (o, i) =>
        `<li class="ws-choice-opt"><label><input type="checkbox" class="ws-multi-box" id="ws-${esc(key)}-${i}" value="${esc(o)}"${isChosen(o) ? ' checked' : ''}${disabled}> <span>${esc(o)}</span></label></li>`,
    )
    .join('');
  const group = `<fieldset class="ws-choice ws-multi"><legend class="ws-sr-only">${esc(label || 'Choose all that apply')}</legend><ul class="ws-choice-opts">${items}</ul></fieldset>`;
  if (opts.mode === 'preview') return group;
  // form: ticking a box aggregates ALL ticked boxes into the hidden `value`, then htmx (hx-trigger=change)
  // autosaves it — exactly the radio form's save path, so marking/keys are unchanged.
  const agg = "this.querySelector('input[name=value]').value=[].slice.call(this.querySelectorAll('.ws-multi-box:checked')).map(function(b){return b.value}).join(', ')";
  return `<form class="ws-choice-form ws-multi-form" hx-post="${esc(saveUrl(opts.action, key))}" hx-trigger="change" hx-swap="none" oninput="${agg}"><input type="hidden" name="value" value="${esc(value)}">${group}<span class="ws-saved" id="ws-sv-${esc(key)}" aria-live="polite"></span></form>`;
}

/** A MATCHING table is a 2-column table whose every answer cell is a choice over the SAME option set:
 * the left column is the prompt to match, the right is the (repeated) pool of answers. Returns the row
 * prompts + the shared options, or null if it isn't that shape. Each row stays a normal t.r.c choice
 * field — matching is only a different WIDGET, so the keys and marking are unchanged from radios. */
function detectMatching(bodyRows: string[][]): { prompts: string[]; options: string[] } | null {
  if (bodyRows.length < 2) return null;
  const first = bodyRows[0]![1] ?? '';
  if (!isChoiceCell(first)) return null;
  const options = choiceOptions(first);
  if (options.length < 2) return null;
  const sig = options.join('');
  const prompts: string[] = [];
  for (const r of bodyRows) {
    const prompt = (r[0] ?? '').trim();
    const cell = r[1] ?? '';
    if (prompt === '' || !isChoiceCell(cell) || choiceOptions(cell).join('') !== sig) return null;
    prompts.push(prompt);
  }
  return { prompts, options };
}

/** Render a matching table as a drag-and-drop (and tap/keyboard) widget: a column of prompt → drop-slot
 * rows beside a tray of answer tiles (sorted, so position never reveals the pairing). pupil.js wires
 * the interaction; each slot autosaves the placed answer to its choice field via /me/answer. */
function renderMatching(tableIdx: number, rows: WorksheetField[], options: string[], opts: WorksheetOptions): string {
  const sorted = [...options].sort((a, b) => a.localeCompare(b));
  const slots = rows
    .map((f) => {
      const value = (opts.values?.get(f.key) ?? '').trim();
      const pid = `ws-mp-${tableIdx}-${esc(f.key)}`;
      const prompt = `<span class="ws-match-prompt" id="${pid}">${esc(f.label)}</span>`;
      if (opts.mode === 'review') {
        const placed = value !== '' ? `<span class="ws-match-placed">${esc(value)}</span>` : `<span class="ws-match-empty">—</span>`;
        return `<li class="ws-match-row">${prompt}<span class="ws-match-slot">${placed}</span></li>`;
      }
      const inert = opts.mode === 'preview' && !opts.interactive; // interactive preview: droppable but non-saving (#1)
      const inside =
        value !== ''
          ? `<span class="ws-match-placed">${esc(value)}</span>${inert ? '' : '<button type="button" class="ws-match-clear" aria-label="clear this answer">✕</button>'}`
          : `<span class="ws-match-empty">drop an answer here</span>`;
      const attrs = inert
        ? 'aria-disabled="true"'
        : `tabindex="0" role="button" data-key="${esc(f.key)}"${opts.mode === 'form' ? ` data-save-url="${esc(saveUrl(opts.action, f.key))}"` : ''}`;
      return `<li class="ws-match-row">${prompt}<div class="ws-match-slot" ${attrs} aria-labelledby="${pid}">${inside}</div></li>`;
    })
    .join('');
  if (opts.mode === 'review') return `<div class="ws-match ws-match-review"><ol class="ws-match-slots">${slots}</ol></div>`;
  const inert = opts.mode === 'preview' && !opts.interactive;
  const tiles = sorted
    .map((o) => `<li class="ws-match-tile" ${inert ? 'aria-disabled="true"' : 'tabindex="0" role="button" draggable="true"'} data-label="${esc(o)}">${esc(o)}</li>`)
    .join('');
  const help = inert ? '' : '<p class="ws-match-help">Drag each answer into its box — or tap an answer, then tap a box.</p>';
  const live = inert ? '' : '<span class="ws-sr-only" aria-live="polite" data-match-live></span>';
  // A visible "saved ✓" flash for sighted pupils (pupil.js flashes it on each placement). Screen-reader
  // users get the parallel `data-match-live` announcement, so this stays aria-hidden to avoid a double read.
  const saved = inert ? '' : '<span class="ws-saved ws-match-saved" aria-hidden="true"></span>';
  return `<div class="ws-match" data-match="${tableIdx}">${help}<div class="ws-match-grid"><ol class="ws-match-slots">${slots}</ol><ul class="ws-match-tray" aria-label="Answers to place">${tiles}</ul></div>${live}${saved}</div>`;
}

/** A fill-in-the-blank input, embedded inline in instruction prose. Autosaves like a typed answer. */
function blankInput(key: string, opts: WorksheetOptions): string {
  const value = opts.values?.get(key) ?? '';
  if (opts.mode === 'review') {
    return value.trim() !== '' ? `<span class="ws-blank-filled">${esc(value)}</span>` : `<span class="ws-blank-filled ws-empty">____</span>`;
  }
  if (opts.mode === 'preview') {
    return `<input class="ws-blank" type="text" disabled aria-label="fill in the gap">`;
  }
  return `<input class="ws-blank" type="text" name="value" autocomplete="off" value="${esc(value)}" aria-label="fill in the gap"
    hx-post="${esc(saveUrl(opts.action, key))}" hx-trigger="input changed delay:600ms, blur" hx-swap="none"><span class="ws-saved" id="ws-sv-${esc(key)}" aria-live="polite"></span>`;
}

/** A slider / rating-scale answer: a range input storing the chosen number. Autosaves on change like a
 * choice (same /me/answer path). Uncredited self-assessment by default. `<output>` shows the live value. */
function scaleControl(key: string, label: string, sc: { min: number; max: number; minLabel?: string; maxLabel?: string }, opts: WorksheetOptions): string {
  const value = (opts.values?.get(key) ?? '').trim();
  if (opts.mode === 'review') {
    return value !== ''
      ? `<div class="ws-answer ws-scale-review">${esc(value)} <span class="muted">(${sc.min}–${sc.max})</span></div>`
      : `<div class="ws-answer ws-empty">—</div>`;
  }
  const al = esc(label || 'rating');
  const v = value !== '' ? value : String(Math.round((sc.min + sc.max) / 2));
  const ends = sc.minLabel || sc.maxLabel
    ? `<div class="ws-scale-ends"><span>${esc(sc.minLabel ?? String(sc.min))}</span><span>${esc(sc.maxLabel ?? String(sc.max))}</span></div>`
    : '';
  if (opts.mode === 'preview') {
    return `<div class="ws-scale">${ends}<div class="ws-scale-row"><input class="ws-scale-range" type="range" min="${sc.min}" max="${sc.max}" value="${esc(v)}" disabled aria-label="${al}"><output class="ws-scale-out">${esc(v)}</output></div></div>`;
  }
  const saved = `<span class="ws-saved" id="ws-sv-${esc(key)}" aria-live="polite"></span>`;
  // The range autosaves on change (htmx); an inline oninput keeps the visible <output> in step.
  return `<div class="ws-scale"><form class="ws-scale-form" hx-post="${esc(saveUrl(opts.action, key))}" hx-trigger="change" hx-swap="none">${ends}<div class="ws-scale-row"><input class="ws-scale-range" type="range" name="value" min="${sc.min}" max="${sc.max}" value="${esc(v)}" aria-label="${al}" oninput="this.parentNode.querySelector('output').value=this.value"><output class="ws-scale-out">${esc(v)}</output></div></form>${saved}</div>`;
}

// ── Ordering widgets: Parson's Problems (P6) + plain-language sequencing ─────────────────────────
// A ```parsons fenced block lists CODE lines in correct order (the pupil drags the jumble back); a
// ```order block does the same for plain-language STEPS/events (a packet's journey, the steps of an
// algorithm). Same machinery, separate key namespace; the solution never reaches form-mode HTML.
const PARSONS_FENCE = /^\s*(?:```|~~~)\s*parsons\b/i;
const ORDER_FENCE = /^\s*(?:```|~~~)\s*order\b/i;
const FENCE_ANY = /^\s*(?:```|~~~)/;

/** Pull a ```parsons / ```order region out of an md block: which tag, prose before, the solution lines
 * (correct order), prose after. Null when neither fence is present. */
function extractOrdering(lines: string[]): { tag: 'parsons' | 'order'; before: string[]; solution: string[]; after: string[] } | null {
  let open = -1;
  let tag: 'parsons' | 'order' | null = null;
  for (let i = 0; i < lines.length; i++) {
    if (PARSONS_FENCE.test(lines[i]!)) { open = i; tag = 'parsons'; break; }
    if (ORDER_FENCE.test(lines[i]!)) { open = i; tag = 'order'; break; }
  }
  if (open === -1 || tag === null) return null;
  let close = -1;
  for (let i = open + 1; i < lines.length; i++) if (FENCE_ANY.test(lines[i]!)) { close = i; break; }
  const end = close === -1 ? lines.length : close;
  const solution = lines.slice(open + 1, end).map((l) => l.replace(/\s+$/, '')).filter((l) => l.trim() !== '');
  return { tag, before: lines.slice(0, open), solution, after: close === -1 ? [] : lines.slice(close + 1) };
}

/** A stable, NON-identity jumble: order lines by a hash of their text — the same on every render, yet
 * never the answer order (if the hash-sort happens to land on the original order, rotate by one so the
 * solution is never shown as-is). */
function shuffleStable(lines: string[]): string[] {
  if (lines.length < 2) return lines.slice();
  const h = (s: string): number => { let x = 5381; for (let i = 0; i < s.length; i++) x = ((x << 5) + x + s.charCodeAt(i)) | 0; return x >>> 0; };
  const sorted = lines.map((l, i) => ({ l, i })).sort((a, b) => h(a.l) - h(b.l) || a.i - b.i).map((o) => o.l);
  return sorted.every((l, i) => l === lines[i]) ? lines.slice(1).concat(lines[0]!) : sorted;
}

function parsonsLabel(before: string[]): string {
  const txt = before.map((l) => l.replace(/[#>*_`]/g, '').trim()).filter(Boolean);
  return (txt[txt.length - 1] ?? 'Put the code lines in the correct order').slice(0, 200);
}

/** Render an ordering widget (Parson's code, or a plain-language sequence): jumbled draggable tiles
 * (form/preview) or the pupil's order (review). `prose` ⇒ steps shown as plain text, else monospaced
 * code. Reuses the `ws-parsons*` classes/keys so pupil.js wires drag + ▲▼ and autosaves the order
 * (tiles joined by "\n") with NO client change. */
function orderingControl(key: string, solution: string[], opts: WorksheetOptions, prose: boolean): string {
  const saved = (opts.values?.get(key) ?? '').split('\n').filter((l) => l.trim() !== '');
  const tile = (l: string): string => (prose ? `<span class="ws-order-text">${esc(l)}</span>` : `<code>${esc(l)}</code>`);
  if (opts.mode === 'review') {
    return saved.length
      ? `<ol class="ws-parsons ws-parsons-review">${saved.map((l) => `<li>${tile(l)}</li>`).join('')}</ol>`
      : `<div class="ws-answer ws-empty">— (not ordered yet)</div>`;
  }
  const display = saved.length ? saved : shuffleStable(solution); // the pupil's order, else a stable jumble — never the solution
  const inert = opts.mode === 'preview' && !opts.interactive; // interactive preview: draggable but non-saving (#1)
  const tiles = display
    .map(
      (l) =>
        `<li class="ws-parsons-line" ${inert ? 'aria-disabled="true"' : 'draggable="true" tabindex="0" role="button"'} data-line="${esc(l)}">` +
        `<span class="ws-parsons-grip" aria-hidden="true">⋮⋮</span>${tile(l)}` +
        `${inert ? '' : '<span class="ws-parsons-btns"><button type="button" class="ws-parsons-up" aria-label="move up">▲</button><button type="button" class="ws-parsons-down" aria-label="move down">▼</button></span>'}</li>`,
    )
    .join('');
  const help = inert ? '' : `<p class="ws-parsons-help">Drag the ${prose ? 'steps' : 'lines'} into the right order — or use ▲ ▼.</p>`;
  const savedSpan = inert ? '' : `<span class="ws-saved" id="ws-sv-${esc(key)}" aria-live="polite"></span>`;
  return `<div class="ws-parsons-wrap${prose ? ' ws-ordering-prose' : ''}${saved.length ? ' is-ordered' : ''}" data-parsons-key="${esc(key)}"${opts.mode === 'form' ? ` data-save-url="${esc(saveUrl(opts.action, key))}"` : ''}>${help}<ol class="ws-parsons">${tiles}</ol>${savedSpan}</div>`;
}

// ── Card sort (group items into named categories) ───────────────────────────────────────────────
// A ```sort block lists each category and its members: "Category: item, item". It expands to ONE
// per-item field (kind 'sort', options = the categories, solution = the item's correct category) so
// each item stores the category it's dropped in — a `choice` value. Items are pooled + shuffled so
// position never reveals the grouping; the correct membership never reaches form-mode HTML.
const SORT_FENCE = /^\s*(?:```|~~~)\s*sort\b/i;
interface SortSpec { before: string[]; categories: string[]; items: { text: string; cat: string }[]; after: string[] }
function extractSort(lines: string[]): SortSpec | null {
  let open = -1;
  for (let i = 0; i < lines.length; i++) if (SORT_FENCE.test(lines[i]!)) { open = i; break; }
  if (open === -1) return null;
  let close = -1;
  for (let i = open + 1; i < lines.length; i++) if (FENCE_ANY.test(lines[i]!)) { close = i; break; }
  const end = close === -1 ? lines.length : close;
  const categories: string[] = [];
  const items: { text: string; cat: string }[] = [];
  for (const raw of lines.slice(open + 1, end)) {
    const line = raw.trim();
    const ci = line.indexOf(':');
    if (ci <= 0) continue;
    const cat = line.slice(0, ci).trim();
    const its = line.slice(ci + 1).split(',').map((s) => s.trim()).filter(Boolean);
    if (!cat || its.length === 0) continue;
    if (!categories.includes(cat)) categories.push(cat);
    for (const it of its) items.push({ text: it, cat });
  }
  if (categories.length < 2 || items.length < 2) return null;
  return { before: lines.slice(0, open), categories, items, after: close === -1 ? [] : lines.slice(close + 1) };
}

/** Render a card-sort: a tray of shuffled item tiles + a labelled drop-zone per category. pupil.js
 * (.ws-sort) wires drag + tap-place and autosaves each item's chosen category to its `sort.{n}.i{m}`
 * field via /me/answer. In review, items show grouped under the category the pupil chose. */
function renderSort(idx: number, fields: WorksheetField[], categories: string[], opts: WorksheetOptions): string {
  const placedOf = (f: WorksheetField): string => (opts.values?.get(f.key) ?? '').trim();
  const inCat = (c: string): WorksheetField[] => fields.filter((f) => placedOf(f).toLowerCase() === c.toLowerCase());
  if (opts.mode === 'review') {
    const cats = categories
      .map((c) => `<div class="ws-sort-cat"><h4 class="ws-sort-cat-h">${esc(c)}</h4><ul class="ws-sort-list">${inCat(c).map((f) => `<li class="ws-sort-item">${esc(f.label)}</li>`).join('') || '<li class="ws-sort-empty">—</li>'}</ul></div>`)
      .join('');
    return `<div class="ws-sort ws-sort-review"><div class="ws-sort-cats">${cats}</div></div>`;
  }
  const inert = opts.mode === 'preview' && !opts.interactive; // interactive preview: draggable but non-saving (#1)
  const tile = (f: WorksheetField): string =>
    `<li class="ws-sort-item" ${inert ? 'aria-disabled="true"' : 'draggable="true" tabindex="0" role="button"'} data-item-key="${esc(f.key)}" data-item="${esc(f.label)}"${opts.mode === 'form' ? ` data-save-url="${esc(saveUrl(opts.action, f.key))}"` : ''}><span class="ws-sort-grip" aria-hidden="true">⋮⋮</span><span class="ws-sort-text">${esc(f.label)}</span></li>`;
  const unsorted = fields.filter((f) => placedOf(f) === '');
  const trayItems = shuffleStable(unsorted.map((f) => f.label)).map((lbl) => unsorted.find((f) => f.label === lbl)).filter((f): f is WorksheetField => !!f);
  const tray = `<ul class="ws-sort-tray" data-sort-tray aria-label="Items to sort">${trayItems.map(tile).join('')}</ul>`;
  const cats = categories
    .map((c) => `<div class="ws-sort-cat"${inert ? ' aria-disabled="true"' : ` data-cat="${esc(c)}" role="group"`} aria-label="${esc(c)}"><h4 class="ws-sort-cat-h">${esc(c)}</h4><ul class="ws-sort-list">${inCat(c).map(tile).join('')}</ul></div>`)
    .join('');
  const help = inert ? '' : '<p class="ws-sort-help">Drag each item into a group — or tap an item, then tap a group.</p>';
  const saved = inert ? '' : '<span class="ws-saved ws-sort-saved" aria-hidden="true"></span>';
  return `<div class="ws-sort" data-sort="${idx}">${help}${tray}<div class="ws-sort-cats">${cats}</div>${saved}</div>`;
}

// ── Label a diagram (drag labels onto positioned spots on an image) ─────────────────────────────
// A ```label block names an image then one "zoneId (x%, y%): correct label" per drop-spot. It expands
// to one field per zone (kind 'label', options = the label bank, solution = the correct label) — each
// stores the label dropped on it, a `choice` value. Renders with the MATCHING widget's classes so the
// existing pupil.js drag/tap engine drives it; only the slots are positioned over the image.
const LABEL_FENCE = /^\s*(?:```|~~~)\s*label\b/i;
const LABEL_ZONE_RE = /^(.+?)\s*\(\s*(\d+(?:\.\d+)?)\s*%?\s*,\s*(\d+(?:\.\d+)?)\s*%?\s*\)\s*:\s*(.+)$/;
interface LabelZone { id: string; x: number; y: number; correct: string }
interface LabelSpec { before: string[]; image: string; zones: LabelZone[]; after: string[] }
function extractLabel(lines: string[]): LabelSpec | null {
  let open = -1;
  for (let i = 0; i < lines.length; i++) if (LABEL_FENCE.test(lines[i]!)) { open = i; break; }
  if (open === -1) return null;
  let close = -1;
  for (let i = open + 1; i < lines.length; i++) if (FENCE_ANY.test(lines[i]!)) { close = i; break; }
  const end = close === -1 ? lines.length : close;
  let image = '';
  const zones: LabelZone[] = [];
  for (const raw of lines.slice(open + 1, end)) {
    const line = raw.trim();
    if (!line) continue;
    const im = line.match(/^image\s*:\s*(.+)$/i);
    if (im) { image = im[1]!.trim(); continue; }
    const z = line.match(LABEL_ZONE_RE);
    if (z) {
      const x = Number(z[2]);
      const y = Number(z[3]);
      if (Number.isFinite(x) && Number.isFinite(y) && x >= 0 && x <= 100 && y >= 0 && y <= 100) {
        zones.push({ id: z[1]!.trim(), x, y, correct: z[4]!.trim() });
      }
    }
  }
  if (!image || zones.length < 2) return null;
  return { before: lines.slice(0, open), image, zones, after: close === -1 ? [] : lines.slice(close + 1) };
}

/** Render a label-the-diagram widget: an image with a drop-slot positioned at each zone's (x%,y%) +
 * a tray of shuffled labels. Reuses the matching widget's classes (.ws-match / .ws-match-slot /
 * .ws-match-tile) so pupil.js drives the drag/tap/save with no new client code; each slot autosaves
 * the dropped label to its `label.{n}.z{m}` field. */
function renderLabel(idx: number, fields: WorksheetField[], spec: LabelSpec, opts: WorksheetOptions): string {
  const bank = [...new Set(spec.zones.map((z) => z.correct))].sort((a, b) => a.localeCompare(b));
  const valueOf = (f: WorksheetField): string => (opts.values?.get(f.key) ?? '').trim();
  const imgTag = `<img class="ws-label-img" src="${esc(spec.image)}" alt="diagram to label" loading="lazy">`;
  if (opts.mode === 'review') {
    const slots = spec.zones
      .map((z, i) => {
        const v = valueOf(fields[i]!);
        const placed = v !== '' ? `<span class="ws-match-placed">${esc(v)}</span>` : `<span class="ws-match-empty">—</span>`;
        return `<div class="ws-label-slot ws-match-slot" style="left:${z.x}%;top:${z.y}%">${placed}</div>`;
      })
      .join('');
    return `<div class="ws-match ws-label ws-label-review"><div class="ws-label-stage">${imgTag}${slots}</div></div>`;
  }
  const inert = opts.mode === 'preview' && !opts.interactive; // interactive preview: droppable but non-saving (#1)
  const slots = spec.zones
    .map((z, i) => {
      const f = fields[i]!;
      const v = valueOf(f);
      const inside = v !== ''
        ? `<span class="ws-match-placed">${esc(v)}</span>${inert ? '' : '<button type="button" class="ws-match-clear" aria-label="clear this answer">✕</button>'}`
        : `<span class="ws-match-empty">?</span>`;
      const attrs = inert ? 'aria-disabled="true"' : `tabindex="0" role="button" data-key="${esc(f.key)}"${opts.mode === 'form' ? ` data-save-url="${esc(saveUrl(opts.action, f.key))}"` : ''}`;
      return `<div class="ws-label-slot ws-match-slot" style="left:${z.x}%;top:${z.y}%" ${attrs} aria-label="${esc(z.id)}">${inside}</div>`;
    })
    .join('');
  const tiles = bank
    .map((o) => `<li class="ws-match-tile" ${inert ? 'aria-disabled="true"' : 'tabindex="0" role="button" draggable="true"'} data-label="${esc(o)}">${esc(o)}</li>`)
    .join('');
  const help = inert ? '' : '<p class="ws-match-help">Drag each label onto the right spot — or tap a label, then tap a spot.</p>';
  const live = inert ? '' : '<span class="ws-sr-only" aria-live="polite" data-match-live></span>';
  const saved = inert ? '' : '<span class="ws-saved ws-match-saved" aria-hidden="true"></span>';
  return `<div class="ws-match ws-label" data-match="${idx}">${help}<div class="ws-label-stage">${imgTag}${slots}</div><ul class="ws-match-tray" aria-label="Labels to place">${tiles}</ul>${live}${saved}</div>`;
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
  const answerCol = header.map((c) => PROMPT.test(c) || SCREENSHOT.test(c));
  const anyBodyPlaceholder = bodyRows.some((r) => r.some((c) => PLACEHOLDER_CELL.test(c) || SCREENSHOT.test(c) || isChoiceCell(c) || isMultiCell(c) || isScaleCell(c) || TRACE_CELL.test(c)));
  const isAnswerTable = answerCol.some(Boolean) || anyBodyPlaceholder;

  if (!isAnswerTable) {
    // Not an answer table → render verbatim via the Markdown renderer (read-only).
    return renderMarkdown(block.lines.join('\n'));
  }

  // Layout A (treat the header as a data row too) when the NARROW placeholder ("type … here") is in
  // the header AND the answer column has no empty body cells to fill — i.e. it's a label/value sheet,
  // not Q&A. Also when there are no body rows at all (e.g. "| Screenshot | Paste here |") — then the
  // header IS the only fillable row, so render it as data or there'd be nowhere to type.
  const headerHasPlaceholder = header.some((c) => PLACEHOLDER.test(c));
  // An answer column "has a body slot to fill" when a body cell is empty, a screenshot prompt, or a
  // multiple-choice list — i.e. an input rather than text. Name/date layout-A instead has TEXT
  // placeholders in the cells, so this stays false and the header is (correctly) the data row. (Just
  // testing for emptiness would misfire on an all-screenshot / all-choice Q&A table — no empty cells —
  // and wrongly promote the "Type your answer here" header to a data row.)
  const answerColHasFillBody = answerCol.some((isA, c) =>
    isA &&
    bodyRows.some((r) => {
      const v = (r[c] ?? '').trim();
      return v === '' || SCREENSHOT.test(v) || isChoiceCell(v) || isMultiCell(v) || isScaleCell(v);
    }),
  );
  const headerIsData = bodyRows.length === 0 ? answerCol.some(Boolean) : headerHasPlaceholder && !answerColHasFillBody;

  // MATCHING widget: a clean 2-column table whose every answer cell is a choice over the SAME options
  // (left = prompt, right = the repeated answer pool). Each row keeps its normal t{n}.r{1..}.c2 choice
  // key — only the WIDGET differs from per-row radios, so marking is identical.
  if (!headerIsData && header.length === 2) {
    const m = detectMatching(bodyRows);
    if (m) {
      const matchFields: WorksheetField[] = m.prompts.map((prompt, i) => ({ key: `${opts.keyPrefix ?? ''}t${tableIdx}.r${i + 1}.c2`, kind: 'choice', level: block.level, label: prompt, options: m.options }));
      fields.push(...matchFields);
      return renderMatching(tableIdx, matchFields, m.options, opts);
    }
  }

  const theadCells = headerIsData ? null : header;
  // Iterate the FULL column count (header or widest row) so a ragged row missing its trailing
  // answer cell still gets an input in the answer column, not an unanswerable blank.
  const colCount = Math.max(header.length, ...bodyRows.map((r) => r.length), 0);
  // B5.2c: a 3+-column answer table is a GRID — a trace table (line | vars… | output) or a truth /
  // logic table (A | B | A AND B). Its typed cells render as compact single-line boxes (not 2-row
  // textareas) so the grid reads cleanly; Q&A / name-date / matching (≤2 cols) keep the roomy box.
  const isGrid = colCount >= 3;

  // Keys must be STABLE across the header-vs-data classification flip (a re-version that flips it
  // must NOT renumber body rows and mis-attach saved answers/marks). So body rows are ALWAYS
  // numbered among body rows (r1, r2, …) regardless of the flip, and a header rendered as a data
  // row (name/date layout) gets the fixed key r0. Only the header input appears/disappears on a
  // flip; body-row keys never move.
  const localFields: WorksheetField[] = [];
  let autoFilledCells = 0; // auto-filled name/date cells render output but emit no field — count them
  // A cell is an input when it's an answer-column blank/placeholder, or itself a placeholder/screenshot/choice.
  const cellIsInput = (c: number, cell: string): boolean => {
    const ph = PLACEHOLDER_CELL.test(cell);
    return TRACE_CELL.test(cell) || (answerCol[c] && (cell.trim() === '' || ph || SCREENSHOT.test(cell) || isChoiceCell(cell) || isMultiCell(cell) || isScaleCell(cell))) || ph || SCREENSHOT.test(cell) || isChoiceCell(cell) || isMultiCell(cell) || isScaleCell(cell);
  };
  const renderRow = (row: string[], rowNo: number): string => {
    // A4: a row that has an input is a question — give its prompt cell a 🔊 read-aloud button.
    const rowHasInput = Array.from({ length: colCount }, (_, c) => cellIsInput(c, row[c] ?? '')).some(Boolean);
    let promptSpoken = false;
    const tds = Array.from({ length: colCount }, (_, c) => {
      const cell = row[c] ?? '';
      const colNo = c + 1;
      const placeholder = PLACEHOLDER_CELL.test(cell);
      // An input is rendered for an answer-column cell that is EMPTY or a placeholder, or for any
      // cell that is itself a placeholder. A filled, non-placeholder cell is preserved as text — so
      // a reference column that merely shares an answer column's table never loses its content.
      const shot = SCREENSHOT.test(cell);
      const cho = isChoiceCell(cell);
      const multi = isMultiCell(cell);
      const scl = isScaleCell(cell);
      const traceM = TRACE_CELL.exec(cell); // `??expected??` answer cell (trace/truth table)
      const isInput = !!traceM || (answerCol[c] && (cell.trim() === '' || placeholder || shot || cho || multi || scl)) || placeholder || shot || cho || multi || scl;
      if (!isInput) {
        // The question prompt for this row (its first non-empty text cell) gets the read-aloud button.
        if (opts.mode === 'form' && rowHasInput && !promptSpoken && cell.trim() !== '') {
          promptSpoken = true;
          return `<td class="ws-q-cell">${speakBtn(cell)}<span class="ws-q-text">${esc(cell)}</span></td>`;
        }
        return `<td>${esc(cell)}</td>`;
      }
      const key = `${opts.keyPrefix ?? ''}t${tableIdx}.r${rowNo}.c${colNo}`;
      // In a grid (trace/truth table) the column HEADER is the clearest label for a cell input;
      // otherwise prefer a sibling cell value (the question text), falling back to the header.
      const headerLabel = (theadCells?.[c] ?? '').trim();
      // Prefer a sibling cell that ISN'T an answer-column label; but if every sibling looks like a
      // prompt (e.g. a code task "Write an if statement…" starts with a verb PROMPT matches), fall back
      // to that sibling question text rather than the column header — it's the real question.
      const label = isGrid && headerLabel
        ? headerLabel
        : (row.find((x, ci) => ci !== c && x.trim() !== '' && !PROMPT.test(x)) ?? row.find((x, ci) => ci !== c && x.trim() !== '') ?? headerLabel);
      // The name/date identity header is known online — auto-fill it read-only (no field emitted, so
      // it isn't counted as something the pupil must do). Tightly matched to the identity header
      // ("Name"/"Date" label, or a "Type your name/date here" placeholder) so a real question that
      // merely mentions "name"/"date" is never auto-filled.
      if (opts.autofill && opts.mode !== 'review') {
        const lbl = label.trim().toLowerCase();
        const cellLc = cell.trim().toLowerCase();
        const auto =
          lbl === 'name' || /^type\s+(?:your\s+)?name\b/.test(cellLc)
            ? opts.autofill.name
            : lbl === 'date' || /^type\s+(?:the\s+)?date\b/.test(cellLc)
              ? opts.autofill.date
              : undefined;
        if (auto != null) {
          autoFilledCells += 1;
          return `<td class="ws-answer-cell"><div class="ws-answer ws-auto" title="filled in automatically">${esc(auto)}</div></td>`;
        }
      }
      // A screenshot-paste cell becomes an image field (pupil pastes a picture of their work); a
      // "( ) a ( ) b" cell becomes a multiple-choice field; everything else is a typed answer. Same
      // key scheme for all → marking is unaffected.
      const isShot = shot || SCREENSHOT.test(theadCells?.[c] ?? '') || SCREENSHOT.test(label);
      // A `??expected??` trace/truth-table cell: an empty typed input the pupil fills, self-marked against
      // `expected` in the mark modal. The expected value NEVER reaches the form/preview HTML (only `solution`).
      if (traceM) {
        localFields.push({ key, kind: 'trace', level: block.level, label, solution: [traceM[1]!.trim()] });
        return `<td class="ws-answer-cell ws-trace-cell">${textControl(key, label, '', opts, true)}</td>`;
      }
      if (scl && !isShot) {
        const sc = parseScale(cell);
        if (sc) {
          localFields.push({ key, kind: 'scale', level: block.level, label, scale: sc });
          return `<td class="ws-answer-cell ws-scale-cell">${scaleControl(key, label, sc, opts)}</td>`;
        }
      }
      if (multi && !isShot) {
        const options = multiOptions(cell);
        if (options.length >= 2) {
          localFields.push({ key, kind: 'multichoice', level: block.level, label, options });
          return `<td class="ws-answer-cell ws-choice-cell ws-multi-cell">${multiChoiceControl(key, label, options, opts)}</td>`;
        }
      }
      if (cho && !isShot) {
        const options = choiceOptions(cell);
        if (options.length >= 2) {
          localFields.push({ key, kind: 'choice', level: block.level, label, options });
          return `<td class="ws-answer-cell ws-choice-cell">${choiceControl(key, label, options, opts)}</td>`;
        }
      }
      // A code-writing answer → a monospaced box. Restricted to an ANSWER-column cell (so a question
      // prompt that merely mentions "code" can't become an input), and not a grid/choice/screenshot.
      const isCode = !isShot && !cho && !isGrid && answerCol[c] && (CODE_CELL.test(cell) || CODE_CELL.test(theadCells?.[c] ?? ''));
      if (isCode) {
        localFields.push({ key, kind: 'code', level: block.level, label });
        return `<td class="ws-answer-cell ws-code-cell">${codeControl(key, label, opts)}</td>`;
      }
      localFields.push({ key, kind: isShot ? 'image' : 'text', level: block.level, label });
      const control = isShot ? imageControl(key, label, opts) : textControl(key, label, placeholder ? cell : '', opts, isGrid);
      return `<td class="ws-answer-cell${isShot ? ' ws-shot-cell' : ''}">${control}</td>`;
    });
    return `<tr>${tds.join('')}</tr>`;
  };

  const out: string[] = [`<table class="ws-table${isGrid ? ' ws-grid' : ''}">`];
  if (theadCells) out.push(`<thead><tr>${theadCells.map((c) => `<th>${esc(c)}</th>`).join('')}</tr></thead>`);
  out.push('<tbody>');
  if (headerIsData) out.push(renderRow(header, 0)); // header-as-data is the fixed r0 row
  bodyRows.forEach((row, i) => out.push(renderRow(row, i + 1)));
  out.push('</tbody></table>');

  // A header started with an answer verb but every cell turned out to hold real content (a reference
  // table, not Q&A) → no inputs AND no auto-filled cells emitted. Fall back to a plain read-only table
  // so nothing is lost and no phantom field keys leak into the marking inventory. (An all-name/date
  // table emits no fields but IS rendered — the auto-filled count keeps it off the fallback.)
  if (localFields.length === 0 && autoFilledCells === 0) return renderMarkdown(block.lines.join('\n'));
  fields.push(...localFields);
  return out.join('');
}

function renderTasks(block: Block, startIdx: number, opts: WorksheetOptions, fields: WorksheetField[]): { html: string; next: number } {
  let idx = startIdx;
  const items = block.lines.map((line) => {
    const m = line.match(TASK)!;
    idx += 1;
    const key = `${opts.keyPrefix ?? ''}task.${idx}`;
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
  let blankIdx = 0;
  let parsonsIdx = 0;
  let orderIdx = 0;
  let sortIdx = 0;
  let labelIdx = 0;

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
    } else {
      // An ordering fence (```parsons code / ```order steps) in this md block → the reorder widget. The
      // per-tag counter is bumped even when the block isn't in the shown slice, so keys stay stable across
      // level slices (like tasks).
      const ord = extractOrdering(block.lines);
      if (ord) {
        const isParsons = ord.tag === 'parsons';
        let key: string;
        if (isParsons) { parsonsIdx += 1; key = `${opts.keyPrefix ?? ''}parsons.${parsonsIdx}`; }
        else { orderIdx += 1; key = `${opts.keyPrefix ?? ''}order.${orderIdx}`; }
        if (!shown) continue;
        fields.push({ key, kind: ord.tag, level: block.level, label: parsonsLabel(ord.before), solution: ord.solution });
        const beforeHtml = ord.before.some((l) => l.trim() !== '') ? renderMarkdown(ord.before.join('\n')) : '';
        const afterHtml = ord.after.some((l) => l.trim() !== '') ? renderMarkdown(ord.after.join('\n')) : '';
        const spk = opts.mode === 'form' ? speakBtn(ord.before.join(' ')) : '';
        out.push(`<div class="ws-block ws-parsons-block">${spk}${beforeHtml}${orderingControl(key, ord.solution, opts, !isParsons)}${afterHtml}</div>`);
        continue;
      }

      // A card-sort fence (```sort) → one `sort` field per item (its chosen category is a choice value).
      // sortIdx + the per-item index are bumped even when not shown, so keys stay stable across slices.
      const srt = extractSort(block.lines);
      if (srt) {
        sortIdx += 1;
        const sortFields: WorksheetField[] = srt.items.map((it, m) => ({
          key: `${opts.keyPrefix ?? ''}sort.${sortIdx}.i${m + 1}`,
          kind: 'sort',
          level: block.level,
          label: it.text,
          options: srt.categories,
          solution: [it.cat],
        }));
        if (!shown) continue;
        fields.push(...sortFields);
        const beforeHtml = srt.before.some((l) => l.trim() !== '') ? renderMarkdown(srt.before.join('\n')) : '';
        const afterHtml = srt.after.some((l) => l.trim() !== '') ? renderMarkdown(srt.after.join('\n')) : '';
        const spk = opts.mode === 'form' ? speakBtn(srt.before.join(' ')) : '';
        out.push(`<div class="ws-block ws-sort-block">${spk}${beforeHtml}${renderSort(sortIdx, sortFields, srt.categories, opts)}${afterHtml}</div>`);
        continue;
      }

      // A label-the-diagram fence (```label) → one `label` field per zone (its dropped label is a choice
      // value). labelIdx + the per-zone index are bumped even when not shown, so keys stay stable.
      const lbl = extractLabel(block.lines);
      if (lbl) {
        labelIdx += 1;
        const bank = [...new Set(lbl.zones.map((z) => z.correct))].sort((a, b) => a.localeCompare(b));
        const labelFields: WorksheetField[] = lbl.zones.map((z, m) => ({
          key: `${opts.keyPrefix ?? ''}label.${labelIdx}.z${m + 1}`,
          kind: 'label',
          level: block.level,
          label: z.id,
          options: bank,
          solution: [z.correct],
        }));
        if (!shown) continue;
        fields.push(...labelFields);
        const beforeHtml = lbl.before.some((l) => l.trim() !== '') ? renderMarkdown(lbl.before.join('\n')) : '';
        const afterHtml = lbl.after.some((l) => l.trim() !== '') ? renderMarkdown(lbl.after.join('\n')) : '';
        const spk = opts.mode === 'form' ? speakBtn(lbl.before.join(' ')) : '';
        out.push(`<div class="ws-block ws-label-block">${spk}${beforeHtml}${renderLabel(labelIdx, labelFields, lbl, opts)}${afterHtml}</div>`);
        continue;
      }

      // An md block (heading / instruction prose / note). Count any [[ ]] fill-in blanks FIRST so their
      // global blank.{n} keys stay stable whether or not this block is in the shown slice (like tasks).
      const blockText = block.lines.join('\n');
      const startBlank = blankIdx;
      blankIdx += countBlanks(blockText);
      if (!shown) continue;
      // In a sliced (pupil) view the level's own heading is hidden — the slice is unlabelled.
      if (block.isLevelHeading && include !== null) continue;

      // Pull out an optional "Word bank: a · b · c" line and render it as chips (SEND scaffold).
      let body = blockText;
      let wordbank = '';
      const wb = body.match(/^[ \t]*word ?bank[ \t]*[:：][ \t]*(.+)$/im);
      if (wb) {
        const words = wb[1]!.split(/[·,;|]+/).map((w) => w.trim()).filter(Boolean);
        if (words.length) wordbank = `<div class="ws-wordbank"><span class="ws-wordbank-label">Word bank</span>${words.map((w) => `<span class="ws-chip">${esc(w)}</span>`).join('')}</div>`;
        body = body.replace(wb[0]!, '').trim();
      }

      let md = renderMarkdown(body);
      const nBlanks = countBlanks(body);
      if (nBlanks > 0) {
        const labels = blankLabels(body);
        let bi = 0;
        md = md.replace(/\[\[\s*\]\]/g, () => {
          const key = `${opts.keyPrefix ?? ''}blank.${startBlank + bi + 1}`;
          fields.push({ key, kind: 'blank', level: block.level, label: labels[bi] ?? '' });
          bi += 1;
          return blankInput(key, opts);
        });
      }

      // Wrap instruction prose in a calm "do this" panel; a fill-in-the-blank block gets the warmer
      // "answer" tint instead so it reads as something to complete. Headings/callouts style themselves.
      const headingOnly = block.lines.every((l) => l.trim() === '' || /^#{1,6}\s/.test(l));
      const quoteOnly = block.lines.every((l) => l.trim() === '' || /^>\s?/.test(l));
      const cls = nBlanks > 0 ? 'ws-block ws-cloze' : 'ws-block ws-instruction';
      // A4: a 🔊 reads the whole instruction / cloze block aloud (form mode only; not bare headings).
      const spk = opts.mode === 'form' ? speakBtn(block.lines.join(' ')) : '';
      out.push(headingOnly || quoteOnly ? md + wordbank : `<div class="${cls}">${spk}${md}${wordbank}</div>`);
    }
  }

  return { html: out.join('\n'), fields, hasLevels: levelDepth > 0 };
}
