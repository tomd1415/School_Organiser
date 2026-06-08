# Open Questions

<!-- markdownlint-disable MD029 -->
<!-- Q1–Q20 use deliberate continuous numbering across sections for easy reference. -->

Decisions and details I need from you to firm up the design. Each has my **recommended
default** so we can proceed even if you only answer a few. Grouped; answer by number. The
most blocking ones (Q1, Q2, Q14, Q19) are also asked directly in chat.

## Decided so far (2026-06-07)

- **Q1 Stack → TypeScript / Fastify** (reuse `exam_questions`).
- **Q2 Timetable → single repeating week** (no A/B; the staff TTRPG is a fortnightly
  after-hours event anchored to a date you'll give me).
- **Q14 Resources → the app HOSTS them** (single source of truth: upload / view / download /
  version / AI-edit / import), per your update — *not* link-only. Remaining detail under Q14.
- **Q23 MS Teams → per-class link + "assigned to Teams" checklist** for now (no Graph API yet).
- **Q24 Events/deadlines → entered manually** (MIS/calendar import can come later).
- **Next step → scaffold Phase 0** (running, authed, backed-up empty app), refining content in
  parallel.

Settled questions below are marked **[decided]**; the rest are still open.

## A. Stack & infrastructure

1. **[decided → TypeScript / Fastify]** Server language. Reuses `exam_questions` (LLM client,
   auth, HTMX, backup scripts). See ARCHITECTURE §"Stack decision".
2. **[decided → single repeating week]** No A/B teaching cycle. The staff TTRPG is the only
   fortnightly item — modelled as an after-hours event anchored to a date you'll give me.
3. **Email intake mechanism?** *Recommend: start with a paste-an-email box (no infra), add
   IMAP polling later.* Or do you want forward-to-mailbox from day one? (need a mailbox + creds)
4. **AI provider — OpenAI, Gemini, or both?** *Recommend: OpenAI Responses API* to match
   `exam_questions`, behind a swappable wrapper. Confirm you're happy sending **redacted**
   (no-names) lesson context to it.
5. **Repo & remote.** Shall I `git init` here, and is there a GitHub remote (as with
   `exam_questions` under `tomd1415`)? *Recommend: yes, init now; add remote when you say.*
6. **Project name.** Keep "School Organiser" (folder stays `School_Orgniser`), or a codename?

## B. The timetable in detail

7. **08:30–08:50 on Tue & Fri** (no briefing): what is it — prep/free, a duty, something else?
   *Recommend: model as unstructured "prep" time usable for work blocks.*
8. **Before- and after-school blocks**: do you want these as **interactive time you can plan
   tasks into** (e.g. "before 08:30 — prep L1"), or just shown for context? *Recommend:
   interactive work blocks.*
9. **The 3 free periods**: are they **fixed slots** in your weekly timetable, or do they move?
   *Recommend: enter them as fixed `purpose='free'` slots; exceptions handle moves.*
10. **Duties** (break/lunch/gate duty): any to track? *Recommend: support `purpose='duty'`
    slots; skip if you have none.*
11. **Rooms**: do you teach in multiple rooms / move rooms? Worth tracking per lesson?
    *Recommend: yes, lightweight room per lesson.*

## C. Classes, courses & content

12. **Your real teaching pattern** (so I can seed realistic data): roughly how many groups,
    which year groups, and which courses? e.g. KS3 Yr7–9 Computing, OCR J277 GCSE, any KS5/BTEC?
    Rough numbers are fine.
13. **"More than one course in one lesson"** — confirm this means a *split class* (two courses
    running simultaneously in one room/slot), and roughly how many such slots you have.
14. **[decided → the app hosts resources]** Single source of truth: upload, view/download,
    version, AI-edit, import. Still need: (a) which **formats** dominate (PowerPoint? Word? PDF?
    Microsoft/Google online docs?) — drives the preview approach; (b) **how far should AI editing
    go** — generate/replace whole resources, or edit text-based ones in place (binary Office is
    hard)? (c) roughly **how much** existing material to bulk-import, and from where, for de-dup.
15. **Non-specialist/TA lessons**: which groups/courses are TA-taught, who are the TAs, and do
    you want them to **report back in-app** eventually (needs a TA login), or will you just
    prepare + oversee? *Recommend: prepare+oversee now; TA login as a later phase.*

## D. Pupils & the record

16. **Pupil-level tracking depth**: do you want a **full roster per class** (so "outstanding
    pupils" and per-pupil notes are pickable), or freeform pupil mentions to start? And can you
    get class lists exported from the MIS (CSV)? *Recommend: start freeform in P1, import
    rosters in P2.*
17. **Redaction tokens**: happy with pupils shown to the AI as stable placeholders like
    `PUPIL_7` (so the AI can keep them distinct) and re-expanded to names only on your screen?
    *Recommend: yes.*

## E. Scope & the "forgotten" features

18. **From the parked list** (SPECIFICATION §8) — which, if any, do you actually want in scope:
    homework setting/tracking, behaviour/detention log, parental-contact log, exam-board key
    dates, duty rota, equipment/room booking, print queue, start/end-of-day checklist? *Pick
    the ones that hurt most day-to-day; the rest stay parked.*
19. **Next step**: shall I **scaffold Phase 0** (running, authed, backed-up empty app) now, or
    **refine these docs** with your answers first? *Recommend: answer Q1–Q2 then I scaffold
    Phase 0, and we refine the data model as Phase 1 lands.*

## G. From your teaching detail (new)

21. **Post-16 group runs 3 courses at once** — which three (names/levels)? And the **Year 10
    "sound engineering" custom course** for the one pupil — is there an existing scheme, or is it
    also to be built? This drives the split-slot setup and SoW seeding.
22. **KS3 "Effective use of computers in school"** is unwritten and a priority. Want the app's
    **AI to help you author it** early, or build the structure now and fill it in as you go?
23. **[decided → link + checklist]** Per-class Teams link + an "assigned to Teams" prep item now;
    direct Graph API posting is parked for later.
24. **[decided → manual entry]** Enter events/deadlines by hand for now; MIS/calendar import can
    come later if a feed is available.
25. **Focus mode** — happy for the app (and AI) to **choose the single next action** and **break
    tasks into steps**, as long as you can override? This is central to the bad-day fixes.
26. **Cognitive-load tagging** — fine to tag tasks **low/medium/high** (plus "needs computer" /
    "quick win") so mornings get the right first job and evenings only get light/urgent work?

27. **Timers** — OK to **auto-start a task timer** on "start" (one running at a time), auto-pause
    on interruptions, and use the actuals to **calibrate AI estimates**? Do you want lessons
    timed beyond the countdown, or just tasks? *Default: tasks timed; lessons get a countdown +
    optional activity timer.*
28. **Captured info** — happy for the AI to **categorise** "things I've been told" into a starter
    taxonomy (pupil · room/logistics · admin/deadline · curriculum · CPD · **safeguarding**),
    extract entities and resurface in context, with override? Any categories to add — and should
    **safeguarding-flagged** items be handled specially?

## F. Anything I've missed

20. You mentioned you've likely forgotten features. What does a *typical bad day* look like —
    where do things currently fall through the cracks? That usually surfaces the missing
    requirement faster than a feature list.
