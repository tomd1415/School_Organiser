# Conversion notes — GCSE HTML (Teach Computing — adapted)

Bundle: `app/seed-content/lessons/gcse-html-teach-computing-adapted/`
Source: `TeachComputing/GCSE/unit_15` (8 lesson zips + unit guide + summative assessment + rubric).
Course: **OCR J277 GCSE Computer Science (KS4)**. 8 lessons. Self-verify: **PASS** (every activity worksheet
renders a screenshot field; level sections slice — support/challenge render distinct HTML; slides parse with
teacher notes; all slides resource titles end `.md`; all `{{res:…}}` placeholders resolve to manifest files
on disk; no unused images).

SEND adaptation applied throughout: identical routine, plain literal language, minimal writing (tick / drag /
order / sort / code box / screenshot), strong code visuals, I-do/we-do/you-do, S/C/C on the same task, TA
cues + likely-error fix-words, no flashing/sound. The unit's summative MCQ test is folded into L8 as a 20-Q
quiz worksheet.

No source **videos** were embedded — the only video is an external YouTube accessibility clip referenced (not
embedded) in L2; flagged on the L2 slide as a teacher-played, has-sound option. No **wanted-but-unbuilt**
question type was needed except **label-a-diagram** (see below): the two annotated source diagrams already
have their labels printed on them, so they can't be used as a clean label widget — used matching/order
instead and logged the image gap for blank versions.

Question-type variety used: single-choice, **multi-select** (L2 accessibility), **matching** (tag↔job,
attribute↔job, property↔effect, box-model layer↔meaning, term↔meaning), **card-sort** (tag vs attribute, good
vs bad design, inline vs external CSS), **order** (add an image, link a page, link a stylesheet, box-model
inside-out), **Parsons** (order a valid HTML page; order a div block), **code** (write HTML/CSS), **slider**
(L7 rubric self-rating; L8 confidence), text, screenshot, checklist.

## §7a alignment tables

### L1 — Introduction to HTML
| Objective | Slide(s) | Worksheet Q / level |
|---|---|---|
| describe what HTML is and what a tag does | S3 "What is HTML?", S4 newspaper | activity Predict; Support choice (brackets, closing `/`); starter (how a page reaches the browser) |
| use heading, paragraph and list tags | S4 newspaper, S7 lists | activity matching (h1/p/ul/ol↔job, shared); **Core Parsons** (order a valid page) + ul-vs-ol text; **Challenge** code (write a list) |
| write and view a simple HTML page | S5 predict, S6 build | activity **Show your work** (code field + 📷 screenshot) + ✅ |

### L2 — Images and links
| Objective | Slide(s) | Worksheet Q / level |
|---|---|---|
| explain what accessibility means | S2 accessibility | starter Support choice + **Core multi-select** (what helps accessibility) + Challenge text |
| add an image with the `img` tag | S3 img, S4 attributes | activity Predict; matching (src/alt/width↔job, shared); **Support card-sort** (tag vs attribute); **Core order** (steps to add an image) |
| create a hyperlink with `a href` | S5 hyperlink | activity **Challenge** code (write a link); Show-your-work (image + link) + ✅ |

### L3 — Mini project
| Objective | Slide(s) | Worksheet Q / level |
|---|---|---|
| identify good vs bad web design | S3 anatomy, S4 bad page | starter matching (tag recap); activity **card-sort** (good vs bad design, shared) |
| link pages stored in the same folder | S6 folder, S7 build | **Support** choice (local vs remote link); **Core order** (make + link a page); **Challenge** code (nav list) |
| insert a locally-stored image | S6 folder | Support choice (local image); Core text (why same folder); **Challenge** code (local img tag); Show-your-work + ✅ |

### L4 — Introduction to CSS
| Objective | Slide(s) | Worksheet Q / level |
|---|---|---|
| describe what CSS is and why we use it | S3 "What is CSS?" (one-style-many-pages) | starter predict; activity Predict (5 h2s → green); matching (property↔effect, shared) |
| write a CSS rule (selector/property/value) | S4 rule shape | **Support** choice (identify selector/value); **Challenge** code (a CSS rule) |
| link to an external stylesheet | S5 external | **Core order** (steps to link styles.css) + why-separate text; Show-your-work (CSS) + ✅ |

### L5 — DIVs and classes
| Objective | Slide(s) | Worksheet Q / level |
|---|---|---|
| describe what a `<div>` is for | S3 what-is-a-div | starter (explore the code); activity matching (div/class/nesting, shared); Core text (why divs) |
| give a `<div>` a class | S4 classes (code+output) | **Support** choice (class syntax; `.` in CSS); **Core Parsons** (order a div block) |
| use a class in CSS to style a section | S4 classes, S5 nesting | **Challenge** code (CSS for `.header`); Show-your-work + ✅ |

### L6 — Layouts and the CSS box model
| Objective | Slide(s) | Worksheet Q / level |
|---|---|---|
| plan with a wireframe and house style | S3 sitemap/wireframe, S4 swatches | starter (different screens); activity text (choose house-style colours) |
| describe the CSS box model | S5 box model | matching (layer↔meaning, shared); **Support order** (layers inside-out); Core text (padding vs margin; `px`) |
| use margin and padding to space out | S5 box model, S6 floats | **Challenge** code (10px padding + border); float text; Show-your-work + ✅ |

### L7 — Final project
| Objective | Slide(s) | Worksheet Q / level |
|---|---|---|
| build a three-page website (HTML+CSS) | S3 the project | starter recall code (HTML list in a div; CSS red/monospace); activity plan text + Show-your-work (the site) + ✅ |
| use a rubric to evaluate a website | S4 rubric | activity **slider** rows (HTML/CSS, pages, images, accessibility, navigation) + Core/Challenge reflection text |
| give and act on peer feedback | S5 peer feedback | activity peer-feedback text (two stars + a wish) |

### L8 — Project completion (+ summative quiz)
| Objective | Slide(s) | Worksheet Q / level |
|---|---|---|
| act on feedback to finish the site | S2 review, S3 finish | starter (to-do list from feedback); activity Support choice (save before handing in) + Core text (a change made) |
| show my work to others | S4 showcase | activity **slider** confidence rows + Show-your-work + ✅ |
| answer end-of-unit questions | S5 quiz | **quiz worksheet**: 20 single-choice Qs from the official summative, reworded to plain language |

All multiple-choice cells are **single-correct** (radio); the only multi-correct item (L2 accessibility) uses
the **multi-select** `[ ]` type. Matching grids reuse one identical option pool per row (matching detection).

### L8 quiz — answer key (for the teacher; not in the pupil worksheet)
1-Hyper Text Markup Language · 2-`</h1>` · 3-`scr` should be `src` · 4-the head · 5-insert a paragraph ·
6-`<h6>` · 7-`<ul>` bullet, `<ol>` numbered · 8-text for screen readers (accessibility) · 9-in the head ·
10-a link with text "BBC News" to that address · 11-image not in the same folder · 12-Cascading Style Sheets ·
13-divide a page into meaningful sections to style with CSS · 14-pixels · 15-`<style>` · 16-`<div class="main">` ·
17-`font-family` · 18-`background-color: black;` · 19-margin · 20-padding.
(Correct option is listed FIRST in each quiz cell's markdown.)

## Image gaps (also for WORKSHEET_QUESTION_TYPES.md §4 — shared file, not edited here)
| Lesson | Where | What image is wanted | Source had one? |
|---|---|---|---|
| L1 | starter / newspaper / lists | browsers, newspaper analogy, real lists-code screenshot | ✅ embedded `image12`, `image18` (L1 deck) + `image9` (L2 deck, ul/ol code) |
| L2 | img-tag / accessibility | a clean **alt-text / screen-reader accessibility** still | ⚠️ source had only decorative tech clipart — embedded `image4` (photo frames); accessibility shown via the external video only. A simple "image with/without alt" diagram would help. |
| L3 | anatomy / bad design / wireframe / folder | labelled page parts, bad-design example, wireframe, folder tree | ✅ embedded `image11`, `image7`, `image6` (L3) + `image6` (L4 folder) |
| L4 | "what is CSS" | one-style-many-pages | ✅ embedded `image8` (L4) |
| L5 | div / classes | div code + styled-output | ✅ embedded `image11` (L6, hello-world div) + `image4` (L5, favourite-films code+output) |
| L6 | box model / planning | box model, sitemap, swatches | ✅ embedded `image5`, `image9`, `image10` (L6). **Gap:** a **blank, unlabelled** box-model diagram would unlock a *label-a-diagram* widget (current image already prints Margin/Border/Padding/Content, so used **matching + order** instead). The labelled Wikipedia-anatomy image (L3) has the same problem — would need a blank version for a label task. |
| L7 | starter extract / project | the "write the HTML for this extract" rendered image; a finished example site | ⚠️ not cleanly extractable from the source (rendered on a slide); used a text description instead. |
| L8 | showcase / quiz | none needed (project + quiz lesson) | n/a (source images were decorative: blackboard "Test", theatre, clipboard) |

## Wanted-but-unbuilt question types
- **Label-a-diagram** (L6 box model; L3 page anatomy): wanted, type IS built, but **blocked by source images**
  that already carry their labels printed on them — no clean unlabelled image to drop labels onto. Stop-gapped
  with **matching** (layer↔meaning) + **order** (layers inside-out). Logged as an image gap (blank diagrams)
  rather than a type gap. No other type gaps — order/sort/parsons/matching/multi-select/slider covered all the
  demand.
