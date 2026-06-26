# Phase 2 — Assign to class + availability window

**Goal:** let the teacher assign a **ready** assessment to one or more eligible classes, each with an
availability window (`available_from` / `available_until`) and a results mode (`instant` vs `on_release`).
This is the bridge between authoring (Phase 1) and the pupil take-flow (Phase 3). The repo layer already
exists; this phase is mostly **service + route + view + tests**.

## Outcome

From a ready assessment's page: "Assign to class" → pick class(es) from the eligible list, set an optional
open/close window and results mode → rows appear in `assessment_classes`. The teacher can edit the window,
change results mode, or unassign. A pupil's eligibility in Phase 3 is exactly "an assignment row exists and
now is within the window."

## Files to create / modify

| File | New? | Responsibility |
|------|------|----------------|
| `app/src/services/assessmentAssign.ts` | new | Eligible-class listing + window validation + assign/unassign orchestration. |
| `app/src/routes/assessments.ts` | edit | Add assign / edit-window / unassign routes. |
| `app/src/lib/assessmentReviewView.ts` | edit | Add an "Assignments" panel (assigned classes + window form). |
| `app/src/lib/paths.ts` | edit | Assign / unassign / window builders. |
| tests | new | Window validation (pure) + assign/eligibility integration. |

## Repo layer (already shipped — reuse as-is)

From [repos/assessmentAttempts.ts](../app/src/repos/assessmentAttempts.ts):
- `assignToClass(assessmentId, groupCourseId, { availableFrom?, availableUntil?, resultsMode? })` — upsert
  (idempotent on the `(assessment_id, group_course_id)` unique key).
- `unassign(assessmentId, groupCourseId)`.
- `listAssignmentsForAssessment(assessmentId)` → `AssignmentRow[]`.
- `getAssignment(assessmentId, groupCourseId)` → `AssignmentRow | null` (used by Phase 3 take auth).
- `setReleased(assessmentId, groupCourseId, released)` (used by Phase 5 release).

## Service — `services/assessmentAssign.ts`

- **Eligible classes:** `listSlotsForCourse(courseId)` ([repos/delivery.ts](../app/src/repos/delivery.ts))
  → `CourseSlot[] { groupCourseId, groupName, … }`; **dedupe by `groupCourseId`** to a class list. The
  assessment's `courseId` comes from `getAssessment(id)`. Mark which classes are **already assigned** (join
  with `listAssignmentsForAssessment`). The class the paper was generated *from* (in `blueprint.groupCourseId`)
  is the natural default but **any** eligible class can be assigned (confirmed scope: "assignable to others").
- **Window validation** (pure helper `validateWindow(fromIso, untilIso): { ok; from; until; error? }`):
  parse to ISO timestamps; `until` must be after `from`; both optional (null = immediate / no close). Keep it
  pure so it's unit-tested. Reject `ready`-gating: only assign assessments whose `status === 'ready'`
  (don't expose draft papers to pupils).
- **Assign / edit / unassign** thin wrappers that call the repo and re-read for the view.

```ts
export interface EligibleClass { groupCourseId: number; groupName: string | null; assigned: boolean; window?: { from: string|null; until: string|null }; resultsMode?: 'instant'|'on_release' }
export async function eligibleClassesFor(assessmentId: number): Promise<EligibleClass[]>
export async function assign(assessmentId: number, groupCourseId: number, opts): Promise<{ ok: boolean; message: string }>
export function validateWindow(from?: string|null, until?: string|null): { ok: boolean; from: string|null; until: string|null; error?: string }
```

## Routes — add to `routes/assessments.ts`

- `POST /assessments/:id/assign` (body: `groupCourseId`, `availableFrom?`, `availableUntil?`, `resultsMode?`)
  → guard `status==='ready'` + `validateWindow` → `assign(...)` → re-render the Assignments panel (HTMX).
- `POST /assessments/:id/assign/:gcId/window` → update window/results mode (same `assignToClass` upsert).
- `POST /assessments/:id/unassign/:gcId` → `unassign(...)`.
- All mutations behind `app.csrfProtection`.

## View — Assignments panel in `assessmentReviewView.ts`

- A table of eligible classes: name, assigned? toggle, the open/close datetime inputs, a results-mode
  select (`instant` / `on_release`). Show "available now" when `from` is null.
- Only render the panel when the assessment is **ready** (draft papers aren't assignable). URLs via `paths.ts`.
- Reuse the existing fixture; add an assigned-state variant for the gallery (Phase 6 formalises it).

## Privacy & degrade

- No AI in this phase → nothing to redact, but **no pupil identity** appears in assignment rows either
  (`assessment_classes` is class-level). Eligibility reads are class/course-level only.
- `is_test`: assignment is not test-partitioned (it's a class-level config); the test partition lives on
  **attempts** (Phase 3). Nothing to filter here.

## Tests (this phase must add)

1. **Pure — `validateWindow`** (`tests/assessmentAssign.test.ts`): null/null ok; `until < from` rejected;
   valid range ok; bad date strings rejected.
2. **Integration — assign + eligibility** (`tests/integration/assessmentAssign.int.test.ts`): build the
   course/class fixture (as `assessmentsRepo.test.ts`); `eligibleClassesFor` lists the class once (dedup),
   marks it unassigned; after `assign`, it's marked assigned with the window; editing the window updates it;
   `unassign` removes it. Assert a **draft** assessment is refused by the service-level `ready` guard.

## Definition of done

- [ ] Gate green (typecheck · unit · integration).
- [ ] Teacher can assign a ready paper to an eligible class with a window + results mode, edit it, unassign.
- [ ] Draft assessments cannot be assigned.
- [ ] New paths + `pathsBuilders.test.ts` assertions; Assignments panel previews in the gallery.

## Open decisions

- Multi-select assign ("assign to all my Year 9 classes at once") vs one-at-a-time — start one-at-a-time.
- Whether `resultsMode` is set at assign time only, or also editable later (plan: editable, via the window route).
