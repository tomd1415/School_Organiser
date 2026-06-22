# Traceability matrix

This is the completion ledger for a rebuild. Replace “target module” names if the chosen framework differs, but retain the requirement/test relationship.

| ID | Capability | Priority | Target modules | Required test groups |
|---|---|---|---|---|
| ID-01 | First-run, teacher/TA auth, epochs | MUST | identity, sessions | Auth §3, operational §17 |
| ID-02 | Pupil code/name/PIN/devices | MUST | identity, pupils | Auth §3, pupil §9 |
| CAL-01 | Years/terms/day shape | MUST | calendar | Foundation §2, clock §4 |
| CAL-02 | Timetable and multi-course slots | MUST | calendar, delivery | Clock §4, lesson §8 |
| CAL-03 | Unified dated exceptions | MUST | calendar | Clock §4, permission §3 |
| NOW-01 | Now/current/next/needs-me | MUST | dashboard, clock | Now §5, performance §16 |
| LES-01 | Occurrences and split lesson cockpit | MUST | delivery, lesson | Lesson §8 |
| LES-02 | Notes/stopping/follow-ups/tracker | MUST | lesson, notes | Lesson §8, notes §13 |
| LES-03 | Class/master edit and adaptation history | MUST | curriculum | Curriculum §6, lesson §8 |
| CUR-01 | Schemes/versions/units/plans | MUST | curriculum | Curriculum §6, migration §2 |
| CUR-02 | Multi-slot lay-down/map/carry-over | MUST | delivery | Curriculum §6 |
| CUR-03 | Accessible transactional planner | MUST | delivery, planner UI | Curriculum §6, browser §15 |
| RES-01 | Versioned file store and links | MUST | resources, storage | Resources §7, ops §17 |
| RES-02 | Import/extract/edit/preview/export | MUST | resources, documents | Resources §7 |
| WRK-01 | Tasks/recurrence/free-period tasks | MUST | teacher-work, jobs | Work §14 |
| WRK-02 | Focus/timers/work blocks | MUST | teacher-work | Work §14, resilience §16 |
| NTE-01 | Notes/captured/events/search | MUST | notes, teacher-work | Notes §13, work §14 |
| TA-01 | Restricted TA view/feedback | MUST | identity, lesson | Auth §3, lesson §8 |
| PUP-01 | Differentiated worksheet renderer | MUST | pupils, worksheet | Pupil §9, widget §10 |
| PUP-02 | Autosave/offline/screenshot/Done/feedback | MUST | pupils, storage | Pupil §9, resilience §16 |
| PUP-03 | Pupil accessibility and test pupil | MUST | pupil UI | Browser §15, pupil §9 |
| PUP-04 | Live slide sync/lock | MUST | lesson, pupils, SSE | Browser §15, pupil §9 |
| ASM-01 | Mark schemes/deterministic marking | MUST | assessment | Marking §11 |
| ASM-02 | Anonymous AI marking/safety gate | MUST | assessment, AI | Marking §11, AI §12 |
| ASM-03 | Confirmation/release/results/exports | MUST | assessment | Marking §11, pupil §9 |
| ASM-04 | ATL and feedback loop | MUST | assessment | Marking §11 |
| AI-01 | One redacting/withholding gateway | MUST | AI | AI §12, security §3/§13 |
| AI-02 | Audit, registry, budget, degrade | MUST | AI, jobs | AI §12, resilience §16 |
| SAF-01 | Complete safeguarding register | MUST | safeguarding | Notes/safety §13 |
| PRI-01 | SAR/anonymise/erase/file cleanup | MUST | pupils, retention | Notes/safety §13, ops §17 |
| OPS-01 | Leased jobs and retries | MUST | jobs | Work §14, resilience §16 |
| OPS-02 | Backup/verify/restore | MUST | operations | Operational §17 |
| OPS-03 | Secure proxy/config/health/logging | MUST | infrastructure | Auth §3, operational §17 |
| A11Y-01 | WCAG/keyboard/touch/reduced motion | MUST | UI system | Browser §15 |
| PERF-01 | Query/latency/asset/memory budgets | SHOULD | all | Performance §16 |
| EXT-01 | Homework | SHOULD after parity | pupils, assessment | New plan required |
| EXT-02 | Stages/strands | SHOULD after decisions | progress | New plan required |
| EXT-03 | Risk/time review | SHOULD | reporting | Deterministic report tests |

## Completion rules

For each MUST row, the implementation project should add links to:

1. approved requirement section;
2. architecture/use-case code;
3. migration/constraint if applicable;
4. unit/integration/browser tests;
5. acceptance evidence;
6. known limitations.

A row is not complete because a page renders. It is complete when permissions, state transitions, failure paths, accessibility, retention, and tests are satisfied.

