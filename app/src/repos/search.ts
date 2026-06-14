// Phase 10.19 — global search ("the missing front door"). Plain ILIKE across the things the teacher
// hunts for daily; teacher-only (no AI, pure SQL). Each hit carries a deep link. Safeguarding-flagged
// notes still appear here (it's the teacher's own surface) — they're only ever withheld from AI.
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

export async function searchEverything(query: string): Promise<SearchResults> {
  const q = query.trim();
  if (q.length < 2) return { hits: [], total: 0 };
  const like = '%' + q.replace(/[%_\\]/g, '\\$&') + '%'; // escape ILIKE wildcards

  // One small query per source, capped — combined + ordered by type for a tidy dropdown.
  const [notes, tasks, captured, events, plans, resources, pupils] = await Promise.all([
    pool.query<{ id: number; body: string }>(`SELECT id, body FROM notes WHERE kind <> 'captured' AND body ILIKE $1 ORDER BY updated_at DESC LIMIT ${PER_TYPE}`, [like]),
    pool.query<{ id: number; title: string; status: string }>(`SELECT id, title, status FROM tasks WHERE title ILIKE $1 ORDER BY created_at DESC LIMIT ${PER_TYPE}`, [like]),
    pool.query<{ id: number; body: string }>(`SELECT id, body FROM notes WHERE kind = 'captured' AND body ILIKE $1 ORDER BY created_at DESC LIMIT ${PER_TYPE}`, [like]),
    pool.query<{ id: number; title: string; kind: string }>(`SELECT id, title, kind FROM events WHERE title ILIKE $1 OR detail ILIKE $1 ORDER BY COALESCE(date, '9999-12-31') DESC LIMIT ${PER_TYPE}`, [like]),
    pool.query<{ id: number; title: string }>(`SELECT id, title FROM lesson_plans WHERE title ILIKE $1 OR objectives ILIKE $1 ORDER BY id DESC LIMIT ${PER_TYPE}`, [like]),
    pool.query<{ id: number; title: string; kind: string }>(`SELECT id, title, kind FROM resources WHERE title ILIKE $1 ORDER BY id DESC LIMIT ${PER_TYPE}`, [like]),
    pool.query<{ id: number; display_name: string }>(`SELECT id, display_name FROM pupils WHERE display_name ILIKE $1 ORDER BY display_name LIMIT ${PER_TYPE}`, [like]),
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
    ...pupils.rows.map((r) => ({ type: 'Pupil', label: r.display_name, sub: null, href: '/pupils' })),
  ];
  return { hits, total: hits.length };
}
