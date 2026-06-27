import { esc } from './html';
import { formatObjectives, formatOutline } from './formatLesson';
import { ExceptionEffect, effectiveRoom } from '../services/exceptions';
import type { LinkedResource } from '../repos/resources';
import { paths } from './paths';

export interface SlotLesson {
  lessonId: number;
  groupName: string | null;
  roomName: string | null;
  label: string;
  start: string;
  end: string;
  isSelf: boolean;
  staffName: string;
  staffId: number;
}

export interface SectionDetails {
  occurrenceCourseId: number;
  groupCourseId: number;
  lessonPlanId: number | null;
  planTitle: string | null;
  courseName: string;
  colour: string | null;
  eff: {
    adapted: boolean;
    objectives: string | null;
    outline: string | null;
    adaptationId: number | null;
  };
  resources: LinkedResource[];
  existingFeedback: Array<{ createdAt: string; pupilsText: string; lessonText: string }>;
}

export function renderLessonBlock(
  l: SlotLesson,
  date: string,
  csrf: string,
  effect: ExceptionEffect,
  sections: SectionDetails[]
): string {
  const parts: string[] = [];
  for (const s of sections) {
    let planHtml = '<p class="muted">No plan bound yet for this lesson.</p>';
    if (s.lessonPlanId != null) {
      planHtml = `
        ${s.planTitle ? `<h3 class="ta-plan-title">${esc(s.planTitle)}${s.eff.adapted ? ' <span class="adapt-badge on">✏ adapted for this class</span>' : ''}</h3>` : ''}
        ${s.eff.objectives ? `<div class="oc-block oc-objectives"><span class="oc-label">Objectives</span>${formatObjectives(s.eff.objectives)}</div>` : ''}
        ${s.eff.outline ? `<div class="oc-block"><span class="oc-label">Outline</span>${formatOutline(s.eff.outline)}</div>` : ''}`;
    }
    const resHtml = s.resources.length
      ? `<div class="ld-res"><span class="ld-res-label">Resources</span> ${s.resources
          .map((r) => `<a href="${paths.resourceViewUrl(r.resourceId)}" target="_blank" rel="noopener">${esc(r.title)}</a>`)
          .join(' · ')}</div>`
      : '';
    const existingHtml = s.existingFeedback.length
      ? `<ul class="ta-fb-list">${s.existingFeedback.map((f) => `<li><span class="muted">${esc(f.createdAt)}</span> ${esc((f.pupilsText + ' ' + f.lessonText).slice(0, 120))}…</li>`).join('')}</ul>`
      : '';
    parts.push(`
      <section class="ld-course" style="border-left-color:${esc(s.colour ?? '#94a3b8')}">
        <h2>${esc(s.courseName)}</h2>
        ${planHtml}
        ${resHtml}
        <div class="ta-fb" id="ta-fb-${s.occurrenceCourseId}">
          <span class="oc-label">Your feedback for the teacher</span>
          ${existingHtml}
          <form hx-post="${paths.taFeedback()}" hx-target="#ta-fb-${s.occurrenceCourseId}" hx-swap="outerHTML">
            <input type="hidden" name="oc" value="${s.occurrenceCourseId}">
            <label class="adapt-l">How were the pupils?<textarea name="pupils" rows="2" placeholder="settled after the starter, two needed movement breaks…"></textarea></label>
            <label class="adapt-l">Thoughts on the lesson<textarea name="lesson" rows="2" placeholder="the card sort worked well; the typing task ran long…"></textarea></label>
            <label class="ta-sg"><input type="checkbox" name="safeguarding" value="true"> safeguarding concern (also tell the teacher in person — flagged items are kept out of AI)</label>
            <button type="submit" class="primary">Send feedback</button>
          </form>
        </div>
      </section>`);
  }
  const room = effectiveRoom(effect, l.roomName);
  const exTag =
    effect.mode === 'room' || effect.mode === 'cover'
      ? ` · <span class="ld-ex ld-ex-${effect.mode}">${esc(effect.label)}${effect.detail ? ` (${esc(effect.detail)})` : ''}</span>`
      : '';
  return `
    <div class="ta-lesson-head">
      <h1>${esc(l.groupName ?? 'Lesson')}</h1>
      <p class="ld-meta">${esc(l.label)} · ${esc(l.start)}–${esc(l.end)}${room ? ` · ${esc(room)}` : ''}${l.isSelf ? '' : ` · led by ${esc(l.staffName)}`}${exTag}</p>
    </div>
    ${parts.join('') || '<p class="muted">No courses attached to this lesson.</p>'}`;
}

export function renderMyLessonsList(
  items: Array<{ lessonId: number; iso: string; isToday: boolean; label: string; start: string; groupName: string | null }>,
  taName: string | null
): string {
  const listItems = items.map(
    (r) => `<li><a href="${paths.taLesson(r.lessonId, r.iso)}">${esc(r.iso)}${r.isToday ? ' (today)' : ''} · ${esc(r.label)} ${esc(r.start)} · ${esc(r.groupName ?? 'lesson')}</a></li>`
  ).join('');
  return `<h1>My upcoming lessons</h1>
    ${items.length ? `<ul class="ta-mine">${listItems}</ul>` : '<p class="muted">Nothing timetabled for you in the next two weeks.</p>'}
    <p class="muted">Open one to read its plan and resources ahead of time.</p>
    ${typeof taName === 'string' && taName ? `<p class="muted ta-signed-in">Signed in as ${esc(taName)}.</p>` : ''}`;
}

interface TaPageOptions {
  which: 'now' | 'next' | 'mine' | 'lesson';
  taName: string | null;
  taStaffId: number;
  csrf: string;
  bodyHtml: string;
}

export function renderTaPage(options: TaPageOptions): string {
  const { which, taStaffId, bodyHtml } = options;
  const tabs = `<nav class="task-tabs">
    <a href="${paths.ta()}"${which === 'now' ? ' class="active"' : ''}>This lesson</a>
    <a href="${paths.taWhich('next')}"${which === 'next' ? ' class="active"' : ''}>Next lesson</a>
    ${taStaffId > 0 ? `<a href="${paths.taWhich('mine')}"${which === 'mine' ? ' class="active"' : ''}>My lessons</a>` : ''}
  </nav>`;
  return `<section class="card ta-next-gen-card">${tabs}${bodyHtml}</section>`;
}
