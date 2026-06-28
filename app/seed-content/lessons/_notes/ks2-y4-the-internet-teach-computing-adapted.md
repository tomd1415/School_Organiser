# Conversion notes — KS2 Y4 The internet (Teach Computing — adapted)

- **Slug:** `ks2-y4-the-internet-teach-computing-adapted`
- **Course:** KS2 Computing · **keyStage:** KS2
- **Source:** TeachComputing/KS2/Year_4/Unit 1 The Internet (Unit guide + L1–L6 zips)
- **Lessons:** 6 (every source lesson converted). Each = starter worksheet + activity worksheet + slides.md + embedded OGL images.
- **Cohort:** primary-level content, SEND secondary pupils — concrete, very low reading load, age-respectful (no infant tone). Online-safety content kept cohort-level (L6) — no personal online stories; framed as habits for everyone.

## Self-verify — PASS
- manifest valid JSON; every `{{res:…}}` resolves to a declared file; no missing files; no unused images.
- every slides resource title ends `.md`; every deck ≥6–8 slides with non-empty `> 🧑‍🏫` notes.
- every activity worksheet has a screenshot (kind=image) field; support slice ≠ challenge slice; all have level sections.
- drag types parse across the unit: order=2 (L1, L6), sort=18 items (L2/L3/L5), label=4 zones (L4), multichoice=6 (Challenge multi-selects).

## §7a Alignment — objective → slide → worksheet question

### L1 Connecting networks
| Objective | Slide(s) | Worksheet Q |
|---|---|---|
| internet = network of networks | S3 network-of-networks (cable map) | starter (internet meaning + true/not-true) |
| share information across the internet | S5 order journey | activity `order` (computer→switch→router→switch→computer) + show-your-work |
| name a router & its job | S4 router | activity Support (router vs switch); Core "router's job" |
| why a network needs protecting | S6 network security | activity Challenge multi-select (incl. security true) |

### L2 What is the internet made of?
| Objective | Slide(s) | Worksheet Q |
|---|---|---|
| name networked devices & how they connect | S2 devices | starter matching (switch/server/router → job) |
| internet gives many services | S3 services | activity Challenge multi-select (services) |
| WWW is part of the internet | S4 web-part-of-internet | activity `sort` (internet vs World Wide Web); Core difference |
| website vs web page | S5 website/web page | activity Support choices; show-your-work (explore a site) |

### L3 Sharing information
| Objective | Slide(s) | Worksheet Q |
|---|---|---|
| media that can be shared | S2 media | starter `sort` (can-share vs cannot-share) + Support/Core/Challenge |
| where websites are stored | S3 data centre | activity Support (server/data centre); Core "where stored" |
| how to get to a website | S4 browsers | activity Support (browser); Challenge multi-select (devices); show-your-work |

### L4 What is a website?
| Objective | Slide(s) | Worksheet Q |
|---|---|---|
| name the parts of a website | S2 parts | starter `label` (logo/search/menu/picture) |
| I can add content to the web | S3 people make content | activity Support (add content); Core good+tricky |
| use a web tool to create content | S4 Music Lab | activity show-your-work (Chrome Music Lab); Challenge multi-select (media) |

### L5 Who owns the web?
| Objective | Slide(s) | Worksheet Q |
|---|---|---|
| content is made by people | S2 person/company | starter matching (YouTuber/LEGO/Scratch → who made it) |
| who owns the content | S3 owning/sharing | activity `sort` (yours-to-keep vs borrow); Core "can't claim it" |
| rules protect content (copyright) | S4 copyright | activity Support (copyright/credit); Challenge multi-select; show-your-work (find a © clue) |

### L6 Can I believe what I read?
| Objective | Slide(s) | Worksheet Q |
|---|---|---|
| not everything is true | S2 is it real (edited image) | starter (real/edited choice + true/not-true) |
| why info may not be honest/accurate | S3 reasons | activity Core "one reason"; (money image) |
| think before I share/reshare | S4 order spread, S5 checks | activity `order` (how info spreads) + Challenge multi-select (sensible checks) + show-your-work |

## Type sanity
- All single-radio `choice` cells are single-correct; every multi-correct question uses multi-select `[ ]`, `sort` or `order`. Matching grids (L2, L5 starters) use a uniform 3-option pool per row. No multi-correct on a radio.

## Images embedded (all OGL — Teach Computing © Raspberry Pi Foundation)
Extracted as rasters from the source `.pptx` decks (clean clipart/photos):
- L1: submarine-cable world map (internet across the world), router, switch, safe/unsafe security shields
- L2: switch, server, router, website (home page), web page (inner page) — the website/web-page pair
- L3: media collage (sharable media), data-centre photo (where sites are stored), browsers strip, a website
- L4: a real website screenshot for the `label` task (logo/search/menu/picture zones), Chrome Music Lab homepage
- L5: YouTuber channel (one person), LEGO site (a company), bookshelf (real-world ownership), BBC © footer (copyright rule)
- L6: edited budgie-with-tiger-head (is it real?), money (a reason for false info), social-media doodle (sharing spreads)

## Image-gap log (per-unit; roll up into docs/WORKSHEET_QUESTION_TYPES.md §4 later — shared doc left untouched to avoid clashing with parallel agents)
| Lesson | Where | Wanted image | Source had one? |
|---|---|---|---|
| L1 | S5 order journey | a clean labelled "two networks joined by a router" diagram (for a `label` task) | ⚠️ source diagrams are PPT vector shapes, not rasterisable — taught via `order` block + device clipart |
| L2 | S2 devices | a wireless access point (WAP) raster to complete the four-device set | ⚠️ none clean in source deck — used switch/server/router (router is the new Y4 device anyway) |
| L3 | S2 media | a clean "physical vs media" contrast still | ⚠️ source used separate object photos (PPT-built) — used the media collage + `sort` instead |
| L6 | S3 reasons | a simple "fake news / why people share it" icon strip | ⚠️ source used decorative photos — used money clipart + social-media doodle |

## Type-gap log
- None. All questions map to live engine types (text, choice, multi-select, matching, `order`, `sort`, `label`, screenshot, checklist). The drag types covered all demand; no backlog item needed.
