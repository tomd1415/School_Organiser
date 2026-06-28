# Conversion notes — GCSE Cyber security (Teach Computing — adapted)

- **Slug:** `gcse-cyber-security-teach-computing-adapted`
- **Course / key stage:** OCR J277 GCSE Computer Science · **KS4**
- **Source:** TeachComputing GCSE unit_13 (Cyber security, KS4 v1.2), Lessons 1–7 + the unit guide and the
  end-of-unit summative assessment. © Raspberry Pi Foundation, OGL v3.0.
- **Lessons authored:** 7 (each: starter worksheet + activity worksheet + slide deck + image; L7's activity is
  the end-of-unit quiz that folds in the summative).
- **Self-verify:** PASS — all `{{res:}}` placeholders map to declared files; every activity/quiz has a `📷`
  screenshot field + an `## ✅ I can…` checklist; level sections slice by content (support ≠ challenge);
  all 7 decks parse (7–8 slides) with `> 🧑‍🏫` teacher notes; slides resource titles end `.md`.
- **Question types used (high variety):** text, single-choice, multi-select (`[ ]`), matching (term↔def),
  fill-in-the-blank (`[[ ]]`, L4 Caesar cipher), **order/sequence** (every lesson), **card-sort** (every
  lesson), **slider/rating** (L1 + L7 confidence), screenshot/upload, checklist. 10 interactive kinds.
- **SEND adaptation:** low-arousal decks, identical routine, plain literal language, I-do/we-do/you-do with
  worked examples, minimal writing (tick/drag/choose/sort/order dominate), genuine S/C/C on the SAME task,
  TA fix-words on every activity, movement built in as routine (L3 paper-ball DoS demo). Cohort-level only;
  no pupil named or described. **No flashing/animation/sound** — the one motion asset in the source (a 15 MB
  animated firewall GIF in L5) was excluded per the no-animation rule.
- **Show-your-work adaptation:** this unit is discussion/paper-based (not MakeCode/SQL), so show-your-work is
  "write your proudest answer" + a `📷` photo of the finished sheet, rather than a code-share link.

> **Heading gotcha avoided:** the words *support*/*core*/*challenge* in any `#`/`##` heading are read by the
> slicer as level dividers. Checked: no slide H1/H2 and no non-level worksheet heading contains those words.

## Media
- **Images embedded (1 per lesson, all OGL, viewed before choosing):** L1 UK breaches-survey infographic ·
  L2 shoulder-surfing illustration · L3 WannaCry ransomware lock screen · L4 Caesar cipher wheel · L5 laptop
  on a network · L6 bitcoin + chip (the "get rich / pen-tester reward" hook) · L7 live cyber threat map.
- **Videos:** none embedded — **all source videos are external YouTube/web links** (WannaCry BBC &
  Computerphile clips, the Joe Lycett blagging clip, "Kids meet a hacker", the asymmetric-encryption demo,
  the CyberFirst careers clips). They are referenced as teacher-played hooks in the slide teacher-notes, but
  no video bytes exist in the zips to attach.

---

## §7a alignment — Lesson 1: The cost of cybercrime and hacker motivation

| Objective ("I can…") | Taught on slide(s) | Asked on worksheet (Q / level) |
|---|---|---|
| describe how cybercrime affects people/businesses | S2 starter (breaches image) | starter: "what does the survey show?" choice + **multi-select** "who is harmed" (shared) · money-cost (Core) · hospital vs games (Challenge) |
| tell cybersecurity & network security apart | S3 two-words | activity: **matching** term↔def (shared) · cyber-vs-network (Challenge) |
| describe why a network can be attacked | S4 why-attacked | activity: one reason a network is vulnerable (Core) |
| name types of hacker + motivation | S5 who-attacks | activity: **card-sort** stories→malicious/hacktivist/ethical (shared) · hacktivist choice (Support) · slider confidence |

## §7a alignment — Lesson 2: Non-automated cybercrime

| Objective | Slide(s) | Worksheet (Q / level) |
|---|---|---|
| explain social engineering | S3 what-is-SE | starter: shoulder-surfing choice + "SE tricks…" (Support) · weakest-link (Core) · fake IT call (Challenge) |
| spot phishing warning signs | S4 spot-phishing | activity: **multi-select** warning signs (shared) |
| order the steps of a phishing attack | S5 how-it-works | activity: **order** the 4 phishing steps (shared) |
| sort types of social engineering | S6 in-person/far-away | activity: **card-sort** in-person vs far-away (shared) · term↔def **matching** (Support) · phishing-vs-pharming (Core) · two safety tips (Challenge) |

## §7a alignment — Lesson 3: Automated cybercrime

| Objective | Slide(s) | Worksheet (Q / level) |
|---|---|---|
| name types of malware | S3 what-is-malware, S4 types | activity: **multi-select** which-are-malware (shared) · malware term↔def **matching** (Support) |
| sort malware from network attacks | S4 types, S5 DoS/DDoS | activity: **card-sort** malware vs network attack (shared) |
| order the steps of a DDoS attack | S5 DDoS | activity: **order** the 4 DDoS steps (shared) |
| explain a weakness that enabled a real attack | S6 WannaCry | starter risky-download choice (shared) · WannaCry image → name the type (Core) · why-update-defends (Challenge) |

## §7a alignment — Lesson 4: Protecting systems with software

| Objective | Slide(s) | Worksheet (Q / level) |
|---|---|---|
| use a Caesar cipher | S3 encryption, S4 cipher wheel | activity: **fill-in-the-blank** +1 shift (shared) |
| order the steps of encrypting | S4 cipher wheel | activity: **order** the 4 encrypt steps (shared) |
| name ways software protects a system | S5 asymmetric, S6 more-defences | activity: **card-sort** software defences (shared) · defence term↔def **matching** (Support) · asymmetric two-keys choice (Core) |
| explain one software defence | S6 more-defences | activity: input-sanitisation vs SQL injection (Challenge); starter encryption recap (Support/Core/Challenge) |

## §7a alignment — Lesson 5: Network design as defence

| Objective | Slide(s) | Worksheet (Q / level) |
|---|---|---|
| decide what a firewall allows/blocks | S3 what-is-firewall, S4 allow/block | activity: **card-sort** firewall allow vs block (shared) · firewall-does choice (Support, starter) |
| order the steps a firewall takes | S4 allow/block | activity: **order** the 4 firewall steps (shared) |
| name ways to keep a network safe | S5 more-defences | activity: **multi-select** which-keep-safe (shared) · method↔def **matching** (Support) · network policy (Core) |
| explain why >1 defence is needed | S6 firewalls-not-everything | activity: firewall+antivirus+access reasoning (Challenge) · teacher-more-access (Challenge, starter) |

## §7a alignment — Lesson 6: Where is the danger?

| Objective | Slide(s) | Worksheet (Q / level) |
|---|---|---|
| plan different types of test | S4 three-ways | activity: **card-sort** Ranter tests → physical/software/social-engineering (shared) |
| order the steps of a penetration test | S3 the-steps | activity: **order** the 4 pen-test steps (shared) |
| name ways to find weak spots | S5 other-ways | activity: method↔def **matching** (Support); starter pen-tester choice (Support) |
| explain what makes hacking ethical | S2 what-is-pen-tester | activity: "ethical = permission" choice (Core) · test-the-people (Challenge) · ethical-vs-malicious (Challenge, starter) |

## §7a alignment — Lesson 7: Being part of the solution (end-of-unit assessment)

| Objective | Slide(s) | Worksheet (Q / level) |
|---|---|---|
| name threats (malware/SE/network attacks) | S2 threat-map, S3 recap | starter: threat-map choice · **card-sort** threat vs defence (shared) · term↔def **matching** (Support); **quiz** Q1–Q8 |
| name defences (encryption/firewall/access) | S3 recap | starter: card-sort (shared) · one threat+defence (Core); **quiz** Q9–Q13 |
| explain how companies find weak spots | S3 recap | **quiz** Q14–Q15 (pen testing, ethical); starter threat-map-accuracy (Challenge) |
| name a cyber security career | S5 careers | **quiz** Q17 careers (text) + confidence slider |

The **quiz** (`l7-end-of-unit-quiz-worksheet.md`) is the **folded summative**: 15 single-choice questions
(one per topic, single-correct), one **multi-select** "good ways to stay safe", a careers text question, a
confidence **slider**, and a screenshot + checklist. It is **shared** (no S/C/C — everyone sits the same
quiz, per "fold the summative into a final quiz"); the L7 **starter** carries the differentiation. Answer
key (from the source summative answers): 1 cybersecurity-def, 2 protest, 3 permission, 4 people, 5 fake
emails, 6 malicious software, 7 spreads-on-its-own, 8 flooding, 9 scrambling, 10 two-keys, 11 cleans-input,
12 checks-and-blocks, 13 least-access, 14 find-weak-spots, 15 permission; 16 = strong password + keep
updated + careful online (distractor: click urgent links).

## Image gaps (logged for sourcing later)
| Lesson | Where | What image is wanted | Source had one? |
|---|---|---|---|
| L5 Network design | firewall slide / activity | a clean **firewall / network-topology diagram** (packet checked at a gate) | ⚠️ source diagram is a PPT shape + a 15 MB animated GIF (excluded per no-animation) — used a generic laptop-on-network photo instead |
| L2 Non-automated | "spot the phishing email" task | a **real annotated phishing-email screenshot** (the 10-clues email) | ⚠️ the source A3 email lives inside the worksheet docx, not the deck; used a text multi-select of the warning signs instead |
| L6 Where is the danger | the-steps slide | a simple **4-phase penetration-test diagram** | ⚠️ source is a PPT match-the-line shape, not a raster — used an `order` block instead |
| (whole unit) | any "label a diagram" task | a **clean unlabelled diagram** (e.g. blank firewall/packet-flow) would unlock a label-a-diagram widget | ⚠️ none of the source rasters has discrete unlabelled spots, so no `label` task was authored this pass |

## Wanted-but-unbuilt question types
**None.** All demand was met by the now-built types (order = 7 sequences, card-sort = 7 sorts, slider = 2,
plus matching/multi-select/fill-blank). No new type needed to be logged to WORKSHEET_QUESTION_TYPES.md §2.
The only type not *used* is **label-a-diagram**, and only because the source has no suitable unlabelled image
(see the image-gap table) — not because the type is missing.
