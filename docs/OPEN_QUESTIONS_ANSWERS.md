# Open Questions — Answers

Canonical record of the teacher's answers to [OPEN_QUESTIONS.md](OPEN_QUESTIONS.md). Newest
batch first. Each entry notes the decision and where it has been applied. History is in
[../CHANGELOG.md](../CHANGELOG.md).

## 2026-06-08 — batch 2

| Q | Decision | Applied to |
| --- | --- | --- |
| **3** Email intake | **(a) Paste box to start** — forward-to-mailbox (b) & `.eml` drop (c) liked but parked for later. | SPEC §5.5, ROADMAP P2 |
| **4** AI provider | **Anthropic (Claude)** — switched from OpenAI. Wrapper stays provider-swappable. | ARCHITECTURE, DATA_MODEL settings, SECURITY |
| **5** Repo | On **GitHub**; folder + repo **renamed to `School_Organiser`** (2026-06-08) — done. | — |
| **6** Project name | **"School_Organiser"** — spelling corrected and the folder + GitHub repo renamed to match (2026-06-08); `package.json`/Docker were already correct. | — |
| **7** Tue/Fri 08:30–08:50 | **Prep/free time** (usable for work blocks). | TEACHING_PATTERN |
| **8** Before/after-school | **Interactive work blocks**. | SPEC §5.6 (already) |
| **9** Free periods | **Fixed slots this year**; the whole timetable changes each September but stays static for the year → academic-year rollover. | SPEC §5.14, TEACHING_PATTERN |
| **10** Clubs & duties | **Computing Club every break and every lunch (13:00–13:30)**; **Wednesdays: enter taxi numbers** into the system (a duty). | TEACHING_PATTERN (`club`/`open_room`/`duty`) |
| **11** Rooms | **All lessons in U1 (Computing Room)**; possibly >1 room some years → per-lesson room retained. | TEACHING_PATTERN |
| **12** Timetable | **Full Mon–Fri timetable captured.** Naming: `<year><FORM>` (e.g. `8PFA` = Year 8, form PFA). | TEACHING_PATTERN |
| **13** Split classes | **Confirmed** — post-16 (×3 courses) and Year 10 (+1 Sound Engineering pupil). | DATA_MODEL, TEACHING_PATTERN |
| **15** Other-teacher lessons | **7JMI** (both Computing Curriculum + Computer Skills), **7ARO** (Computer Skills), **7RAL** (Computer Skills). | TEACHING_PATTERN, "Lessons I oversee" |
| **16** Pupil tracking | **As recommended** — freeform mentions first, import rosters in Phase 2. | ROADMAP |
| **17** Redaction tokens | **Yes** (`PUPIL_n`). | SECURITY |
| **18** Scope to start | **Exam dates** + **start/end-of-day checklist**. | SPEC §5.13/§5.15, ROADMAP |
| **19** Next step | **As recommended.** | — |
| **20** Bad day | Missing **written-task deadlines**, **parent contact** owed, forgetting to **fill in forms** / running out of time. | SPEC (deadlines, parental-contact log, forms-as-tasks) |
| **21** Post-16 + Sound Eng | Post-16 = **BCS "Thinking Like a Coder"**, **AIMS Robotics**, **Using Computers for VI pupils**. **Year 10 Sound Engineering** currently being built. | TEACHING_PATTERN |
| **22** KS3 "Computer Skills" | **Combination** — good structure + some complete lessons first, with the option to create more as you go. | SPEC §5.10, ROADMAP |
| **25** Focus mode | **Yes — very important.** Default on, or a very clear trigger. | SPEC §5.12 |
| **26** Cognitive-load tags | **Yes.** System tags first; you can alter; the system **learns from your changes**. | SPEC §5.5/§5.16 |
| **27** Timers | **As recommended.** | SPEC §5.16 |
| **28** Captured-info categories | **Yes.** Safeguarding items **highlighted and withheld from AI once spotted** (never sent, not just name-redacted). | SECURITY, SPEC §5.17, DATA_MODEL |
| **Extra** "Current interest" | Mark things as **current interest**; the system **learns your current interest** over time and biases what it surfaces. | SPEC §5.18 (new) |

### Q14 — resource detail (2026-06-08)

- **(a) Formats:** currently **PowerPoint + Word + some PDF + media files** (every GCSE and
  Computing Curriculum lesson has slides + several Word docs + some PDFs/media). → Office formats
  preview via server-side PDF render; media served directly.
- **(b) AI editing → "as far as possible":** generated **worksheets must stay editable for
  pupils** and **presentations must look good**; underlying format is secondary. Pupils currently
  receive resources via **MS Teams assignments**.
- **(c) Volume:** sizeable — every GCSE + Curriculum lesson already has PPTX + several DOCX +
  some PDF/media to bulk-import.

**Parked future direction — pupil-facing resource/quiz site.** An internal website where pupils
get resources and answer questions, with login + teacher marking (a planned summer project). It
overlaps the sibling **`exam_questions`** platform (OCR J277 revision with pupil login + marking).
Out of scope for current phases; the hosted resource store is designed to stay compatible so it
can feed or integrate with that later rather than be rebuilt.

## 2026-06-07/08 — batch 1 (for reference)

Q1 TypeScript/Fastify · Q2 single repeating week · Q14 app hosts resources (versioned, AI-edit,
import) · Q23 MS Teams = per-class link + checklist · Q24 events entered manually · Next step =
scaffold Phase 0 (done & verified).
