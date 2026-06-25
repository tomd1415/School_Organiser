// Rail & Stage rebuild — Focus (SPEC §5): the one-thing-now surface. A segmented mode control
// (Morning / Free period / End of day) over a big teal-gradient card showing the single chosen task with a
// tappable step checklist + actions, or a "wind-down / you're done" banner when nothing's left. The data
// (which task, which mode) is FocusService's job in the route's buildInner(); this is the pure render.
import { esc } from './html';
import { paths } from './paths';
import { URGENCY_LABELS, LOAD_LABELS } from '../services/task';
import type { FocusMode } from '../services/focus';
import type { SubStep } from '../repos/tasks';

export function renderSubStep(s: SubStep): string {
  return `<li id="substep-${s.id}" class="fu${s.done ? ' done' : ''}"><label><input type="checkbox" ${s.done ? 'checked' : ''} hx-post="${paths.focusSubstepToggle(s.id)}" hx-target="#substep-${s.id}" hx-swap="outerHTML"> ${esc(s.title)}</label></li>`;
}

export interface FocusPick {
  id: number;
  title: string;
  urgency: string;
  estimateMin: number | null;
  cognitiveLoad: string | null;
}

export interface FocusVM {
  mode: FocusMode;
  pollUrl: string; // built in the route (carries the dedupe sig) — passed through verbatim
  picked: FocusPick | null;
  windowMinutes: number | null;
  hidden: number;
  subStepsHtml: string; // pre-rendered via renderSubStep
}

const MODES: ReadonlyArray<[FocusMode, string]> = [
  ['morning', 'Morning'],
  ['free_period', 'Free period'],
  ['end_of_day', 'End of day'],
];

function poller(pollUrl: string): string {
  return `<div class="focus-poll" data-bg-poll hx-get="${pollUrl}" hx-trigger="every 45s" hx-target="#focus-inner" hx-swap="innerHTML" style="display:none"></div>`;
}

export function renderFocusInner(vm: FocusVM): string {
  const modeNav = `<div class="seg-tabs focus-modes" role="tablist" aria-label="Focus mode">${MODES.map(
    ([m, label]) => `<a href="${paths.focusMode(m)}" class="seg-tab${m === vm.mode ? ' is-on' : ''}" role="tab" aria-selected="${m === vm.mode}">${label}</a>`,
  ).join('')}</div>`;

  if (!vm.picked) {
    const done = vm.mode === 'end_of_day'
      ? `<div class="focus-done focus-clear"><h1>✅ You're done — go home.</h1><p class="muted">Nothing quick or urgent is left. Anything heavier is parked for tomorrow.</p></div>`
      : `<div class="focus-done"><h1>Nothing to focus on</h1><p class="muted">No eligible task right now${vm.windowMinutes != null ? ` that fits ${vm.windowMinutes} min` : ''}.</p></div>`;
    return `${modeNav}${done}${poller(vm.pollUrl)}`;
  }

  const p = vm.picked;
  const caption = [
    URGENCY_LABELS[p.urgency] ?? p.urgency,
    vm.windowMinutes != null ? `~${vm.windowMinutes} min window` : '',
    p.estimateMin ? `${p.estimateMin} min` : '',
    p.cognitiveLoad ? (LOAD_LABELS[p.cognitiveLoad] ?? p.cognitiveLoad) : '',
  ].filter(Boolean).join(' · ');

  return `${modeNav}
    <div class="focus-card">
      <p class="focus-kicker">Do this now</p>
      <h1 class="focus-title">${esc(p.title)}</h1>
      <p class="focus-caption">${esc(caption)}</p>
      <ul class="focus-steps" id="substeps-${p.id}">${vm.subStepsHtml}</ul>
      <form class="fu-form" hx-post="${paths.focusBreakdown(p.id)}" hx-target="#substeps-${p.id}" hx-swap="beforeend" hx-on::after-request="if(window.htmxSaved(event))this.reset()">
        <input type="text" name="text" data-followup placeholder="+ break into a step" autocomplete="off">
      </form>
      <button type="button" class="link fu-ai" hx-post="${paths.focusBreakdownAi(p.id)}" hx-target="#substeps-${p.id}" hx-swap="beforeend" hx-disabled-elt="this">✨ Break down with AI</button>
      <div class="focus-actions">
        <button type="button" class="button" hx-post="${paths.focusDone(p.id)}" hx-target="#focus-inner" hx-swap="innerHTML">✓ Done &amp; next</button>
        <button type="button" class="btn-soft" hx-post="${paths.timerStart()}" hx-vals='{"task":${p.id}}' hx-target="#timer-banner" hx-swap="outerHTML">▶ Start timer</button>
        <a class="link" href="${paths.tasks()}">see all tasks</a>
      </div>
      <p class="focus-hidden muted">${vm.hidden} other task${vm.hidden === 1 ? '' : 's'} hidden — on purpose.</p>
    </div>${poller(vm.pollUrl)}`;
}
