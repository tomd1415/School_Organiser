# Conversion notes — Y7 Clear messaging in digital media (Teach Computing — adapted)

Bundle slug: `y7-clear-messaging-digital-media-teach-computing-adapted`
Source: `TeachComputing/KS3/year_7/unit_2` (6 lessons + Unit guide v1.3 + Rubric v1.1).
Target: course **Computing Curriculum**, KS3. 6 lessons converted. Self-verify: **PASS**.

This is a digital-media / design unit (search → poster → brand → slides → present), light on code.
Worksheets lean on single-choice, multi-select (tick-all), short text, and screenshot show-your-work
cells — there is no MakeCode here, so the show-your-work "link" cell asks for a share link to the
pupil's poster/slides instead.

## §7a alignment tables (objective → slide(s) → worksheet Q/level)

### L1 — Get the message across
| Objective | Slide(s) | Worksheet Q / level |
|---|---|---|
| choose search terms for a topic | "Search for an online safety poster" (we do) | activity: Predict + Core "3 terms + why" / Support "better term" choice / Challenge "refine when search fails" |
| screenshot an image into another app | "Your turn — screenshot and label" + screenshot video | activity: Support "screenshot is…" choice + Show your work (screenshot) |
| identify features of a good poster | "What makes a good poster?" | starter: multi-select "tick all good features" + road-sign single-choice; Core/Challenge "where seen / why a picture" |

### L2 — Poster making
| Objective | Slide(s) | Worksheet Q / level |
|---|---|---|
| plan a poster to convey a message | "Plan first, then make" (I do) | activity: plan rows (message, colour) + Core "portrait/landscape + why" |
| choose and download a suitable image | "Find and download an image" + paste-image video | activity: Core "search words" / Support "download means…" / Challenge "check the licence" + Show your work |
| create a poster in a publishing app | "Choosing colours" + you-do build | activity: Show your work (poster screenshot) + ✅ checklist |
| (starter) recognise good poster features | "Starter — good or not so good" (Mobile Threats poster) | starter: multi-select "tick all good features" + S/C/C |

### L3 — Brand
| Objective | Slide(s) | Worksheet Q / level |
|---|---|---|
| modify (recolour) a logo | "Choose and recolour a logo" + recolour video | activity: logo choice + Support "fill tool" choice + Show your work |
| combine text + graphics on a slide | "Build your slide" + background-colour video | activity: Core "key message" / Challenge "background+text colours" |
| give feedback on design choices | "Your turn — feedback" (you do) | activity: "Feedback for my partner" text + Support "comment" choice |
| (starter) what a brand is | "Starter — what brand is this?" (brand cube) | starter: multi-select "tick all brand cues" + S/C/C |

### L4 — Creating a brand
| Objective | Slide(s) | Worksheet Q / level |
|---|---|---|
| plan a consistent layout | "Plan your style" (we do) | activity: charity choice + logo choice + Core "main colour / logo position" |
| modify a logo to fit the style | "Recolour your logo" (you do) | activity: logo choice + Support "example text before font" + Challenge "consistent shades" |
| create a styled set of slides | "Make your three slides" (you do) | activity: Show your work (three-slide screenshot) + ✅ checklist |
| (starter) branding vs content | "Starter — branding or content?" | starter: multi-select "tick all branding parts" + S/C/C |

### L5 — Adding content
| Objective | Slide(s) | Worksheet Q / level |
|---|---|---|
| search for suitable text | "Find and write the text" (we do) | activity: Predict + Core "3 search words / key message" / Support "add the source" choice |
| search for and add an image | "Find and add an image" (you do) | activity: Support "image should match" choice / Challenge "appropriate = age/theme/permission" + Show your work |
| evaluate content against a rubric | "Give feedback with the rubric" | activity: "Peer feedback (use the rubric)" text + ✅ checklist |
| (starter) what content slides need | "Starter — what would you change?" | starter: multi-select "tick all content needed" + S/C/C |

### L6 — Presenting
| Objective | Slide(s) | Worksheet Q / level |
|---|---|---|
| plan how to deliver a presentation | "Plan your talk" (I do → we do) | activity: per-slide plan rows + Support "lasts ~2 min / practise" choices |
| explain work through a presentation | "Present your slides" (you do) | activity: Core "design choice + why" / Challenge "choices serve the message" + Show your work |
| evaluate work against a rubric | "Evaluate against the rubric" | activity: "Evaluate against the rubric" text + ✅ checklist |
| (starter) a good presenter | "Starter — a good presentation" | starter: multi-select "tick all a good presenter does" + S/C/C |

Type sanity: every single-choice `(  )` cell is single-correct; every "tick all" question uses the
multi-select `[  ]` type (never single-radio multi-correct). Slicing verified (challenge-only Qs appear
only at challenge; no level-label leak). Each activity worksheet has the `📷` screenshot field + `✅ I can…`.

## Media included (OGL v3.0, Raspberry Pi Foundation / STEM Learning)
- L1: one-way road-sign (starter image) · screenshot-capture video · searching-for-an-image video.
- L2: Mobile Threats poster (starter image) · paste-an-image video.
- L3: social-media brand-cube (starter image) · eye/laptop/webcam logos (recolour choice) · recolour-logo
  video · set-background-colour video.
- L4: safety / stranger-danger / warning logos (charity logo choice).
- L5, L6: no source images/videos embedded (design + feedback lessons — see image-gap log).
Videos are referenced on slides as teacher-played hooks (they have motion/sound — flagged as the teacher's
choice, per the low-arousal default). The 10.7 MB "formatting slide" video (L3) was left out to keep the
bundle lean; the recolour + background-colour videos cover the key L3 skills.

## §4 image-gap log (places an image would help, none suitable in source)
| Lesson | Where | What image is wanted | Source had one? |
|---|---|---|---|
| L5 Adding content | starter / "find an image" slide | a "before/after" slide showing empty vs content-filled slide, or an example licensed image | Source deck images were generic UI screenshots — none reusable; **gap** |
| L6 Presenting | starter / "working between applications" plenary | a simple 4-icon strip (browser · publishing · graphics · presentation) for the apps-used plenary | Source had only bespoke slide graphics — **gap**, would be nice to make |
| L3/L4 | logo-choice worksheet | a "before → after recolour" example of one logo | Source shows it only inside a screen-recording, not as a still — **gap** (video covers it) |

## §2 wanted-but-unbuilt question types (logged, not built — shared engine is off-limits this pass)
- **Card sort / group into categories** (WORKSHEET_QUESTION_TYPES.md §2.5) — *wants it:* L4 starter
  "branding vs content" would ideally be a two-column sort (Branding | Content). Stop-gap used: a
  multi-select "tick all the branding parts" (single set), which is answerable and auto-marked.
- **Order / sequence (non-code)** (§2.3) — *wants it:* L6 "plan your talk" (order what to say across
  three slides) and L2 poster-making steps (plan → image → build). Stop-gap: per-slide text rows.
- **Label a diagram / image hotspot** (§2.4) — *wants it:* L1 "label the good features on your poster
  screenshot" and L3 "label the parts of a slide". Stop-gap: pupils annotate in their own app and paste a
  screenshot into the Show-your-work cell, plus a text "name one feature" question.

No new types were built (shared `app/src/lib/*` is owned by other parallel agents this pass).
