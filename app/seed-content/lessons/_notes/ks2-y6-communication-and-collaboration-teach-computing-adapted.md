# Conversion notes — KS2 Y6 Communication and collaboration (Teach Computing — adapted)

**Slug:** `ks2-y6-communication-and-collaboration-teach-computing-adapted`
**Course / key stage:** KS2 Computing · KS2
**Lessons:** 6 (every TCC lesson converted)
**Framing:** PRIMARY content, SEND-secondary cohort — simple/concrete, age-respectful (not babyish),
very low reading load, lean on visual/drag types (sort, order, multi-select, choice, screenshot).
This is the **in-year gold template** for the rest of the Y6 batch.

## Question-type spread (variety, low writing)
- **sort** (card-sort) — L2 (header vs payload), L3 starter (uses-internet vs not), L6 (public/private; one-to-one/one-to-many)
- **order** (sequence) — L1 (DNS name→IP steps), L2 (numbered packets spell a message), L3 (add a picture via Explore), L4 (remix steps), L6 (online-safety steps)
- **multi-select** — L1 starter (what sends data), L3 (media shared), L4 (what you changed), L5 (internet ways), L6 (what to keep private)
- **single-choice / matching grids** — every Support section (single-correct; not the multi-correct trap); L5 Core is a choose-the-best-way matching grid
- **screenshot** — every activity worksheet (📷 show-your-work)
- **scale** — not used (checklist covers self-assessment)

## Image use (all OGL, Teach Computing © Raspberry Pi Foundation)
| Lesson | Embedded | Used for |
|---|---|---|
| L1 | word cloud, two people talking, red postbox, address book (A–Z) | how we use the internet; protocol; IP address (postal analogy); DNS = address book (name→number) |
| L2 | internet globe | data travels the internet in packets |
| L3 | Google Slides Explore panel | collaborative shared file (Explore + Chat) |
| L4 | Mars Lander (See inside / Remix) | remixing in Scratch |
| L5 | internet globe | the internet connects people far apart |
| L6 | two people communicating | how do you communicate / public vs private |

## §7a Alignment (objective → slide → worksheet Q)
**L1 Internet addresses** — protocols (S3 / starter Support + multi-select); IP address (S4 / activity Support
choice + Core); DNS name→IP (S5 / activity order + Challenge). Show-your-work: find a real IP.
**L2 Data packets** — packets=small parts (S2 / starter choice); header vs payload (S3 / activity sort + Support);
all data in packets (S5 / activity choice). Numbered packets → activity order + screenshot.
**L3 Working together** — shared file (S3 / starter sort + activity Core); share media (S5 / activity multi-select);
collaborate (S4 / activity order + screenshot of slide).
**L4 Shared working** — ways to work online / public-private (S6 / activity copyright choice); remix (S3/S4 / activity
order + Support); reuse OK? (S6 / activity choice). Screenshot of remix.
**L5 How we communicate** — ways to communicate (S2 / starter); internet ways (S4 / activity multi-select);
choose for purpose (S5 / activity matching grid + mind-map screenshot).
**L6 Communicating responsibly** — compare (S3 / activity sorts); what to share (S4 / activity multi-select);
not private (S4 / activity Core); report (S5 / activity order). Exit-ticket + screenshot.

## Image gaps (logged to WORKSHEET_QUESTION_TYPES.md §4)
- L2 packet **header/payload structure diagram** — source draws it as PPT vector shapes, not extractable rasters;
  built as a card-sort + envelope/letter analogy in prose instead.
- L6 — no clean "public vs private" visual in source (decorative photos only); reused the communicating image.
- L1 — no DNS-lookup result screenshot embedded (mxtoolbox is a live teacher demo); the address-book photo
  carries the analogy.

## Verified
`npm run seed:lessons -- <slug>` → unit seeded (6 lessons, 27 resources); `_verify.ts` + `_vfile.ts` both green
(every activity has a 📷 field; slides end .md with teacher notes; S/C/C slice).
