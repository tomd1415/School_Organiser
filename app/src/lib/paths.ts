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
  planApplyImprovement: (lp: number): string => `/lesson/plan/${lp}/apply-improvement`,
  groupContext: (gc: number): string => `/lesson/group-context/${gc}`,
  adaptControls: (gc: number, lp: number): string => `/lesson/adapt/${gc}/${lp}`,

  // ── Misc actions referenced by the cockpit (path-only) ──────────────────────────────────────────
  freeMark: (): string => '/free/mark',
  map: (): string => '/map',
  mapShift: (): string => '/map/shift',
  mapMove: (): string => '/map/move',
  testLab: (): string => '/test-lab',
  testLabPlan: (lp: number): string => `/test-lab/plan/${lp}`,
  testPupilOpen: (): string => '/test-pupil/open',
  pedagogy: (): string => '/pedagogy',
  kitPanel: (): string => '/kit/panel',

  // ── Progression (Stages & strands — Phase 16A) ──────────────────────────────────────────────────
  progression: (): string => '/progression',
  progressionScheme: (schemeId: number): string => `/progression/scheme/${schemeId}`,
  progressionAssign: (): string => '/progression/assign',
  progressionPupil: (pupilId: number): string => `/progression/pupil/${pupilId}`,
  progressionClass: (groupCourseId: number): string => `/progression/class/${groupCourseId}`,
  progressionSchemeMap: (schemeId: number): string => `/progression/scheme/${schemeId}/map`,
  progressionSpecLink: (): string => '/progression/spec-link',
  progressionEvidenceConfirm: (): string => '/progression/evidence/confirm',

  // ── Homework (Phase 16B) ────────────────────────────────────────────────────────────────────────
  me: (): string => '/me',
  homework: (): string => '/homework',
  homeworkSet: (): string => '/homework/set',
  homeworkClear: (): string => '/homework/clear',

  // ── Query-string routes (HTML-attribute form; see header) ───────────────────────────────────────
  lessonOpen: (lesson: number, date: string, opts: { oc?: number; lab?: boolean } = {}): string =>
    `/lesson?lesson=${lesson}&amp;date=${esc(date)}` + (opts.oc ? `&amp;oc=${opts.oc}` : '') + (opts.lab ? '&amp;lab=1' : ''),
  lessonPrint: (lesson: number, date: string): string => `/lesson/print?lesson=${lesson}&amp;date=${esc(date)}`,
  todayPrint: (date: string): string => `/today/print?date=${esc(date)}`,
  schemesCourse: (course?: number | null): string => `/schemes?course=${course ?? ''}`,
  schemesLens: (course: number, lens: 'spine' | 'classes', scheme?: number | null): string =>
    `/schemes?course=${course}${scheme ? `&amp;scheme=${scheme}` : ''}&amp;lens=${lens}`,
  coverage: (): string => '/coverage',
  coverageFiltered: (course: number, cov: 'all' | 'covered' | 'gaps'): string => `/coverage?course=${course}&amp;cov=${cov}`,
  mapSlot: (lesson: number, gc: number): string => `/map?slot=${lesson}:${gc}`,
  pupilPreview: (gc: number | null, lp: number, level: string): string => `/lesson/pupil-preview?${scopeQ(gc)}&amp;lp=${lp}&amp;level=${level}`,
  present: (gc: number | null, lp: number, level: string): string => `/lesson/present?${scopeQ(gc)}&amp;lp=${lp}&amp;level=${level}`,
  boardView: (gc: number | null, lp: number, level: string, oc?: number): string =>
    `/lesson/pupil-view?${scopeQ(gc)}&amp;lp=${lp}&amp;level=${level}` + (oc ? `&amp;oc=${oc}` : ''),
  worksheetPreview: (gc: number, lp: number, level: string): string => `/lesson/worksheet-preview?gc=${gc}&amp;lp=${lp}&amp;level=${level}`,
  worksheetModal: (gc: number, lp: number, level = 'core'): string => `/lesson/worksheet-modal?gc=${gc}&amp;lp=${lp}&amp;level=${level}`,
  imageTodo: (oc: number, gc: number, lp: number): string => `/lesson/oc/${oc}/image-todo?gc=${gc}&amp;lp=${lp}`,
  lessonPreview: (plan: number): string => `/lesson/preview?plan=${plan}`,

  // ── Settings ────────────────────────────────────────────────────────────────────────────────────
  settingsSchool: (): string => '/settings/school',
  settingsNav: (): string => '/settings/nav',
  settingsPassword: (): string => '/settings/password',
  settingsTeacherIdle: (): string => '/settings/teacher-idle',
  settingsAiKey: (): string => '/settings/ai-key',
  settingsAi: (): string => '/settings/ai',
  settingsPupilAccess: (): string => '/settings/pupil-access',
  settingsPupilIdle: (): string => '/settings/pupil-idle',
  settingsMarksAccess: (): string => '/settings/marks-access',
  settingsEmail: (key: string): string => `/settings/email?key=${key}`, // single fixed param → no &amp; joiner
  settingsEmailTest: (): string => '/settings/email/test',
  settingsTaAccount: (): string => '/settings/ta-account',
  settingsTaAccountAction: (id: number, action: 'active' | 'password' | 'delete'): string => `/settings/ta-account/${id}/${action}`,
  settingsTaPassword: (): string => '/settings/ta-password',

  // ── Schemes of work (the /schemes×44 family — largest) ──────────────────────────────────────────
  schemesCreate: (course: number): string => `/schemes/create?course=${course}`,
  schemesAuthor: (course: number): string => `/schemes/author?course=${course}`,
  schemesImport: (): string => '/schemes/import',
  schemesSpotCheck: (): string => '/schemes/spot-check',
  // …course-scoped
  schemesCourseScheme: (course: number, scheme: number): string => `/schemes?course=${course}&amp;scheme=${scheme}`,
  schemesCourseConvert: (course: number): string => `/schemes/course/${course}/convert`,
  schemesCourseConvertPanel: (course: number): string => `/schemes/course/${course}/convert-panel`,
  schemesCourseConvertSearch: (course: number): string => `/schemes/course/${course}/convert-search`,
  schemesCourseSummary: (course: number): string => `/schemes/course/${course}/summary`,
  schemesCourseContext: (course: number): string => `/schemes/course/${course}/context`,
  // …scheme-scoped (the header row; `addUnit` POSTs a new unit, distinct from `unit/:id` which edits one)
  schemesAddUnit: (scheme: number): string => `/schemes/${scheme}/unit`,
  schemesLabels: (scheme: number): string => `/schemes/${scheme}/labels`,
  schemesMoveCourse: (scheme: number): string => `/schemes/${scheme}/move-course`,
  schemesDelete: (scheme: number): string => `/schemes/${scheme}/delete`,
  schemesActivate: (scheme: number): string => `/schemes/${scheme}/activate`,
  schemesVersion: (scheme: number): string => `/schemes/${scheme}/version`,
  schemesExport: (scheme: number): string => `/schemes/${scheme}/export`,
  // …unit-scoped
  schemesUnit: (unit: number): string => `/schemes/unit/${unit}`,
  schemesUnitPlan: (unit: number): string => `/schemes/unit/${unit}/plan`,
  schemesUnitResourcesAi: (unit: number): string => `/schemes/unit/${unit}/resources-ai`,
  schemesUnitReviewAi: (unit: number): string => `/schemes/unit/${unit}/review-ai`,
  schemesUnitReviewSequence: (unit: number): string => `/schemes/unit/${unit}/review-sequence`,
  schemesUnitLayForm: (unit: number): string => `/schemes/unit/${unit}/lay-form`,
  schemesUnitLayDown: (unit: number): string => `/schemes/unit/${unit}/lay-down`,
  // …plan-scoped
  schemesPlan: (plan: number): string => `/schemes/plan/${plan}`,
  schemesPlanDraft: (plan: number): string => `/schemes/plan/${plan}/draft`,
  schemesPlanResources: (plan: number): string => `/schemes/plan/${plan}/resources`,
  schemesPlanResourcesAi: (plan: number): string => `/schemes/plan/${plan}/resources-ai`,
  schemesPlanResourcesAiStatus: (plan: number): string => `/schemes/plan/${plan}/resources-ai/status`,
  schemesPlanReview: (plan: number): string => `/schemes/plan/${plan}/review`,
  schemesPlanReviewAi: (plan: number): string => `/schemes/plan/${plan}/review-ai`,
  schemesPlanCompare: (plan: number): string => `/schemes/plan/${plan}/compare`,
  // …advisory-review cards
  schemesReviewApply: (review: number): string => `/schemes/review/${review}/apply`,
  schemesReviewDismiss: (review: number): string => `/schemes/review/${review}/dismiss`,
  // …generic tree-row controls (kind narrows to the two reorderable row types)
  schemesRowMove: (kind: 'unit' | 'plan', id: number, dir: 'up' | 'down'): string => `/schemes/${kind}/${id}/move/${dir}`,
  schemesRowDelete: (kind: 'unit' | 'plan', id: number): string => `/schemes/${kind}/${id}/delete`,

  // ── Top-level nav / page roots ──────────────────────────────────────────────────────────────────
  schemes: (): string => '/schemes',
  settings: (): string => '/settings',
  timetable: (): string => '/timetable',
  timetableClassAway: (): string => '/timetable/class-away',
  tasks: (): string => '/tasks',
  tasksFiltered: (view: string): string => `/tasks?view=${view}`,
  captured: (): string => '/captured',
  capturedFiltered: (category: string): string => `/captured?category=${category}`,
  events: (): string => '/events',
  marking: (): string => '/marking',
  notes: (): string => '/notes',
  notesFiltered: (link: string): string => `/notes?link=${link}`,
  recurring: (): string => '/recurring',
  resources: (): string => '/resources',
  kit: (): string => '/kit',
  ta: (): string => '/ta',
  workBlocks: (): string => '/work-blocks',
  oversee: (): string => '/oversee',
  overseeWeek: (date: string): string => `/oversee?date=${date}`,
  captureQuick: (): string => '/capture-quick',
  dayChecklist: (): string => '/day-checklist',
  dayChecklistAdd: (): string => '/day-checklist/add',
  prep: (): string => '/prep',
  prepAdd: (): string => '/prep/add',
  timerStart: (): string => '/timer/start',
  followupToggle: (id: number): string => `/followups/${id}/toggle`,

  // ── Now screen ──────────────────────────────────────────────────────────────────────────────────
  nowClock: (sig: string): string => `/now/clock?sig=${encodeURIComponent(sig)}`,
  nowTimeline: (): string => '/now/timeline',
  nowCurrent: (sig: string): string => `/now/current?sig=${encodeURIComponent(sig)}`,
  nowInboxQueue: (): string => '/now/inbox-queue',
  settingsExperience: (): string => '/settings/experience',
  settingsExperienceNudgeDismiss: (): string => '/settings/experience-nudge/dismiss',

  // ── Tasks ───────────────────────────────────────────────────────────────────────────────────────
  task: (id: number): string => `/tasks/${id}`,
  taskTriage: (id: number): string => `/tasks/${id}/triage`,
  taskInterest: (id: number): string => `/tasks/${id}/interest`,
  taskDone: (id: number): string => `/tasks/${id}/done`,
  taskDrop: (id: number): string => `/tasks/${id}/drop`,
  tasksPaste: (): string => '/tasks/paste',
  tasksCalibrate: (): string => '/tasks/calibrate',

  // ── Focus (one-thing-now) ───────────────────────────────────────────────────────────────────────
  focusMode: (mode: string): string => `/focus?mode=${mode}`,
  focusDone: (id: number): string => `/focus/${id}/done`,
  focusBreakdown: (id: number): string => `/focus/${id}/breakdown`,
  focusBreakdownAi: (id: number): string => `/focus/${id}/breakdown-ai`,
  focusSubstepToggle: (id: number): string => `/focus/substep/${id}/toggle`,

  // ── Recurring task defs ─────────────────────────────────────────────────────────────────────────
  recurringDef: (id: number): string => `/recurring/${id}`,
  recurringDefToggle: (id: number, action: 'activate' | 'deactivate'): string => `/recurring/${id}/${action}`,
  recurringDefDelete: (id: number): string => `/recurring/${id}/delete`,

  // ── Captured intake ─────────────────────────────────────────────────────────────────────────────
  capturedItem: (id: number): string => `/captured/${id}`,
  capturedFlag: (id: number, flag: string): string => `/captured/${id}/flag/${flag}`,
  capturedSuggest: (id: number): string => `/captured/${id}/suggest`,
  capturedToTask: (id: number): string => `/captured/${id}/to-task`,

  // ── Events ──────────────────────────────────────────────────────────────────────────────────────
  event: (id: number): string => `/events/${id}`,
  eventDone: (id: number): string => `/events/${id}/done`,
  eventCancel: (id: number): string => `/events/${id}/cancel`,

  // ── Notes ───────────────────────────────────────────────────────────────────────────────────────
  note: (id: number): string => `/notes/${id}`,

  // ── Kit register ────────────────────────────────────────────────────────────────────────────────
  kitItem: (id: number): string => `/kit/${id}`,
  kitChecked: (id: number): string => `/kit/${id}/checked`,
  kitArchive: (id: number): string => `/kit/${id}/archive`,
  kitRestore: (id: number): string => `/kit/${id}/restore`,
  kitAdd: (): string => '/kit/add',
  kitImport: (): string => '/kit/import',

  // ── Concepts ────────────────────────────────────────────────────────────────────────────────────
  concept: (id: number): string => `/concepts/${id}`,
  conceptCourse: (id: number): string => `/concepts/${id}/course`,
  conceptArchive: (id: number): string => `/concepts/${id}/archive`,
  conceptRestore: (id: number): string => `/concepts/${id}/restore`,
  conceptAdd: (): string => '/concepts/add',

  // ── Work blocks (focus) ─────────────────────────────────────────────────────────────────────────
  workBlock: (id: number): string => `/work-blocks/${id}`,
  workBlockDone: (id: number): string => `/work-blocks/${id}/done`,
  workBlockDiverted: (id: number): string => `/work-blocks/${id}/diverted`,
  workBlockDelete: (id: number): string => `/work-blocks/${id}/delete`,

  // ── Resources library ───────────────────────────────────────────────────────────────────────────
  resourcesList: (): string => '/resources/list',
  resourcesListQuery: (q: string, kind: string, page: number): string =>
    `/resources/list?q=${encodeURIComponent(q)}&amp;kind=${encodeURIComponent(kind)}&amp;page=${page}`,
  resourcesGenerate: (): string => '/resources/generate',
  resourceViewUrl: (id: number): string => `/resources/${id}/view`,
  resourceDownload: (id: number): string => `/resources/${id}/download`,
  /** Pupil-safe lesson-document view (signed for limited roles by the onSend hook). */
  lessonDoc: (id: number): string => `/lesson-doc/${id}`,
  resourcePresent: (id: number): string => `/resources/${id}/present`,
  resourceUsage: (id: number): string => `/resources/${id}/usage`,
  schemesPlanResourceDetach: (plan: number, res: number): string => `/schemes/plan/${plan}/resources/${res}/detach`,
  schemesPlanResourcesSearch: (plan: number): string => `/schemes/plan/${plan}/resources/search`,

  // ── Marking (occurrence-course / per-pupil mark modal) ──────────────────────────────────────────
  occMark: (oc: number): string => `/lesson/oc/${oc}/mark`,
  occAtl: (oc: number): string => `/lesson/oc/${oc}/atl`,
  // ── Attendance register (Phase 17) ──────────────────────────────────────────────────────────────
  occAttendance: (oc: number): string => `/lesson/oc/${oc}/attendance`,
  occAttendanceAllPresent: (oc: number): string => `/lesson/oc/${oc}/attendance/all-present`,
  occPupilAttendance: (oc: number, pid: number): string => `/lesson/oc/${oc}/pupil/${pid}/attendance`,
  occPupilMark: (oc: number, pid: number): string => `/lesson/oc/${oc}/pupil/${pid}/mark`,
  occPupilMarkWs: (oc: number, pid: number, ws: number): string => `/lesson/oc/${oc}/pupil/${pid}/mark?ws=${ws}`,
  occPupilMarkSave: (oc: number, pid: number): string => `/lesson/oc/${oc}/pupil/${pid}/mark/save`,
  occPupilMarkConfirm: (oc: number, pid: number): string => `/lesson/oc/${oc}/pupil/${pid}/mark/confirm`,
  occPupilComment: (oc: number, pid: number): string => `/lesson/oc/${oc}/pupil/${pid}/comment`,

  // ── Timetable cells + week nav ──────────────────────────────────────────────────────────────────
  // `yearQ` is a pre-built query fragment from the route (incl. its own joiner); passed through verbatim.
  timetableDate: (date: string, yearQ: string): string => `/timetable?date=${esc(date)}${yearQ}`,
  clubOpen: (lesson: number, date: string): string => `/club?lesson=${lesson}&amp;date=${esc(date)}`,
  freeOpen: (lesson: number, date: string): string => `/free?lesson=${lesson}&amp;date=${esc(date)}`,

  // ── TA (read-only assistant view) ───────────────────────────────────────────────────────────────
  taWhich: (which: string): string => `/ta?which=${which}`,
  taFeedback: (): string => '/ta/feedback',
  taLesson: (lesson: number, iso: string): string => `/ta?lesson=${lesson}&amp;date=${iso}`,

  // ── Pupil /me surface ───────────────────────────────────────────────────────────────────────────
  meDone: (oc: number): string => `/me/done?oc=${oc}`,
  meFeedback: (oc: number): string => `/me/feedback?oc=${oc}`,
  meAnswer: (oc: number): string => `/me/answer?oc=${oc}`,
  // Serve a stored pupil screenshot (the `img:<relpath>` answer value → same-origin image URL).
  pupilImage: (rel: string): string => `/pupil-image?p=${encodeURIComponent(rel)}`,

  // ── Safeguarding ────────────────────────────────────────────────────────────────────────────────
  safeguarding: (): string => '/safeguarding',
  safeguardingSource: (sourceType: string, sourceId: number): string => `/safeguarding/${sourceType}/${sourceId}`,

  // ── Setup / admin (the /setup×31 family) ────────────────────────────────────────────────────────
  setup: (): string => '/setup',
  setupTab: (tab: string, year: number): string => `/setup?tab=${tab}&amp;year=${year}`,
  setupYear: (id: number): string => `/setup/year/${id}`,
  setupYearMakeCurrent: (id: number): string => `/setup/year/${id}/make-current`,
  setupYearAdd: (): string => '/setup/year/add',
  setupTerm: (id: number): string => `/setup/term/${id}`,
  setupTermDelete: (id: number): string => `/setup/term/${id}/delete`,
  setupTermAdd: (year: number): string => `/setup/term/add?year=${year}`,
  setupPeriod: (id: number): string => `/setup/period/${id}`,
  setupPeriodDelete: (id: number): string => `/setup/period/${id}/delete`,
  setupPeriodAdd: (year: number, weekday: number): string => `/setup/period/add?year=${year}&amp;weekday=${weekday}`,
  setupDayCopy: (year: number): string => `/setup/day/copy?year=${year}`,
  setupDayApplyModel: (year: number): string => `/setup/day/apply-model?year=${year}`,
  setupRoomToggle: (id: number, action: 'archive' | 'restore'): string => `/setup/room/${id}/${action}`,
  setupRoomAdd: (): string => '/setup/room/add',
  setupStaffToggle: (id: number, action: 'archive' | 'restore'): string => `/setup/staff/${id}/${action}`,
  setupStaffAdd: (): string => '/setup/staff/add',
  setupCourse: (id: number): string => `/setup/course/${id}`,
  setupCourseToggle: (id: number, action: 'archive' | 'restore'): string => `/setup/course/${id}/${action}`,
  setupCourseAdd: (): string => '/setup/course/add',
  setupGroup: (id: number): string => `/setup/group/${id}`,
  setupGroupCourse: (groupId: number, courseId: number): string => `/setup/group/${groupId}/course/${courseId}`,
  setupGroupToggle: (id: number, action: 'archive' | 'restore'): string => `/setup/group/${id}/${action}`,
  setupGroupEnrol: (id: number): string => `/setup/group/${id}/enrol`,
  setupGroupAdd: (year: number): string => `/setup/group/add?year=${year}`,
  setupEnrolmentMove: (enrolmentId: number, year: number): string => `/setup/enrolment/${enrolmentId}/move?year=${year}`,
  setupEnrolmentRemove: (enrolmentId: number): string => `/setup/enrolment/${enrolmentId}/remove`,
  setupLesson: (id: number): string => `/setup/lesson/${id}`,
  setupLessonCourse: (lessonId: number, courseId: number): string => `/setup/lesson/${lessonId}/course/${courseId}`,
  setupLessonDelete: (id: number): string => `/setup/lesson/${id}/delete`,
  setupLessonAdd: (period: number, year: number): string => `/setup/lesson/add?period=${period}&amp;year=${year}`,
  // `/setup/rollover?from=…&to=…` (the "from" param only appears when a previous year exists).
  setupRolloverRoll: (from: number | null, to: number): string =>
    from == null ? `/setup/rollover?to=${to}` : `/setup/rollover?from=${from}&amp;to=${to}`,
  groupHistory: (id: number): string => `/group/${id}/history`,

  // ── Per-unit summative assessments (Phase 1) ────────────────────────────────────────────────────
  unitAssessments: (unitId: number): string => `/units/${unitId}/assessments`,
  unitAssessmentsGenerate: (unitId: number): string => `/units/${unitId}/assessments/generate`,
  schemesUnitAssessments: (unitId: number): string => `/schemes/unit/${unitId}/assessments`, // Phase 6 lazy spine panel
  assessment: (id: number): string => `/assessments/${id}`,
  assessmentReady: (id: number): string => `/assessments/${id}/ready`,
  assessmentQuestion: (id: number, qid: number): string => `/assessments/${id}/questions/${qid}`,
  assessmentPart: (id: number, pid: number): string => `/assessments/${id}/parts/${pid}`,
  assessmentMarkPoint: (id: number, mid: number): string => `/assessments/${id}/markpoints/${mid}`,
  // Phase 2 — assign to class + availability window
  assessmentAssign: (id: number): string => `/assessments/${id}/assign`,
  assessmentAssignWindow: (id: number, gcId: number): string => `/assessments/${id}/assign/${gcId}/window`,
  assessmentUnassign: (id: number, gcId: number): string => `/assessments/${id}/unassign/${gcId}`,
  // Phase 3 — pupil take-flow (behind the pupil gate)
  meAssessments: (): string => '/me/assessments',
  meAssessment: (id: number): string => `/me/assessments/${id}`,
  meAssessmentAnswer: (id: number): string => `/me/assessments/${id}/answer`,
  meAssessmentSubmit: (id: number): string => `/me/assessments/${id}/submit`,
  meAssessmentResults: (id: number): string => `/me/assessments/${id}/results`,
  // Phase 5 — results + teacher-controlled release
  assessmentResults: (id: number): string => `/assessments/${id}/results`,
  assessmentRelease: (id: number, gcId: number): string => `/assessments/${id}/release/${gcId}`,
  // Phase 4 — teacher marking (confirm/adjust)
  assessmentMarkQueue: (): string => '/assessments/marking',
  assessmentAttemptMarks: (id: number, attemptId: number): string => `/assessments/${id}/attempts/${attemptId}/marks`,
  assessmentMarkNow: (id: number, attemptId: number): string => `/assessments/${id}/attempts/${attemptId}/mark`,
  assessmentMarkConfirm: (id: number, attemptId: number): string => `/assessments/${id}/attempts/${attemptId}/confirm`,
  assessmentMarkAnswer: (id: number, attemptId: number, answerId: number): string => `/assessments/${id}/attempts/${attemptId}/answers/${answerId}/override`,

  // ── Cross-cutting page links ────────────────────────────────────────────────────────────────────
  pupils: (): string => '/pupils',
  pupilsClass: (groupCourseId: number): string => `/pupils?class=${groupCourseId}`,
  setupRollover: (): string => '/setup/rollover',
  welcome: (): string => '/welcome',
} as const;
