// The pupil-access master switch + idle-minutes, cached briefly so the per-request lockdown hook
// doesn't hit the DB every time. The Settings handlers call invalidatePupilCfg() the instant they
// change either value, so the DPIA kill-switch and an idle-timeout change take effect immediately
// (not after the TTL) — "turning pupil access off actually revokes access" must be true at once.
import { getSetting } from '../repos/settings';

let cfg = { idleMins: 20, accessOn: false, at: 0 };

export async function pupilCfg(): Promise<{ idleMins: number; accessOn: boolean }> {
  if (Date.now() - cfg.at > 30_000) {
    const [idle, access] = await Promise.all([
      getSetting('pupil_idle_minutes').catch(() => null),
      getSetting('pupil_access_enabled').catch(() => null),
    ]);
    const v = Number(idle);
    cfg = { idleMins: Number.isFinite(v) && v >= 1 ? v : 20, accessOn: access === 'true', at: Date.now() };
  }
  return { idleMins: cfg.idleMins, accessOn: cfg.accessOn };
}

/** Force the next pupilCfg() to re-read from the DB (call after changing either setting). */
export function invalidatePupilCfg(): void {
  cfg = { ...cfg, at: 0 };
}
