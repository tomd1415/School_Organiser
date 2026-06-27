# Conversion notes — Y7 Using media: gaining support for a cause (Teach Computing — adapted)

Slug: `y7-using-media-cause-teach-computing-adapted` · Course: Computing Curriculum (KS3) · 6 lessons.
Source: TCC KS3 / year_7 / unit_7. Media-literacy + word-processing unit (word-processor features →
image licensing → source credibility → research/plan a blog → build/promote → complete + summative).

No MakeCode in this unit — the "Show your work" link field asks for a **document / blog link** (not a
MakeCode share link). No source `.mp4` videos exist in the decks (L2's "3-minute copyright video" is an
embedded web link, not a file) — logged below, none embedded.

Self-verify: **PASS** (all worksheets render; screenshot field present per lesson; support vs challenge
content slices differ; single-choice, multi-select, matching all detected; slides parse ≥4 with teacher
notes; every `{{res:}}` placeholder ↔ a manifest `file`; every image referenced). Question types used:
text, single-choice, multi-select (`multichoice`), matching, screenshot, checklist.

## §7a Alignment tables (objective → slide(s) → worksheet Q/level)

### L1 — Features of a word processor
| Objective | Slide(s) | Worksheet question / level |
|---|---|---|
| Choose the right software for a task | S2 Starter | starter: "best software for…" ×3 (single-choice, all levels) |
| Name key features of a word processor | S3 Features | starter Support multi-select (features); activity Support match tool→use |
| Use the tools to format a document | S4 Why format, S5 Your turn | activity Show-your-work (formatted doc link + 📷 screenshot) |
| Explain why we format documents | S4 Why format | activity Core "what is formatting", Challenge "why format / audience" |

### L2 — Licensing appropriate images
| Objective | Slide(s) | Worksheet question / level |
|---|---|---|
| Choose an image that suits the document | S2 Starter | starter: "which image suits…" ×3 (single-choice) |
| Explain the copyright rule | S3 Copyright | activity "can you use it?" (single-choice) |
| Choose the right Creative Commons licence | S5 Which licence (chooser image) | activity Challenge "which licence for use/edit/share-no-money" (single-choice) |
| Credit the source of an image | S4 Find CC images (search image) | activity Support multi-select "what you must do"; Core "why credit"; Show-your-work 📷 |

### L3 — The credibility of sources
| Objective | Slide(s) | Worksheet question / level |
|---|---|---|
| Not all information online is reliable | S2 Starter (fake-news image), S3 Who can post | starter "no author/date — credible?" (single-choice) |
| Use checks to judge a source | S4 Four checks (question-words image) | starter Support multi-select; activity "best way to check" + Support multi-select |
| Decide if a source is credible and say why | S3, S4 | activity Core "why not trust Wikipedia"; Challenge "recent date, no author" |
| Choose a cause to support | S6 Your cause | activity My cause (text) |

### L4 — Research and plan your blog
| Objective | Slide(s) | Worksheet question / level |
|---|---|---|
| Explain plagiarism, citation, paraphrase | S2 Starter | starter **matching** term↔meaning; Support single-choice |
| Reference a source correctly | S3 Is this plagiarism?, S4 Blog | activity Core "why reference" + "how a blog shows sources" |
| Judge whether a source is reliable | S4 Blog (blog image), S5 Research | activity "what makes a blog different" + Challenge "check a fact" |
| Record research and credit sources | S5 Research | activity My research table (text) + Show-your-work 📷 |

### L5 — Promoting your cause
| Objective | Slide(s) | Worksheet question / level |
|---|---|---|
| Set success criteria for my blog | S2 Starter | starter "good vs opinion criterion" (single-choice) + write own |
| Build a blog using the software | S4 Build | activity Show-your-work (blog link + 📷) |
| Add credible, referenced content | S3 Criteria (rubric image) | activity "what is on the rubric" (single-choice); Support multi-select |
| Lay out my blog to suit my audience | S3 Criteria, S5 Feedback | activity Support "most helpful feedback" (single-choice); Core feedback |

### L6 — Project completion and assessment
| Objective | Slide(s) | Worksheet question / level |
|---|---|---|
| Finish and share my blog | S2 Starter, S4 Finish | starter "publish/share" (single-choice) + Show-your-work 📷 |
| Check my blog against the criteria | S3 Criteria (rubric image) | starter Support multi-select; Core/Challenge rubric reflection |
| Answer questions about using media | S5 Quiz | **activity = the summative MCQ** — 11 single-choice Qs, Support→Challenge |
| Reflect on what I have learned | S6 Now I can | slide plenary (oral/board) |

All single-choice cells are single-correct (no single-radio multi-correct trap). "Tick all that apply"
questions all use the multi-select `[  ]` type. L4 starter is the matching type (identical option pool
per row → drag-and-drop).

## Image-gap log (WORKSHEET_QUESTION_TYPES.md §4 candidates)
| Lesson | Where | Image wanted | Source had one? |
|---|---|---|---|
| L1 | activity Predict / S4 | a side-by-side **before vs after** formatting comparison | ⚠️ only the "before" (messy) image existed — used it (`l1-poorly-formatted-document.png`); the "after" is a docx exemplar, not an image |
| L2 | activity Challenge / S5 | a clean **all-6 CC licences** reference chart with icons | ⚠️ source had per-scenario chooser screenshots only — used the NC-ND chooser (`l2-cc-licence-chooser.png`) |
| L6 | starter / S4 | an **example finished blog** screenshot to model the standard | ❌ none suitable in source — log to source/make later |
| All | every plenary | a small **confidence self-rating** visual (see type-gap slider) | n/a |

Embedded media (all OGL v3.0, Teach Computing © Raspberry Pi Foundation): L1 poorly-formatted document;
L2 CC image-search + CC licence chooser; L3 fake-news newspaper + credibility question-words; L4 example
climate blog; L5 + L6 assessment rubric. **No videos** (none present as files in source).

## Wanted-but-unbuilt question types (WORKSHEET_QUESTION_TYPES.md §2)
| Lesson | Worksheet | Wanted type | Why / reframed to |
|---|---|---|---|
| L1 | activity Support | **label-a-diagram (§2.4)** — label icons on a real toolbar screenshot (bold/font/colour/align/bullets) | strong SEND fit (near-zero writing); reframed to a match-tool→use single-choice grid |
| L1 / L2 | activity | **order/sequence non-code (§2.3)** — order the format/insert steps (insert→crop→text-wrap→credit) | reframed to a paper "step strip" (Support) + single-choice; log for the `steps` block |
| L2 | activity | **card-sort (§2.5)** — sort images into "OK to use / not OK", or sort licence rights into yes/no | reframed to multi-select "what you must do"; log for the `sort` block |
| L3 | activity | **card-sort (§2.5)** — sort source features into "more credible / less credible" | reframed to multi-select "what helps you trust a source"; log for the `sort` block |
| all | plenary | **slider/rating (§2.6)** — confidence 1–5 self-rating | low priority; currently the ✅ checklist; log |

No new (uncatalogued) type was needed — every question maps to a built type or a clean reframe above.
