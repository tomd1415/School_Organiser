// Phase 10.19 / 12 D3 — global search ("the missing front door"). RANKED FULL-TEXT search (Postgres
// tsvector) over the things the teacher hunts for daily: stemming (teach/teaching/taught all match),
// relevance ranking, multi-word AND and as-you-type prefix matching, with an ILIKE fallback so a
// substring or symbol query ("micro:bit") never loses recall. Teacher-only, pure local SQL (no AI), so
// the no-name-to-AI invariant holds. Each hit carries a deep link. Safeguarding-flagged notes still
// appear here (the teacher's own surface) — they're only ever withheld from AI.
import { pool } from '../db/pool';

export interface SearchHit {
  type: string;
  label: string;
  sub: string | null;
  href: string;
}

export interface SearchResults {
  hits: SearchHit[];
  total: number;
}

const PER_TYPE = 6;

// Expression strings MUST match the GIN indexes in migration 0041 exactly, or the index won't be used.
const EXPR = {
  notes: 'body',
  tasks: 'title',
  events: "coalesce(title, '') || ' ' || coalesce(detail, '')",
  plans: "coalesce(title, '') || ' ' || coalesce(objectives, '') || ' ' || coalesce(outline, '')",
  resources: 'title',
};

/** A safe prefix tsquery from the user's words: "netw card" → "netw:* & card:*" (each word a stemmed
 *  prefix, ANDed). Non-alphanumerics are stripped so the query can never be a tsquery-syntax injection;
 *  '' when there are no usable words (then we fall back to ILIKE only). */
function prefixQuery(q: string): string {
  return q
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.replace(/[^\p{L}\p{N}]+/gu, ''))
    .filter(Boolean)
    .map((t) => `${t}:*`)
    .join(' & ');
}

export async function searchEverything(query: string): Promise<SearchResults> {
  const q = query.trim();
  if (q.length < 2) return { hits: [], total: 0 };
  const like = '%' + q.replace(/[%_\\]/g, '\\$&') + '%'; // escape ILIKE wildcards
  const tsq = prefixQuery(q);
  const useFts = tsq.length > 0;
  const params: unknown[] = useFts ? [like, tsq] : [like];

  // For one source's column expression: a hybrid WHERE (FTS OR substring) + an FTS rank for ordering.
  const where = (expr: string): string =>
    useFts ? `(to_tsvector('english', ${expr}) @@ to_tsquery('english', $2) OR ${expr} ILIKE $1)` : `${expr} ILIKE $1`;
  const rank = (expr: string): string => (useFts ? `ts_rank(to_tsvector('english', ${expr}), to_tsquery('english', $2))` : '0');

  // One small query per source, ranked by relevance then recency, capped — combined for a tidy dropdown.
  const [notes, tasks, captured, events, plans, resources, pupils] = await Promise.all([
    pool.query<{ id: number; body: string }>(
      `SELECT id, body FROM notes WHERE kind <> 'captured' AND ${where(EXPR.notes)} ORDER BY ${rank(EXPR.notes)} DESC, updated_at DESC LIMIT ${PER_TYPE}`,
      params,
    ),
    pool.query<{ id: number; title: string; status: string }>(
      `SELECT id, title, status FROM tasks WHERE ${where(EXPR.tasks)} ORDER BY ${rank(EXPR.tasks)} DESC, created_at DESC LIMIT ${PER_TYPE}`,
      params,
    ),
    pool.query<{ id: number; body: string }>(
      `SELECT id, body FROM notes WHERE kind = 'captured' AND ${where(EXPR.notes)} ORDER BY ${rank(EXPR.notes)} DESC, created_at DESC LIMIT ${PER_TYPE}`,
      params,
    ),
    pool.query<{ id: number; title: string; kind: string }>(
      `SELECT id, title, kind FROM events WHERE ${where(EXPR.events)} ORDER BY ${rank(EXPR.events)} DESC, COALESCE(date, '9999-12-31') DESC LIMIT ${PER_TYPE}`,
      params,
    ),
    pool.query<{ id: number; title: string }>(
      `SELECT id, title FROM lesson_plans WHERE ${where(EXPR.plans)} ORDER BY ${rank(EXPR.plans)} DESC, id DESC LIMIT ${PER_TYPE}`,
      params,
    ),
    pool.query<{ id: number; title: string; kind: string }>(
      `SELECT id, title, kind FROM resources WHERE ${where(EXPR.resources)} ORDER BY ${rank(EXPR.resources)} DESC, id DESC LIMIT ${PER_TYPE}`,
      params,
    ),
    // Pupils stay on a plain name match (FTS adds nothing for short proper names).
    pool.query<{ id: number; display_name: string }>(
      `SELECT id, display_name FROM pupils WHERE display_name ILIKE $1 ORDER BY display_name LIMIT ${PER_TYPE}`,
      [like],
    ),
  ]);

  const snip = (s: string): string => {
    const t = s.replace(/\s+/g, ' ').trim();
    return t.length > 70 ? t.slice(0, 67) + '…' : t;
  };
  const hits: SearchHit[] = [
    ...notes.rows.map((r) => ({ type: 'Note', label: snip(r.body) || '(empty note)', sub: null, href: '/notes' })),
    ...tasks.rows.map((r) => ({ type: 'Task', label: r.title, sub: r.status, href: '/tasks' })),
    ...captured.rows.map((r) => ({ type: 'Captured', label: snip(r.body) || '(empty)', sub: null, href: '/captured' })),
    ...events.rows.map((r) => ({ type: 'Event', label: r.title, sub: r.kind, href: '/events' })),
    ...plans.rows.map((r) => ({ type: 'Lesson', label: r.title, sub: null, href: '/schemes' })),
    ...resources.rows.map((r) => ({ type: 'Resource', label: r.title, sub: r.kind, href: `/resources/${r.id}/view` })),
    ...pupils.rows.map((r) => ({ type: 'Pupil', label: r.display_name, sub: null, href: `/pupils/${r.id}` })),
  ];
  return { hits, total: hits.length };
}
