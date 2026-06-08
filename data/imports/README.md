# data/imports

Drop-zone for things to import into the app:

- **Forwarded emails** (`.eml`) to be turned into tasks (see ARCHITECTURE "Email intake").
- **Class lists / rosters** (CSV exports from the MIS) for pupil import (Phase 2).
- **Existing planning** exports to seed courses / schemes of work (Phase 3).

Nothing here is loaded automatically yet; import scripts land in `scripts/` during build.
Contents may contain pupil data — this folder is git-ignored except for this README.
