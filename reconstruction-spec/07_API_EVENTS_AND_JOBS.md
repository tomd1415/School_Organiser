# API, events, and background jobs

## 1. API style

The target may use framework form actions rather than these literal URLs. Preserve the use cases, permission gates, status semantics, and idempotency. Use HTML responses for normal navigation and typed JSON/problem responses for enhanced actions where that produces simpler, testable code.

Every mutation requires CSRF protection, a validated body, actor policy, object-level policy, transaction where stated, and a structured audit for high-risk actions.

## 2. Current route-family inventory

This table captures the current public surface at a family level, including patterns expanded dynamically.

| Area | Current routes/use cases |
|---|---|
| Auth | `/welcome*`, `/login`, `/logout` |
| Now | `/`, `/now/clock`, `/header-overhaul` |
| Timetable | `/timetable` |
| Lesson | `/lesson`, preview, pupil-view, present, bind/edit/progress, slide/slide-lock, adaptation/history, context/access, resources AI, review, retrieval, cover, exception, print, fast capture, group levels |
| Free/club | `/free` assignment/new/done/mark/unmark; `/club` record/history |
| Marking/ATL | `/marking`, `/lesson/oc/:id/mark`, per-pupil mark/save/confirm, `/pupil-work`, scheme, release, settings, answer pack/CSV, `/atl` |
| Pupil | `/pupil` code/name/PIN/resume/forget; `/me` answer/done/feedback/remember/image/ping/slide-stream; test-pupil routes |
| Curriculum | `/schemes*`, `/map*`, `/planner*`, `/coverage*`, `/pedagogy`, `/concepts*` |
| Resources | `/resources` list/import/stage/commit/cancel/create/generate/version/edit/image/view/download/present/usage; `/lesson-image/:id` |
| Work | `/tasks*`, `/recurring*`, `/events*`, `/time`, `/work-blocks*`, `/timer*`, `/focus*`, `/prep*` |
| Notes/capture | `/notes*`, `/note/route*`, `/captured*`, `/capture-quick`, stopping-point/follow-up actions |
| People/setup | `/pupils*`, `/group/:id/history`, `/setup*`, `/setup/rollover*`, `/kit*`, `/oversee` |
| TA | `/ta`, `/ta/feedback` |
| Safety/settings | `/safeguarding*`, `/settings*`, AI-log HTML/CSV/JSON |
| Search/health | `/search`, `/health` |

## 3. Recommended target endpoint/use-case groups

### 3.1 Sessions

- `POST /sessions/teacher-ta`
- `DELETE /session`
- `POST /pupil-session/class`
- `POST /pupil-session/identity`
- `POST /pupil-session/pin`
- `POST /pupil-session/resume`
- `DELETE /pupil-device-cookie`

Responses never distinguish disabled user from wrong secret. Login POSTs are never idempotently retried by the client.

### 3.2 Dashboard and schedule

- `GET /api/now?signature=` → 204 if unchanged.
- `GET /api/timetable?week=&year=`.
- `POST/DELETE /api/schedule-exceptions`.
- `GET/POST /api/free-periods/:slot/:date/tasks`.
- `PUT /api/club-sessions/:slot/:date`.

### 3.3 Lesson and delivery

- open/preview lesson;
- bind plan;
- save progress/stopping point;
- add note/follow-up;
- save class/master lesson fields;
- create/reset adaptation and fetch history;
- preview pupil level;
- generate/adapt resources;
- create cover pack;
- set exception;
- get pupil-work signature/read model;
- place/move/lock/undo plans.

Use an idempotency key for expensive generation and large planner commands.

### 3.4 Pupil work

- `PUT /api/pupil-work/:section/answers/:fieldKey` with worksheet version/provenance.
- `POST /api/pupil-work/:section/answer-files/:fieldKey` streaming raster upload.
- `PUT /api/pupil-work/:section/completion`.
- `PUT /api/pupil-work/:section/feedback`.
- `POST /api/pupil-devices`.
- `GET /api/pupil-images/:answerFileId` with ownership check.

Successful saves return a monotonically increasing revision or `updated_at`, allowing conflict detection. A stale client should receive 409 with both safe versions, not silently overwrite newer work.

### 3.5 Marking

- derive/edit/ready scheme;
- run objective/open marking;
- confirm confident/all-per-pupil;
- override answer mark;
- save pupil comment;
- release/revoke results;
- update class marking policy;
- generate profile/summary;
- export CSV/answer pack;
- save ATL.

AI marking commands return job/progress state when slow. Repeating the same job key must not spend twice.

### 3.6 Resources

- stage upload/import with per-entry result;
- commit/cancel batch;
- create/version/edit;
- preview/download/present/export;
- link/unlink and usage.

Downloads use `Content-Disposition`, `X-Content-Type-Options: nosniff`, validated MIME, and role/capability checks.

## 4. Event contracts

### 4.1 SSE slide stream

Endpoint authenticates pupil/test-pupil and section eligibility. Events:

```text
event: slide
data: {"index": 3, "revision": 18}

event: lock
data: {"locked": true, "revision": 19}
```

On connect send both current states. Heartbeat comments every ~25 seconds. Clamp index to available deck on the client. Disconnect and reconnect degrade to local navigation; locked state resumes from persisted state.

### 4.2 Save events

Use a typed client store/event, not DOM class names as the API. Each operation has a stable operation ID. A failure updates only that operation. Successful unrelated reads do not clear it.

### 4.3 Poll signatures

Now and pupil-work read models include deterministic signatures derived from meaningful visible state. If client signature matches, return 204 with no body. Do not include volatile timestamps that force every poll to swap.

## 5. Background jobs

| Job | Trigger | Idempotency key | Failure/recovery |
|---|---|---|---|
| Recurring tasks | Boot + scheduled daily/minute | definition + due slot | Unique instance; cursor and task atomic |
| Email poll | Configured cadence | mailbox + message ID/hash | Lease/claim; complete destination atomically; retry stale claim |
| Open marking | On Done/manual + 30s worker | occurrence section + scheme/version + job kind | Durable state; no duplicate AI spend |
| File deletion | After disposal/replacement + periodic | storage path + reason | Retry with attempts/backoff; alert after threshold |
| Morning brief | School-day early morning/on demand | date | Deterministic overwrite; no AI required |
| Review sweep | Optional 04:00–08:00 | date + review slot | Lease with expiry; daily cap; skip open review |
| Device/export cleanup | Daily | date | Idempotent delete expired artifacts |
| Backup verification reminder | Daily/read-only | latest backup stamp | Surface overdue verification; backup itself remains operator/system timer |

## 6. Job lease protocol

1. Insert unique scheduled run or atomically claim an expired pending run.
2. Set lease owner and expiry in a short transaction.
3. Perform external/long work outside transaction.
4. Recheck ownership and commit result.
5. On exception, record safe error and next attempt.
6. Hard crash leaves an expiring lease; another worker resumes.

For AI: prepare/redact → reserve estimated cost/audit → provider call → reconcile actual. A retry after uncertain provider outcome requires an idempotency/duplicate-spend decision; never blindly call again.

## 7. Upload limits

Define configurable but bounded defaults:

- pupil screenshot: 12 MB, raster PNG/JPEG/WebP/GIF only;
- course document: much smaller policy appropriate to extraction, with character cap;
- single teacher resource: up to current operational need, streamed;
- folder batch: total bytes, files, parts, depth, per-entry decompressed size, and compression ratio;
- email body/attachment: strict message and extracted text caps.

Reject early with 413 and preserve staged-batch cleanup. Tests must assert bounded memory, not only status.

## 8. Cache semantics

- Private authenticated HTML: `no-store` or appropriate private cache policy.
- Static fingerprinted assets: `public, max-age=31536000, immutable`.
- Sensitive images/resources: private/no-store unless signed capability and safe cache window are deliberate.
- SSE: no-cache/no-transform and proxy buffering disabled.
- Export archives: short-lived, private, explicit download.

## 9. Compatibility strategy

Do not preserve all 335 legacy URLs by default. During cut-over, either:

- route old deep links to new canonical pages with validated redirects; or
- provide a temporary compatibility adapter with tests and a removal date.

Preserve stable teacher bookmarks for Now, timetable, lesson by lesson/date, pupil login, marking, schemes, resources, setup, and settings.

