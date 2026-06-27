# Conversion notes — Y7 Networks: from semaphores to the Internet (Teach Computing — adapted)

Slug: `y7-networks-semaphores-to-internet-teach-computing-adapted`
Course: Computing Curriculum (KS3). Source: TCC KS3 Year 7 Unit 3 (L1–L6 zips + Unit guide + summative assessment).
6 lessons converted: starter + activity worksheet + slide deck each, with embedded source images. Self-verify PASS.

**Videos:** this unit's videos are external YouTube links (Vint Cerf, "A Packet's Tale", an IoT intro), not embedded `.mp4`
files in the zips. So no video resources were attached; the links are referenced in slide teacher-notes as optional
teacher-played hooks (flagged motion+sound — teacher's choice, given the low-arousal default).

**End-of-unit summative assessment** (24 multiple-choice Qs, taken in L6) was read but NOT authored as a worksheet — out of
the per-lesson scope. It is a strong candidate for a future `l6 … assessment worksheet.md` (all 24 are single-correct MCQ,
so they map cleanly to the `(  )` choice type). Logged here as a backlog item.

---

## §7a alignment tables (objective → slide(s) → worksheet Q / level)

### L1 — Computer networks and protocols
| Objective | Slide(s) | Worksheet Q / level |
|---|---|---|
| say what a computer network is | S3 What is a network | activity Support "A computer network is…" (choice) |
| data is passed device to device | S4 Message to Australia | activity Core "why passed not straight"; Challenge "post depot ~ device" |
| say what a protocol is | S5 What is a protocol | activity Support "A protocol is…"; Core "what does protocol mean" |
| give a non-networking protocol example | S6 climber/belayer, S7 email/web rules | starter multi-select (non-computer methods); activity matching (climber commands) + Challenge "email rule" |

### L2 — Networking hardware
| Objective | Slide(s) | Worksheet Q / level |
|---|---|---|
| name the main hardware | S2 starter, S3–S6 | starter matching (name ↔ what it does) |
| say what each does | S3 cable, S4 hub, S5 server, S7 router | activity fill-in-the-blanks; Support choices; Core "job of a hub" |
| choose hardware to build a network | S6 build the network | activity Show-your-work (build + screenshot); Predict "more PCs → cables go up" |
| say what an ISP is | S7 router & ISP | activity Core "what does ISP stand for" |

### L3 — Wired and wireless networks
| Objective | Slide(s) | Worksheet Q / level |
|---|---|---|
| compare wired and wireless | S3 wired vs wireless, S8 you-do | starter multi-select (which are wireless); activity Challenge multi-select (wireless situations) |
| name wireless technologies | S4 technologies | starter Core "name a wireless technology" |
| bandwidth + units | S5 bandwidth, S6 speed test | activity Predict (most bandwidth); Support (units, pipe); Core "what is bandwidth" |
| choose wired or wireless | S8 you-do | activity Challenge multi-select; Show-your-work (speed test screenshot) |

### L4 — The internet
| Objective | Slide(s) | Worksheet Q / level |
|---|---|---|
| say what the internet is | S2 starter, S3 global | starter choice + multi-select (internet activities); Core "what is the internet" |
| how data crosses in packets | S4 packets | activity Predict; fill-blank (packets/payload/header); Core "why split into packets" |
| describe a packet | S5 header/payload, S6 IP | activity fill-blank; Support "IP looks like / sequence number"; Core "header contains" |
| name TCP and IP | S8 protocols | activity Challenge choices (TCP splits/reorders; IP routes) |

### L5 — Internet services
| Objective | Slide(s) | Worksheet Q / level |
|---|---|---|
| internet vs World Wide Web | S2 starter, S3 internet vs WWW | starter choice; Support; Core "one difference"; Challenge "why not the same" |
| name internet services | S4 services, S5 VoIP/email | activity matching (WWW/VoIP/Spam/IoT); Core "name two services" |
| what the IoT is | S6 IoT | activity Support "IoT = everyday objects"; Core "what does IoT mean" |
| a privacy/security risk of IoT | S7 IoT risks | activity Challenge multi-select (real IoT risks) + "benefit AND risk" |

### L6 — The World Wide Web
| Objective | Slide(s) | Worksheet Q / level |
|---|---|---|
| name the parts of the WWW | S2 starter, S3 browser/server | starter choice (browsers); activity matching (browser/server/search engine/HTTP/HTTPS) |
| HTTP vs HTTPS | S4 HTTP/HTTPS | activity Support "S = secure"; Core "HTTP vs HTTPS"; Challenge "which needs HTTPS" |
| what a URL is | S5 URLs | activity Support "facebook.com = domain name"; Core "what is a URL" |
| what DNS does | S6 DNS | activity Challenge "what DNS does" |

All choice cells are single-correct; "tick all that apply" questions use the multi-select `[  ]` type (sets), never a
single-radio. No orphan objectives; every worksheet question maps to a slide/plan point.

---

## §4 image-gap log (would help, none suitable in source)
| Lesson | Where | Image wanted | Source had one? |
|---|---|---|---|
| L1 | "Message to Australia" slide | a simple relay diagram: sender → relay devices → receiver (depots / towers) | ⚠️ no — TCC slide is built from PowerPoint shapes (not a raster), so not extractable. Embedded the semaphore-tower photo on the starter instead. |
| L2 | "Build the network" slide | a clean labelled topology: 4 PCs — hub — file server — router — internet | ⚠️ no usable raster — only separate hardware ICONS (hub/server/PC) exist as images; the topology is PowerPoint shapes. Embedded the hub + server icons; logged the topology. |
| L4 | "Inside a packet" slide | a labelled packet diagram (header: from/to/sequence; payload: message piece) | ⚠️ no — diagram is PowerPoint shapes. Embedded the global-network and packets-as-parcels photos instead. |
| L4 | "Packets and routers" slide | the router-mesh routing diagram (a packet taking different routes) | ⚠️ no raster — PowerPoint shapes. |
| L5 | "Internet vs WWW" slide | a 2-box diagram "internet = hardware (cables/routers)" vs "WWW = pages/links on top" | ⚠️ no — embedded the connected-world globe as a general visual; the contrast diagram is wanted. |
| L6 | "URLs" slide | a labelled URL anatomy bar (protocol · www · domain · TLD with callouts) | ⚠️ no labelled raster — embedded the Google HTTPS address-bar photo (shows https:// + padlock) as the nearest real example. |

Embedded source images actually used: L1 semaphore tower; L2 hub + server icons; L3 speed-test result; L4 global network +
packets-as-parcels; L5 connected-world globe; L6 browser logos + HTTPS address bar. (All OGL v3.0, attributed in manifest.)

---

## §2 wanted-but-unbuilt question types (WORKSHEET_QUESTION_TYPES.md backlog refs)
| Lesson / worksheet | Wanted type | Why | Stop-gap used |
|---|---|---|---|
| L1 activity (climber/belayer) | **§2.3 order/sequence (non-code)** | the source task is to ORDER 7 climbing commands 1→7 — a plain-English sequence | reframed to a **matching** widget (command ↔ meaning, 4 items) + a Show-your-work screenshot of the pupil's ordered commands; order-non-code logged |
| L4 activity (packets arrive jumbled) | **§2.3 order/sequence (non-code)** | "put the arrived packets back into the right order" is a sequencing task | text box ("write the message in arrival order" + "how is it fixed") for now; order-non-code logged |
| L3 activity (bandwidth: light/medium/high) | **§2.5 card sort / group into categories** | source sorts activities into 3 bandwidth bands; a 3-column drag-sort is the natural fit | reframed to a **multi-select** "tick the HIGH-bandwidth ones" (set-marked); card-sort logged |
| L3 activity (wired/wireless scenarios) | **§2.5 card sort (2 groups)** | source sorts 6 scenarios into wired/wireless | reframed to a **multi-select** "tick the wireless ones" (avoids the identical-2-option matching pitfall); card-sort logged |
| L2 / L4 hardware & packet diagrams | **§2.4 label-a-diagram** | label the parts of a network topology / a packet (header+payload) — strongly visual, near-zero writing, ideal SEND | used matching/fill-blank + embedded icons; label-a-diagram logged (also needs the diagram images in §4) |

(Did not edit the shared WORKSHEET_QUESTION_TYPES.md — these reference its existing §2.3 / §2.4 / §2.5 categories so they can
be folded in on the next pass. No new question types were built, per the brief.)
