// Phase 11 idea 2 — pace-aware content sizing. From where a class ACTUALLY got to in recent lessons
// (the tracker's progress_step) vs how many steps were planned, decide whether the class reliably
// under-runs, and if so nudge the next lesson SMALLER. Deliberately conservative: the signal is noisy
// (progress_step is often the last-tapped step, sometimes null), so we
//   • need ≥2 valid samples or we say nothing,
//   • only ever flag clear UNDER-running (we can't detect "finished early" from position alone),
//   • speak in a soft band, never a precise %,
//   • and label it a nudge, not a rule.
// Pure + DB-free (planned step counts are passed in); rides context[] like every other input.
import type { RedactableItem } from '../../services/redact';

export interface PaceSample {
  progressStep: number | null; // the step the class reached (null / 0 = no signal)
  plannedSteps: number; // how many steps the lesson outline had
}

export interface PaceResult {
  band: 'over' | 'steady'; // 'over' = consistently doesn't finish; 'steady' = reaches the end
  samples: number;
  meanRatio: number;
}

export function classifyPace(samples: PaceSample[]): PaceResult | null {
  const ratios: number[] = [];
  for (const s of samples) {
    if (s.progressStep == null || s.progressStep <= 0 || s.plannedSteps <= 0) continue; // no signal
    ratios.push(Math.min(s.progressStep / s.plannedSteps, 1.5)); // cap so one odd sample can't dominate
  }
  if (ratios.length < 2) return null; // not enough signal — emit nothing
  const meanRatio = ratios.reduce((a, b) => a + b, 0) / ratios.length;
  return { band: meanRatio < 0.7 ? 'over' : 'steady', samples: ratios.length, meanRatio };
}

/** A cohort sizing directive — ONLY when the class clearly under-runs. Otherwise [] (a no-op). */
export function paceItems(result: PaceResult | null): RedactableItem[] {
  if (!result || result.band !== 'over') return [];
  const strength = result.meanRatio < 0.5 ? 'often gets through only about half of' : 'frequently does not finish';
  return [
    {
      text:
        `CLASS PACE — judging by where this class actually reached in ${result.samples} recent lessons, it ` +
        `${strength} the activities planned for a lesson. Plan FEWER, smaller activities so they can be ` +
        `finished in the available time; keep the same lesson duration, just fit less in. (A rough, ` +
        `cohort-level nudge from the lesson tracker — not a precise measure.)`,
    },
  ];
}
