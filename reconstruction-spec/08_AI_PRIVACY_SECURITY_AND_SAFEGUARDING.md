# AI, privacy, security, and safeguarding

## 1. Non-negotiable rules

1. No pupil name may be sent to an external AI provider.
2. Safeguarding-marked or guard-matched content is withheld entirely from AI.
3. No browser calls an AI provider directly.
4. Every AI request passes through one server gateway and produces a redacted audit record before egress.
5. AI is optional; provider failure cannot block core teaching/recording.
6. AI output is a proposal unless a narrow deterministic action is explicitly approved.
7. AI marks are never pupil-visible until teacher-confirmed.
8. Tests never call the real provider.

## 2. AI gateway pipeline

For text and structured output, perform in this order:

1. Resolve feature configuration and API key without returning the key to UI/logs.
2. Check master feature switch and feature-specific gate.
3. Assemble typed context items with `safeguarding`, source, and sensitivity metadata.
4. Remove every safeguarding item.
5. Load the complete active real-pupil roster, not merely the current class.
6. Replace full names and distinctive name parts with stable tokens. Matching must handle whitespace/punctuation variants and fail closed for real roster names that are ordinary words.
7. Redact instruction and system text as well as context.
8. Assert no roster name survives in the final serialised payload.
9. Estimate maximum cost from redacted input and output limit.
10. Atomically reserve against the monthly cap and persist the redacted request.
11. Call the provider with timeout/retry policy.
12. Validate structured output against a schema or treat it as unusable.
13. Reconcile tokens/cost/status in the same audit row.
14. Recursively re-expand tokens for teacher display only.

Any failure before step 11 means nothing was sent. Audit-write failure must not discard a successful billed response, but must raise an operator-visible control failure.

## 3. Feature registry

Use one registry as the source for settings, prompts, model role, maximum tokens, schema, cost estimate, privacy class, enabled default, and audit label. It must include every actual call site.

Required families include:

- author scheme, class intake, draft/adapt lesson, improve master;
- lesson/adapted slides and lesson resources;
- convert/import/generate resource, cover pack;
- term/class work summaries and standing preferences;
- captured/email/note routing, task breakdown, estimate calibration;
- mark scheme, open-answer marking, pupil profile;
- coverage check, retrieval starter, lesson review, scheme review.

The current system has registry drift; the rebuild MUST have a test that compares registered features to all gateway calls.

## 4. Prompt and output controls

- Version every prompt contract.
- Put immutable policy and pedagogy in system text; put selected, labelled data in context.
- Cap each source item and total prompt size.
- Exclude AI-generated resources from source-material grounding to prevent feedback loops.
- Separate teacher notes from pupil/projector content structurally, not by hopeful prompt instruction.
- Structured operations validate types, maximum array sizes, string lengths, enum values, and cross-reference IDs before persistence.
- Never accept model-generated storage paths, SQL, HTML, resource IDs, marks outside scheme totals, or arbitrary route targets.
- Escape/sanitise rendered model Markdown and never allow raw HTML/script execution.

## 5. AI marking privacy

- Group open answers by question, replace each pupil with an ephemeral slot letter, and do not include pupil ID/token/name.
- Guard-screen answer text before batching. Withheld answers go directly to teacher/safeguarding review.
- Do not send screenshot/image answers in v1.
- Request marks, confidence, evidence quotes, and concise feedback against a supplied scheme.
- Verify evidence is present in the submitted answer and award is within range.
- Low confidence, no evidence, injection-like output, or sensitive content sets `needs_review`.
- Store provider result as suggested; teacher action creates confirmation/override history.

## 6. Safeguarding design

Sources include flagged notes of any kind, captured items, TA feedback, and pupil answers matched by the guard. The central register must cover all sources and track handling. It is teacher-only and excluded from search snippets shown in lower-trust contexts.

Guard matching should be conservative and versioned. It is not a classifier of truth; it is an egress brake. False positives are acceptable because the fallback is teacher review, not data loss.

## 7. DPIA gates

Two default-off production switches:

- pupil access: enabling records acknowledgement timestamp/version of DPO/SLT approval;
- pupil marking/devices/profiles: enabling requires pupil access and a separate addendum acknowledgement.

Turning either off takes immediate effect: cached settings invalidate, live sessions/jobs are revoked or blocked, pupil pages stop, and remembered-device resume fails.

Do not hardcode “approval exists” in seed/migration for production. Test-data instances may enable gates only with fictional pupils and visible sandbox labelling.

## 8. Authentication and session controls

- Password/PIN hashing: Argon2id or scrypt with modern parameters and per-secret salt.
- Session cookies: encrypted/signed, HttpOnly, SameSite=Strict, Secure in production, bounded absolute lifetime.
- Teacher idle timeout ignores background polls but enforces timeout on them.
- Pupil idle timeout receives keep-alive only from recent genuine visible interaction.
- Session epochs checked on every limited-role request.
- CSRF on all mutations, including enhanced fetch/form requests.
- Per-IP and per-account-class rate limits; proxy overwrites and app trusts only configured proxy hops.
- Generic errors prevent credential/enrolment oracles.
- First-run claim is transactional and serialised.

## 9. Authorisation and object access

- Teacher routes require teacher role, not merely `authed=true`.
- TA URL allow-list is supplementary; each resource/lesson read checks assignment and signed capability.
- Pupil URL allow-list is supplementary; every answer/file/stream checks own current eligible lesson.
- Resource IDs and pupil paths are never trusted from the URL alone.
- Signed image URLs include ID, role/audience, expiry, and HMAC; validate with timing-safe comparison.
- Test-pupil override is teacher-only and cannot be activated from a pupil session.

## 10. Upload/content security

- Stream limits before buffering.
- Validate MIME and file signatures where possible.
- Disallow SVG for pupil screenshots.
- Serve untrusted active formats as attachments with `nosniff`.
- Disable PDF JavaScript/eval.
- Protect against ZIP slip, excessive nesting, entry count, decompression bombs, and path traversal.
- Store outside executable/static source directories using opaque names.
- Never include local absolute paths in responses or AI context.

## 11. Data minimisation and retention

Store only data needed for planning, work, assessment, and approved pupil access. Do not add DOB, address, parent contact, diagnosis, or formal safeguarding case management without explicit purpose, lawful basis, retention, and DPIA update.

Retention values must be school-approved and configurable/documented. Current proposals such as academic year plus one term are not approval. Expired devices, temporary exports, staged imports, failed buffers, and old job logs need cleanup policies.

## 12. Export, anonymisation, erasure

- Subject-access export is complete, checksummed, and excludes hashes/secrets.
- Safeguarding material is withheld for case-by-case DSL handling with an explanatory manifest entry.
- Anonymise removes every direct/indirect identifier and screenshots; cohort attainment may remain only if truly non-identifying and approved.
- Erase removes dependent personal records and files.
- Shared free text is scrubbed using robust name variants, not only recorded mention text.
- File deletion is durable and retried; completion is observable.
- Disposal audit retains only token/action/counts/time.

## 13. Secrets and infrastructure

- Session key, DB password, backup encryption recipient/key, and environment-managed AI/mail secrets stay outside Git/database where possible.
- If the UI can manage AI/mail secrets, encrypt them with a deployment key not stored in the database.
- Production refuses default DB credentials and insecure session key.
- PostgreSQL/app direct ports bind loopback/internal network; LAN traffic enters through Caddy.
- Use TLS, security headers, request-size limits, and no public internet exposure.
- No CDN, analytics, trackers, remote fonts, or third-party scripts.

## 14. Security headers

At minimum: CSP suited to the chosen framework without broad `unsafe-eval`, `frame-ancestors 'self'` or stricter, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, restrictive `Permissions-Policy`, and HSTS when the internal certificate deployment supports it. Projector/new-tab flows must still work under CSP.

## 15. Security acceptance evidence

Release evidence includes:

- redaction property tests at full roster scale;
- safeguarding-withholding tests for every AI feature family;
- provider-call spy proving no bypass;
- role/object access matrix tests;
- upload bomb/traversal/type tests;
- session revoke/idle/rate-limit tests behind proxy;
- export/disposal/file deletion tests;
- production dependency audit;
- restore drill record;
- reviewed DPIA version and sign-off status.

