# Conversion notes — Y9 Introduction to cybersecurity (Teach Computing — adapted)

Slug: `y9-cybersecurity-teach-computing-adapted` · course **Computing Curriculum** (KS3) · 6 lessons.
Source: `TeachComputing/KS3/year_9/unit_5`. All adapted to the SEND/low-arousal default; every
social-engineering scenario kept **cohort-level** (a user / a customer / a made-up character — never a
real or individual pupil). Self-verify: PASS (all worksheets render a screenshot field; slides parse 7–8
slides each with teacher notes; level sections slice genuinely support≠challenge; placeholders ↔ manifest
files consistent; slides titles end `.md`).

Question-type variety used: single-choice, **multi-select** `[ ]`, **matching** (term↔definition / threat↔
protection / incident↔attack), **card-sort** `sort`, **order/sequence** `order` (DDoS), **slider** `scale`
(plenary confidence), screenshot, checklist.

## §7a Alignment tables

### L1 — You and your data
| Objective (I can…) | Slide(s) | Worksheet Q / level |
|---|---|---|
| difference between data and information | S3 starter, S4 data/info | starter: data↔meaning match; activity Core "what turns data into information" |
| what a company learns from your data | S5 customer profile | activity: recommend-tick (multi-select), Challenge "unfair assumption" |
| what happens to data entered online | S6 categorise | activity: **card-sort** (Personal/Content/Behaviour/Others), Support "profiling" |
| why we need the Data Protection Act | S6 DPA | starter Support "who DPA protects", activity Challenge + exit ticket |

### L2 — Social engineering
| Objective | Slide(s) | Worksheet Q / level |
|---|---|---|
| explain what social engineering is | S2 starter, S3 tricks | starter choice "tricking people…"; activity match |
| spot phishing/blagging signs | S4 spot the signs | activity **multi-select** "tick ALL warning signs" |
| name common tricks | S3 tricks | activity **matching** trick↔meaning (phishing/blagging/shouldering/name-gen) |
| give advice to keep data safe | S5 protect customers | activity **card-sort** advice by trick; Challenge warning notice |

### L3 — Script kiddies
| Objective | Slide(s) | Worksheet Q / level |
|---|---|---|
| define hacking | S2 starter | starter choice "definition of hacking" + ethical choice |
| how a DDoS affects users | S3 DDoS | activity **order** (5 DDoS steps); Core "affect on users" |
| make brute force less likely | S4 brute force | activity **card-sort** weak/strong + Support multi-select rules |
| why we need the Computer Misuse Act | S5 CMA | activity **matching** action↔section (incl. "does not break") |

### L4 — Rise of the bots (malware)
| Objective | Slide(s) | Worksheet Q / level |
|---|---|---|
| list common malware | S2 starter, S3 family | starter "malware = malicious software"; activity matching pool |
| match malware to what it does | S3 family | activity **matching** 6 types↔effect |
| virus vs worm vs trojan | S3, S4 sort | activity **card-sort** self-replicates?; Core "worm vs virus", Support trojan |
| how malicious bots affect society | S5 bots | activity **multi-select** consequences of fake accounts |

### L5 — Protecting a network
| Objective | Slide(s) | Worksheet Q / level |
|---|---|---|
| compare threats by risk & impact | S4 risk vs impact | activity Core "risk = likely AND harm"; biggest-danger Q |
| name protections | S3 protections | starter map context; activity matching pool |
| match threat to protection | S3 protections | activity **matching** protection↔what-it-stops + **card-sort** defences |
| choose most important protection | S4 | activity "biggest danger + protection" (homework starter); **slider** confidence |
| (recap) retrieval quiz | S2 starter | starter 3× single-choice (data/DDoS/social-eng) |

### L6 — Under attack (unit review)
| Objective | Slide(s) | Worksheet Q / level |
|---|---|---|
| recall protections | S2 starter | starter **multi-select** "tick all protections" |
| match incident to attack | S3 game | activity **matching** 5 incidents↔attack type |
| choose protection that stops each | S3 game, S4 | activity Support "fake IT call → 2FA"; **card-sort** attack/protection |
| protections that stop the most | S4 reflect | activity **multi-select** "the two best (2FA + anti-malware)"; **slider** confidence |

## Image gaps (WORKSHEET_QUESTION_TYPES.md §4)
| Lesson | Where | Image wanted | Source had one? |
|---|---|---|---|
| L1 | activity customer-profile | a clean shopping-basket still (tent/dog toys/tracker) | ⚠️ source = clipart; described in text instead |
| L2 | activity "spot the phishing signs" | a clean annotated phishing/blagging EMAIL screenshot | ⚠️ source emails are PPT text boxes (not raster); embedded the name-generator quiz clipart instead |
| L4 | starter ransomware slide | the WannaCry ransom-screen still | ⚠️ source has it but low-clarity; used the clean "Attack – ransomware" game card instead |
| L5 | activity risk-vs-impact | a blank risk(impact)×probability grid to plot threats on (would unlock a **label**/plot task) | ⚠️ source ships a PDF graph (`A2 Resource_ Risk graph.pdf`) but not a clean raster; used a defence card-sort instead |

Embedded media: 17 OGL images carried over — the L6 **Attack/Protection game cards** (clean, labelled,
low-arousal) are reused across L3–L6 for malware/threat/protection visuals, plus the **live cyber threat
map** (L1 & L5 starters) and the **name-generator quiz** clipart (L2). No source **videos** exist in the
zips — the unit's videos (blagging comedy sketch, careers interviews) are **external links only**, so none
were embedded; referenced as optional teacher-played hooks in the plan/notes instead.

## Wanted-but-unbuilt question types
None. Every type the unit wanted is built and used (order, card-sort, matching, multi-select, slider).
**Label-a-diagram** was *not* used: the source has no single positioned diagram suited to hotspots (the
game cards are one-concept tiles). If a blank risk/impact grid (L5 gap above) is sourced later, that task
could become a label/plot widget.
