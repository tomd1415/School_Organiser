# Operations and deployment specification

## 1. Production topology

```text
School LAN clients
  → Caddy :443/:80 (TLS, real-IP overwrite, headers)
      → app internal :44360
          → PostgreSQL internal :5432
          → resource volume
          → Gotenberg internal (optional document conversion)
          → outbound Anthropic HTTPS / configured IMAP only
```

Do not expose PostgreSQL or the direct app port to the LAN. Loopback publication for local admin tools is acceptable. The app is not internet-facing.

## 2. Configuration

Required production configuration:

- environment, host/port, school timezone;
- database URL with non-default random password;
- 32-byte session key;
- secure-cookie and trusted-proxy settings;
- resource volume path;
- backup encryption recipient/key reference;
- optional environment-managed AI and IMAP secrets;
- upload/job/idle timeout limits.

Validate all configuration at startup and fail with a safe actionable message. Never silently use development secrets in production.

## 3. Containers and persistence

- App image built from lockfile using production dependencies only.
- Run as non-root with read-only application filesystem where practical.
- PostgreSQL data and resource store are separate persistent volumes.
- Temporary upload/export directories are bounded and cleaned.
- Health checks distinguish live process from ready DB/storage.
- Restart policy returns service after power loss.
- Pin compatible major versions and document upgrade order.

## 4. Database startup

On app start:

1. validate production safety;
2. connect to DB;
3. acquire migration advisory lock;
4. apply ordered forward-only migrations transactionally where possible;
5. verify resource volume writable/readable;
6. start HTTP listener;
7. start leased job worker.

Do not let every app replica run independent interval jobs. The lease system makes accidental multiple workers safe.

## 5. Backup set

A backup stamp contains:

- encrypted PostgreSQL dump;
- encrypted or securely archived resource-volume snapshot;
- manifest with stamp, schema/app version, filenames, sizes, SHA-256 checksums, record counts, created time;
- manifest published last to mark completeness.

Refuse plaintext backups. Prune by complete backup set, never independent files. Backups contain pupil data and receive the same access controls/retention as production.

## 6. Verification

Automated verification of newest complete set:

1. validate manifest and checksums;
2. decrypt to protected temporary area;
3. restore DB into scratch database;
4. unpack resource snapshot into scratch directory;
5. run schema/integrity queries;
6. verify sampled/all referenced storage paths and checksums according to cost;
7. report success/failure and update `backup_last_verified` only on success;
8. destroy scratch data safely.

## 7. Restore

Restore is destructive and requires explicit typed confirmation or `FORCE` in a controlled script.

1. Verify the selected complete set before stopping live service.
2. Stop app/jobs.
3. Take a final emergency snapshot if possible.
4. Drop/recreate target database; do not overlay a populated schema.
5. Replace—not merge—the resource volume from the matching set.
6. Restore DB and verify migrations/schema.
7. Run DB↔file integrity check.
8. Start app and run smoke tests.
9. Record drill/restore result.

At least monthly, execute on a throwaway isolated copy. A script existing is not proof of recoverability.

## 8. Upgrade

1. Read release notes/migration/backup compatibility.
2. Create and verify pre-upgrade backup.
3. Pull/build image using locked dependencies.
4. Stop or place app in maintenance/read-only mode if migration requires.
5. Start new version; migrations run under lock.
6. Smoke health, teacher login, Now, current lesson, resource download, pupil gate, and job worker.
7. Monitor logs/jobs/storage.

Rollback procedure must state whether old code can read the new schema. If not, restore the pre-upgrade matched backup rather than simply running the old image.

## 9. Monitoring and alerting

Minimum operator signals:

- app readiness/liveness and restart count;
- DB connectivity/pool saturation and disk usage;
- resource volume availability/disk usage;
- failed/overdue jobs and file deletions;
- last successful email poll, backup, verification, and review sweep;
- AI spend/cap/reserved rows and repeated gateway errors;
- rate-limit spikes and repeated failed auth, without logging secrets;
- response latency and 5xx/save-failure rate.

The single-teacher app does not need a large observability platform. Structured logs plus a concise Settings/Operations status card and system monitoring are sufficient.

## 10. Log policy

Log: timestamp, severity, correlation ID, route/job, actor role (not pupil name), object type/id where safe, status, latency, query count, byte count, safe error class.

Never log: passwords/PINs/hashes, session/device tokens, cookies, API/mail secrets, pupil answer/note bodies, safeguarding content, unredacted AI prompt, full email body, or file content.

Set retention and access under school policy. AI audit is application data, separate from operational logs.

## 11. Security maintenance

- Production dependency audit in CI/release.
- OS/container security updates on documented cadence.
- Rotate session/DB/backup/API/mail secrets with impact procedure.
- Review Caddy certificate trust on managed school devices.
- Review DPIA termly and before new pupil/AI/integration scope.
- Revoke leavers/TA accounts and expire remembered devices at rollover.
- Review storage/retention and disposal queue.

## 12. Incident procedures

### Suspected pupil data exposure

Stop affected access/egress, preserve logs/audit, notify school DPO/SLT through school process, determine data/source/recipients/time, rotate affected secrets, remediate, document. Do not use the app as the formal incident system.

### AI redaction control failure

Immediately disable AI master switch and key, preserve redacted/unredacted local evidence securely, inspect gateway/audit/provider traffic, notify DPO, fix and regression-test before re-enabling. Core app remains operational.

### Resource volume failure

Make writes visibly fail, do not create false DB success, stop destructive cleanup, restore matched DB+files if needed.

### Database failure

Stop writes/jobs, diagnose disk/service, restore only from verified matched set, run integrity/smoke checks.

## 13. Production acceptance checklist

- TLS works on managed desktop/laptop/pupil devices.
- Only proxy ports are LAN reachable.
- Real client IP reaches rate limiter safely.
- Production defaults refused.
- Resource and DB volumes persist through restart.
- Current-year setup and teacher login complete.
- Pupil and marks gates default off until approval.
- AI off path works; optional key configured safely.
- Backup, verification, and isolated restore pass.
- Idle logout and session revocation pass.
- Logs contain no forbidden data in sampled failure scenarios.
- Operator knows upgrade, rollback, restore, and AI-disable procedures.

