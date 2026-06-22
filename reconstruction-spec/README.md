# School Organiser reconstruction pack

This directory is a build specification for recreating the application with a smaller, clearer codebase while preserving the current application's useful behaviour. It describes the application as it exists in the workspace on **22 June 2026**, including the uncommitted slide-synchronisation and pupil offline-save work.

It is not a request to copy the current implementation. The target should preserve product behaviour and safety properties, not its accumulated route count, duplicated styling, or historical phase structure.

## Reading order

1. [01_CURRENT_SYSTEM_AUDIT.md](01_CURRENT_SYSTEM_AUDIT.md) — what was inspected, what exists, and what is unfinished.
2. [02_PRODUCT_AND_FEATURE_SPEC.md](02_PRODUCT_AND_FEATURE_SPEC.md) — canonical functional requirements.
3. [03_ROLES_WORKFLOWS_AND_STATES.md](03_ROLES_WORKFLOWS_AND_STATES.md) — users, permissions, journeys, and state machines.
4. [04_DOMAIN_AND_DATA_MODEL.md](04_DOMAIN_AND_DATA_MODEL.md) — target entities, relationships, constraints, retention, and migration mapping.
5. [05_TARGET_ARCHITECTURE.md](05_TARGET_ARCHITECTURE.md) — recommended lean implementation and alternatives.
6. [06_UI_UX_ACCESSIBILITY_SPEC.md](06_UI_UX_ACCESSIBILITY_SPEC.md) — page-level UI and interaction requirements.
7. [07_API_EVENTS_AND_JOBS.md](07_API_EVENTS_AND_JOBS.md) — application contracts, background work, and real-time behaviour.
8. [08_AI_PRIVACY_SECURITY_AND_SAFEGUARDING.md](08_AI_PRIVACY_SECURITY_AND_SAFEGUARDING.md) — non-negotiable trust boundaries.
9. [09_IMPLEMENTATION_PLAN.md](09_IMPLEMENTATION_PLAN.md) — phased build and migration sequence.
10. [10_TEST_AND_ACCEPTANCE_PLAN.md](10_TEST_AND_ACCEPTANCE_PLAN.md) — tests that must be written and passed.
11. [11_LLM_BUILD_PLAYBOOK_AND_TRAPS.md](11_LLM_BUILD_PLAYBOOK_AND_TRAPS.md) — instructions for an implementation LLM.
12. [12_GAPS_AND_RECOMMENDED_ADDITIONS.md](12_GAPS_AND_RECOMMENDED_ADDITIONS.md) — confirmed gaps and proposed features.
13. [13_TRACEABILITY_MATRIX.md](13_TRACEABILITY_MATRIX.md) — feature-to-data-to-test completion checklist.
14. [14_OPERATIONS_AND_DEPLOYMENT.md](14_OPERATIONS_AND_DEPLOYMENT.md) — production, backup, restore, and observability.

## Requirement language

- **MUST**: required for parity, privacy, safeguarding, integrity, or dependable daily use.
- **SHOULD**: high-value behaviour that may follow the first production slice.
- **MAY**: optional enhancement.
- **MUST NOT**: prohibited because it would violate a safety or product boundary.

## Definition of a successful reconstruction

The rebuild is complete only when:

- every MUST requirement is implemented and linked to automated tests;
- teacher, TA, pupil, and test-pupil permission boundaries are enforced server-side;
- names and safeguarding material cannot cross the AI boundary;
- pupil work cannot be silently lost and marks cannot be released without confirmation;
- the database and resource files can be backed up and restored as one verified set;
- the current year's data can be imported or a documented cut-over decision has been made;
- keyboard, touch, reduced-motion, large-text, and screen-reader acceptance passes are complete;
- the application works with AI disabled and during provider failure;
- no legacy UI or compatibility stylesheet is carried into the new implementation.

## Product boundary

The present product is a **single-teacher, school-LAN application** with limited TA and pupil portals. Do not silently turn it into a school-wide multi-tenant platform. Multi-teacher support changes identity, authorisation, data ownership, resource sharing, audit, and DPIA assumptions and therefore requires a separate architecture and approval.

