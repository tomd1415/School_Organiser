// "Adjust with AI" service (docs/ADJUST_WITH_AI_PLAN.md). Two steps so the AI never silently overwrites a
// working artefact: `proposeAdjustment` calls the wrapper and returns the improved Markdown (saves nothing);
// `applyAdjustment` validates it and writes a new MASTER version. Everything AI goes through the one wrapper,
// so redaction / safeguarding-withholding / audit / budget all apply. (Class-copy target + lesson-plan
// artefacts are the documented follow-up; v1 handles worksheet/slides resources → master.)
import { callLLM } from '../llm/client';
import { modelForFeature } from '../repos/settings';
import { ADJUST_SYSTEM, ADJUST_VERSION, adjustContext, adjustInstruction, type ArtefactKind } from '../llm/prompts/adjustArtefact';
import { getResource, getCurrentVersion, addVersion } from '../repos/resources';
import { readStored, relPathFor, withStagedFile, checksum } from '../lib/resourceStore';
import { renderWorksheet } from '../lib/worksheetForm';
import { sliceSlidesForLevel } from '../lib/slideDeck';

export type AdjustStatus = 'ok' | 'unavailable' | 'invalid' | 'notfound' | 'error';
export interface ProposeResult { status: AdjustStatus; markdown?: string; message?: string }
export interface ApplyResult { status: AdjustStatus; version?: number; message?: string }

const kindOf = (resourceKind: string): ArtefactKind => (resourceKind === 'slides' ? 'slides' : 'worksheet');

/** Markdown is valid for its kind: a worksheet renders ≥1 answerable field; a slide deck has a title and a
 * slide. Cheap, render-based — blocks the AI from saving something the cockpit can't use. */
export function isValidArtefact(kind: ArtefactKind, md: string): boolean {
  if (!md || md.trim() === '') return false;
  if (kind === 'slides') return /^#\s+\S/m.test(md) && sliceSlidesForLevel(md, 'core').length >= 1;
  // worksheet/lesson: must render at least one answerable field (so it isn't an empty/broken sheet)
  try {
    return renderWorksheet(md, { mode: 'review' }).fields.length >= 1;
  } catch {
    return false;
  }
}

async function currentMarkdown(resourceId: number): Promise<string | null> {
  const v = await getCurrentVersion(resourceId);
  if (!v) return null;
  try {
    return (await readStored(v.storagePath)).toString('utf8');
  } catch {
    return null;
  }
}

/** Step 1 — generate an improved version of the artefact. Saves nothing. */
export async function proposeAdjustment(resourceId: number, teacherRequest: string, teachingContext: string | null): Promise<ProposeResult> {
  const r = await getResource(resourceId);
  if (!r) return { status: 'notfound' };
  const md = await currentMarkdown(resourceId);
  if (md == null) return { status: 'notfound' };
  const kind = kindOf(r.kind);

  const res = await callLLM({
    feature: kind === 'slides' ? 'adjust_slides' : 'adjust_worksheet',
    model: await modelForFeature(kind === 'slides' ? 'adjust_slides' : 'adjust_worksheet', 'plan'),
    promptVersion: ADJUST_VERSION,
    system: ADJUST_SYSTEM,
    context: adjustContext(md, teachingContext),
    instruction: adjustInstruction(kind, teacherRequest),
    maxTokens: 8000,
  });
  if (res.status !== 'ok' || !res.text) {
    return { status: 'unavailable', message: res.message ?? 'AI is off or unavailable right now.' };
  }
  const improved = stripFences(res.text).trim();
  if (!isValidArtefact(kind, improved)) {
    return { status: 'invalid', message: 'The AI returned something that does not look like a valid worksheet/deck — try rewording the request.' };
  }
  return { status: 'ok', markdown: improved };
}

/** Step 2 — write the (teacher-confirmed) improved Markdown as a NEW master version. */
export async function applyAdjustment(resourceId: number, markdown: string): Promise<ApplyResult> {
  const r = await getResource(resourceId);
  if (!r) return { status: 'notfound' };
  const kind = kindOf(r.kind);
  if (!isValidArtefact(kind, markdown)) return { status: 'invalid', message: 'That content is not a valid worksheet/deck.' };
  const nextNo = (r.versionNo ?? 0) + 1;
  const buf = Buffer.from(markdown, 'utf8');
  const rel = relPathFor(resourceId, nextNo, r.title);
  await withStagedFile(rel, buf, () => addVersion(resourceId, rel, buf.length, checksum(buf), 'ai', 'adjusted with AI'));
  return { status: 'ok', version: nextNo };
}

/** The model sometimes wraps the whole reply in a ``` fence despite being told not to — peel one off. */
function stripFences(s: string): string {
  const m = s.trim().match(/^```[a-z]*\n([\s\S]*?)\n```$/i);
  return m ? m[1]! : s;
}
