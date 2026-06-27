# Conversion notes — Y8 Mobile app development (Teach Computing — adapted)

Slug: `y8-mobile-app-development-teach-computing-adapted` · Course: Computing Curriculum (KS3) · 6 lessons.
Source: TeachComputing KS3 Y8 unit_5 (Mobile app development). All embedded images are OGL v3.0
(Raspberry Pi Foundation / STEM Learning). Online-safety content (L2, L4) is kept **cohort-level only** —
no example names or describing an individual pupil.

Question-type variety used: single choice, **multi-select**, **matching**, **card-sort**, **order/sequence**,
**label-a-diagram**, **slider/rating**, text, screenshot, checklist. (All four "new" types are exercised.)

## §7a alignment tables (objective → slide(s) → worksheet Q/level)

### L1 — Designing a mobile app
| Objective | Slide | Worksheet question |
|---|---|---|
| describe the app + target audience | S2–S3 our app | starter: tick what a health app tracks (Support choice; Challenge: target audience) |
| list user-friendly features | S4 | activity: **card-sort** user-friendly vs not; Core "feature that helps the user" |
| explain user-centred design | S5 | activity: Support word-choice; Core "what does UCD mean" |
| draw a wireframe for one screen | S6–S7 (sketch + example img) | activity: **order** the design steps; *Show your work* (📷 wireframe) + ✅ |

### L2 — Introduction to online safety
| Objective | Slide | Worksheet question |
|---|---|---|
| explain encryption/passwords/privacy | S3–S5 | starter choices; activity **matching** word↔meaning |
| choose a strong password | S4 | activity Support **multi-select** "what makes a password strong" |
| match the safety words | S3–S5 | activity **matching** (4 terms) |
| why end-to-end encryption keeps msgs private | S6 case study (img) | activity Challenge text; + **card-sort** safe vs risky online |

### L3 — Mobile phone hardware
| Objective | Slide | Worksheet question |
|---|---|---|
| name common hardware parts | S2–S3 (CPU/RAM/board imgs) | starter "name the component" (CPU, RAM choices); **label-a-diagram** the circuit board |
| say what CPU/RAM/sensors do | S3–S4 | activity Core "what does the CPU/RAM do" |
| match each sensor to its job | S4 sensors | activity **matching** sensor↔job (GPS/accelerometer/gyroscope/proximity) |
| choose which hardware an app needs | S5 case study | activity **card-sort** Sensors/Memory&processing/Output; Challenge fitness-app hardware + battery limit |

### L4 — Online safety in app development
| Objective | Slide | Worksheet question |
|---|---|---|
| explain secure data handling | S3 (padlock img) | activity Support choice "secure = safe & protected" |
| why privacy & consent matter | S4 | activity Core "why consent matters" |
| spot good vs poor data practice | S5 policies | activity **card-sort** good vs poor practice |
| give a view on an ethical dilemma | S6 dilemmas (big-data img) | activity Challenge text (location-without-consent; security-bug) — genuinely open |

### L5 — App development (part 1)
| Objective | Slide | Worksheet question |
|---|---|---|
| find your way around App Lab Design view | S3 (interface img) | activity **label-a-diagram** the App Lab screen |
| add elements to a screen | S4 | activity **order** "add a button" steps; Support "Properties changes text" |
| build the welcome screen | S4 you-do | activity *Show your work* (App Lab link + 📷) + ✅ |
| explain selection (if) | S5 | activity Core "give an if example for your app" |

### L6 — App development (part 2)
| Objective | Slide | Worksheet question |
|---|---|---|
| give helpful feedback | S2 peer review | starter "most helpful comment"; activity **card-sort** helpful vs unhelpful |
| add a second screen | S3 tutorial (interface img) | activity **order** add-and-link steps |
| add a button that links screens | S3–S4 | activity Support "a link button"; *Show your work* (2 screens 📷) |
| write a simple test plan | S5 testing | activity Core "what is a test plan"; Challenge mini test table (do → should happen) |

Every objective is taught on a slide and assessed on a worksheet; every worksheet question maps to taught
content. Choices are single-correct; "tick all" uses multi-select; order/sort/label/matching carry their own
self-mark solution (matching renders as the drag widget — keys unchanged from radios, no answer key embedded).

## Image gaps (§4 log)
| Lesson | Where | What image wanted | Source had one? |
|---|---|---|---|
| L1 | wireframe slides/worksheet | wireframe sketch + example screen | ✅ embedded (hand-drawn sketch + Tappy-Tap mockup) |
| L2 | encryption/case-study/ethics | encryption visual, messaging app, ethics choice | ✅ embedded 3 |
| L3 | starter/label/sensors | CPU, RAM, circuit board | ✅ embedded 3 (board used for the label-a-diagram) |
| L4 | secure-data / dilemmas | padlock, big-data | ✅ embedded 2 |
| L5 | App Lab interface | App Lab Design view screenshot | ✅ embedded (real screenshot, used for label) |
| L6 | second-screen tutorial | a **two-screen / second-screen** App Lab screenshot | ⚠️ source only had the same single-screen Design view — **reused L5's**; a real "screen2 + link button" still would be better |
| L3 | sensors slide | a labelled **phone-internals** diagram (vs the desktop motherboard) | ⚠️ source had only a generic circuit-board photo; on-topic phone-internals raster would be ideal |

## Video gap
Source "videos" (L1 health intro, L4 online-safety clip, L5 App Lab intro) are **YouTube links on the slides,
not embedded mp4 files** — `extractOfficeImages`/zip scan found no media video to carry over. Slides reference
them as optional teacher-played hooks (with a motion/sound caution) but no `{{res:...mp4}}` is attached.
If wanted, download the source clips and attach them on a future pass.

## Wanted-but-unbuilt question types
None. All types this unit wanted are built (order, card-sort, label-a-diagram, slider, matching, multi-select).
No §2 backlog additions needed.

## Self-verify
`_u5verify.ts` (deleted) ran green: all manifest files present, no orphans, every `{{res:}}` placeholder maps to
a manifest `file`, every slides title ends `.md`; each activity worksheet has a screenshot (image) field and
distinct support/challenge field slices; label/matching/sort/order widgets render in HTML; slides parse
(≥7 each) with teacher notes present.
