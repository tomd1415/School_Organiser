# GCSE Computer networks (Teach Computing — adapted) — Part 1 conversion notes

- **Bundle:** `gcse-computer-networks-teach-computing-adapted__pt1`
- **Source:** `TeachComputing/GCSE/unit_12` — lessons L1–L7 (the unit splits into part 1 = L1–L7, part 2 = L8–L13, which is the sibling `__pt2` bundle).
- **Unit title:** GCSE Computer networks (Teach Computing — adapted)
- **Target course:** OCR J277 GCSE Computer Science · KS4 (the GCSE scheme).
- **Lessons (in order):** L1 What is a computer network? · L2 The client–server model · L3 Network hardware · L4 Network topologies · L5 Wired and wireless transmission media · L6 Network performance and routing costs · L7 What is the internet?

Each lesson = a plan (3 "I can…" + routine outline with S/C/C, vocab, likely error, TA cues) + a starter worksheet + an activity worksheet (with level sections + show-your-work) + a `.md` slide deck with `> 🧑‍🏫` teacher notes. Packet Tracer practicals from the source are kept as optional teacher-played video hooks in the notes (motion/sound flagged for the low-arousal default), not required pupil tasks.

## Question-type variety used (all engine-supported)
- **Card-sort** (`sort`): L1 is-it-a-network · L2 client/server + PAN/LAN/WAN · L4 star-vs-mesh features · L5 wired/wireless · L7 internet-vs-WWW.
- **Matching** (term↔definition grid): every activity sheet (network keywords · client/server/PAN/LAN/WAN · hardware↔job · topology↔description · media↔description · factor↔definition · internet terms).
- **Order** (`order`, prose steps): L1 peer-to-peer file request · L7 the six steps of visiting a website.
- **Label a diagram** (`label`): L3 — label the network/NIC port (+ HDMI, USB) on a laptop-ports photo.
- **Multi-select** (`[ ]`): L1 advantages of a network · L2 disadvantages of client–server · L5 advantages of wireless.
- **Fill-in-the-blank** (`[[ ]]`, in prose): L4 terminators · L5 copper/fibre signals · L6 transfer-time calc · L7 "network of ___".
- **Single-choice**, **slider** not needed here (plenary is the ✅ checklist), **screenshot** show-your-work on every activity sheet.

Authoring note: `[[ ]]` only parses as a blank in **prose**, not inside a table cell — the four fill-blanks are written as prose lines under the Core heading (a table cell `[[ ]]` renders as inert text). Card-sort item text avoids commas (the `sort` block splits items on commas).

## §7a alignment — objective ↔ slide ↔ worksheet

**L1 What is a computer network?**
| Objective | Slide(s) | Worksheet Q |
|---|---|---|
| define a computer network | S3 what-is-a-network | card-sort "is it a network?"; Support matching (computer network row) |
| advantage + disadvantage | S5 good/bad points | multi-select advantages; Core write one adv + one disadv |
| peer-to-peer role | S6 peer-to-peer | Core "ask/send" gap; Challenge order the 4 P2P steps + explain equal responsibility |

**L2 The client–server model**
| Objective | Slide(s) | Worksheet Q |
|---|---|---|
| client & server roles | S3 client/server | card-sort client/server; Support matching |
| compare with peer-to-peer | S4 client–server vs P2P | Core scenarios (school→client-server, friends→peer-to-peer); Challenge single-point-of-failure |
| PAN/LAN/WAN | S5 three sizes | card-sort PAN/LAN/WAN; Support matching |

**L3 Network hardware**
| Objective | Slide(s) | Worksheet Q |
|---|---|---|
| what each device does | S3 the hardware | Support device↔job matching (router/switch/hub/NIC/WAP/bridge); Core router write; Challenge hub-vs-switch + WiFi device |
| define a MAC address | S4 MAC address | Core MAC choice |
| choose hardware | S5 find-the-port / S6 choose | label-a-diagram (NIC port); Challenge pick the switch for a shop |

**L4 Network topologies**
| Objective | Slide(s) | Worksheet Q |
|---|---|---|
| describe star/bus/ring/mesh | S3 star+bus / S4 ring+mesh | Support topology↔description matching |
| advantage + disadvantage | S3–S4 | Challenge star-vs-mesh card-sort; Core single-point choice |
| choose a topology | S5 choose | Core bus scenario + terminators gap; Challenge office scenario |

**L5 Wired and wireless transmission media**
| Objective | Slide(s) | Worksheet Q |
|---|---|---|
| define wired/wireless | S3 transmission media | wired/wireless card-sort |
| describe copper/fibre/WiFi/Bluetooth | S4 the four media | Support media↔description matching; Core copper/fibre gaps |
| choose the media | S5 choose | Core TV-studio→fibre, coffee-shop→WiFi; Challenge wireless advantages + wired reason |

**L6 Network performance and routing costs**
| Objective | Slide(s) | Worksheet Q |
|---|---|---|
| performance factors | S3 factors | Support factor↔definition matching; Challenge "why more devices = slower" |
| calculate transfer time | S4 formula | Core two transfer-time choices + a gap-fill calc |
| lowest-cost route | S5 routing | Challenge add link costs (Route 2 = 9 < Route 1 = 15) |

**L7 What is the internet?**
| Objective | Slide(s) | Worksheet Q |
|---|---|---|
| internet = network of networks | S3 internet vs Web | internet/WWW card-sort; "network of ___" gap |
| IP address & DNS | S4 IP / S5 DNS | Support matching; Core DNS + IP choices; Challenge "why unique IP" |
| web browser | S6 the browser | Challenge order the 6 website-visit steps |

ANSWER KEYS (closed Qs, for self/teacher mark): L5 media scenarios — TV studio = fibre, coffee shop = WiFi (source also: chef headset = Bluetooth, gamer = Bluetooth, print-on-demand = WiFi, bakery = copper). L6 calcs — 1000÷100 = 10 s, 200÷50 = 4 s, 20000÷1000 = 20 s; lowest-cost route = Route 2 (9). L4 — bus scenario = bus; gap = terminator. L2 — school = client–server, friends = peer-to-peer. (No `upsertScheme` shipped in the bundle, matching the `__pt2` sibling; auto-marking schemes can be derived later.)

## Images embedded (all from the unit_12 source decks/zips)
| Lesson | File | What | Source |
|---|---|---|---|
| L1 | l1-network-people.png | a network of connected people | deck photo (OGL) |
| L2 | l2-server.png | a server icon | Cisco icon (in TCC pack) |
| L3 | l3-router.png, l3-switch.png | router & switch icons | Cisco icons (in TCC pack) |
| L3 | l3-laptop-ports.png | laptop ports — used for the label-a-diagram | deck photo (OGL) |
| L4 | l4-topologies.png | star & bus topology diagrams | adapted TCC slide |
| L5 | l5-ethernet-cable.png | RJ45 network cable | deck photo (OGL) |
| L6 | l6-crowd-bandwidth.png | a crowd all on phones (shared bandwidth) | deck photo (OGL) |
| L7 | l7-internet-world.png | networks linked around the world | deck photo (OGL) |

## Image-gap log (record for WORKSHEET_QUESTION_TYPES.md §4)
TCC's network **topology diagrams** (star/bus/ring/mesh node graphs), the **packet-switching** diagram and the **DNS lookup** diagram are PowerPoint **shapes**, not extractable rasters (same recurring theme as the Y7 networks unit). Embedded the available photos/icons and the one rasterised star+bus page instead. Wanted, to source/redraw later:
- L4: clean unlabelled ring & mesh node-graphs (would unlock a topology **label-a-diagram** like the L3 ports one).
- L6: a clean motorway-lanes "bandwidth" diagram; a simple A→B routing graph with link costs.
- L7: a packet-switching diagram and a URL→DNS→IP→page flow strip.

## Verification
Validated with a throwaway script (now deleted): all 7 lessons' worksheets parse; every **activity** sheet has the 📷 show-your-work field; every deck title ends `.md` and has non-empty `> 🧑‍🏫` notes; `sliceSlidesForLevel`/`renderWorksheet` slice cleanly per level (Support/Core/Challenge isolated, shared blocks shown to all, no level-label leak into pupil view). Card-sort/order/label/multi-select/matching/blank fields all detected. DB untouched — bundle files only.

---

## Resource-completeness sweep (2026-06-28) — PILOT unit

First unit swept under `docs/RESOURCE_COMPLETENESS_SWEEP.md` (v2). Audit finding: this unit was **already
high-quality and largely complete** — each lesson carries its key diagram and the worksheets are rich
(order/sort/label/matching/blank/multi-select + 📷 show-your-work on every activity). Two changes made:

- **Note 1 (missing concept visuals) — L4 Network topologies.** The lesson taught + tested all four
  topologies (star/bus/ring/mesh) but only embedded the **star+bus** image; **ring and mesh had no visual**
  (the activity asks pupils to match all four). Fixed by **rasterising the source slides** (Gotenberg
  Office→PDF → `pdf-to-img` PNG — this captures the PPT **vector** diagrams `extractOfficeImages` can't):
  added `l4-ring-topology.png` (source slide 23) + `l4-mesh-topology.png` (source slide 31), cropped tight,
  embedded on the "Ring and mesh" slide and in the activity worksheet (all four shapes now shown).
- **Note 4 (activity-start cues).** Every teaching deck cued the activity only in the `> 🧑‍🏫` teacher notes.
  Added a **visible** "▶ Your turn — open your activity worksheet now" line (with the specific task) to each
  `(you do)` slide across L1–L12, so the board itself tells pupils what to start.

Notes 2 (upload), 3 (documents), 5 (code) needed nothing here: every activity already had the 📷 upload
field; the unit hands out no separate documents (Packet Tracer practicals stay optional teacher video hooks);
it is non-programming so there is no code. The L10/L11 "blank coloured boxes" are **correct** — they are
`label`-task backdrops (pupils drag the layer names onto the bands), not unfinished diagrams.

Re-seeded + verified (file-level + DB): unit seeds clean, all activities keep the 📷 field, decks slice per
level with teacher notes. **Key enabler proven here:** the Gotenberg rasteriser resolves the long-standing
"TCC diagrams are vector shapes" image-gap — applicable to every future unit.
