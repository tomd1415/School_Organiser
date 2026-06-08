# scripts

Operational helpers, added as phases land:

- `backup.sh` / `restore.sh` — nightly `pg_dump` + tested restore (Phase 0).
- `import-eml.*` — ingest `data/imports/*.eml` into tasks (Phase 2, optional).
- `import-roster.*` — load class-list CSVs into pupils/enrolments (Phase 2).

See [../docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md) for deployment and backup detail.
