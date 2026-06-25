import { describe, expect, it } from 'vitest';
import { paths } from '../src/lib/paths';

// Oracle for paths.ts itself (docs/UI_SEPARATION_PLAN.md Phase 2): every builder must emit its exact URL.
// The pathsGuard test proves the VIEWS reference builders (no raw literals); this proves the BUILDERS are
// correct. Query builders emit the HTML-attribute form (&amp; joiners, esc()/encodeURIComponent applied
// internally) so the rendered bytes match what the views used to hard-code (modulo the deliberate raw-&
// → &amp; canonicalization). Together they pin both ends of the route-URL contract.

describe('paths builders — exact URLs', () => {
  it.each<[string, string]>([
    // top-level roots
    [paths.schemes(), '/schemes'],
    [paths.settings(), '/settings'],
    [paths.timetable(), '/timetable'],
    [paths.tasks(), '/tasks'],
    [paths.tasksFiltered('interest'), '/tasks?view=interest'],
    [paths.captured(), '/captured'],
    [paths.events(), '/events'],
    [paths.marking(), '/marking'],
    [paths.notes(), '/notes'],
    [paths.recurring(), '/recurring'],
    [paths.resources(), '/resources'],
    [paths.kit(), '/kit'],
    [paths.ta(), '/ta'],
    [paths.workBlocks(), '/work-blocks'],
    [paths.captureQuick(), '/capture-quick'],
    [paths.dayChecklist(), '/day-checklist'],
    [paths.dayChecklistAdd(), '/day-checklist/add'],
    [paths.prep(), '/prep'],
    [paths.prepAdd(), '/prep/add'],
    [paths.timerStart(), '/timer/start'],
    [paths.followupToggle(3), '/followups/3/toggle'],
    // coverage
    [paths.coverage(), '/coverage'],
    [paths.coverageFiltered(2, 'gaps'), '/coverage?course=2&amp;cov=gaps'],
    // map
    [paths.map(), '/map'],
    [paths.mapShift(), '/map/shift'],
    [paths.mapMove(), '/map/move'],
    [paths.mapSlot(4, 9), '/map?slot=4:9'],
    // now
    [paths.nowClock('a b&c'), '/now/clock?sig=a%20b%26c'], // encodeURIComponent applied inside
    [paths.nowTimeline(), '/now/timeline'],
    [paths.settingsExperience(), '/settings/experience'],
    [paths.settingsExperienceNudgeDismiss(), '/settings/experience-nudge/dismiss'],
    // tasks
    [paths.task(5), '/tasks/5'],
    [paths.taskTriage(5), '/tasks/5/triage'],
    [paths.taskInterest(5), '/tasks/5/interest'],
    [paths.taskDone(5), '/tasks/5/done'],
    [paths.taskDrop(5), '/tasks/5/drop'],
    [paths.tasksPaste(), '/tasks/paste'],
    [paths.tasksCalibrate(), '/tasks/calibrate'],
    // recurring
    [paths.recurringDef(9), '/recurring/9'],
    [paths.recurringDefToggle(9, 'deactivate'), '/recurring/9/deactivate'],
    [paths.recurringDefToggle(9, 'activate'), '/recurring/9/activate'],
    [paths.recurringDefDelete(9), '/recurring/9/delete'],
    // captured
    [paths.capturedItem(2), '/captured/2'],
    [paths.capturedFlag(2, 'archived'), '/captured/2/flag/archived'],
    [paths.capturedFlag(2, 'star'), '/captured/2/flag/star'],
    [paths.capturedSuggest(2), '/captured/2/suggest'],
    [paths.capturedToTask(2), '/captured/2/to-task'],
    // events
    [paths.event(4), '/events/4'],
    [paths.eventDone(4), '/events/4/done'],
    [paths.eventCancel(4), '/events/4/cancel'],
    // notes
    [paths.note(7), '/notes/7'],
    [paths.noteDelete(7), '/notes/7/delete'],
    [paths.noteFollowups(7), '/notes/7/followups'],
    // kit
    [paths.kitItem(1), '/kit/1'],
    [paths.kitChecked(1), '/kit/1/checked'],
    [paths.kitArchive(1), '/kit/1/archive'],
    [paths.kitRestore(1), '/kit/1/restore'],
    [paths.kitAdd(), '/kit/add'],
    [paths.kitImport(), '/kit/import'],
    // concepts
    [paths.concept(6), '/concepts/6'],
    [paths.conceptCourse(6), '/concepts/6/course'],
    [paths.conceptArchive(6), '/concepts/6/archive'],
    [paths.conceptRestore(6), '/concepts/6/restore'],
    [paths.conceptAdd(), '/concepts/add'],
    // work blocks
    [paths.workBlock(8), '/work-blocks/8'],
    [paths.workBlockDone(8), '/work-blocks/8/done'],
    [paths.workBlockDiverted(8), '/work-blocks/8/diverted'],
    [paths.workBlockDelete(8), '/work-blocks/8/delete'],
    // resources
    [paths.resourcesList(), '/resources/list'],
    [paths.resourcesListQuery('a b', 'doc&x', 2), '/resources/list?q=a%20b&amp;kind=doc%26x&amp;page=2'],
    [paths.resourcesGenerate(), '/resources/generate'],
    [paths.resourceViewUrl(3), '/resources/3/view'],
    [paths.resourceDownload(3), '/resources/3/download'],
    [paths.resourcePresent(3), '/resources/3/present'],
    [paths.resourceUsage(3), '/resources/3/usage'],
    [paths.schemesPlanResourceDetach(11, 4), '/schemes/plan/11/resources/4/detach'],
    [paths.schemesPlanResourcesSearch(11), '/schemes/plan/11/resources/search'],
    [paths.schemesPlanResources(11), '/schemes/plan/11/resources'],
    // marking / mark modal
    [paths.occMark(20), '/lesson/oc/20/mark'],
    [paths.occAtl(20), '/lesson/oc/20/atl'],
    [paths.occPupilMark(20, 30), '/lesson/oc/20/pupil/30/mark'],
    [paths.occPupilMarkWs(20, 30, 2), '/lesson/oc/20/pupil/30/mark?ws=2'],
    [paths.occPupilMarkSave(20, 30), '/lesson/oc/20/pupil/30/mark/save'],
    [paths.occPupilMarkConfirm(20, 30), '/lesson/oc/20/pupil/30/mark/confirm'],
    [paths.occPupilComment(20, 30), '/lesson/oc/20/pupil/30/comment'],
    // timetable cells + nav
    [paths.timetableDate('2026-03-03', '&amp;year=5'), '/timetable?date=2026-03-03&amp;year=5'],
    [paths.timetableDate('2026-03-03', ''), '/timetable?date=2026-03-03'],
    [paths.clubOpen(7, '2026-03-03'), '/club?lesson=7&amp;date=2026-03-03'],
    [paths.freeOpen(7, '2026-03-03'), '/free?lesson=7&amp;date=2026-03-03'],
    [paths.lessonOpen(7, '2026-03-03'), '/lesson?lesson=7&amp;date=2026-03-03'],
    [paths.lessonOpen(7, '2026-03-03', { lab: true }), '/lesson?lesson=7&amp;date=2026-03-03&amp;lab=1'],
    // TA
    [paths.taWhich('next'), '/ta?which=next'],
    [paths.taWhich('mine'), '/ta?which=mine'],
    [paths.taFeedback(), '/ta/feedback'],
    [paths.taLesson(7, '2026-03-03'), '/ta?lesson=7&amp;date=2026-03-03'],
    // pupil /me
    [paths.meDone(20), '/me/done?oc=20'],
    [paths.meFeedback(20), '/me/feedback?oc=20'],
    [paths.meAnswer(20), '/me/answer?oc=20'],
    [paths.pupilImage('2026/06/a b.png'), '/pupil-image?p=2026%2F06%2Fa%20b.png'],
    // safeguarding
    [paths.safeguardingSource('note', 12), '/safeguarding/note/12'],
    // setup / admin
    [paths.setup(), '/setup'],
    [paths.setupTab('day', 5), '/setup?tab=day&amp;year=5'],
    [paths.setupYear(5), '/setup/year/5'],
    [paths.setupYearMakeCurrent(5), '/setup/year/5/make-current'],
    [paths.setupYearAdd(), '/setup/year/add'],
    [paths.setupTerm(2), '/setup/term/2'],
    [paths.setupTermDelete(2), '/setup/term/2/delete'],
    [paths.setupTermAdd(5), '/setup/term/add?year=5'],
    [paths.setupPeriod(3), '/setup/period/3'],
    [paths.setupPeriodDelete(3), '/setup/period/3/delete'],
    [paths.setupPeriodAdd(5, 1), '/setup/period/add?year=5&amp;weekday=1'],
    [paths.setupDayCopy(5), '/setup/day/copy?year=5'],
    [paths.setupDayApplyModel(5), '/setup/day/apply-model?year=5'],
    [paths.setupRoomToggle(4, 'archive'), '/setup/room/4/archive'],
    [paths.setupRoomToggle(4, 'restore'), '/setup/room/4/restore'],
    [paths.setupRoomAdd(), '/setup/room/add'],
    [paths.setupStaffToggle(4, 'archive'), '/setup/staff/4/archive'],
    [paths.setupStaffAdd(), '/setup/staff/add'],
    [paths.setupCourse(6), '/setup/course/6'],
    [paths.setupCourseToggle(6, 'restore'), '/setup/course/6/restore'],
    [paths.setupCourseAdd(), '/setup/course/add'],
    [paths.setupGroup(8), '/setup/group/8'],
    [paths.setupGroupCourse(8, 6), '/setup/group/8/course/6'],
    [paths.setupGroupToggle(8, 'archive'), '/setup/group/8/archive'],
    [paths.setupGroupEnrol(8), '/setup/group/8/enrol'],
    [paths.setupGroupAdd(5), '/setup/group/add?year=5'],
    [paths.setupEnrolmentMove(9, 5), '/setup/enrolment/9/move?year=5'],
    [paths.setupEnrolmentRemove(9), '/setup/enrolment/9/remove'],
    [paths.setupLesson(10), '/setup/lesson/10'],
    [paths.setupLessonCourse(10, 6), '/setup/lesson/10/course/6'],
    [paths.setupLessonDelete(10), '/setup/lesson/10/delete'],
    [paths.setupLessonAdd(3, 5), '/setup/lesson/add?period=3&amp;year=5'],
    [paths.setupRolloverRoll(2, 5), '/setup/rollover?from=2&amp;to=5'],
    [paths.setupRolloverRoll(null, 5), '/setup/rollover?to=5'],
    [paths.groupHistory(8), '/group/8/history'],
  ])('builds %s', (actual, expected) => {
    expect(actual).toBe(expected);
  });
});
