# Additional Review Findings - 2026-06-15

These findings were identified after comparing against `docs/REVIEW_FINDINGS_2026-06-14.md`. No code changes were made as part of the review.

## Findings

### High: TA users can access arbitrary resources by ID

The TA lockdown allowlist permits any `/resources/:id/view`, `/download`, `/present`, or `/download.docx` URL:

- `app/src/auth/lockdown.ts:10`
- `app/src/auth/lockdown.ts:16`

The resource routes only require an authenticated session and then fetch the requested resource ID directly:

- `app/src/routes/resources.ts:146`
- `app/src/routes/resources.ts:241`
- `app/src/routes/resources.ts:259`

A TA could enumerate resource IDs and view or download resources that are not attached to their current lesson. This should be scoped so limited roles can only open resources linked to lessons they are allowed to see, or resources should be served through scoped signed URLs.

### High: Uploaded SVG files can be served inline as same-origin content

Uploads preserve the file bytes and MIME type:

- `app/src/routes/resources.ts:78`
- `app/src/routes/resources.ts:85`

SVG files are classified as image resources and image previews are served inline:

- `app/src/services/resource.ts:10`
- `app/src/services/resource.ts:23`
- `app/src/services/resource.ts:62`
- `app/src/routes/resources.ts:285`
- `app/src/routes/resources.ts:288`

A malicious SVG opened through `/resources/:id/view` could execute script in the app origin. Consider forcing SVG downloads, sanitizing SVGs before preview, or serving them from a separate cookieless/sandboxed origin.

### Medium: Named TA now/next view is not scoped to that TA's lessons

`lessonsAt` returns every lesson in the current weekday and slot without filtering by `staff_id`:

- `app/src/routes/ta.ts:46`
- `app/src/routes/ta.ts:57`

The `/ta` route renders all returned lessons for the `now` and `next` tabs:

- `app/src/routes/ta.ts:212`
- `app/src/routes/ta.ts:222`
- `app/src/routes/ta.ts:224`

The deep-link path does enforce that the selected lesson belongs to the named TA, which suggests the normal now/next path may be missing the same scope check:

- `app/src/routes/ta.ts:190`
- `app/src/routes/ta.ts:196`

As written, a named TA can read plans and linked resources for other lessons happening in the same period. If shared TA accounts are expected to see all current lessons, that behavior should be made explicit and separated from named TA accounts.

### Low: Day checklist defaults can duplicate under concurrent first loads

`getDayChecklist` reads existing rows and, when none are present, inserts default checklist items one by one:

- `app/src/repos/prep.ts:68`
- `app/src/repos/prep.ts:70`
- `app/src/repos/prep.ts:73`

The table has no uniqueness constraint for the date/part/default rows:

- `app/migrations/0004_prep.sql:3`
- `app/migrations/0004_prep.sql:12`

Two first requests for the same date and checklist part can both observe no rows and both insert the defaults. A unique key plus `ON CONFLICT DO NOTHING`, or a transaction/advisory lock around materialisation, would prevent duplicate checklist items.
