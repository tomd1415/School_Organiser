# Computing pedagogy

The AI planning in School_Organiser is grounded in the **National Centre for Computing Education
(NCCE) "12 Principles of Computing Pedagogy"** — the evidence-based practices the teacher uses day to
day. Source: <https://teachcomputing.org/pedagogy>.

## Single source of truth

The principles live **once**, in [`app/src/llm/prompts/pedagogy.ts`](../app/src/llm/prompts/pedagogy.ts):

- `PEDAGOGY_PRINCIPLES` — the twelve, as structured data (name + one-line summary). Rendered by the
  read-only **/pedagogy** page so what the teacher reads can never drift from what the AI is told.
- `PEDAGOGY_GUIDANCE` — a compact, actionable appendix that is concatenated onto the **system prompt**
  of the content-generating AI features, so generated material reflects the principles.
- `PEDAGOGY_VERSION` (`ncce_pedagogy@1`) — bump when the wording changes.

It is static guidance with **no pupil data**, so it lives in the system string (the privacy rules in
[SECURITY_AND_PRIVACY.md](SECURITY_AND_PRIVACY.md) govern the `context[]` inputs, not this).

## Where it is applied

`PEDAGOGY_GUIDANCE` is appended to these prompt system strings (each prompt's `@version` was bumped so
the change is traceable on every `ai_calls` row):

| Feature | Prompt module |
|---|---|
| Author a scheme of work | `authorScheme.ts` |
| Draft the next lesson | `draftLesson.ts` |
| Adapt a lesson for a class | `adaptLesson.ts` |
| Generate a lesson's resource set (slides / worksheet / answers) | `lessonResources.ts` |
| Generate a one-off resource | `generateResource.ts` |
| Retrieval-practice starter | `retrievalStarter.ts` |
| Improve the master lesson | `improveMaster.ts` |

The guidance tells the model to **apply the principles that fit** the topic and age group rather than
forcing all twelve into one lesson.

## The 12 principles

1. **Lead with concepts** — key concepts and vocabulary; glossaries, concept maps, displays; regular recall and revision.
2. **Work together** — pair programming, peer instruction and structured group tasks.
3. **Get hands-on** — physical computing and making for a concrete, engaging context.
4. **Unplug, unpack, repack** — semantic waves: explore unplugged/familiar, then repack into the concept.
5. **Model everything** — worked examples and live coding (debugging, conversions, …).
6. **Foster program comprehension** — tracing, debugging, Parson's Problems.
7. **Create projects** — project-based learning evaluated against criteria.
8. **Add variety** — tasks from highly structured to open and exploratory.
9. **Challenge misconceptions** — formative questioning, adapt on the spot.
10. **Make concrete** — real-world contexts and links to other subjects.
11. **Structure lessons** — PRIMM (Predict, Run, Investigate, Modify, Make) and Use–Modify–Create.
12. **Read and explore code first** — reading before writing when teaching programming.

## Updating

Edit `PEDAGOGY_PRINCIPLES` / `PEDAGOGY_GUIDANCE` in the module, bump `PEDAGOGY_VERSION`, and (if a
principle's wording changes materially) bump the affected prompt `@version`s. The /pedagogy page and
this table update from the module automatically; keep the prose list above in step by hand.
