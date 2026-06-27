import { esc } from './html';
import { paths } from './paths';
import { renderMarkdown } from './markdown';
import { sliceSlidesForLevel, splitTeacherNotes } from './slideDeck';
import { renderWorksheet, savedTick, type Level } from './worksheetForm';
import type { PupilResults } from '../services/marking';

export const ACTIVITY_CHIPS = ['practical', 'typing', 'cards', 'video', 'drawing', 'talking', 'worksheet', 'quiz', 'games', 'reading'];

export const FACES = [
  { v: 1, e: '🙁', l: 'Not great' },
  { v: 2, e: '😐', l: 'Okay' },
  { v: 3, e: '🙂', l: 'Good' },
  { v: 4, e: '😀', l: 'Awesome!' },
];

export function extractTextFromMarkdown(md: string): string {
  if (!md) return '';
  let txt = md;
  // Remove markdown headers
  txt = txt.replace(/^#+\s+/gm, '');
  // Remove markdown images
  txt = txt.replace(/!\[.*?\]\(.*?\)/g, '');
  // Remove markdown links but keep text
  txt = txt.replace(/\[(.*?)\]\(.*?\)/g, '$1');
  // Remove bold/italics
  txt = txt.replace(/[*_~`]+/g, '');
  // Remove HTML tags
  txt = txt.replace(/<[^>]*>/g, '');
  // Remove blockquotes/lists prefixes
  txt = txt.replace(/^\s*>\s?/gm, '');
  txt = txt.replace(/^\s*[-*+]\s+/gm, '');
  txt = txt.replace(/^\s*\d+\.\s+/gm, '');
  // Trim and collapse whitespace
  return txt.replace(/\s+/g, ' ').trim();
}

function chipRow(group: 'liked' | 'disliked', selected: Set<string>): string {
  return ACTIVITY_CHIPS.map(
    (c) =>
      `<label class="chip${selected.has(c) ? ' active' : ''}"><input type="checkbox" name="${group}" value="${c}"${selected.has(c) ? ' checked' : ''}> ${esc(c)}</label>`,
  ).join('');
}

function feedbackWidget(oc: number, fb: { rating: number | null; liked: string; disliked: string; comment: string } | null): string {
  const liked = new Set((fb?.liked ?? '').split(',').map((s) => s.trim()).filter(Boolean));
  const disliked = new Set((fb?.disliked ?? '').split(',').map((s) => s.trim()).filter(Boolean));
  return `<form class="pupil-feedback" id="fb-${oc}" hx-post="${paths.meFeedback(oc)}" hx-trigger="change delay:400ms" hx-swap="none">
    <h3>How was this lesson?</h3>
    <div class="face-row">
      ${FACES.map((f) => `<label class="face" title="${f.l}"><input type="radio" name="rating" value="${f.v}"${fb?.rating === f.v ? ' checked' : ''}> <span>${f.e}</span></label>`).join('')}
    </div>
    <p class="fb-q">What did you enjoy?</p>
    <div class="chip-row">${chipRow('liked', liked)}</div>
    <p class="fb-q">What didn't you like?</p>
    <div class="chip-row">${chipRow('disliked', disliked)}</div>
    <label class="fb-comment">Anything else? <textarea name="comment" rows="2" maxlength="500" placeholder="(optional)">${esc(fb?.comment ?? '')}</textarea></label>
    <span class="note-status" id="fb-${oc}-status"></span>
  </form>`;
}

function resultsCard(r: PupilResults): string {
  const mark = (a: number, t: number): string =>
    t <= 0 ? '' : a >= t ? '<span class="rc-ok">✓</span>' : a <= 0 ? '<span class="rc-no">✗</span>' : '<span class="rc-part">◐</span>';
  const items = r.items
    .map((i) => {
      const fb = i.feedback || (i.awarded <= 0 && i.total > 0 ? 'Have another look at this one next time — you can do it.' : '');
      return `<li class="rc-item">${mark(i.awarded, i.total)} <span class="rc-q">${esc(i.label)}</span>${r.showScores ? ` <span class="rc-score">${i.awarded}/${i.total}</span>` : ''}
        ${fb ? `<div class="rc-fb">${esc(fb)}</div>` : ''}</li>`;
    })
    .join('');
  return `<section class="pupil-results">
    <h2>Your feedback ${r.showScores ? `<span class="rc-total">${r.awarded}/${r.total}</span>` : ''}</h2>
    ${r.comment ? `<p class="rc-comment">💬 ${esc(r.comment)}</p>` : ''}
    <ul class="rc-list">${items}</ul>
  </section>`;
}

/**
 * The ONE source of per-slide markup, shared by every surface (pupil /me + preview, presenter, the
 * projector board, and the cockpit mirror) so a slide renders identically everywhere: a `.slide-content
 * md-doc` body (consistent table/code/heading framing), one "Listen" button class, the `.pslide` +
 * `data-slide` JS contract. Callers wrap this stage in their own chrome (deck head/nav, board foot, …).
 */
export function renderPslide(clean: string, i: number, opts: { on?: boolean; notesPanel?: string } = {}): string {
  const slideText = extractTextFromMarkdown(clean);
  const speakButton = slideText
    ? `<button type="button" class="ws-speak btn-soft pslide-speak-btn" data-speak-text="${esc(slideText)}" title="Read slide aloud">🔊 Listen</button>`
    : '';
  return `<div class="pslide${opts.on ? ' on' : ''}" data-slide="${i}">
    <div class="pslide-content-header">${speakButton}</div>
    <div class="slide-content md-doc">${renderMarkdown(clean)}</div>
    ${opts.notesPanel ?? ''}
  </div>`;
}

export function renderSlideDeck(md: string, deckId: string, level: Level, audience: 'pupil' | 'teacher' = 'pupil'): string {
  const slides = sliceSlidesForLevel(md, level);
  if (slides.length === 0) return '';
  const html = slides
    .map((s, i) => {
      const { clean, notes } = splitTeacherNotes(s);
      const notesPanel = audience === 'teacher' && notes
        ? `<aside class="pslide-notes" aria-label="Teaching notes — not shown to pupils"><span class="pslide-notes-h">🧑‍🏫 Teaching notes <span class="muted">— only you see these</span></span><div class="pslide-notes-body">${renderMarkdown(notes)}</div></aside>`
        : '';
      return renderPslide(clean, i, { on: i === 0, notesPanel });
    })
    .join('');
  return `<section class="pupil-slides${audience === 'teacher' ? ' teacher-present' : ''}" data-deck="${esc(deckId)}" aria-label="Lesson slides">
    <div class="pslide-head"><span class="pslide-title">📊 Slides</span><span class="pslide-count">Slide <b class="pslide-n">1</b> / ${slides.length}</span></div>
    <div class="pslide-stage">${html}</div>
    <div class="pslide-nav">
      <button type="button" class="btn-soft pslide-prev" aria-label="Previous slide">◀ Back</button>
      <span class="muted pslide-hint">Follow along on the board</span>
      <button type="button" class="btn-soft pslide-next" aria-label="Next slide">Next ▶</button>
    </div>
  </section>`;
}

function doneBlock(oc: number, done: boolean): string {
  return `<div class="pupil-done" id="done-${oc}">
    ${
      done
        ? `<p class="done-yes">✓ You marked this done — well done!</p>
           <button type="button" class="link" hx-post="${paths.meDone(oc)}" hx-vals='{"done":"false"}' hx-target="#done-${oc}" hx-swap="outerHTML">not finished yet</button>`
        : `<button type="button" class="pupil-go done-btn" hx-post="${paths.meDone(oc)}" hx-vals='{"done":"true"}' hx-target="#done-${oc}" hx-swap="outerHTML">I'm done ✓</button>`
    }
  </div>`;
}

interface MePageOptions {
  acting: { id: number; isTest: boolean };
  name: string;
  csrf: string;
  testLevel: Level;
  todayLabel: string;
  canRemember: boolean;
  remember: string;
  levelBtns: string;
  head: string;
  lesson: { lessonId: number; date: string } | null;
  blocks: string[];
  homeworkHtml?: string; // 16B — the pupil's outstanding-homework list, above the lesson blocks
}

export function renderMePage(options: MePageOptions): string {
  const { head, blocks, homeworkHtml } = options;
  return `${head}${homeworkHtml ?? ''}${blocks.join('') || '<section class="pupil-card"><p class="pupil-note">Nothing set for this lesson yet.</p></section>'}`;
}

export async function buildOccurrenceBlock(
  s: { occurrenceCourseId: number; groupCourseId: number; lessonPlanId: number | null; planTitle: string | null; courseName: string; planObjectives: string | null; planOutline: string | null; colour: string | null },
  pupilId: number,
  isTest: boolean,
  testLevel: Level,
  name: string,
  todayLabel: string,
  marksEnabledVal: boolean,
  fetchLevel: () => Promise<Level>,
  fetchAnswers: (oc: number) => Promise<Map<string, string>>,
  fetchIsDone: (oc: number) => Promise<boolean>,
  fetchFeedback: (oc: number) => Promise<{ rating: number | null; liked: string; disliked: string; comment: string } | null>,
  fetchWorksheets: (gc: number, lp: number) => Promise<Array<{ index: number; markdown: string; title: string; keyPrefix: string; resourceId: number; versionNo: number }>>,
  fetchSlides: (gc: number, lp: number) => Promise<string | null>,
  fetchResults: (oc: number) => Promise<PupilResults | null>
): Promise<string> {
  const oc = Number(s.occurrenceCourseId);
  let inner = '';
  if (s.lessonPlanId != null) {
    const [worksheets, slidesMd] = await Promise.all([
      fetchWorksheets(Number(s.groupCourseId), Number(s.lessonPlanId)),
      fetchSlides(Number(s.groupCourseId), Number(s.lessonPlanId)),
    ]);
    if (worksheets.length) {
      const [level, values, done, fb] = await Promise.all([
        isTest ? Promise.resolve(testLevel) : fetchLevel(),
        fetchAnswers(oc),
        fetchIsDone(oc),
        fetchFeedback(oc),
      ]);
      const renderOne = (w: (typeof worksheets)[number]): string =>
        `<div class="ws-doc">${renderWorksheet(w.markdown, { mode: 'form', level, values, action: paths.meAnswer(oc), autofill: { name, date: todayLabel }, keyPrefix: w.keyPrefix }).html}</div>`;
      let wsHtml: string;
      if (worksheets.length === 1) {
        wsHtml = renderOne(worksheets[0]!);
      } else {
        const tabLabel = (w: (typeof worksheets)[number], i: number): string => esc(w.title.replace(/\s*[—-]\s*worksheet\.md$/i, '').trim() || `Worksheet ${i + 1}`);
        const tabs = worksheets.map((w, i) => `<button type="button" class="ws-tab${i === 0 ? ' is-on' : ''}" role="tab" aria-selected="${i === 0}" data-ws-tab="${i}">${tabLabel(w, i)}</button>`).join('');
        const panels = worksheets.map((w, i) => `<div class="ws-panel${i === 0 ? ' is-on' : ''}" data-ws-panel="${i}">${renderOne(w)}</div>`).join('');
        wsHtml = `<div class="ws-tabs" role="tablist" aria-label="Worksheets">${tabs}</div>${panels}`;
      }
      const results = marksEnabledVal ? await fetchResults(oc) : null;
      const work = `${results ? resultsCard(results) : ''}<p class="ws-progress" aria-live="polite"></p>${wsHtml}${doneBlock(oc, done)}${feedbackWidget(oc, fb)}`;
      const deck = slidesMd ? renderSlideDeck(slidesMd, String(oc), level) : '';
      inner = deck
        ? `<div class="pupil-twopane" data-pane="work">
             <div class="pane-toggle" role="tablist" aria-label="Show slides or worksheet">
               <button type="button" class="pane-tab" role="tab" data-pane-btn="slides" aria-selected="false">📊 Slides</button>
               <button type="button" class="pane-tab is-on" role="tab" data-pane-btn="work" aria-selected="true">📝 My worksheet</button>
             </div>
             <div class="pupil-pane pupil-pane-slides">${deck}</div>
             <div class="pupil-pane pupil-pane-work">${work}</div>
           </div>`
        : work;
    }
  }
  if (!inner) inner = '<p class="pupil-note">Nothing to do here yet — your teacher will add it.</p>';
  return `<section class="pupil-card pupil-work-card"><h1>${esc(s.planTitle ?? s.courseName)}</h1>${inner}</section>`;
}
