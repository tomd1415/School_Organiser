# Conversion notes — Y8 Developing for the web (Teach Computing — adapted)

Bundle: `app/seed-content/lessons/y8-developing-for-the-web-teach-computing-adapted/`
Source: `TeachComputing/KS3/year_8/unit_3` (6 lesson zips + unit guide + summative assessment).
Course: Computing Curriculum (KS3). 6 lessons. Self-verify: **PASS** (all worksheets render with a
screenshot field on each activity; level sections slice; slides parse with teacher notes; slides titles end `.md`).

No source **videos** in this unit. No **wanted-but-unbuilt** question types — every type a lesson wanted was
available (parsons, order, sort, label, matching, single-choice, fill-blank, code, screenshot, checklist).

## §7a alignment tables

### L1 — Website building blocks (HTML tags & inline styling)
| Objective | Slide(s) | Worksheet Q / level |
|---|---|---|
| describe what HTML is | S3 "What is HTML?" | activity Predict; Support choice (brackets, closing /) |
| use HTML tags to structure a page | S3, S5 | activity matching (tag↔job, shared); **Core Parsons** (order HTML into a valid page); Show-your-work |
| modify a tag with inline styling | S4 plain-vs-styled, S5 | activity Core text (color:red); **Challenge** write inline style; Show-your-work + ✅ |
| starter: automation | S2 brick wall | starter (brick guesstimate); S/C/C |

### L2 — Words are not enough (images, build from a design)
| Objective | Slide(s) | Worksheet Q / level |
|---|---|---|
| add an image with the img tag | S3 img tag, S4 folders | activity Predict; matching (src/alt↔job, shared) |
| name what src and alt do | S3 | activity matching; **Challenge** write a full img tag |
| build a page to match a design | S5 target design | **Support card-sort** (tag vs attribute); **Core order** (steps to add an image); Show-your-work (replicate design) + ✅ |
| starter: tags recap | S2 tag reference | starter **fill-in-the-blank** (closing tags); S/C/C |

### L3 — Taking shortcuts (CSS)
| Objective | Slide(s) | Worksheet Q / level |
|---|---|---|
| describe what CSS is | S3 "What is CSS?" | activity Predict (one rule → 5 headings); matching (property↔effect, shared) |
| use CSS to style a page | S4 styled page | **Support card-sort** (inline vs CSS file); **Core order** (CSS set-up steps); **Challenge** write a CSS rule; Show-your-work |
| explain why CSS beats inline | S3, S5 | Core text (tag reused); **Challenge** assess "change once, update everywhere" + ✅ |
| starter: the slow way | S2 | starter (20 paragraphs by hand); S/C/C |

### L4 — Searching the web (crawl, index, rank)
| Objective | Slide(s) | Worksheet Q / level |
|---|---|---|
| describe what a search engine is | S2 search results | starter **label-a-diagram** (parts of a search); Support choice |
| explain crawl & index | S3 crawler, S4 example page | activity Predict; matching (crawler/index/query/ranking, shared); **Support card-sort** (recorded vs ignored); **Core order** (crawler steps) + keywords text |
| describe what makes a page rank higher | S5 | **Challenge** two ranking texts; Show-your-work (make a quality page) + ✅ |

### L5 — Tightening the web (operators & hyperlinks)
| Objective | Slide(s) | Worksheet Q / level |
|---|---|---|
| use search operators | S3 operators, S4 try-it | matching (operator↔effect, shared); **Support card-sort** (broadens vs narrows) |
| explain how an operator changes results | S3 | **Core single-choice** (which gives most results) + NOT operator text |
| create a hyperlink between pages | S5 hyperlinks | **Challenge** write a search + **Parsons** (order the `<a href>` tag); Show-your-work + ✅ |
| starter: too many results | S2 | starter (millions of results); S/C/C |

### L6 — Navigating the web (navigation & assessment)
| Objective | Slide(s) | Worksheet Q / level |
|---|---|---|
| write a hyperlink with a href | S2 hyperlink check | starter choice (correct link) + **Parsons** (order a link); **Challenge** what's missing |
| add the same navigation to every page | S4 navigation, S3 final page | activity Predict; **Support order** (navigation steps); Core/Challenge texts; Show-your-work + ✅ |
| show learning in the quiz | S6 quiz | **quiz worksheet**: 10 single-choice questions (from the unit's summative assessment) |

All multiple-choice cells are **single-correct** (radio); multi-correct never used a single radio. Matching/
sort/order/label widgets confirmed to render in their level slices.

## Image-gap log (also belongs in WORKSHEET_QUESTION_TYPES.md §4 — not edited here, shared file)
| Lesson | Where | What image is wanted | Source had one? |
|---|---|---|---|
| L1 | starter / before-after | brick wall + plain vs styled page | ✅ embedded `image2/image4/image6` from the source deck |
| L2 | recap / img tag / design | tag reference, folder/directory, target design | ✅ embedded `image2/image7/image8` |
| L3 | "what is CSS" slide | a clean **inline-vs-CSS side-by-side** comparison | ⚠️ source deck used PPT **shapes** (not raster) — reused L1's styled-page screenshot as a stand-in |
| L4 | starter / crawl / index | search results (labelled), crawler/spider, example page | ✅ embedded `image1/image4/image5`; crawler diagram is strong |
| L5 | operators slide | an **AND/OR/NOT Venn or results-count comparison** | ⚠️ source had only decorative animal photos — reused the search-results screenshot; a made operator diagram would help |
| L6 | navigation slide | a finished website / nav-menu diagram | ✅ embedded `image2` (web-development illustration) |

## Notes
- HTML/web unit, so "Show your work" uses a **code** field (`Type your code here`) + the required `📷`
  screenshot, in place of the micro:bit MakeCode-link field.
- L4 label-a-diagram coordinates were set by viewing `l4-search-results.png` (search box 50/6, web address
  20/30, result title 26/36, description 45/43, "more questions" 24/65). Re-check if the image is re-cropped.
- L6 quiz mirrors the official "Spinning the web" summative assessment, reworded to plain language; Q4 and Q9
  were reframed to keep one unambiguous correct answer.
