# Conversion notes — Y8 Media: vector graphics (Teach Computing — adapted)

Slug: `y8-vector-graphics-teach-computing-adapted`
Course: Computing Curriculum (KS3). Source: TCC KS3 Year 8 Unit 1 "Media — Vector graphics" (L1–L6 zips +
Unit guide + Rubric + Summative assessment + answers). Editor used in source: Inkscape 1.1.
6 lessons converted: starter + activity worksheet + slide deck each, with embedded source images. Self-verify PASS
(every worksheet renders with a screenshot field; level sections slice; every choice is single-correct; every slide
deck parses with teacher notes; every `{{res:…}}` placeholder resolves to a real bundle file; no unreferenced files).

**Question-type variety used (new types exercised):** label-a-diagram (L1, name the three shapes), order/sequence
(L1 draw+colour steps, L3 draw-a-path steps), card-sort (L2 group-vs-combine, L4 logo/icon/illustration, L6
vector-vs-bitmap uses), slider/rating (L4 + L6 plenary confidence, uncredited), plus multi-select (L1 starter),
matching (L2 combine grid, L4 starter), fill-in-the-blank (L5 markup), code (L5 edit-the-markup challenge),
single-choice, text, screenshot, checklist. No single-radio multi-correct anywhere.

**Videos / animations:** the source zips contain NO `.mp4` videos. The only motion media are animated `.gif` screen
recordings of Inkscape (e.g. L1 image5/6/9, L2 image4/5, L3 image17, L5 image12/13). These were **deliberately NOT
embedded** — the SEND default forbids flashing/animation/looping motion. The teacher demonstrates live instead (the
source itself recommends a live demo over the looping GIF). No video resources attached. See image-gap log for the
static stills wanted in their place.

**Homeworks not authored (scope):** L2 (match-up), L4 (typeface), L5 (match-up) each ship a homework + solution docx.
Per the brief's default (starter + activity + slides), these were not separately authored; their content is covered by
the activity Core/Challenge questions. Candidates for a future `lN … homework worksheet.md` (all map cleanly to
matching/choice types). The L6 summative (14 single-correct MCQs) was read and seeded a few questions into the L6
activity Challenge, but the full 14-Q paper was not authored as a separate worksheet — strong candidate for a future
`l6 … assessment worksheet.md` (all 14 are single-correct → `(  )` choice).

---

## §7a alignment tables (objective → slide(s) → worksheet Q / level)

### L1 — Get into shapes
| Objective | Slide(s) | Worksheet Q / level |
|---|---|---|
| name vector graphics + the software | S3 What is a vector, S4 Inkscape | starter multi-select (shapes in the house); activity Support "fill/stroke"; Challenge "cross-platform" |
| use shape tools to draw/change shapes | S5 Draw shapes | activity label-a-diagram (name square/ellipse/polygon) + order block (draw+colour steps) |
| change fill and outline | S6 Change fill and outline | activity Support "fill vs stroke" (×2 choice) |
| move/rotate/reorder (z-order) | S7 Move, rotate, order | activity Predict (which is in front) + Core "what z-order decides"; Challenge "bring circle to front"; Show-your-work screenshot |

### L2 — Working with multiple objects
| Objective | Slide(s) | Worksheet Q / level |
|---|---|---|
| select more than one object | S4 Align and distribute | starter Support "every item is an object"; activity Support "align lines them up" |
| align and distribute | S4 | activity Core "what distribute does" |
| group and ungroup | S5 Group and ungroup | activity card-sort (group vs combine) + Support "group = move together"; Challenge "why can't uncombine" |
| combine — union/difference/intersection | S6 Combine (crescent) | activity matching grid (union/difference/intersection → what it does); Challenge "difference vs intersection" |

### L3 — Paths
| Objective | Slide(s) | Worksheet Q / level |
|---|---|---|
| vector graphics are paths + nodes | S3 What is a path | activity "a path and its nodes" prose + Support "grey squares = nodes" |
| draw/edit straight, curved, freehand | S4 Three kinds of line, S5 Editing | activity order block (draw a closed path) + Support "freehand"; Core "straight vs curved"; Challenge "what handles do" |
| convert a shape to a path | S6 Convert a shape | activity Core "convert first to edit nodes"; Challenge "head outline to back" |
| make a superhero face | S7 Make a superhero face | activity Show-your-work (screenshot of the face) + ✅ checklist |
| (recap, combining) | S2 Starter (combine images) | starter 3× choice (which combine made each result) |

### L4 — What will you make?
| Objective | Slide(s) | Worksheet Q / level |
|---|---|---|
| describe logos, icons, illustrations | S3 Logos/icons/illustrations | activity card-sort (sort examples into the 3 types) + Support "a logo is…", "an icon is…" |
| choose a project and plan | S4 Choose, S5 Plan | activity "plan your project" (which project + idea sentence) |
| combine tools to create a vector | S6 Create | activity Show-your-work (screenshot) + Challenge "two techniques you'll use" |
| evaluate against its purpose | S5 Plan (rubric), S7 plenary | activity Core "what is the purpose"; Challenge "why a vector suits large/small"; plenary slider |

### L5 — Behind the scenes
| Objective | Slide(s) | Worksheet Q / level |
|---|---|---|
| a vector is stored as markup | S3 Inside a vector (markup + shapes image) | activity fill-in-the-blank (x/y = position, w/h = size) + Support "markup = text that describes" |
| change an object by editing markup | S4 Scalable, S5 Edit in Inkscape | activity Predict (width 200→400); Challenge code (double the square) |
| explain SVG and "scalable" | S4 Scalable | starter recap; activity Support "scalable"; Core "what does SVG stand for" |
| plan + make improvements | S6 Review and develop | starter Core (one change to make); activity Show-your-work screenshot |

### L6 — Showcase
| Objective | Slide(s) | Worksheet Q / level |
|---|---|---|
| key differences vector vs bitmap | S3 Vectors vs bitmaps, S4 pixels | activity Support "bitmap = pixels / vector = paths"; Core "one difference" |
| which type suits which use | S5 Which suits which | activity card-sort (vector-best vs bitmap-best) |
| evaluate against a rubric | S2 starter (logo), S6 improve+evaluate | starter "good or could be better"; activity Challenge (characteristics + SVG quiz, scenario choice) |
| share a finished project | S8 Showcase | activity Show-your-work (finished project screenshot) + plenary slider + ✅ checklist |

All choice cells are single-correct; "tick all that apply" uses the multi-select `[  ]` type. No orphan objectives;
every worksheet question maps to a slide/plan point. Support = recognition (tick/choose), Core = recall/explain,
Challenge = reason/apply — on the same task.

---

## §4 image-gap log (would help, none suitable in source)
| Lesson | Where (slide / worksheet) | Image wanted | Source had one? |
|---|---|---|---|
| L1 | "Draw shapes" / handles explorer | a still of a SELECTED shape showing the square (resize) vs circle (modify) handle, clean enough to label | ⚠️ source has image7/16 (busy, arrows) — used the clean three-shapes still for the label-a-diagram instead; a clear annotated-handles still is wanted |
| L2 | "Align and distribute" slide | a clean before/after still of objects aligned + evenly distributed | ⚠️ no still — source only has animated GIFs (image4/5), excluded per no-animation |
| L2 | "Stacks of flags" starter | a simple flag built from stacked rectangles (e.g. 3 colour bands, exploded) | ⚠️ none in source deck; described in text |
| L3 | "Editing paths" slide | a still of a curved path with a node + its two curve handles labelled | ⚠️ no clean still — source uses a GIF (image17); node/handle label still wanted |
| L5 | "Inside a vector / edit markup" | a real screenshot of SVG markup text beside its live preview (the live-preview is a GIF in source) | ⚠️ embedded the rendered-shapes still (image11) + wrote the markup as a code block; a paired text↔preview screenshot is wanted |

Embedded source images actually used (all OGL v3.0, attributed in manifest): L1 house, Inkscape logo, three shapes,
fills/outlines, Fill/Stroke tabs; L2 grouped objects, difference crescent; L3 the square+triangle combine set
(both shapes + union/difference/intersection results), superhero face; L4 Treasure Island logo, whale illustration,
elephant icon; L5 shapes-from-markup; L6 vector clownfish, clownfish photo, pixels-zoom butterfly, Treasure Island logo.

---

## §2 wanted-but-unbuilt question types
None blocking — all four newly-built types (order, card-sort, label-a-diagram, slider) were available and used, so no
question needed a stop-gap. One soft note for WORKSHEET_QUESTION_TYPES.md §2.4 (label-a-diagram): a click-to-capture
coordinate picker would make labelling editor screenshots (e.g. the handles still, the Inkscape toolbar) far easier —
the clean three-shapes still was chosen for L1's label precisely because hand-setting zones on a busy editor screenshot
is error-prone. (Did not edit the shared WORKSHEET_QUESTION_TYPES.md.)
