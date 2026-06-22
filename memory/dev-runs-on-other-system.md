---
name: dev-runs-on-other-system
description: This Windows machine lacks the dev stack (Node, Postgres); building/running/testing happens on a different system
metadata:
  type: project
---

The machine this repo is edited on (Windows, `c:\Users\TomDuguidEGS\OneDrive - ...\orgniser`) does **not** have the development software installed — `node` is not on PATH (in Bash or PowerShell), and Postgres isn't available either. The app (Fastify + pgvector, run via Docker Compose) is built, run, and tested on a **different system**.

**Why:** Confirmed 2026-06-22 — `node --check` failed with "command not found" here; the user said "this is not the system with all the software installed."

**How to apply:** Don't try to `npm install`/run the app/tests or `node` here — edits only. Anything needing runtime verification (e.g. browser-JS bugs, integration tests) has to be done on the other system. Static checks (reading code, `tsc` reasoning) are fine to do here, but can't be executed.
