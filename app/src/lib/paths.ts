// The single source of truth for route URLs referenced by the VIEW layer. Route files own the HANDLERS;
// `paths` owns the STRINGS — so renaming an endpoint is one edit here, not a string-hunt across views, and
// the view layer stops hard-coding back-end URLs. See docs/UI_SEPARATION_PLAN.md (Phase 2).
//
// MIGRATION STATE: path-only routes (no query string) are migrated first — they match exactly with no
// HTML-attribute escaping question. Query-string URLs (e.g. `/lesson?lesson=&date=`, `…?gc=&lp=&level=`)
// are migrated in a later increment once the `&` vs `&amp;` escaping convention is settled; until then they
// remain inline in the views. A grep guard (tests/pathsGuard.test.ts) enforces the migrated prefixes.
import { esc } from './html';

// Query-string builders emit the HTML-ATTRIBUTE form the views already use: `&amp;` joiners (the entity,
// so the markup stays valid) and HTML-escaped values — so migrating to them changes no rendered bytes.
// `gc == null` means the master copy (the read-only scheme preview), matching `isPreview ? 'master=1' : …`.
const scopeQ = (gc: number | null): string => (gc == null ? 'master=1' : `gc=${gc}`);

export const paths = {
  // ── Live lesson actions, occurrence-course scoped (cockpit + board) ──────────────────────────────
  occProgress: (oc: number): string => `/occurrence-course/${oc}/progress`,
  occStopping: (oc: number): string => `/occurrence-course/${oc}/stopping`,
  occPlan: (oc: number): string => `/occurrence-course/${oc}/plan`,
  occSaveGroups: (oc: number): string => `/lesson/oc/${oc}/save-groups`,
  occFastCapture: (oc: number): string => `/lesson/oc/${oc}/fast-capture`,
  occCoverPack: (oc: number): string => `/lesson/oc/${oc}/cover-pack`,
  occSpacedRecall: (oc: number): string => `/lesson/oc/${oc}/spaced-recall`,
  occPupilWork: (oc: number): string => `/lesson/oc/${oc}/pupil-work`,
  occSlideStream: (oc: number): string => `/lesson/oc/${oc}/slide-stream`,

  // ── Notes ────────────────────────────────────────────────────────────────────────────────────────
  noteDelete: (id: number): string => `/notes/${id}/delete`,
  noteFollowups: (id: number): string => `/notes/${id}/followups`,

  // ── Plan / group-course (cockpit lazy panels + tools) ───────────────────────────────────────────
  planReviewFlag: (lp: number): string => `/lesson/plan/${lp}/review-flag`,
  groupContext: (gc: number): string => `/lesson/group-context/${gc}`,
  adaptControls: (gc: number, lp: number): string => `/lesson/adapt/${gc}/${lp}`,

  // ── Misc actions referenced by the cockpit (path-only) ──────────────────────────────────────────
  freeMark: (): string => '/free/mark',
  mapShift: (): string => '/map/shift',
  testLab: (): string => '/test-lab',
  testPupilOpen: (): string => '/test-pupil/open',

  // ── Query-string routes (HTML-attribute form; see header) ───────────────────────────────────────
  lessonOpen: (lesson: number, date: string, opts: { oc?: number; lab?: boolean } = {}): string =>
    `/lesson?lesson=${lesson}&amp;date=${esc(date)}` + (opts.oc ? `&amp;oc=${opts.oc}` : '') + (opts.lab ? '&amp;lab=1' : ''),
  lessonPrint: (lesson: number, date: string): string => `/lesson/print?lesson=${lesson}&amp;date=${esc(date)}`,
  todayPrint: (date: string): string => `/today/print?date=${esc(date)}`,
  schemesCourse: (course?: number | null): string => `/schemes?course=${course ?? ''}`,
  mapSlot: (lesson: number, gc: number): string => `/map?slot=${lesson}:${gc}`,
  pupilPreview: (gc: number | null, lp: number, level: string): string => `/lesson/pupil-preview?${scopeQ(gc)}&amp;lp=${lp}&amp;level=${level}`,
  present: (gc: number | null, lp: number, level: string): string => `/lesson/present?${scopeQ(gc)}&amp;lp=${lp}&amp;level=${level}`,
  boardView: (gc: number | null, lp: number, level: string, oc?: number): string =>
    `/lesson/pupil-view?${scopeQ(gc)}&amp;lp=${lp}&amp;level=${level}` + (oc ? `&amp;oc=${oc}` : ''),
  worksheetPreview: (gc: number, lp: number, level: string): string => `/lesson/worksheet-preview?gc=${gc}&amp;lp=${lp}&amp;level=${level}`,
  imageTodo: (oc: number, gc: number, lp: number): string => `/lesson/oc/${oc}/image-todo?gc=${gc}&amp;lp=${lp}`,
} as const;
