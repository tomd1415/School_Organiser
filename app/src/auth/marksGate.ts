// Phase 9.0 — the DPIA-addendum gate. Auto-marking stores per-pupil attainment, sends anonymised
// answer text to the AI for marking, and (9.6) issues a remembered-device credential. All of that
// is OFF until the teacher enables it in Settings, which requires acknowledging the DPIA addendum
// (DPO/SLT sign-off) — mirroring the pupil-access master switch. Cached briefly; invalidated the
// instant the setting changes so disabling it takes effect at once.
import { getSetting } from '../repos/settings';

let cfg = { on: false, at: 0 };

export async function marksEnabled(): Promise<boolean> {
  if (Date.now() - cfg.at > 30_000) {
    cfg = { on: (await getSetting('pupil_marks_enabled').catch(() => null)) === 'true', at: Date.now() };
  }
  return cfg.on;
}

export function invalidateMarksGate(): void {
  cfg = { ...cfg, at: 0 };
}
