# Conversion notes — Y9 Media — animation (Teach Computing — adapted)

Slug: `y9-media-animation-teach-computing-adapted`
Course: Computing Curriculum (KS3). Source: TCC KS3 Year 9 Unit 2 "Media — Animations" (Blender 3D), L1–L6 zips +
Unit guide v1.2 + Learning graph PDF. Software in source: **Blender 2.8+** (free/open-source 3D modelling & animation).
6 lessons converted: starter + activity worksheet + slide deck each, with embedded source images. Self-verify PASS
(every activity worksheet renders with a screenshot field; level sections slice; every choice cell is single-correct;
every slide deck parses with teacher notes and a `.md` title; every `{{res:…}}` placeholder resolves to a real bundle
file; no unreferenced files).

**Source-packaging note (resolved).** `adm-zip` (the helper in the conversion guide) mis-read these zips and the L1
zip threw "Invalid filename"; Python `zipfile` / `unzip` (both present on this box, despite the guide's "no unzip"
note) read all six correctly. **All six zips genuinely contain the Blender Animation content** that the Unit guide and
Learning graph describe — confirmed lesson-by-lesson. Text was extracted with the app's `docxText`; images with
`extractOfficeImages` over each `.pptx`.

**Question-type variety used (new types exercised):** label-a-diagram (L1 snowman shapes, L2 keyframe-vs-tween arc,
L4 vertex/edge/face cube), card-sort (L2 stop-motion vs keyframe, L5 light vs camera settings, L6 modelling/animation/
lights-camera recap), order/sequence (L1 build-a-snowman, L2 keyframe steps, L3 make-a-rocket, L4 knife-tool leaf, L5
make-a-chest + spinning-spotlight setup, L6 production pipeline), slider/rating (L4, L5, L6 plenary confidence,
uncredited), matching (L3 vertex/edge/face grid — renders as single-correct choice rows), multi-select (L1 starter
"where is 3D animation"), plus single-choice, text, screenshot, checklist. No single-radio multi-correct anywhere; the
only "tick all that apply" (L1) uses the multi-select `[  ]` type.

**Videos / motion media.** L2 ships one source video: `L2 Resource_ Agathaumas …ogv` — a classic stop-motion clip used
as the lesson's "stop-motion vs keyframe" hook. It is **63 MB** (vs ~360 KB for the Y7 pilot's mp4) and `.ogv` (Ogg
Theora), so it was **NOT embedded** in the committed bundle (too large for git; format mismatch). It is referenced as an
optional **teacher-played hook** in the L2 slide notes (keep it short/calm per the no-flashing default; the teacher
plays it locally / from the ncce source). No other zip contains video or animated GIFs. Logged below.

**Worksheets/homeworks not authored (scope).** Source ships 3 step-by-step Blender "activity" worksheets per lesson
(e.g. Party monkey / Snowman / Colouring) plus L2 & L5 homeworks and the L6 rubric. These are screenshot-heavy
click-by-click guides; per the brief's default (starter + activity + slides) their content is folded into the native
activity worksheets (the `order` blocks reproduce the build steps; Support choices reproduce the key/tool checks). The
L6 teacher rubric (Modelling/Colours/Animation/Camera/Lighting, Emerging/Expected/Exceeding) was read and seeded into
the L6 activity checklist + Challenge; the full rubric grid is a candidate for a future `l6 … assessment worksheet.md`.

---

## §7a alignment tables (objective → slide(s) → worksheet Q / level)

### L1 — Move, rotate, scale, colour
| Objective | Slide(s) | Worksheet Q / level |
|---|---|---|
| add, delete, move objects | S3 This is Blender, S4 Four moves | activity Support "move = G / delete = X" choices; order block (build steps) |
| scale and rotate objects | S4 Four moves | activity Predict (press S → resize); Support "scale = S" |
| use a material to add colour | S6 Colour with materials | activity Core "what a material adds"; Challenge "material reused = variable" |
| make a snowman model | S5 Your turn, S6 | activity label-a-diagram (hat=cylinder/head=sphere/nose=cone) + Show-your-work screenshot + ✅ |
| (starter) where is 3D animation | S2 Starter | starter multi-select (games/films/adverts, not the letter); Support "objects"; Challenge "green screen" |

### L2 — Animation, names, parenting
| Objective | Slide(s) | Worksheet Q / level |
|---|---|---|
| add/move/delete keyframes | S4 Keyframes & tweening, S5 Timeline | activity label-a-diagram (keyframe vs tweened); Support "key = I", "keyframe stores position"; order block |
| play/move via the timeline | S5 Timeline | activity Predict (what happens between two keyframes) |
| give objects useful names | S6 Names & parenting | activity Challenge "why clear names beat Sphere.001" |
| join objects with parenting | S6 Names & parenting | activity Core "what parenting does" + parenting-Outliner image |
| (starter) animation types | S3 Starter (stop-motion hook) | starter card-sort (stop-motion vs keyframe); Support "the computer fills in-betweens" |

### L3 — Complex models and colours
| Objective | Slide(s) | Worksheet Q / level |
|---|---|---|
| use edit mode and extrude | S3 Edit mode, S4 Extrude | activity Support "extrude = E", "change shape in edit mode"; Predict (extrude top face); order block |
| use loop cut and face editing | S4 Extrude, S5 Build anything | activity Core "what loop cut adds" |
| different colours on one model | S6 Many colours | activity Challenge "two colours on one object" + coloured-rocket image |
| (building blocks) | S2 Starter | starter "built from vertices/edges/faces"; activity matching grid vertex/edge/face |
| make a rocket model | S4–S5 | activity Show-your-work screenshot + ✅ |

### L4 — Organic modelling
| Objective | Slide(s) | Worksheet Q / level |
|---|---|---|
| use proportional editing | S4 Proportional editing | activity Support "moves nearby points"; Predict (nearby points follow); plenary slider |
| use the knife tool | S5 Knife tool | activity Support "cut shapes into a surface"; order block (palm leaf) |
| use subdivision | S6 Subdivision | activity Core "what subdivision does to a face" |
| (symmetry / organic) | S3 Real things | activity choice "natural = a little asymmetrical"; Challenge "why break symmetry" + palm-tree image |
| (starter) name the parts | S2 Starter | starter label-a-diagram (vertex/edge/face on the cube); Support "vertex = corner" |

### L5 — Lights, camera, render
| Objective | Slide(s) | Worksheet Q / level |
|---|---|---|
| add and edit lighting | S3 Lights | activity Support "spotlight = cone"; order block (spinning spotlight) + island-spotlight image |
| set up the camera | S4 Camera & rule of thirds | activity Support "press 0 to look through camera"; Predict (place subject on a third) + rule-of-thirds image |
| compare render modes | S6 Render modes | activity Core "what the f-stop does"; Challenge "ray tracing vs fast mode"; plenary slider |
| (recap / sort) | S2 Starter, S3 | starter order (make a treasure chest); activity card-sort (Light vs Camera settings) |

### L6 — Project
| Objective | Slide(s) | Worksheet Q / level |
|---|---|---|
| plan + make a 3–10s animation | S4 Make your film | activity Support "3–10 seconds"; Core "write your plan"; Challenge "which advanced skill" |
| render to a video file | S4 Make your film | activity order block (… → render to a video file); Show-your-work screenshot |
| self- and peer-assess | S5 Watch & feedback | activity Peer feedback (great / improve); plenary slider; ✅ checklist |
| (recap) | S2 Starter, S3 Your skills | starter "made with keyframes"; activity card-sort (modelling/animation/lights-camera) |

All choice cells are single-correct; the one "tick all that apply" (L1 starter) uses multi-select. Support = recognition
(tick/choose/label), Core = recall/explain/sequence, Challenge = reason/apply — on the same task. No orphan objectives;
every worksheet question maps to a slide/plan point.

---

## §4 image-gap log (would help, none suitable embedded)
| Lesson | Where (slide / worksheet) | Image wanted | Source had one? |
|---|---|---|---|
| L2 | Starter "stop-motion vs keyframe" | a short stop-motion clip / a clean stop-motion still | ⚠️ source has the **Agathaumas .ogv (63 MB)** — too large + `.ogv`, NOT embedded; referenced as a teacher-played hook in slide notes. A small still (single frame) would be a good lightweight replacement. |
| L3 | "Build anything" / loop-cut slide | a clean before/after of a loop cut adding an edge ring | ⚠️ source stills are mid-edit screenshots; embedded the grey + coloured rocket and the chair instead |
| L4 | "Knife tool" slide | a still of a leaf part-cut by the knife with the grid pattern | ⚠️ source close-ups (image16/17) are dark shadow crops; embedded the finished palm tree instead |
| L5 | "Render modes" slide | a side-by-side fast-preview vs ray-traced (Cycles) still of the same shot | ⚠️ no clean paired still in source; described in text + used the lit-island render |
| L6 | "Make your film" / showcase | an example finished pupil film still / storyboard frame | ⚠️ source has only a decorative "The End" curtain + question-mark art (not embedded); used the bouncing-cube frame + snowman recap |

Embedded source images actually used (all OGL v3.0, attributed in manifest):
L1 Agent 327 film still, coloured snowman; L2 keyframe/tween arc diagram, Blender timeline, parenting Outliner;
L3 grey rocket (extrude), chair, coloured rocket; L4 vertex/edge/face cube, symmetry faces, palm tree;
L5 rule-of-thirds grid, spotlit island, camera view of the island; L6 bouncing-cube frame, snowman model.

---

## §2 wanted-but-unbuilt question types
None blocking — all four newly-built types (order, card-sort, label-a-diagram, slider) were available and used heavily,
so no question needed a stop-gap. (Did not edit the shared WORKSHEET_QUESTION_TYPES.md.)

Soft note for §2.4 (label-a-diagram): the three label tasks (snowman parts, keyframe-vs-tween arc, vertex/edge/face
cube) had their zone coordinates hand-set by viewing each image — a `/ui-gallery` click-to-capture coordinate picker
would speed this up and reduce the chance of a slot landing slightly off a small part (the snowman cone/hat are close
together). Coordinates were chosen on clear, well-separated parts to keep them robust.
