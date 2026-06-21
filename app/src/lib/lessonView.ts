import { esc } from './html';
import { CourseSection, LessonDetail, OccurrenceHeader } from '../services/occurrence';
import { NoteItem, FollowupItem } from './notesView';
import { renderPrepList, renderPrepAdd } from './prepView';
import { PrepItem } from '../repos/prep';
import { LinkedResource } from '../repos/resources';
import { TaFeedbackRow } from '../repos/taFeedback';
import { EffectiveLesson } from '../repos/adaptations';
import { renderLinkedResources } from './resourceView';
import { Level } from './worksheetForm';
import { PupilWorkRow } from '../repos/pupilWork';
import { renderMarkdown } from './markdown';
import { sliceSlidesForLevel, splitTeacherNotes } from './slideDeck';

// Custom interface for notes in the cockpit
export interface CockpitNote {
  id: number;
  body: string;
  time: string;
  category: string | null;
  safeguarding: boolean;
  followups: FollowupItem[];
}

/**
 * Strip Markdown tags to generate plain text for text-to-speech (TTS)
 */
export function getSpeakText(markdown: string): string {
  return (markdown ?? '')
    .replace(/^#+\s+/gm, '') // headings
    .replace(/^\s*[-*+]\s+/gm, '') // bullet lists
    .replace(/^\s*\d+\.\s+/gm, '') // numbered lists
    .replace(/[*_`~]/g, '') // formatting
    .replace(/\n+/g, ' ') // lines
    .trim();
}

/**
 * Helper to parse basic slide titles and list bullet points
 */
function parseSlideInfo(slideMd: string, index: number): { heading: string; points: string } {
  const lines = slideMd.split('\n');
  const headingLine = lines.find((l) => l.startsWith('## '));
  const heading = headingLine ? getSpeakText(headingLine.replace('## ', '').trim()) : `Slide ${index + 1}`;
  const points = lines
    .filter((l) => l.trim().startsWith('- ') || l.trim().startsWith('* '))
    .map((l) => getSpeakText(l.replace(/^[-*]\s+/, '').trim()))
    .join('|');
  return { heading, points };
}

/**
 * Renders the compact recent notes list inside the Fast Capture panel
 */
export function renderRecentNotesList(notes: CockpitNote[]): string {
  if (!notes || notes.length === 0) {
    return `<p class="muted recent-notes-empty">No notes recorded during this lesson yet.</p>`;
  }
  const items = notes
    .map((n) => {
      const badgeClass = n.safeguarding
        ? 'badge danger'
        : n.category === 'support'
        ? 'badge warn'
        : n.category === 'behaviour'
        ? 'badge behaviour'
        : 'badge';
      const label = n.safeguarding ? 'Safeguarding' : n.category ? n.category.charAt(0).toUpperCase() + n.category.slice(1) : 'Learning';
      return `<li>
        <span class="${badgeClass}">${esc(label)}</span>
        <span>${esc(n.body || '(empty note)')}</span>
        <time>${esc(n.time)}</time>
      </li>`;
    })
    .join('');
  return `<ul class="recent-notes" data-recent-notes aria-label="Recent lesson notes">${items}</ul>`;
}

/**
 * Renders the contents of the Activity Groups card (Support, Core, Extend lists)
 */
export function renderActivityGroupsContent(ocId: number, rows: PupilWorkRow[], locked: boolean): string {
  const support: PupilWorkRow[] = [];
  const core: PupilWorkRow[] = [];
  const extend: PupilWorkRow[] = [];

  for (const r of rows) {
    if (r.level === 'support') support.push(r);
    else if (r.level === 'challenge') extend.push(r);
    else core.push(r);
  }

  const renderNames = (list: PupilWorkRow[]) =>
    list.map((p) => `<li>${esc(p.displayName)}</li>`).join('');

  return `
    <p class="group-state">
      <span class="badge ${locked ? 'danger' : 'live'}">${locked ? 'Locked' : 'Editable'}</span>
      <span data-group-state>${locked ? 'Independent work in progress · changes locked' : 'Independent work has not started · changes update pupil worksheets'}</span>
    </p>
    <div class="group-columns">
      <section class="group support">
        <h3>Support <span><span data-group-count="support">${support.length}</span> pupils</span></h3>
        <ul class="pupil-list">${renderNames(support) || '<li class="muted">None</li>'}</ul>
      </section>
      <section class="group core">
        <h3>Core <span><span data-group-count="core">${core.length}</span> pupils</span></h3>
        <ul class="pupil-list">${renderNames(core) || '<li class="muted">None</li>'}</ul>
      </section>
      <section class="group extend">
        <h3>Extend <span><span data-group-count="extend">${extend.length}</span> pupils</span></h3>
        <ul class="pupil-list">${renderNames(extend) || '<li class="muted">None</li>'}</ul>
      </section>
    </div>
  `;
}

/**
 * Heuristics to rank and surface 2-3 pupils needing attention
 */
function renderPupilsNeedingAttention(rows: PupilWorkRow[]): string {
  const surfaced: Array<{ name: string; level: string; reason: string }> = [];

  for (const r of rows) {
    if (r.level === 'support' && r.filled === 0) {
      surfaced.push({ name: r.displayName, level: 'Support', reason: 'Not yet saved any worksheet answers.' });
    } else if (r.rating === 1 || r.rating === 2) {
      surfaced.push({ name: r.displayName, level: r.level.charAt(0).toUpperCase() + r.level.slice(1), reason: 'Left unhappy or neutral feedback.' });
    } else if (r.level === 'challenge' && r.done) {
      surfaced.push({ name: r.displayName, level: 'Extend', reason: 'Worksheet completed.' });
    }
  }

  const limit = surfaced.slice(0, 3);
  if (limit.length === 0) {
    return `<p class="muted" style="padding: 12px 16px;">All pupils are working productively. ✓</p>`;
  }

  const items = limit
    .map(
      (p) => `<li><strong>${esc(p.name)} · ${esc(p.level)}</strong><span>${esc(p.reason)}</span></li>`
    )
    .join('');

  return `<ul class="support-list">${items}</ul>`;
}

/**
 * Main function to render the three-column Unified Cockpit Layout
 */
export function renderLessonCockpit(options: {
  detail: LessonDetail;
  notes: NoteItem[];
  prep: PrepItem[];
  plansByCourse: Map<number, Array<{ id: number; title: string }>>;
  resByPlan: Map<number, LinkedResource[]>;
  matByPlan: Map<number, string[]>;
  effByKey: Map<string, EffectiveLesson>;
  adaptedResByKey: Map<string, LinkedResource[]>;
  taFbByOc: Map<number, TaFeedbackRow[]>;
  exceptionsHtml: string;
  csrf: string;
  slidesByKey: Map<string, string | null>; // BUG-052: keyed `${groupCourseId}:${lessonPlanId}` so two
  pupilWorkByOc: Map<number, PupilWorkRow[]>; //  classes adapting one plan don't collide on slides
  lockedStateMap?: Map<number, boolean>; // track client-simulated group lock state
  preview?: { backHref: string }; // read-only scheme preview: never expose occurrence write controls
  selectedOc?: number; // BUG-052: which split-lesson section (occurrence-course) to show; default first
}): string {
  const {
    detail,
    notes,
    prep,
    plansByCourse,
    resByPlan,
    matByPlan,
    effByKey,
    adaptedResByKey,
    taFbByOc,
    exceptionsHtml,
    csrf,
    slidesByKey,
    pupilWorkByOc,
    lockedStateMap = new Map(),
    preview,
    selectedOc,
  } = options;
  const isPreview = preview != null;

  const h = detail.header;
  // BUG-052: a split lesson carries one section per course/class. Show the one the `oc` query param
  // selects (default the first); a tab bar switches between them, and every panel below is scoped to it.
  const activeSection = detail.sections.find((s) => s.occurrenceCourseId === selectedOc) ?? detail.sections[0];
  const oc = activeSection?.occurrenceCourseId ?? 0;
  const groupCourseId = activeSection?.groupCourseId ?? 0;
  const lp = activeSection?.lessonPlanId ?? 0;
  const currentLevel = 'core'; // default preview level

  const heading = h.groupName ? esc(h.groupName) : esc(h.purpose);
  const meta = [h.periodLabel, h.start && h.end ? `${h.start}–${h.end}` : '', h.roomName ?? '']
    .filter(Boolean)
    .map((x) => esc(x))
    .join(' · ');

  // Fetch slide deck if available
  const slidesMd = lp ? slidesByKey.get(`${groupCourseId}:${lp}`) : null;
  let slideThumbsHtml = '';
  let slidePreviewsHtml = '';
  let slideNotesHtml = '';
  let totalSlides = 0;

  if (slidesMd) {
    const slides = sliceSlidesForLevel(slidesMd, currentLevel);
    totalSlides = slides.length;

    slides.forEach((s, i) => {
      const { clean, notes: slideNote } = splitTeacherNotes(s);

      const { heading, points } = parseSlideInfo(clean, i);
      const current = i === 0 ? 'aria-current="true"' : 'aria-current="false"';
      slideThumbsHtml += `<button class="slide-thumb" type="button" ${current} data-slide-thumb data-position="Slide ${i + 1} of ${slides.length}" data-label="${esc(heading)}" data-title="${esc(heading)}" data-points="${esc(points)}" data-index="${i}">
        <span>${i + 1}</span><strong>${esc(heading)}</strong>
      </button>`;

      const speakText = getSpeakText(clean);
      const speakBtn = `<button type="button" class="ws-speak pslide-speak" data-speak-text="${esc(speakText)}" title="Read slide aloud">🔊 Listen</button>`;

      slidePreviewsHtml += `<div class="pslide${i === 0 ? ' on' : ''}" data-slide="${i}">
        <span class="slide-label">Slide ${i + 1}</span>
        ${speakBtn}
        <div class="slide-content md-doc">${renderMarkdown(clean)}</div>
      </div>`;

      slideNotesHtml += `<div class="pslide-note-item${i === 0 ? ' on' : ''}" data-slide="${i}">
        <label><span class="sr-only">Private notes for slide ${i + 1}</span>
          <textarea placeholder="Add prompts, explanations, questions to ask, or reminders for this slide…" disabled>${esc(slideNote)}</textarea>
        </label>
      </div>`;
    });
  }

  // Column 2: sequence card outline
  let sequenceListHtml = '';
  if (activeSection && activeSection.planOutline) {
    const steps = activeSection.planOutline.split('\n').map((s) => s.trim()).filter(Boolean);
    const progress = activeSection.progressStep ?? null;

    sequenceListHtml = steps
      .map((step, i) => {
        const state = progress == null ? '' : i < progress ? 'done' : i === progress ? 'current' : '';
        const marker = progress != null && i < progress ? '✓' : String(i + 1);
        const badge = progress !== null && i === progress ? '<span class="badge ai">Current</span>' : progress !== null && i < progress ? '<span class="badge good">Done</span>' : '';
        const isCurrent = progress !== null && i === progress;
        const startWorkBtn = !isPreview && isCurrent && (step.toLowerCase().includes('practical') || step.toLowerCase().includes('investigation') || step.toLowerCase().includes('work'))
          ? `<button class="button small" type="button" id="start-work-btn" data-oc="${oc}">Start work</button>`
          : '';

        return `<li class="${state}">
          <span class="step">${marker}</span>
          <div>
            <strong>${esc(step)}</strong>
            ${startWorkBtn}
          </div>
          ${badge}
        </li>`;
      })
      .join('');
  }

  // Fast capture notes translation
  const cockpitNotes: CockpitNote[] = notes.map((n) => ({
    id: n.id,
    body: n.body,
    time: n.time,
    category: n.category ?? null,
    safeguarding: n.safeguarding ?? false,
    followups: n.followups,
  }));
  const recentNotesHtml = renderRecentNotesList(cockpitNotes);

  // Activity groups counts
  const pupilWorkRows = pupilWorkByOc.get(oc) ?? [];
  const groupsLocked = lockedStateMap.get(oc) ?? false;
  const activityGroupsHtml = isPreview
    ? `<div class="lesson-preview-placeholder"><strong>Class groups appear when the lesson is live.</strong><span>Support, Core and Extend membership is class-specific and is not changed by this preview.</span></div>`
    : renderActivityGroupsContent(oc, pupilWorkRows, groupsLocked);

  // Column 3: Live tools
  const needsAttentionHtml = isPreview
    ? `<div class="lesson-preview-placeholder"><strong>Live pupil signals appear here.</strong><span>Needs-attention prompts are calculated from the class's work during the lesson.</span></div>`
    : renderPupilsNeedingAttention(pupilWorkRows);

  // Group course edit dialog
  let groupEditRows = '';
  for (const r of pupilWorkRows) {
    groupEditRows += `
      <div class="group-edit-row">
        <div><strong>${esc(r.displayName)}</strong><small>Fields: ${r.filled} · level: ${esc(r.level)}</small></div>
        <select name="level_${r.pupilId}" aria-label="Level for ${esc(r.displayName)}">
          <option value="support" ${r.level === 'support' ? 'selected' : ''}>Support</option>
          <option value="core" ${r.level === 'core' ? 'selected' : ''}>Core</option>
          <option value="challenge" ${r.level === 'challenge' ? 'selected' : ''}>Extend</option>
        </select>
        <span class="quiet">No suggestion</span>
      </div>
    `;
  }

  const groupEditDialog = isPreview ? '' : `
    <dialog id="groups-dialog" aria-labelledby="group-dialog-title">
      <form hx-post="/lesson/oc/${oc}/save-groups" hx-target="#groups-card-content" hx-swap="innerHTML" hx-on::after-request="if(event.detail.successful)this.closest('dialog').close()">
        <header class="dialog-head">
          <div>
            <p class="eyebrow">Before independent work</p>
            <h2 id="group-dialog-title">Adjust activity groups</h2>
            <p>Choose the worksheet version each pupil will receive.</p>
          </div>
          <button class="dialog-close" type="button" onclick="this.closest('dialog').close()" aria-label="Close group editor">×</button>
        </header>
        <div class="dialog-body">
          <div class="group-editor">
            ${groupEditRows}
          </div>
        </div>
        <footer class="dialog-foot">
          <span class="muted push-left">Changes remain editable until “Start work”.</span>
          <button class="button ghost" type="button" onclick="this.closest('dialog').close()">Cancel</button>
          <button class="button primary" type="submit">Save groups</button>
        </footer>
      </form>
    </dialog>
  `;

  // Hidden original element for binding OOB swaps from legacy routes
  const hiddenOriginalSwapElements = isPreview ? '' : `
    <div style="display: none;">
      <div id="oc-${oc}-plan"></div>
      <div id="trk-${oc}"></div>
      <div id="oc-${oc}-res"></div>
      <span id="oc-${oc}-status"></span>
    </div>
  `;

  const boardHref = isPreview
    ? `/lesson/pupil-view?master=1&amp;lp=${lp}&amp;level=${currentLevel}`
    : `/lesson/pupil-view?gc=${groupCourseId}&amp;lp=${lp}&amp;level=${currentLevel}`;

  // BUG-052: split-lesson course/class switcher (only when there's more than one section). Plain links
  // reload the cockpit scoped to the chosen occurrence-course; preview is single-section so shows none.
  const sectionTabs = detail.sections.length > 1
    ? `<nav class="cockpit-course-tabs" aria-label="Classes in this lesson">${detail.sections
        .map((s) => {
          const on = s.occurrenceCourseId === oc;
          return `<a class="course-tab${on ? ' active' : ''}"${on ? ' aria-current="page"' : ''} href="/lesson?lesson=${h.lessonId}&amp;date=${esc(h.date)}&amp;oc=${s.occurrenceCourseId}"${s.colour ? ` style="--tab-colour:${esc(s.colour)}"` : ''}>${esc(s.courseName || 'Class')}</a>`;
        })
        .join('')}</nav>`
    : '';

  return `
    <div class="ld overhaul-cockpit" hx-headers='{"x-csrf-token":"${csrf}"}'>
      <section class="live-bar" aria-labelledby="lesson-title">
        <div>
          <span class="badge ${isPreview ? 'ai' : 'live'}"><span class="dot" aria-hidden="true"></span> ${isPreview ? 'Lesson preview · not live' : 'Live lesson'}</span>
          <h1 id="lesson-title">${esc(heading)}</h1>
          <p>${esc(meta)}${isPreview ? ' · No lesson occurrence or pupil record is created' : ` · ${pupilWorkRows.length} pupils`}</p>
        </div>
        <div class="lesson-clock" data-clock>—:—</div>
        <div class="lesson-actions">
          ${isPreview ? `<a class="button ghost" href="${esc(preview.backHref)}">← Back to scheme</a>` : ''}
          <a class="button primary" href="${boardHref}" target="_blank" rel="noopener">Open board screen</a>
          <button class="button focus-mode-toggle" type="button">Focus Mode</button>
          ${isPreview ? '' : `<button class="button ghost" type="button" title="No class this period? Mark it free and assign yourself tasks" hx-post="/free/mark" hx-vals='{"lesson":"${h.lessonId}","date":"${esc(h.date)}"}'>Make free</button>`}
        </div>
      </section>

      ${sectionTabs}

      ${exceptionsHtml}

      <div class="cockpit">
        <!-- Column 1: Slides & mirror -->
        <div class="cockpit-column">
          <section class="slides-card card" aria-labelledby="slides-title">
            <div class="card-head">
              <div>
                <p class="eyebrow">Board mirror</p>
                <h2 id="slides-title">Slides</h2>
              </div>
              <span class="badge"><span data-slide-position>Slide 1 of ${totalSlides}</span></span>
            </div>
            <div class="slide-workspace">
              <div class="slide-thumbs" aria-label="Slide thumbnails">
                ${slideThumbsHtml || '<p class="muted" style="padding:16px;">No slides available for this lesson.</p>'}
              </div>
              <div class="slide-preview" data-slide-preview aria-live="polite">
                ${slidePreviewsHtml || '<div class="pslide on"><p class="muted">No slides deck bound.</p></div>'}
              </div>
            </div>
            <div class="slide-controls">
              <p>The board display contains no pupil names or private notes.</p>
              <div>
                <button class="button ghost small" type="button" id="slide-prev-btn">← Previous</button>
                <button class="button small" type="button" id="slide-next-btn">Next →</button>
              </div>
            </div>
            <section class="quick-note" aria-labelledby="slide-notes-title">
              <div class="card-head">
                <div>
                  <p class="eyebrow" id="slide-notes-eyebrow">Private · slide 1</p>
                  <h3 id="slide-notes-title">Teacher notes for this slide</h3>
                </div>
                <span class="badge ai">Future feature</span>
              </div>
              <div class="slide-notes-container">
                ${slideNotesHtml || '<textarea placeholder="No notes for this slide." disabled></textarea>'}
              </div>
              <div class="quick-note-actions">
                <span class="muted">Visible only on the teacher screen. Notes will follow the selected slide.</span>
                <button class="button small" type="button" disabled>Save slide note</button>
              </div>
            </section>
          </section>
        </div>

        <!-- Column 2: Lesson flow & capture -->
        <div class="cockpit-column">
          <section class="sequence-card card" aria-labelledby="sequence-title">
            <div class="card-head">
              <div>
                <p class="eyebrow">Lesson flow</p>
                <h2 id="sequence-title">What comes next</h2>
              </div>
              <div>
                ${isPreview
                  ? '<span class="badge ai">Read-only preview</span>'
                  : `<!-- Keep stopping point input to satisfy hx-post changed trigger -->
                    <input class="stop-input" name="stopping_point" value="${esc(activeSection?.stoppingPoint ?? '')}" placeholder="where we got to…"
                      hx-post="/occurrence-course/${oc}/stopping" hx-trigger="input changed delay:800ms, blur" hx-swap="none" style="display:none;">
                    <button class="button ghost small" type="button" id="stopping-point-trigger-btn">Record stopping point</button>`}
              </div>
            </div>
            <ol class="sequence">
              ${sequenceListHtml || '<li class="muted">No outline set for this plan.</li>'}
            </ol>
          </section>

          <!-- Fast capture notes -->
          <section class="notes-card card" aria-labelledby="notes-title">
            <div class="card-head">
              <div>
                <p class="eyebrow">Fast capture</p>
                <h2 id="notes-title">Lesson notes</h2>
              </div>
              <span class="badge">Private to staff</span>
            </div>
            ${isPreview
              ? `<div class="lesson-preview-placeholder"><strong>Fast capture is disabled in preview.</strong><span>When this is a real lesson, notes are saved against its occurrence and shown here.</span></div>`
              : `<div class="note-form">
              <!-- Fast capture categories -->
              <form hx-post="/lesson/oc/${oc}/fast-capture" hx-target="#recent-notes-list" hx-swap="innerHTML" hx-on::after-request="if(window.htmxSaved(event))this.reset()">
                <div class="note-types" aria-label="Note type">
                  <input type="hidden" name="category" id="fast-capture-category" value="Learning">
                  <button class="note-type active" type="button" onclick="document.getElementById('fast-capture-category').value='Learning'; this.parentNode.querySelectorAll('button').forEach(b=>b.classList.remove('active')); this.classList.add('active');">Learning</button>
                  <button class="note-type" type="button" onclick="document.getElementById('fast-capture-category').value='Support'; this.parentNode.querySelectorAll('button').forEach(b=>b.classList.remove('active')); this.classList.add('active');">Support</button>
                  <button class="note-type" type="button" onclick="document.getElementById('fast-capture-category').value='Behaviour'; this.parentNode.querySelectorAll('button').forEach(b=>b.classList.remove('active')); this.classList.add('active');">Behaviour</button>
                  <button class="note-type" type="button" onclick="document.getElementById('fast-capture-category').value='Safeguarding'; this.parentNode.querySelectorAll('button').forEach(b=>b.classList.remove('active')); this.classList.add('active');">Safeguarding</button>
                </div>
                <label>
                  <span class="sr-only">Lesson note</span>
                  <textarea name="body" placeholder="Type what you noticed…" required></textarea>
                </label>
                <div class="note-form-foot">
                  <small data-note-hint>Saved to this lesson. Add pupil links only if needed.</small>
                  <button class="button primary small" type="submit">Save note</button>
                </div>
              </form>
            </div>
            <div id="recent-notes-list">${recentNotesHtml}</div>`}
          </section>

          <!-- Activity Groups -->
          <section id="groups" class="groups-card card" aria-labelledby="groups-title">
            <div class="card-head">
              <div>
                <p class="eyebrow">Activity groups</p>
                <h2 id="groups-title">Who gets which version</h2>
              </div>
              ${isPreview ? '<span class="badge ai">Class-specific</span>' : '<button class="button small" type="button" id="edit-groups-btn" onclick="document.getElementById(\'groups-dialog\').showModal()">Edit groups</button>'}
            </div>
            <div id="groups-card-content">
              ${activityGroupsHtml}
            </div>
          </section>
        </div>

        <!-- Column 3: Live tools -->
        <aside class="cockpit-column" aria-label="Live lesson tools">
          <section class="support-card card" aria-labelledby="support-title">
            <div class="card-head">
              <div>
                <p class="eyebrow">Check first</p>
                <h2 id="support-title">Who may need you</h2>
              </div>
            </div>
            ${needsAttentionHtml}
            ${isPreview ? '' : '<button class="button small" type="button" onclick="document.getElementById(\'pw-live-section\').scrollIntoView({behavior: \'smooth\'})">Open live progress</button>'}
          </section>

          <section class="timer-card card" aria-labelledby="timer-title">
            <div class="card-head">
              <div>
                <p class="eyebrow">Class timer</p>
                <h2 id="timer-title">Demonstration</h2>
              </div>
              <span class="badge ${isPreview ? 'ai' : 'live'}">${isPreview ? 'Runs locally' : 'Board visible'}</span>
            </div>
            <div class="timer-wrap" data-timer>
              <div class="timer"><strong data-timer-display>—:—</strong><span>remaining</span></div>
              <div class="timer-buttons">
                <button class="button small" type="button" data-timer-set="5">5m</button>
                <button class="button small" type="button" data-timer-set="10">10m</button>
                <button class="button small" type="button" data-timer-set="15">15m</button>
                <button class="button ghost small" type="button" data-timer-stop>Stop</button>
              </div>
            </div>
          </section>

          <section class="support-card card" aria-labelledby="resources-title">
            <div class="card-head">
              <div>
                <p class="eyebrow">At hand</p>
                <h2 id="resources-title">Resources</h2>
              </div>
            </div>
            <div class="resources-overhaul-list">
              ${renderLinkedResources(resByPlan.get(lp) ?? [])}
            </div>
          </section>

          ${isPreview || !lp ? '' : `
          <section class="adapt-card card" aria-labelledby="adapt-title">
            <div class="card-head">
              <div>
                <p class="eyebrow">For this class</p>
                <h2 id="adapt-title">Adapt this lesson</h2>
              </div>
            </div>
            <div hx-get="/lesson/adapt/${groupCourseId}/${lp}" hx-trigger="load" hx-swap="innerHTML"><span class="muted">Loading…</span></div>
          </section>`}
        </aside>
      </div>

      <!-- Live Pupil Work grid embedded below for full access -->
      <section class="card" id="pw-live-section">
        ${isPreview
          ? `<div class="card-head"><div><p class="eyebrow">Live pupil work</p><h2>Progress and marking</h2></div><span class="badge ai">Available when live</span></div>
             <div class="lesson-preview-placeholder"><strong>No pupil data is loaded in preview.</strong><span>The live lesson shows saves, completion, feedback and marking controls here.</span></div>`
          : `<div class="pupil-work-panel" hx-get="/lesson/oc/${oc}/pupil-work" hx-trigger="load" hx-swap="innerHTML"></div>`}
      </section>

      ${groupEditDialog}
      ${hiddenOriginalSwapElements}
    </div>
  `;
}

/**
 * Renders the clean, minimal board presentation view (zero pupil telemetry)
 */
export function renderBoardNext(options: {
  master: { title: string };
  className: string;
  slidesMd: string | null;
  level: Level;
  lp: number;
  gcKey: number;
}): string {
  const { master, className, slidesMd, level, lp, gcKey } = options;

  let slideListHtml = '';
  let totalSlides = 0;

  if (slidesMd) {
    const slides = sliceSlidesForLevel(slidesMd, level);
    totalSlides = slides.length;

    slides.forEach((s, i) => {
      const { clean } = splitTeacherNotes(s);
      const speakText = getSpeakText(clean);
      const speakBtn = `<button type="button" class="ws-speak pslide-speak" data-speak-text="${esc(speakText)}" title="Read slide aloud">🔊 Listen</button>`;

      const { heading } = parseSlideInfo(clean, i);

      // The heading is shown as the board eyebrow; render the remaining Markdown with the same
      // safe renderer used by pupil slides and resource previews.
      const contentMd = clean.replace(/^##\s+.*(?:\n|$)/, '').trim();
      const contentHtml = renderMarkdown(contentMd);

      slideListHtml += `
        <div class="pslide${i === 0 ? ' on' : ''}" data-slide="${i}">
          <p class="eyebrow">${esc(heading)}</p>
          ${speakBtn}
          <div class="slide-content md-doc">${contentHtml}</div>
        </div>
      `;
    });
  }

  return `
    <main class="presentation overhaul-board">
      <header class="present-head">
        <div>
          <h1>${esc(master?.title ?? 'Lesson')}</h1>
          <p>${esc(className)} · pupil-safe board display</p>
        </div>
        <div class="present-controls">
          <a class="button small" href="#" onclick="window.close(); return false;">Close board</a>
        </div>
      </header>

      <section id="present-slide" class="present-slide" aria-labelledby="board-slide-title">
        <div class="pupil-slides" data-deck="${gcKey}-${lp}">
          <div class="pslide-stage">
            ${slideListHtml || '<div class="pslide on"><p class="muted">No slides available.</p></div>'}
          </div>
        </div>
      </section>

      <footer class="present-foot">
        <div class="present-controls">
          <button class="button ghost pslide-prev" type="button" id="slide-prev-btn">← Previous</button>
          <button class="button pslide-next" type="button" id="slide-next-btn">Next →</button>
        </div>
        <span class="present-position">Slide <b class="pslide-n">1</b> of ${totalSlides}</span>
        <div class="present-controls">
          <span class="badge live" data-timer><span data-timer-display>—:—</span></span>
          <button class="button ghost" type="button" id="fullscreen-btn" onclick="if(!document.fullscreenElement){document.documentElement.requestFullscreen();}else{document.exitFullscreen();}">Full screen</button>
        </div>
      </footer>
    </main>
  `;
}
