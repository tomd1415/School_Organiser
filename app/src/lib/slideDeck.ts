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
// THE SAFETY BOUNDARY. Teacher talk must never reach the board. The prompt asks the model to mark notes
// as a `> 🧑‍🏫 …` blockquote, but in practice the model very often reverts to a `*Say:* …` talking-points
// line (and sometimes `Teacher:` / `Presenter notes:`), so we detect EVERY common form — and we err on
// the side of stripping. A `> key idea` callout (no teacher marker) is the ONE blockquote kept: it's
// pupil-facing. This is the single source of truth — every slide render (board, pupil, presenter, the
// next-shell views) MUST route through it; do not re-implement the test (it has leaked before).
//
// A teacher-talk LINE: `Say:` / `Teacher('s) note(s):` / `Note to teacher:` / `Presenter('s) notes:`,
// optionally wrapped in * or _ emphasis. A `[:：]` colon is required, so ordinary prose ("Say hello to a
// partner", no colon) is left for pupils.
const TEACHER_LINE = /^\s*[*_]*\s*(?:say|teacher['’]?s?(?:\s+notes?)?|teaching\s+notes?|notes?\s+(?:for|to)\s+(?:the\s+)?teacher|presenter['’]?s?(?:\s+notes?)?|speaker\s+notes?)\s*[*_]*\s*[:：][*_]*\s*/iu;
// A standalone notes heading owns the rest of this slide (until another slide heading). This catches
// Markdown such as `### Teacher notes` followed by bullets, rather than leaking those bullets.
const TEACHER_SECTION = /^\s*(?:#{1,6}\s*)?[*_]*\s*(?:teacher['’]?s?\s+notes?|teaching\s+notes?|presenter['’]?s?\s+notes?|speaker\s+notes?)\s*[*_]*\s*:?[*_]*\s*$/iu;
const TEACHER_EMOJI_LINE = /^\s*(?:🧑‍🏫|👩‍🏫|👨‍🏫)\s*/u;
// LLM-authored decks use this as an unresolved production instruction. It is for the teacher/editor,
// never slide content: showing "[show: ...]" on the board looks exactly like a leaked presenter note.
const VISUAL_DIRECTIVE = /^\s*>\s*🖼️?\s*\[show:\s*([^\]]+)\]\s*$/iu;
// A teacher-note BLOCKQUOTE: first line carries a teacher emoji (🧑‍🏫/👩‍🏫/👨‍🏫 or a bare 🏫) or a
// `teacher`/`say`/`presenter` marker. The whole contiguous `>` block is then teacher-only.
const TEACHER_QUOTE = /^\s*>\s*(?:🧑‍🏫|👩‍🏫|👨‍🏫|🏫|\**\s*(?:say|teacher|presenter)\b)/iu;
const QUOTE_LINE = /^\s*>/;
// Strip the leading `>` + any teacher marker/emoji from a quoted note line, leaving the note text.
const QUOTE_PREFIX = /^\s*>\s?(?:\**\s*(?:🧑‍🏫|👩‍🏫|👨‍🏫|🏫)\s*)?(?:\**\s*(?:say|teacher['’]?s?(?:\s+notes?)?|teaching\s+notes?|presenter['’]?s?(?:\s+notes?)?|speaker\s+notes?)\s*[:：]?\s*)?/iu;

function tidyNoteLine(line: string): string {
  return line
    .replace(/^\s*>\s?/, '')
    .replace(/^\s*[-*+]\s+/, '')
    .replace(TEACHER_LINE, '')
    .replace(TEACHER_EMOJI_LINE, '')
    .replace(/[*_]+\s*$/, '')
    .trim();
}

/** Split one slide's Markdown into the pupil-visible part and the (private) teacher notes. The clean
 *  part NEVER contains teacher notes; that's the safety boundary the pupil/board render relies on. */
export function splitTeacherNotes(md: string): { clean: string; notes: string } {
  const lines = (md ?? '').replace(/\r\n/g, '\n').split('\n');
  const clean: string[] = [];
  const notes: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const l = lines[i]!;
    const visual = l.match(VISUAL_DIRECTIVE);
    if (visual) {
      notes.push(`Visual to add: ${visual[1]!.trim()}`);
      i += 1;
      continue;
    }
    if (TEACHER_SECTION.test(l)) {
      i += 1;
      while (i < lines.length && !/^##\s/.test(lines[i]!)) {
        notes.push(tidyNoteLine(lines[i]!));
        i += 1;
      }
      continue;
    }
    if (TEACHER_LINE.test(l)) {
      const note = l.replace(TEACHER_LINE, '').replace(/[*_]+\s*$/, '').trim();
      notes.push(note); // keep the talking point as a note
      // `Teacher notes:` on its own introduces a multi-line note section.
      if (!note) {
        i += 1;
        while (i < lines.length && !/^##\s/.test(lines[i]!)) {
          notes.push(tidyNoteLine(lines[i]!));
          i += 1;
        }
        continue;
      }
      i += 1;
      while (i < lines.length && lines[i]!.trim() !== '' && !/^##\s/.test(lines[i]!)) {
        notes.push(tidyNoteLine(lines[i]!));
        i += 1;
      }
      continue;
    }
    if (TEACHER_EMOJI_LINE.test(l)) {
      notes.push(l.replace(TEACHER_EMOJI_LINE, '').trim());
      i += 1;
      while (i < lines.length && lines[i]!.trim() !== '' && !/^##\s/.test(lines[i]!)) {
        notes.push(tidyNoteLine(lines[i]!));
        i += 1;
      }
      continue;
    }
    if (TEACHER_QUOTE.test(l)) {
      while (i < lines.length && QUOTE_LINE.test(lines[i]!)) {
        notes.push(lines[i]!.replace(QUOTE_PREFIX, '').trim()); // the whole contiguous block is teacher-only
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
