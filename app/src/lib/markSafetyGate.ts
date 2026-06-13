// Phase 9.3 — the safety gate + content guard (adapted from the exam_questions design).
//  • Guard patterns screen pupil answers BEFORE they're sent to the AI: a match means that answer
//    is withheld from the AI entirely and surfaced to the teacher ("needs your eyes") — a worksheet
//    answer is a plausible safeguarding disclosure channel, so it's treated like one.
//  • The safety gate flags an AI mark for teacher review when it can't be trusted: low confidence,
//    a hallucinated evidence quote (not actually in the answer), or marks clipped to the total.
// Both are pure functions, proven by tests.

// Substring patterns (case-insensitive) — deliberately broad; better a false "needs your eyes"
// than a missed disclosure. Teacher-editable later; constant for now.
export const GUARD_PATTERNS: string[] = [
  'kill', 'hurt myself', 'hurt me', 'self harm', 'self-harm', 'suicide', 'abuse', 'hit me',
  'touched me', 'scared at home', 'not safe', 'starving', "won't eat", 'run away', 'hate myself',
  'ignore previous', 'ignore the above', 'system prompt', 'disregard your instructions',
];

/** Does this answer trip a guard pattern? (→ withhold from AI, route to "needs your eyes".) */
export function guardMatch(answer: string, patterns: string[] = GUARD_PATTERNS): string | null {
  const a = (answer ?? '').toLowerCase();
  for (const p of patterns) {
    if (p && a.includes(p.toLowerCase())) return p;
  }
  return null;
}

export interface GateInput {
  answer: string;
  marksAwarded: number;
  marksTotal: number;
  evidence: string;
  confidence: number;
}

export interface GateVerdict {
  marksAwarded: number; // clamped to [0, marksTotal]
  needsReview: boolean;
  reasons: string[];
}

export const CONFIDENCE_FLOOR = 0.6;

/** Decide whether an AI mark can stand or needs the teacher's eyes. Never throws; always returns a
 *  usable (clamped) mark plus the reasons it was flagged. */
export function gateMark(input: GateInput): GateVerdict {
  const reasons: string[] = [];
  let marks = input.marksAwarded;

  // A non-finite mark (NaN/±∞ from a malformed AI number) would slip past the >total / <0 clamps
  // below (both comparisons are false for NaN) and get stored as-is. Force it to 0 and flag.
  if (!Number.isFinite(marks)) {
    reasons.push('invalid mark → 0');
    marks = 0;
  }
  if (marks > input.marksTotal) {
    reasons.push(`clipped ${marks}→${input.marksTotal}`);
    marks = input.marksTotal;
  }
  if (marks < 0) marks = 0;

  // A non-finite confidence likewise wouldn't trip the floor (NaN < 0.6 is false) — treat as untrusted.
  if (!(input.confidence >= CONFIDENCE_FLOOR)) {
    reasons.push(`low confidence ${Number.isFinite(input.confidence) ? input.confidence.toFixed(2) : '?'}`);
  }
  // Evidence must be a real (case-insensitive) substring of the answer when marks were awarded.
  if (marks > 0) {
    const ev = (input.evidence ?? '').trim().toLowerCase();
    if (ev === '' || !input.answer.toLowerCase().includes(ev)) {
      reasons.push('evidence not found in answer');
    }
  }
  return { marksAwarded: marks, needsReview: reasons.length > 0, reasons };
}
