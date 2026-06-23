import { esc } from './html';
import { ConceptRow } from '../repos/concepts';

export function courseOptions(courses: { id: number; name: string }[], selected: number | null): string {
  const opts = [`<option value=""${selected == null ? ' selected' : ''}>All courses</option>`];
  for (const c of courses) {
    opts.push(`<option value="${c.id}"${selected === c.id ? ' selected' : ''}>${esc(c.name)}</option>`);
  }
  return opts.join('');
}

export function renderRow(c: ConceptRow, courses: { id: number; name: string }[]): string {
  const save = (field: string) =>
    `hx-post="/concepts/${c.id}" hx-vals='{"field":"${field}"}' hx-trigger="input changed delay:700ms, blur" hx-swap="none"`;
  return `<tr class="concept-row${c.active ? '' : ' kit-archived'}" id="concept-${c.id}">
    <td><input class="kit-name" name="value" value="${esc(c.title)}" placeholder="concept…" ${save('title')}></td>
    <td><textarea name="value" rows="2" placeholder="how to teach it / the analogy / why it helps…" ${save('body')}>${esc(c.body ?? '')}</textarea></td>
    <td><select name="value" hx-post="/concepts/${c.id}/course" hx-trigger="change" hx-swap="none">${courseOptions(courses, c.courseId)}</select></td>
    <td><input class="kit-tags" name="value" value="${esc(c.tags ?? '')}" placeholder="tags…" ${save('tags')}></td>
    <td>
      <span class="note-status" id="concept-${c.id}-status"></span>
      ${c.active
        ? `<button type="button" class="link danger" hx-post="/concepts/${c.id}/archive" hx-target="#concept-${c.id}" hx-swap="outerHTML" hx-confirm="Archive this concept? It stays in the records but stops being woven into lessons.">archive</button>`
        : `<button type="button" class="link" hx-post="/concepts/${c.id}/restore" hx-target="#concept-${c.id}" hx-swap="outerHTML">restore</button>`}
    </td>
  </tr>`;
}

export interface ConceptsNextData {
  rows: ConceptRow[];
  courses: { id: number; name: string }[];
  csrf: string;
  selectedCourseId?: number | null;
}

export function renderConceptsNext(data: ConceptsNextData): string {
  const { rows, courses, csrf, selectedCourseId } = data;
  
  const head = `<tr><th>Concept</th><th>How to teach it</th><th>Course</th><th>Tags</th><th></th></tr>`;
  
  // Filter row display client-side or render as normal table
  const table = rows.length
    ? `<div class="table-scroll"><table class="kit-table"><thead>${head}</thead><tbody>${rows.map((c) => renderRow(c, courses)).join('')}</tbody></table></div>`
    : `<p class="muted">No teaching concepts yet — add the first one below. They're woven into generated lessons where they fit.</p>`;
    
  return `
    <section class="card concepts-overhaul" hx-headers='{"x-csrf-token":"${csrf}"}'>
      <h1>Teaching concepts</h1>
      <p class="muted">Cohort-level teaching ideas, analogies and "always do this" approaches. They're given to
        the AI for every lesson/scheme generation and woven in <em>where they fit</em>, without lengthening the
        lesson. Scope each to one course or leave it global. <strong>Never name an individual pupil</strong> —
        keep these about the class/topic. Archive (don't delete) ones you stop using.</p>
      ${table}
      <form class="kit-add" hx-post="/concepts/add" hx-target="closest section" hx-swap="outerHTML">
        <div style="display: flex; gap: 12px; align-items: center; flex-wrap: wrap;">
          <input type="text" name="title" placeholder="new concept… e.g. CPU as a busy office" required maxlength="300" style="flex: 1; min-width: 250px;">
          <select name="course" style="padding: 8px; border-radius: 6px; border: 1px solid var(--border-color, #ccc); font-family: inherit;">${courseOptions(courses, selectedCourseId ?? null)}</select>
          <button type="submit" class="btn-primary">＋ add</button>
        </div>
      </form>
    </section>
  `;
}
