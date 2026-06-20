// Split a generated slides document (Markdown, one `## ` heading per slide) into individual slides,
// sliced to a pupil's ability level when the deck carries `# 🟢 Support` / `# 🟡 Core` / `# 🔴 Challenge`
// depth-1 level sections — so a pupil follows the board on a SIMPLIFIED version of the slides that
// matches their level. A deck with no level sections is shared: every pupil gets the same slides.
// (Slides use `## ` per slide, so level dividers are depth-1 `# ` to avoid colliding with a slide.)

export type SlideLevel = 'support' | 'core' | 'challenge';

function levelOfHeading(text: string): SlideLevel | null {
  if (/🟢|\bsupport\b/i.test(text)) return 'support';
  if (/🟡|\bcore\b/i.test(text)) return 'core';
  if (/🔴|\bchallenge\b/i.test(text)) return 'challenge';
  return null;
}

const H1 = /^#\s+(.*)$/;

/** Slides for a level: shared slides + the chosen level's slides (or all, if the deck isn't levelled). */
export function sliceSlidesForLevel(md: string, level: SlideLevel): string[] {
  const lines = (md ?? '').replace(/\r\n/g, '\n').split('\n');
  const hasLevels = lines.some((l) => {
    const m = l.match(H1);
    return !!m && levelOfHeading(m[1]!) != null;
  });

  const out: string[] = [];
  let cur: SlideLevel | 'shared' = 'shared';
  let slide: string[] = [];
  let slideLevel: SlideLevel | 'shared' = 'shared';
  const flush = (): void => {
    const text = slide.join('\n').trim();
    if (text && (!hasLevels || slideLevel === 'shared' || slideLevel === level)) out.push(text);
    slide = [];
  };

  for (const line of lines) {
    const h1 = line.match(H1);
    if (h1 && levelOfHeading(h1[1]!) != null) {
      // a level divider: end the current slide, switch level — the divider line itself isn't shown
      flush();
      cur = levelOfHeading(h1[1]!)!;
      continue;
    }
    if (/^##\s/.test(line)) {
      flush();
      slide = [line];
      slideLevel = cur;
      continue;
    }
    slide.push(line);
  }
  flush();
  return out;
}

// ── Per-slide teacher notes (private — NEVER shown to pupils / the board) ───────────────────────
// Teacher notes are authored as a blockquote whose first line is marked 🧑‍🏫, e.g.
//   > 🧑‍🏫 Drop in the fact that the first webcam watched a coffee pot…
// The legacy `*Say:*` talking-points line (which used to leak onto the pupil/board slides) is treated
// as a teacher note too, so old decks are cleaned automatically. A `> key idea` callout (no 🧑‍🏫)
// stays — it's pupil-facing.
const TEACHER_QUOTE = /^\s*>\s*🧑‍🏫/; // a teacher-notes blockquote (marked first line)
const QUOTE_LINE = /^\s*>/;
const SAY_LINE = /^\s*[*_]+\s*say\s*[:：][*_]*\s*/i; // legacy "*Say:* …" talking-points line (eats the markers)

/** Split one slide's Markdown into the pupil-visible part and the (private) teacher notes. The clean
 *  part NEVER contains teacher notes; that's the safety boundary the pupil/board render relies on. */
export function splitTeacherNotes(md: string): { clean: string; notes: string } {
  const lines = (md ?? '').replace(/\r\n/g, '\n').split('\n');
  const clean: string[] = [];
  const notes: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const l = lines[i]!;
    if (SAY_LINE.test(l)) {
      notes.push(l.replace(SAY_LINE, '').replace(/[*_]+\s*$/, '').trim()); // keep the talking point as a note (old decks)
      i += 1;
      continue;
    }
    if (TEACHER_QUOTE.test(l)) {
      while (i < lines.length && QUOTE_LINE.test(lines[i]!)) {
        notes.push(lines[i]!.replace(/^\s*>\s?/, '').replace(/^🧑‍🏫\s*/, '').trim()); // the whole contiguous block is teacher-only
        i += 1;
      }
      continue;
    }
    clean.push(l);
    i += 1;
  }
  return { clean: clean.join('\n').trim(), notes: notes.filter((n) => n !== '').join('\n').trim() };
}

/** Pupil/board-safe slide Markdown: the slide with every teacher note removed. */
export function stripTeacherNotes(md: string): string {
  return splitTeacherNotes(md).clean;
}

/** Whether a slides document is levelled (has per-ability sections) — for UI hints. */
export function slidesAreLevelled(md: string): boolean {
  return (md ?? '')
    .replace(/\r\n/g, '\n')
    .split('\n')
    .some((l) => {
      const m = l.match(H1);
      return !!m && levelOfHeading(m[1]!) != null;
    });
}
