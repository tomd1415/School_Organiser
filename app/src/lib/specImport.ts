// Phase 11 idea 10 — parse pasted spec points into {code, title}. One point per line. A leading
// statement code is detected (e.g. "1.1.1 The purpose of the CPU", "3a Boolean logic"); a line with
// no code uses the whole line as both code and title, so re-import stays idempotent (upsert by code).
// Pure + DB-free so it's unit-testable.

const CODE_LINE = /^([0-9]+(?:\.[0-9]+)*[a-z]?|[A-Z]{1,3}[0-9]+(?:\.[0-9]+)*[a-z]?)[)\].:]?\s+(.+)$/;

export interface ParsedSpecPoint {
  code: string;
  title: string;
}

export function parseSpecPoints(text: string): ParsedSpecPoint[] {
  const out: ParsedSpecPoint[] = [];
  const seen = new Set<string>();
  for (const raw of (text ?? '').split('\n')) {
    const line = raw.replace(/^[\s•\-*]+/, '').trim(); // strip bullet/indent noise
    if (!line) continue;
    const m = CODE_LINE.exec(line);
    const code = (m ? m[1]! : line).slice(0, 40);
    const title = (m ? m[2]!.trim() : line).slice(0, 300);
    const key = code.toLowerCase();
    if (seen.has(key)) continue; // dedupe within one paste
    seen.add(key);
    out.push({ code, title });
  }
  return out;
}
