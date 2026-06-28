# Conversion notes — KS4 Media (Teach Computing — adapted)

- **Slug:** `ks4-media-teach-computing-adapted`
- **Course:** KS4 IT & Digital Skills (KS4)
- **Source:** `TeachComputing/KS4_non_GCSE/unit_3` — 7 lesson zips + Unit guide v1.2 + Unit assessment rubric.
- **Lessons converted:** 7 (all). The unit's summative is a peer/teacher-graded group presentation
  (rubric), so it is **folded into Lesson 7** as a knowledge end-of-unit quiz + evaluation alongside the
  presentation/peer-assessment activity. No separate summative docx existed.
- Question-type variety used: single-choice, multi-select, matching, fill-blank, `order`, `sort` (card-sort),
  `label` (label the camera), `scale`, screenshot, checklist.

## §7a alignment (objective → slide → worksheet)

**L1 What is pre-production?**
| Objective | Slide | Worksheet Q |
|---|---|---|
| describe pre-production | S2 starter, S3 stages | starter choice "what is pre-production"; order the 3 stages |
| name planning tools | S4–S6 (mood board/storyboard/script/visualisation) | starter Support matching; activity tool table |
| choose a tool | S7–S8 | activity Support/Core (which tool for a video) |
| create a plan | S7–S8 | activity Show-your-work (mind map + storyboard photo) |

**L2 Creating digital graphics**
| Objective | Slide | Worksheet Q |
|---|---|---|
| describe raster/vector | S2 starter | starter choice + Core; sort file types |
| name file formats | S3 | starter `sort` raster/vector extensions |
| make a graphic | S4–S5 (Inkscape/GIMP) | activity `order` poster steps + Show-your-work |
| copyright/CC | S6 | activity multi-select CC rules |

**L3 Creating digital video**
| Objective | Slide | Worksheet Q |
|---|---|---|
| camera angles | S2 | starter matching angles + `label` camera parts |
| video properties (FPS/compression/format) | S3–S4 | activity fill-blank frames/compression/codec/container |
| use OpenShot | S5 | activity `order` editing steps + Show-your-work |
| export video | S6 | activity Support (MP4=container), checklist |

**L4 Creating a multi-page website**
| Objective | Slide | Worksheet Q |
|---|---|---|
| website features | S2 | starter `sort` front-end/back-end |
| plan a website | S2/S4 | starter Core/Challenge (call to action, SSL) |
| build with HTML | S3–S4 | activity `order` build steps + fill-blank tags |
| add logo+video | S5 | activity Show-your-work (browser screenshot) |

**L5 Planning**
| Objective | Slide | Worksheet Q |
|---|---|---|
| read & choose a brief | S4 | starter matching terms; activity brief table + artefact choice |
| choose an artefact | S4 | activity single-choice artefact |
| plan with group | S5 | activity `order` planning steps + job list |
| use the rubric | S3 | activity Challenge (reach top rubric level) + scale |

**L6 Producing**
| Objective | Slide | Worksheet Q |
|---|---|---|
| team/delegate | S2 | starter multi-select team behaviours |
| make the artefact | S4 | activity Show-your-work |
| use the rubric | S3/S5 | activity `scale` per rubric row |
| name an improvement | S5 | activity Core (one thing to improve) |

**L7 Presenting + quiz**
| Objective | Slide | Worksheet Q |
|---|---|---|
| present & explain choices | S3 | starter Core; quiz Show-your-work |
| evaluate | S4 | quiz evaluate section + scale |
| peer-assess fairly | S2 | starter choice (grade the work) |
| whole-unit knowledge | S5 | quiz: matching + single-choice + multi-select + fill-blank across all topics |

No orphan objectives; every multiple-choice is single-correct (multi-correct items use multi-select). Levels
are coherent (Support = recognition, Core = recall/explain, Challenge = reason/apply on the same task).

## Images embedded (16, all OGL from the source decks)
- L1: mood board, storyboard, visualisation sketch, film script (the four pre-production tools).
- L2: Inkscape logo, GIMP logo, copyright symbol.
- L3: video camera (used for the `label` task), editing timeline, file-container icon.
- L4: website-hosting/server diagram, HTML code screen (HTML still pulled from the L6 deck).
- L5: client meeting, the unit assessment rubric screenshot.
- L6: teamwork cartoon. L7: presenting cartoon.

## Image gaps (for WORKSHEET_QUESTION_TYPES.md §4)
| Lesson | Where | Wanted | Source had one? |
|---|---|---|---|
| L2 graphics | starter raster-vs-vector slide | a clean side-by-side pixel-zoom vs vector-zoom diagram (could unlock a `label` of "pixels"/"paths") | ⚠️ source had only software logos + decorative clipart; the raster/vector comparison is a PPT shape, not a raster |
| L3 video | camera-angles slides | a labelled strip of the 7 camera angles (close-up/long/high/low/over-shoulder/pan) | ⚠️ source deck used decorative stills only; no per-angle diagram extractable |
| L4 website | "good website" features slide | an annotated webpage screenshot pointing at nav / CTA / logo (would unlock a `label` task) | ⚠️ source had a hosting clipart + an HTML-code photo only |
| L5/L7 | the rubric | the rubric is embedded as a screenshot (`l5-assessment-rubric.png`); a cleaner full-grid render would be nicer | ⚠️ used the worksheet screenshot from the source deck |

## Type gaps
None. All demand was met by existing types (single/multi-choice, matching, fill-blank, order, sort, label,
scale, screenshot). The flip-book FPS clip and the OpenShot video assets are **referenced as teacher-played
hooks** (motion/sound; large >6 MB) and not embedded, per the low-arousal default.

## Self-verify
PASS — every activity/quiz worksheet has a screenshot (image) field; support≠challenge slices on all
worksheets; each deck has ≥4 slides (7–10) with non-empty teacher notes; every `{{res:…}}` resolves to a
manifest file present on disk.
