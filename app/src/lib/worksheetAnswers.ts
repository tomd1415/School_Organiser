// Bridge between the worksheet block editor and the mark scheme (docs/LESSON_WORKSHEET_EDITOR_PLAN.md Gap B).
// The teacher sets correct/model answers on choice / multi-select rows; we map them to render-time field keys
// by DOCUMENT ORDER (render the Markdown, take its choice/multichoice fields in order, zip with the editor's
// choice/multichoice rows in order). If the counts don't line up (e.g. a choice cell lives in a raw block the
// editor doesn't model) we return null and write NO scheme, rather than a misaligned — and therefore wrong —
// one. v1 covers choice + multichoice (discrete, visible answers); text/blank/scale model answers are a
// documented follow-up.
import type { Block, QRow } from './worksheetBlocks';
import { renderWorksheet } from './worksheetForm';

export interface ChoicePoint { fieldKey: string; kind: 'choice' | 'multichoice'; expected: string }

function choiceFieldKeys(markdown: string): { key: string; kind: 'choice' | 'multichoice' }[] {
  return renderWorksheet(markdown, { mode: 'review' }).fields
    .filter((f) => f.kind === 'choice' || f.kind === 'multichoice')
    .map((f) => ({ key: f.key, kind: f.kind as 'choice' | 'multichoice' }));
}

function choiceRows(blocks: Block[]): QRow[] {
  const rows: QRow[] = [];
  for (const b of blocks) if (b.type === 'qtable') for (const r of b.rows) if (r.kind === 'choice' || r.kind === 'multichoice') rows.push(r);
  return rows;
}

/** Build the mark-scheme points from the editor's choice/multichoice answers. null ⇒ alignment broken. */
export function choiceAnswerPoints(markdown: string, blocks: Block[]): ChoicePoint[] | null {
  const fields = choiceFieldKeys(markdown);
  const rows = choiceRows(blocks);
  if (fields.length !== rows.length) return null;
  const points: ChoicePoint[] = [];
  for (let i = 0; i < fields.length; i++) {
    const ans = rows[i]!.answer;
    const expected = Array.isArray(ans) ? ans.filter((x) => x.trim() !== '').join(', ') : (ans ?? '').toString().trim();
    if (expected === '') continue; // no answer set → leave that question to AI / manual marking
    points.push({ fieldKey: fields[i]!.key, kind: fields[i]!.kind, expected });
  }
  return points;
}

/** The reverse, for loading the editor: the expected answer per choice/multichoice field in document order
 * (null where none is set), so the editor can zip them onto its choice rows. */
export function choiceAnswersInOrder(markdown: string, expectedByKey: Record<string, string>): (string | null)[] {
  return choiceFieldKeys(markdown).map((f) => (f.key in expectedByKey ? expectedByKey[f.key]! : null));
}
