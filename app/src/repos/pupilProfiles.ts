// Phase 9.8 — the per-pupil "what works for me" profile (pupil-keyed: the cross-subject bridge,
// PHASE_9_PLAN §13). The digest is AI-written from the pupil's own feedback + marks history; no
// pupil name is in it (it goes through the wrapper, and the inputs are activity chips/ratings/
// percentages, not free text about a person).
import { pool } from '../db/pool';

export async function getProfile(pupilId: number): Promise<{ digest: string; updatedAt: string } | null> {
  const { rows } = await pool.query<{ digest: string; updatedAt: string }>(
    `SELECT digest, to_char(updated_at, 'YYYY-MM-DD') AS "updatedAt" FROM pupil_profiles WHERE pupil_id = $1`,
    [pupilId],
  );
  return rows[0] ?? null;
}

export async function setProfile(pupilId: number, digest: string): Promise<void> {
  await pool.query(
    `INSERT INTO pupil_profiles (pupil_id, digest, updated_at) VALUES ($1, $2, now())
     ON CONFLICT (pupil_id) DO UPDATE SET digest = EXCLUDED.digest, updated_at = now()`,
    [pupilId, digest],
  );
}

export interface ProfileInputs {
  liked: Array<[string, number]>;
  disliked: Array<[string, number]>;
  ratings: number[];
  markPercents: number[]; // recent lesson mark percentages
}

/** The pupil's feedback + marks history that feed the digest (no names anywhere). */
export async function profileInputs(pupilId: number): Promise<ProfileInputs> {
  const fb = await pool.query<{ liked: string; disliked: string; rating: number | null }>(
    `SELECT liked, disliked, rating FROM pupil_lesson_feedback WHERE pupil_id = $1 ORDER BY updated_at DESC LIMIT 20`,
    [pupilId],
  );
  const tally = (xs: string[]): Map<string, number> => {
    const m = new Map<string, number>();
    for (const x of xs) m.set(x, (m.get(x) ?? 0) + 1);
    return m;
  };
  const likedAll: string[] = [];
  const dislikedAll: string[] = [];
  const ratings: number[] = [];
  for (const r of fb.rows) {
    for (const c of r.liked.split(',').map((s) => s.trim()).filter(Boolean)) likedAll.push(c);
    for (const c of r.disliked.split(',').map((s) => s.trim()).filter(Boolean)) dislikedAll.push(c);
    if (r.rating != null) ratings.push(r.rating);
  }
  const top = (m: Map<string, number>): Array<[string, number]> => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);

  // Recent mark percentages per lesson (confirmed marks only), newest first.
  const marks = await pool.query<{ pct: number }>(
    `SELECT (100.0 * sum(m.marks_awarded) / NULLIF(sum(m.marks_total), 0))::int AS pct
     FROM pupil_marks m JOIN pupil_answers a ON a.id = m.pupil_answer_id
     WHERE a.pupil_id = $1 AND m.status = 'confirmed'
     GROUP BY a.occurrence_course_id ORDER BY max(m.updated_at) DESC LIMIT 6`,
    [pupilId],
  );
  return {
    liked: top(tally(likedAll)),
    disliked: top(tally(dislikedAll)),
    ratings,
    markPercents: marks.rows.map((r) => r.pct).filter((p): p is number => p != null),
  };
}
