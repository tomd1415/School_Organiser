// Phase 10.3 — the teacher session's idle-logout minutes, cached briefly so the per-request
// lockdown hook doesn't hit the DB every time. Mirrors auth/pupilAccessCache. The threat model and
// DPIA R3 both claim "session timeout" mitigates the unattended-classroom-laptop risk; until now
// only pupils idled out, so the teacher — the account that sees the most personal data — could sit
// logged in for the full 12h absolute window. Default 30 min; 0 disables. The Settings handler
// calls invalidateTeacherIdle() so a change takes effect at once, not after the TTL.
import { getSetting } from '../repos/settings';

const DEFAULT_MINS = 30;
let cfg = { mins: DEFAULT_MINS, at: 0 };

/** Idle minutes for a teacher session; 0 means "no idle timeout". */
export async function teacherIdleMins(): Promise<number> {
  if (Date.now() - cfg.at > 30_000) {
    const raw = await getSetting('teacher_idle_minutes').catch(() => null);
    const v = Number(raw);
    // A stored '0' is a deliberate "off"; anything missing/invalid falls back to the default.
    cfg = { mins: raw !== null && Number.isFinite(v) && v >= 0 ? v : DEFAULT_MINS, at: Date.now() };
  }
  return cfg.mins;
}

/** Force the next teacherIdleMins() to re-read from the DB (call after changing the setting). */
export function invalidateTeacherIdle(): void {
  cfg = { ...cfg, at: 0 };
}
