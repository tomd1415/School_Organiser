# Roles, workflows, and state machines

## 1. Permission matrix

| Capability | Teacher | TA | Pupil | Test pupil |
|---|---:|---:|---:|---:|
| Full teacher navigation | Yes | No | No | Teacher session remains active |
| Current/next assigned lesson | All | Assigned/self only | Own current class only | Chosen preview lesson |
| Pupil names/roster | Yes | No | Own identity only | Fictional identity only |
| Lesson plan/resources | Yes/edit | Read approved content | Rendered worksheet/slides only | Same pupil renderer |
| Notes/tasks/events | Yes | Feedback only | No | No |
| Pupil answers/marks | Yes | No | Own; released marks only | Isolated preview data |
| Safeguarding register | Yes | No | No | No |
| AI actions/settings/audit | Yes | No | No direct action | No |
| Setup/export/disposal | Yes | No | No | No |

Every backend handler MUST state its required role and its resource-level predicate. “The link is hidden” is not authorisation.

## 2. Authentication workflows

### 2.1 First run

1. `GET /welcome` is available only while no teacher credential exists.
2. The user supplies teacher name, school name, and a strong password.
3. The server takes a transaction-scoped “first-run identity” lock.
4. Under the lock it rechecks that no credential exists.
5. Exactly one caller creates the self staff row, school setting, and password hash.
6. The winner becomes an authenticated teacher; all later callers go to login.
7. A guided setup checklist remains until explicitly marked complete.

### 2.2 Teacher/TA login

1. Rate limit by trusted client IP and principal class.
2. Verify teacher password first; only a teacher success clears the teacher attempt counter.
3. Otherwise verify active named TA credentials; retain the attempt brake.
4. A legacy shared TA password is migration-only and SHOULD NOT exist in the clean rebuild.
5. Set role, account ID, staff ID, session epoch, and last-active timestamp.
6. Teacher goes to Now; TA goes to TA home.
7. Password change, account disable/delete, or epoch bump invalidates live sessions.

### 2.3 Pupil login

```text
access switch on
  → enter class code
  → server binds class ID + issued-at to session
  → choose name from active enabled roster
  → enter PIN
  → verify binding, TTL, enrolment, credential state and rate limits
  → set pupil ID, group ID, epoch and activity time
  → /me
```

Failure messages MUST not reveal whether a PIN, pupil ID, or credential-enabled state was the cause. Five failed PINs lock the credential until teacher unlock. Reset/disable MUST revoke remembered devices and bump the session epoch atomically.

### 2.4 Remembered device

- Store only a random opaque secret in an HttpOnly, SameSite=Strict, Secure-in-production cookie.
- Store a hash, pupil ID, label, expiry, and last-used time server-side.
- Permit one-tap resume only when pupil access, marking/device gate, pupil, enrolment, and class device policy remain active.
- Resolve the current lesson's class first, primary enrolment second.
- “Not me” clears the cookie.
- Term end, PIN reset, pupil deactivation, class policy off, or teacher revoke invalidates it.

## 3. Daily teacher workflow

### 3.1 Start of day

1. Open Now.
2. Review current/next lesson, day checklist, safeguarding item count, deadlines, marking, and coverage risks.
3. Use quick capture without navigating away.
4. Open Focus if overwhelmed; receive exactly one recommended action.
5. Print the effective day only if needed.

### 3.2 Before a lesson

1. Follow Now/timetable deep link containing stable lesson ID and ISO date.
2. Review effective room/cover state and last stopping point.
3. Confirm bound plan and current class adaptation.
4. Open/generate slides, worksheet, support, answers, TA notes, and kit list.
5. Preview exact pupil view at Support/Core/Challenge levels using the fictitious test pupil.
6. Open projector view; teacher presenter notes remain private.

### 3.3 During a lesson

1. Navigate slides; pupil devices follow via SSE when locked.
2. Tap the current outline step; progress and textual stopping point update together.
3. Capture learning, logistics, or safeguarding notes quickly.
4. View aggregate pupil completion and individual work.
5. Record ATL in the class grid or marking modal.
6. Mark/confirm work while circulating if enabled.
7. Background refreshes do not replace unchanged DOM or steal focus.

### 3.4 After a lesson

1. Confirm stopping point and follow-ups.
2. Review Done/feedback/answers/ATL.
3. Run deterministic/open marking as appropriate.
4. Confirm, comment, and release according to class policy.
5. Produce a cohort summary or standing feedback digest if useful.
6. Adapt the next lesson or propose master improvement; no proposal auto-applies.

### 3.5 Free period

1. Open effective free slot, not the lesson cockpit.
2. See tasks already assigned to `(date, timetable slot)`.
3. Pull in an existing task or create one.
4. Use Focus/timer.
5. Mark done or record diverted actual work while preserving the plan.
6. A temporary free exception can be reverted to teaching.

### 3.6 Club

1. Open club workspace.
2. Record what happened and where participants got to.
3. Autosave within a bounded text length.
4. Review recent session history for continuity.

## 4. Curriculum workflows

### 4.1 Create or import a scheme

- Manual: create scheme → units → lessons → objectives/outline/kit/resources.
- AI: review course/context/spec/material inputs → generate structured draft → validate → materialise in one transaction.
- Imported unit: stage files → preview extracted content and attribution → choose course/class → convert → optionally lay down across all class slots.
- First scheme may become active by explicit policy; later schemes MUST remain draft until activation.

### 4.2 Version and activate

```text
active vN
  → clone creates draft vN+1 with all units/plans/links/spec/kit/labels
  → edit/review draft
  → activate transaction locks course
  → old active becomes inactive; draft becomes sole active
```

Database constraints MUST prevent two active versions and duplicate `(course, version)` pairs.

### 4.3 Class adaptation

- No adaptation row means inherit the master.
- First class edit creates a delta row.
- Every edit appends history with author and summary.
- Reset deletes/clears the delta and returns to inheritance.
- AI adaptation writes only class delta and history.
- Promotion to master is a proposal, then explicit teacher application.

### 4.4 Planner placement

The planner operates on one chronological stream of all class slots.

- Insert into empty: bind plan.
- Insert into occupied: cascade until a gap; stop at locked slot.
- Move: relocate/swap within the class stream.
- Whole unit: place ordered plans beginning at target.
- Pull: clear selected plan and shift later unlocked plans forward.
- Lock: pin binding against automatic movement.
- Undo: restore a clearly described previous operation.

All affected positions MUST be calculated before writing, validated for year overflow, and persisted in one class-serialised transaction. A lesson MUST never fall off the end silently.

## 5. Pupil work workflow

### 5.1 Eligibility predicate

A real pupil may access/write occurrence-course `oc` only if all are true:

- session role is pupil;
- pupil ID and group ID exist and epochs match;
- pupil and enrolment are active;
- pupil access switch is on;
- `oc` belongs to the session group;
- occurrence is today in the school timezone;
- the effective lesson is not cancelled, free, or off timetable;
- the submitted field key occurs in the rendered worksheet slice/version;
- for image reads/writes, the path belongs to this pupil and permitted occurrence.

The test pupil uses a separate teacher-authorised predicate and never weakens the real-pupil path.

### 5.2 Answer save state

```text
clean
  → user input: dirty + local buffer written
  → request starts: saving
  → 2xx confirmed: server value current, buffer removed, saved
  → network/5xx/session redirect: buffer retained, visible not-saved/offline state
  → reconnect/login: retry latest buffered value
  → server has a different non-empty value: trust server, discard stale buffer, surface conflict if needed
```

Changing an answer invalidates its stale mark in the same transaction.

### 5.3 Completion and feedback

- Done is reversible.
- Done may trigger objective marking immediately and enqueue debounced open marking.
- Feedback rating is optional; liked/disliked chips are allow-listed; comment length is bounded.
- Completion does not itself release results.

## 6. Marking state machines

### 6.1 Mark scheme

```text
absent → derived/generated/teacher draft → teacher edits → ready
```

Only a scheme matching the answer's resource/version provenance may mark it.

### 6.2 Individual answer mark

```text
no mark
  → objective marker: suggested/confirmed according to deterministic policy
  → AI marker: suggested + confidence + evidence + safety result
  → teacher confirm: confirmed
  → teacher override: confirmed, marker=teacher, prior state in history
  → answer changes: mark invalidated/deleted
```

AI evidence MUST be a verified substring of the answer. Out-of-range awards, unsupported evidence, low confidence, or safety matches require teacher review.

### 6.3 Results release

- `instant`: confirmed marks become visible as they are confirmed.
- `hold`: no marks are visible until teacher releases the occurrence-course.
- Unconfirmed marks are never visible.
- Revoke release hides results but retains confirmed records.
- `show scores=false` shows friendly ticks/feedback without numeric score.

## 7. Tasks, events, work, and timers

### 7.1 Task status

```text
inbox → triaged → scheduled → in_progress → done
                ↘ dropped
```

Transitions should be explicit. Completing a parent does not silently complete children unless specified. Starting a timed task stops any other running timer transactionally.

### 7.2 Work block

```text
planned → done
        → diverted (planned data retained; actual task/note required or encouraged)
```

### 7.3 Event

```text
upcoming → done
         → cancelled
```

Availability-impacting events remove overlapping work windows; ordinary information events do not.

### 7.4 Recurrence

Each generated task has a stable slot key. Generator writes task plus cursor advancement atomically and uses a unique constraint/`ON CONFLICT DO NOTHING`. The cursor includes date and minute for per-lesson patterns.

## 8. Safeguarding workflow

```text
source flagged or guard-matched
  → immediately excluded from AI context
  → visible in teacher safeguarding register
  → handling status: recorded → actioned or referred
  → action note/date retained
```

The register records handling; it MUST NOT claim to replace the school's referral process. TA/pupil UI should instruct the user to tell the teacher/designated lead where appropriate.

## 9. Pupil lifecycle

### 9.1 Deactivate

Keeps the record, removes login/access, bumps epoch, revokes devices, and excludes pupil from active rosters.

### 9.2 Anonymise

Keeps non-identifying cohort attainment where lawful, removes credentials/devices/screenshots/profiles and identity-bearing narrative, replaces identity with stable non-identifying token, and writes a disposal audit containing counts but no name.

### 9.3 Erase

Deletes personal dependent rows and files, scrubs shared narrative references, queues failed file deletions durably, and retains only a non-identifying disposal audit.

### 9.4 Export

Creates a ZIP with JSON record, permitted screenshots, manifest, and plain-language exclusions. Secrets/hashes and safeguarding records are excluded.

