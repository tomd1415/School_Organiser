# Future Phase (unnumbered) — Multi-teacher school server

> **Status: parked / plan-first. Deliberately UNNUMBERED — not started, not scheduled.**
> This is a v2 architecture. It will **not be touched until the single-teacher tool has been
> used and tested in real teaching for an extended period** and is demonstrably stable. It is
> recorded now only so the single-teacher work doesn't accidentally paint us into a corner, and
> so the shape is agreed before any code.
>
> **Two hard gates before any build:** (1) the single-teacher app is proven in daily use; (2) a
> **fresh, whole-school DPIA** is completed and DPO/SLT-signed — this is a materially bigger
> data-protection step than the single-teacher DPIA (whole-school pupil data, several staff users,
> and *cross-subject profiling*), not an addendum.

## 1. The vision

Today: **one instance per teacher** — each teacher runs their own container + database (see
`scripts/new-instance.sh`); nothing is shared. The destination this plan describes:

- **One server inside the school, one database, many teacher accounts.** Teachers sign in as
  themselves (not a shared password), each seeing and owning their own courses, schemes, lessons,
  notes, tasks and resources.
- **Each pupil has ONE account** for the whole school, not one per teacher. A pupil enrolled in
  Computing *and* (say) Science logs in once and sees all their lessons across subjects on `/me`.
- **(Opt-in, sensitive) cross-subject signal to inform planning** — e.g. a pupil's "what works
  for me" profile, their differentiation level, or how lessons land, could help *every* teacher
  who teaches them, not just the one who recorded it. This is the most powerful idea here and the
  most data-protection-heavy; it is strictly opt-in, redacted, and DPIA-gated (§6).

What does **not** change: the non-negotiable AI boundary — **no pupil name ever reaches an AI
service**, safeguarding content is withheld entirely, the single wrapper audits everything. Those
guarantees are *preserved and extended* to the school-wide roster (§7), never relaxed.

## 2. Why this is a rearchitecture (grounded in the current code)

The current app bakes the single-tenant assumption in deeply. An honest inventory:

| Area | Today | What multi-teacher needs |
|---|---|---|
| **Identity** | One shared teacher password; the session holds only `authed` + `role`. "The teacher" is implicitly the one `staff.is_self = true` row. No user id anywhere. | Real per-user accounts + a `current user id` in the session. |
| **Ownership** | **Zero owner columns** on any of ~20 core tables (courses, groups, group_courses, schemes, units, lesson_plans, timetabled_lessons, resources, notes, tasks, events, …). Everything is implicitly the one teacher's. | An `owner` (teacher) FK on owned tables + an index, and a `school`/tenant concept above them. |
| **Pupils / roster** | `listPupils()` / `listRoster()` return *all* pupils — one instance = one teacher's pupils. Redaction loads the whole roster per call. | A **school-wide** roster shared across teachers; redaction over the school roster (§7). |
| **Authorization** | Every mutating route is gated by `requireAuth` only (`authed === true`) — the single teacher implicitly owns everything. No per-resource checks. | **RBAC on every route**: a teacher may only act on their own (or shared) data; deny-by-default. This is the single biggest change. |
| **Deployment** | One DB + container + resource store + backups **per teacher** (`new-instance.sh`). | One shared DB/server; per-teacher data isolation enforced in software, not by separate databases. |
| **Accounts that already exist** | Phase 8 added `ta_accounts` (named TA logins) and `pupil_credentials` — the only per-identity tables. Neither has an owner link. | Generalise these into the unified accounts model (§3). |

Bluntly: this touches the auth layer, the data model, and **the authorization of essentially
every route** — on the order of half the codebase. It is not an add-on; it is a major version.

## 3. The core decision — tenancy model

Three options, with the recommendation:

- **A. Shared database, row-level ownership + RBAC (recommended).** One DB; add an `owner_id`
  (and a single `school`/tenant row) to owned tables; every query is scoped by the signed-in
  user's permissions. Pupils, rooms, the academic year, terms and the day shape are **school-level
  shared**; courses, schemes, lessons, notes, tasks and resources are **teacher-owned**. This is
  what makes "one pupil, many teachers" and cross-subject sharing *possible* — the data lives
  together and access is controlled in software. Highest value, highest care required.
- **B. Schema-per-teacher in one DB.** Cheap isolation, but it *defeats* the goals — shared
  pupils and cross-subject signal become cross-schema joins, i.e. all the multi-tenant complexity
  with none of the sharing benefit. Rejected.
- **C. Keep separate instances + a thin "directory".** Lowest risk, but pupils still have N
  accounts and there's no cross-subject signal. This is essentially the status quo; only worth it
  if the school never wants the shared-pupil benefit. Rejected for the stated goals.

**Recommendation: A.** The rest of this plan assumes it.

## 4. Identity & accounts

- A single **`users`** table (teacher / TA / pupil / admin) with `id`, `role`, credential, active,
  and a display name — superseding the shared teacher password, the Phase-8 `ta_accounts`, and
  `pupil_credentials` (those fold in, preserving their data on migration). The session carries a
  real **`userId`** and `role`, not just `authed`.
- **`staff.is_self` retires** as the "this is me" flag — a teacher *is* a `users` row; the staff
  table reverts to pure timetable metadata (and links to a user where that staff member has an
  account).
- An **admin role** provisions teacher accounts, manages the school year/day-shape/rooms (the
  shared scaffolding), and handles leavers. Password reset, lockout and rate-limiting generalise
  the Phase-8 work already done for pupils/TAs.
- **Pupils keep their SEND-friendly login** (class code → name → PIN) but their account is now
  school-wide; a pupil tapping their name belongs to the school, not to one teacher's roster.

## 5. Shared pupils & one login

- The **roster becomes school-wide**. A pupil is enrolled (via `enrolments`) in the classes of
  potentially several teachers/subjects. `/me` resolves *all* of a pupil's lessons across teachers
  for the current slot, not just one teacher's.
- **De-duplication** is the migration's hardest data problem: today each teacher's instance has
  its own `pupils` rows, so "Alex Smith" exists N times. Merging instances must match-and-merge
  pupils (with teacher confirmation — never automatic), preserving each pupil's stable `ai_token`
  for redaction continuity.
- A pupil's **answers, levels and feedback** (Phase 8 data) attach to the pupil, but each piece is
  still scoped to the lesson/occurrence that produced it, so a teacher only sees the work from
  *their own* lessons by default — sharing across subjects is the explicit opt-in of §6.

## 6. Cross-subject signal for planning (the powerful, sensitive part)

This is the headline benefit and the headline risk. Done well it lets the whole team teach a pupil
better; done carelessly it's whole-school profiling of vulnerable children.

- **Shareable, opt-in, cohort-safe:** a pupil's **"what works for me" profile** (the Phase-9 idea —
  e.g. "responds well to practical and cards; long typing tasks land poorly"), their **preferred
  differentiation level**, and **activity preferences** — useful to every teacher, low
  safeguarding weight. Sharing is **off by default**, switched on per-pupil (or per-school policy)
  with a clear record of who can see what.
- **Never shared across subjects automatically:** raw lesson notes, anything **safeguarding-
  flagged** (withheld from AI *and* not cross-shared), behaviour incidents, and any free text that
  names or characterises an individual. These stay with the owning teacher.
- **The AI angle:** when cross-subject signal informs an AI planning call, it goes through the one
  wrapper exactly as today — names tokenised, safeguarding withheld, audited. Sharing changes
  *who can read* a profile in the UI; it never changes the egress rules.
- This feature is the main reason the DPIA (§9) is a fresh whole-school assessment: it is
  **profiling of children across contexts**, which needs explicit consideration, likely a
  lawful-basis decision, and probably a parental-information step.

## 7. The AI boundary at school scale

- **The boundary keeps its shape.** Redaction / safeguarding-withholding / egress-assert / audit
  stay in the one wrapper, *above* the provider call. The only change: the redaction roster becomes
  **school-wide** (every pupil's name is tokenised, not just one teacher's), so a name from another
  teacher's class typed anywhere is still caught. The "no pupil name to AI" rule holds unchanged.
- **Per-teacher spend caps + audit attribution:** `ai_calls` gains the acting user, so spend and
  the redaction-evidence trail are attributable per teacher; the monthly cap can be per-teacher
  and/or per-school.
- Multi-provider selection (the other future item in [ROADMAP.md](ROADMAP.md)) is orthogonal and
  composes cleanly — the adapter sits below the same school-wide boundary.

## 8. Authorization / RBAC — the big build

- A small, central **authorization layer**: given (userId, role) and a target resource, may they
  read / write it? Owned resources → owner or an explicitly-shared grantee or admin. Shared
  resources (pupils, year, rooms) → any teacher, scoped by their enrolments where relevant.
- **Deny-by-default**, applied as a preHandler on every route — generalising the Phase-8 lockdown
  hook from "role allowlist" to "role + ownership". Every existing query that currently assumes
  "the teacher owns everything" gets a `WHERE owner_id = $me` (or a shared-resource exception).
- Teachers can **share** a scheme/resource with a colleague (read or copy) — this is how
  departments reuse curriculum, and it's modelled explicitly rather than via global visibility.

## 9. DPIA — fresh, whole-school (hard gate)

The current [DPIA.md](DPIA.md) is scoped to one teacher's planning record. Multi-teacher needs a
**new DPIA**, because the processing materially expands:

- **Data subjects & volume:** the whole school's pupils, plus several staff users.
- **Controllers/processors:** the school is controller; multiple staff are users; the data-sharing
  between staff is itself a processing activity to assess.
- **Profiling:** cross-subject "what works for me" sharing is profiling of children — assess
  necessity/proportionality, lawful basis, and whether pupils/parents must be informed or consent.
- **Access control as a safeguard:** RBAC, least-privilege defaults, and a who-saw-what audit
  become DPIA-relevant controls, not just engineering niceties.
- **Retention & leavers** across subjects and teachers; subject-access across the merged record.

This DPIA must be signed before *any* real multi-teacher pupil data exists — the same
gate-in-code pattern as Phase 8's master switch would enforce it.

## 10. Migration from single-teacher instances

A one-time, carefully-reviewed consolidation:

1. **Export** each teacher's instance (the `export-year` machinery is a starting point).
2. **Create the school + teacher users**; assign each instance's owned data to its teacher.
3. **Merge shared scaffolding** (academic years, terms, day shape, rooms) into one school set,
   reconciling differences with the teachers.
4. **De-duplicate pupils** across instances (teacher-confirmed matches; preserve `ai_token`s).
5. **Re-point enrolments / lessons / resources** at the merged pupils and the owning teachers.
6. Run with the old instances still available read-only until the shared server is trusted.

This is bespoke, run once, and must be reversible until verified — not a routine migration.

## 11. Suggested internal build order (when the gates open)

A — Accounts & sessions (users table; per-user login; admin role; fold in ta_accounts/pupil_credentials).
B — Ownership columns + the school/tenant row; backfill the single teacher as owner.
C — The central RBAC layer + deny-by-default preHandler; scope every query.
D — School-wide roster + redaction over it; per-user AI audit/caps.
E — One-login shared pupils; `/me` across teachers; pupil de-dup tooling.
F — Cross-subject sharing (opt-in profiles), behind the signed DPIA.
G — The consolidation/migration tool (§10).

Each is independently reviewable; A–C are the load-bearing rearchitecture, D–F the new value, G the
one-time move.

## 12. Risks & why this waits

- **Scope:** touches auth, data model and the authorization of ~every route — roughly half the
  codebase. High regression risk to a tool that, by then, teachers depend on daily.
- **Safeguarding/DP gravity:** whole-school children's data + cross-subject profiling is a serious
  step; the DPIA and access model must lead, not follow.
- **Don't destabilise the working tool:** the single-teacher app is the proven, valuable thing.
  This v2 is only worth starting once that's rock-solid and the school actually wants the shared
  model — hence **unnumbered and gated**.

## 13. Explicitly out of scope (for this future phase, until decided)

- Internet exposure / access from home (still LAN-only unless the school's infrastructure and a
  fresh DPIA say otherwise).
- Parent/guardian accounts; formal gradebooks or MIS write-back.
- Cross-*school* anything (one school, one server).
- Real-time collaboration on the same lesson/resource.
