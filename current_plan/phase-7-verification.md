# Phase 7 — Test matrix + privacy guards + e2e + end-to-end verification

**Goal:** harden the whole feature. Pull the per-phase tests into a coherent **matrix**, add the cross-cutting
**privacy guards** that prove the non-negotiables hold across the subsystem (not just per phase), add a
**full-lifecycle e2e** (generate → assign → take → mark → release → results), update the docs (DPIA / privacy
/ phase plan / CHANGELOG), and do a final manual eyeball. No new feature surface — this phase is confidence.

## Outcome

A green, documented, privacy-proven assessment subsystem: unit + integration + e2e all pass; explicit tests
fail loudly if a pupil name could ever reach AI, if safeguarding content isn't withheld, if a pupil could see
unconfirmed/unreleased marks or an answer key, or if `is_test` data leaks into cohort analytics.

## 1. Test matrix (audit coverage across phases)

Confirm each row has a real test; fill any gap.

| Concern | Layer | Test |
|---------|-------|------|
| Tree assembly / scoring / objective attribution | pure | `assessmentService.test.ts` (exists) |
| Blueprint covered/uncovered + style mapping | pure | Phase 1 |
| Generation validator (clamp/normalise/drop) | pure | Phase 1 |
| Generation degrade writes nothing | integration | Phase 1 |
| Assign window validation + eligibility/dedup | pure + integration | Phase 2 |
| Take projection is PII-safe (no answer key) | pure | Phase 3 |
| Take lifecycle (start idempotent / save / submit guard) | integration | Phase 3 |
| Objective marking + slot-batch completeness + gate/guard | pure | Phase 4 |
| Marking lifecycle + confirm-skips-review + spec-point cache | integration | Phase 4 |
| Marking degrade writes nothing / re-arms | integration | Phase 4 |
| Pupil-visibility gate (confirmed + released) | pure | Phase 5 |
| Analytics excludes `is_test` + release flow | integration | Phase 5 |
| `paths` guard + builder oracle | unit | Phase 6 |
| Gallery renders every view (no DB) | e2e | Phase 6 |
| Full lifecycle | e2e | this phase |

## 2. Cross-cutting privacy guards (subsystem-level — add here)

These assert the **non-negotiables** hold across *every* assessment AI call, independent of any one phase's
implementation. Put them in `tests/assessmentPrivacy.test.ts` (pure) + an integration variant.

1. **No pupil name to AI — generation:** for a blueprint that (artificially) includes a roster name in the
   unit/spec data, assert the assembled request would be **blocked** by the wrapper's `containsRosterName`
   egress assert (or that names redact to tokens). Generation carries no pupil identity by construction —
   pin that the call shape routes all inputs through `context[]`.
2. **No pupil name to AI — marking:** build a marking batch where a pupil writes their own name in an answer;
   assert it redacts to a token before egress (the wrapper does this; the test pins that marking uses
   `context[]` + anonymous slots, never `system`, and the slot→answer map is server-side only).
3. **Safeguarding withheld entirely:** an answer tripping `guardMatch` is **never** placed in the AI
   `context[]` and is stored `disclosure=true, needs_review=true` — assert both (it must not appear in any
   request payload and must surface in the safeguarding register).
4. **Inputs never in `system`:** scan every assessment prompt module — `system` strings are constants with no
   spec/answer/pupil data; all variable inputs come from the `Items()`/`Instruction()` builders fed to
   `context[]`/`instruction`.
5. **`is_test` isolation:** cohort/analytics reads filter `WHERE NOT is_test`; test attempts never AI-marked;
   `wipeTestAttempts` clears them. (Integration: seed a test attempt, run cohort reads, assert exclusion.)
6. **Tests never hit the real provider:** confirm the integration config forces an empty key for every new
   suite (inherited, but assert no new suite bypasses it).
7. **Answer key never to pupils:** the take projection + pupil results contain no mark-points/model
   answers/correctness for unconfirmed work (re-assert at the subsystem level, incl. the rendered HTML).

## 3. Full-lifecycle e2e (Playwright)

One spec driving the **whole** path against the dev stack with **AI off** (so it's deterministic) — exercise
the structure, not the AI quality:
1. Seed (or fixture) a unit + class + a **ready** assessment (use the repo `materialiseAssessment` directly to
   avoid depending on a live generation), assign it to the test class with `instant` results.
2. As the **test pupil**: list → start → answer every part → submit → see "awaiting marking".
3. As the **teacher**: objective parts are auto-marked; manually mark/confirm; (open parts stay unmarked with
   AI off — assert they're left for the teacher, not silently zeroed).
4. Release → as the pupil, see confirmed results; assert **no** mark-points/model answers anywhere.
5. Assert the take + results pages never expose the answer key; assert `is_test` data doesn't appear in cohort.

Plus a **live-AI throwaway smoke** (`app/scripts/X-smoke.ts`, self-cleaning, deleted after) that runs one real
generation + one real marking batch end-to-end to confirm the prompts/schemas work against the provider — kept
out of the automated suite (which must never call the provider).

## 4. Docs to update (durable record)

- `docs/PHASE_5_PLAN.md` / build status + `CHANGELOG.md` — mark the assessment phases done.
- `docs/SECURITY_AND_PRIVACY.md` + `docs/DPIA.md` — add the assessment subsystem: what PII it stores
  (`assessment_answers` free text), that marking sends only **redacted, slot-lettered** answers, safeguarding
  withholding, `is_test` partition, and the pupil-visibility gate.
- Update [docs/HANDOVER_2026-06-26.md](../docs/HANDOVER_2026-06-26.md) Part B status (Phases 1–7 → done) or
  write a fresh handover; then this `current_plan/` folder can be retired.

## 5. Final manual eyeball (before any push)

- Generate a paper for a real-ish class; sanity-check question quality + spec-point tagging.
- Walk the cockpit-adjacent screens the feature touches (Schemes spine panel, marking modal, results) and the
  pupil take-flow in a real browser.
- Confirm boot logs show migrations `0063/0064` applied then "up to date"; confirm the mark-queue sweeper
  logs on boot.
- Re-run the **whole** gate (typecheck · unit · integration · Playwright) one last time.

## Definition of done

- [ ] Every matrix row has a passing test; no coverage gaps.
- [ ] All 7 cross-cutting privacy guards pass and **fail loudly** when the property is violated (verify by
      temporarily breaking one, then reverting).
- [ ] Full-lifecycle e2e green with AI off; the live-AI smoke confirms prompts/schemas, then is deleted.
- [ ] DPIA / privacy / changelog / handover updated.
- [ ] Final manual eyeball done; whole gate green. **Do not push/merge unattended** — hand back to the teacher
      to commit (per `CLAUDE.md`).

## Standing risks to watch

- AI generation quality vs the strict validator — if too many questions get dropped, loosen the schema or
  improve the prompt, not the invariants.
- Structured-widget answer encoding consistency between Phase 3 (write) and Phase 4 (objective read).
- Cap/cost: a full-paper generation on Opus is the priciest call in the app — keep the `estimatedCostPence`
  pre-reservation honest so it can't overshoot the monthly cap.
