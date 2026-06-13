// Phase 9.2 — deterministic marking of objective answers. Pure functions (no I/O), so the rules
// are provable by tests. Numeric marking is STRICT after parsing (Q36): "4" = "4.0" = " 4 ", with
// word forms carried as listed alternatives; anything genuinely fuzzy is classified 'open' at
// scheme time and left to the AI, never guessed here.

export type MarkKind = 'tick' | 'choice' | 'exact' | 'numeric' | 'keyword' | 'open';

export interface MarkPoint {
  id: number;
  kind: MarkKind;
  expected: string;
  alternatives: string[];
  marks: number;
  required: boolean;
}

export interface FieldMark {
  marksAwarded: number;
  marksTotal: number;
  pointsHit: number[];
  evidence: string[];
}

/** Fold case, trim, collapse inner whitespace, and strip surrounding punctuation — so "CPU." and
 *  " cpu " both match "CPU". Inner punctuation is kept (it can be meaningful). */
function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^[\s.,;:!?'"()\[\]-]+|[\s.,;:!?'"()\[\]-]+$/g, '')
    .trim();
}

/** Parse a number from free text: keep digits, sign, decimal point; tolerate "4 GB", "£3.50". */
function parseNum(s: string): number | null {
  const m = s.replace(/,/g, '').match(/-?\d+(?:\.\d+)?/);
  if (!m) return null;
  const n = Number(m[0]);
  return Number.isFinite(n) ? n : null;
}

const WORD = '[\\p{L}\\p{N}_]';
function keywordHit(answer: string, term: string): string | null {
  const t = term.trim();
  if (!t) return null;
  const re = new RegExp(`(?<!${WORD})${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?!${WORD})`, 'iu');
  const m = answer.match(re);
  return m ? m[0] : null;
}

/** Does a single answer satisfy one mark point? Returns the matched evidence text, or null. */
function pointMatch(point: MarkPoint, answer: string): string | null {
  const candidates = [point.expected, ...point.alternatives].map((s) => s ?? '').filter((s) => s !== '');
  const a = answer ?? '';
  switch (point.kind) {
    case 'tick':
      // A success-checklist tick: the pupil's value is 'x' when ticked.
      return norm(a) === 'x' ? 'ticked' : null;
    case 'choice':
    case 'exact': {
      const na = norm(a);
      return candidates.some((c) => norm(c) === na) && na !== '' ? a.trim() : null;
    }
    case 'numeric': {
      const an = parseNum(a);
      // Numeric equality (strict after parsing) against any numeric candidate.
      if (an !== null && candidates.some((c) => parseNum(c) !== null && parseNum(c) === an)) return a.trim();
      // Else accept a word-form / non-numeric alternative (e.g. "four") via exact compare.
      const na = norm(a);
      return na !== '' && candidates.some((c) => parseNum(c) === null && norm(c) === na) ? a.trim() : null;
    }
    case 'keyword': {
      for (const c of candidates) {
        const hit = keywordHit(a, c);
        if (hit) return hit;
      }
      return null;
    }
    case 'open':
      return null; // not deterministic — the AI marks these
  }
}

/** True when every point for a field is objective (so the field can be marked without the AI). */
export function isDeterministic(points: MarkPoint[]): boolean {
  return points.length > 0 && points.every((p) => p.kind !== 'open');
}

/** Mark one field's answer against its mark points (all objective). Award each point's marks when
 *  the answer satisfies it; the field's mark is the sum. All-or-nothing per point. */
export function markField(points: MarkPoint[], answer: string): FieldMark {
  const result: FieldMark = { marksAwarded: 0, marksTotal: 0, pointsHit: [], evidence: [] };
  for (const p of points) {
    result.marksTotal += p.marks;
    const ev = pointMatch(p, answer);
    if (ev !== null) {
      result.marksAwarded += p.marks;
      result.pointsHit.push(p.id);
      result.evidence.push(ev);
    }
  }
  return result;
}
