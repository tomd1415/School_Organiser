// Render lesson objectives/outlines as structure instead of a wall of text.
// Outlines arrive as plain lines ("1. Arrival routine (5 min) — …", "- recap quiz", prose);
// numbered lines become an <ol> with the timing pulled out as a badge, bullet lines a <ul>,
// anything else short paragraphs. Pure string → HTML (everything escaped), so it's unit-testable.
import { esc } from './html';

const NUMBERED = /^\s*(?:step\s*)?\d+\s*[.)–—-]\s+/i;
const BULLET = /^\s*[-*•]\s+/;
const MINUTES = /\(\s*(~?\s*\d+(?:\s*[-–]\s*\d+)?\s*min[s.]?)\s*\)/i;

function stepHtml(raw: string): string {
  const text = raw.replace(NUMBERED, '').trim();
  const m = text.match(MINUTES);
  const label = m ? text.replace(MINUTES, '').replace(/\s{2,}/g, ' ').trim() : text;
  const badge = m ? ` <span class="step-min">${esc(m[1]!.replace(/\s+/g, ' '))}</span>` : '';
  return `<li>${esc(label)}${badge}</li>`;
}

/** The outline as readable structure. Empty/null → ''. */
export function formatOutline(text: string | null | undefined): string {
  const lines = (text ?? '').split('\n').map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return '';
  const out: string[] = [];
  let buf: string[] = [];
  let bufKind: 'ol' | 'ul' | null = null;
  const flush = () => {
    if (!buf.length) return;
    if (bufKind === 'ol') out.push(`<ol class="outline-steps">${buf.join('')}</ol>`);
    else if (bufKind === 'ul') out.push(`<ul class="outline-steps outline-bullets">${buf.join('')}</ul>`);
    buf = [];
    bufKind = null;
  };
  for (const line of lines) {
    if (NUMBERED.test(line)) {
      if (bufKind !== 'ol') flush();
      bufKind = 'ol';
      buf.push(stepHtml(line));
    } else if (BULLET.test(line)) {
      if (bufKind !== 'ul') flush();
      bufKind = 'ul';
      buf.push(stepHtml(line.replace(BULLET, '')));
    } else {
      flush();
      out.push(`<p class="outline-p">${esc(line)}</p>`);
    }
  }
  flush();
  return out.join('');
}

/** Objectives, one per line (leading bullets/numbers stripped), as a tick-list. */
export function formatObjectives(text: string | null | undefined): string {
  const lines = (text ?? '')
    .split('\n')
    .map((l) => l.replace(NUMBERED, '').replace(BULLET, '').trim())
    .filter(Boolean);
  if (!lines.length) return '';
  return `<ul class="obj-list">${lines.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>`;
}
