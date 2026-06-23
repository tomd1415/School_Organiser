// SQL for the hosted resource store: resources, their versions, and links.
import { pool } from '../db/pool';
import { relPathFor, removeStored, storeBuffer } from '../lib/resourceStore';
import type { LinkTarget } from '../services/resource';

export interface ResourceRow {
  id: number;
  title: string;
  kind: string;
  mimeType: string | null;
  source: string;
  sourceAttribution: string; // licence/credit line for reused material (e.g. Teach Computing OGL); '' for own work
  unit: string | null; // bulk-import: the unit this resource belongs to (from its Word description)
  yearGroup: string | null; // bulk-import: the year group / key stage of that unit
  versionNo: number | null;
  byteSize: number | null;
  usedCount: number; // lesson plans + units this resource is linked to (where-used)
}

export interface VersionRow {
  id: number;
  versionNo: number;
  storagePath: string;
  byteSize: number | null;
  checksum: string | null;
  changeNote: string | null;
  createdAt: string;
}

export interface LinkedResource {
  resourceId: number;
  title: string;
  kind: string;
  source: string; // 'uploaded' | 'imported' | 'ai_generated' | … — used to group the linked list
}

const RES_COLS = `r.id, r.title, r.kind, r.mime_type AS "mimeType", r.source, r.source_attribution AS "sourceAttribution",
                  r.unit AS "unit", r.year_group AS "yearGroup",
                  v.version_no AS "versionNo", v.byte_size AS "byteSize",
                  (SELECT count(*)::int FROM resource_links rl
                   WHERE rl.resource_id = r.id AND (rl.lesson_plan_id IS NOT NULL OR rl.unit_id IS NOT NULL OR rl.adaptation_id IS NOT NULL)) AS "usedCount"`;

export async function createResource(title: string, kind: string, mimeType: string | null, source: string): Promise<number> {
  const { rows } = await pool.query<{ id: number }>(
    `INSERT INTO resources (title, kind, mime_type, source) VALUES ($1, $2, $3, $4) RETURNING id`,
    [title, kind, mimeType, source],
  );
  const id = rows[0]?.id;
  if (id === undefined) throw new Error('failed to create resource');
  return id;
}

/** Append a version (version_no = max+1) and make it current — atomically. BUG-008: the insert and the
 *  current-pointer update run in ONE transaction, and the resource row is locked `FOR UPDATE` first so
 *  two concurrent appends serialise. Without the lock both read the same max(version_no), and one loses
 *  the UNIQUE(resource_id, version_no) race with a 500 (orphaning its just-staged file); with it the
 *  second caller reads the committed max and gets the next number. (Storage-path uniqueness — so the two
 *  files don't collide on disk — is handled by the random token in relPathFor.) */
export async function addVersion(
  resourceId: number,
  storagePath: string,
  byteSize: number,
  sum: string,
  author: 'teacher' | 'ai',
  changeNote: string | null,
): Promise<number> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`SELECT id FROM resources WHERE id = $1 FOR UPDATE`, [resourceId]);
    const { rows } = await client.query<{ id: number }>(
      `INSERT INTO resource_versions (resource_id, version_no, storage_path, byte_size, checksum, author, change_note)
       VALUES ($1, COALESCE((SELECT max(version_no) + 1 FROM resource_versions WHERE resource_id = $1), 1), $2, $3, $4, $5, $6)
       RETURNING id`,
      [resourceId, storagePath, byteSize, sum, author, changeNote],
    );
    const vid = rows[0]?.id;
    if (vid === undefined) throw new Error('failed to add version');
    await client.query(`UPDATE resources SET current_version_id = $2 WHERE id = $1`, [resourceId, vid]);
    await client.query('COMMIT');
    return vid;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

/**
 * BUG-028 / BUG-008: create a brand-new resource together with its first version, ATOMICALLY. The
 * resource row, its v1 row, the current-version pointer and any unit/year metadata are written in ONE
 * transaction, and the file is staged inside that transaction's success path — so a failure leaves no
 * orphan resource row (the BUG-008 residual: a resource used to be INSERTed a statement before its
 * version) and no orphan file (rolled back, then unlinked). Returns the new resource id. For an APPEND
 * to an existing resource, use addVersion instead.
 */
export async function createResourceWithVersion(
  meta: { title: string; kind: string; mimeType: string | null; source: string; unit?: string | null; yearGroup?: string | null; sourceAttribution?: string | null },
  file: { filename: string; buf: Buffer; checksum: string; author: 'teacher' | 'ai'; changeNote: string | null },
): Promise<number> {
  const client = await pool.connect();
  let rel: string | null = null;
  try {
    await client.query('BEGIN');
    const r = await client.query<{ id: number }>(
      `INSERT INTO resources (title, kind, mime_type, source, unit, year_group, source_attribution) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [meta.title, meta.kind, meta.mimeType, meta.source, meta.unit ?? null, meta.yearGroup ?? null, meta.sourceAttribution ?? ''],
    );
    const id = r.rows[0]!.id;
    rel = relPathFor(id, 1, file.filename);
    const v = await client.query<{ id: number }>(
      `INSERT INTO resource_versions (resource_id, version_no, storage_path, byte_size, checksum, author, change_note)
       VALUES ($1, 1, $2, $3, $4, $5, $6) RETURNING id`,
      [id, rel, file.buf.length, file.checksum, file.author, file.changeNote],
    );
    await client.query(`UPDATE resources SET current_version_id = $2 WHERE id = $1`, [id, v.rows[0]!.id]);
    await storeBuffer(rel, file.buf); // stage the bytes last; a throw here rolls the rows back below
    await client.query('COMMIT');
    return id;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    if (rel) await removeStored(rel).catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

/**
 * BUG-028: append a new version to an EXISTING resource, ATOMICALLY — mirror of createResourceWithVersion
 * but for an append. The version row, the current-version pointer and the staged file all succeed or roll
 * back together (the file is staged inside the transaction's success path; a throw rolls the rows back and
 * unlinks the file), so no path leaves an orphan version row or an orphan file. Returns the new version id.
 */
export async function addVersionWithFile(
  resourceId: number,
  file: { filename: string; buf: Buffer; checksum: string; author: 'teacher' | 'ai'; changeNote: string | null },
): Promise<number> {
  const client = await pool.connect();
  let rel: string | null = null;
  try {
    await client.query('BEGIN');
    await client.query(`SELECT id FROM resources WHERE id = $1 FOR UPDATE`, [resourceId]);
    const next = await client.query<{ n: number }>(
      `SELECT COALESCE(max(version_no) + 1, 1) AS n FROM resource_versions WHERE resource_id = $1`,
      [resourceId],
    );
    const vNo = next.rows[0]!.n;
    rel = relPathFor(resourceId, vNo, file.filename);
    const v = await client.query<{ id: number }>(
      `INSERT INTO resource_versions (resource_id, version_no, storage_path, byte_size, checksum, author, change_note)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [resourceId, vNo, rel, file.buf.length, file.checksum, file.author, file.changeNote],
    );
    await client.query(`UPDATE resources SET current_version_id = $2 WHERE id = $1`, [resourceId, v.rows[0]!.id]);
    await storeBuffer(rel, file.buf); // stage the bytes last; a throw here rolls the rows back below
    await client.query('COMMIT');
    return v.rows[0]!.id;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    if (rel) await removeStored(rel).catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

export async function getResource(id: number): Promise<ResourceRow | null> {
  const { rows } = await pool.query<ResourceRow>(
    `SELECT ${RES_COLS} FROM resources r LEFT JOIN resource_versions v ON v.id = r.current_version_id WHERE r.id = $1`,
    [id],
  );
  return rows[0] ?? null;
}

export interface ResourceQuery {
  q?: string;
  kind?: string;
}

// Build the shared WHERE clause for search/count from an optional title query + kind filter.
function searchWhere(query: ResourceQuery): { clause: string; params: unknown[] } {
  const where = ['r.active'];
  const params: unknown[] = [];
  if (query.q) {
    params.push(`%${query.q}%`);
    // Search the title, and the bulk-import unit / year group, so a unit name finds all its files.
    where.push(`(r.title ILIKE $${params.length} OR r.unit ILIKE $${params.length} OR r.year_group ILIKE $${params.length})`);
  }
  if (query.kind) {
    params.push(query.kind);
    where.push(`r.kind = $${params.length}`);
  }
  return { clause: where.join(' AND '), params };
}

export async function searchResources(query: ResourceQuery, limit: number, offset: number): Promise<ResourceRow[]> {
  const { clause, params } = searchWhere(query);
  params.push(limit, offset);
  const { rows } = await pool.query<ResourceRow>(
    `SELECT ${RES_COLS} FROM resources r LEFT JOIN resource_versions v ON v.id = r.current_version_id
     WHERE ${clause} ORDER BY r.title, r.id LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );
  return rows;
}

export async function countResources(query: ResourceQuery): Promise<number> {
  const { clause, params } = searchWhere(query);
  const { rows } = await pool.query<{ n: number }>(
    `SELECT count(*)::int AS n FROM resources r WHERE ${clause}`,
    params,
  );
  return rows[0]?.n ?? 0;
}

export async function listKinds(): Promise<string[]> {
  const { rows } = await pool.query<{ kind: string }>(
    `SELECT DISTINCT kind FROM resources WHERE active ORDER BY kind`,
  );
  return rows.map((r) => r.kind);
}

export async function getCurrentVersion(resourceId: number): Promise<VersionRow | null> {
  const { rows } = await pool.query<VersionRow>(
    `SELECT v.id, v.version_no AS "versionNo", v.storage_path AS "storagePath", v.byte_size AS "byteSize",
            v.checksum, v.change_note AS "changeNote", to_char(v.created_at, 'YYYY-MM-DD HH24:MI') AS "createdAt"
     FROM resources r JOIN resource_versions v ON v.id = r.current_version_id WHERE r.id = $1`,
    [resourceId],
  );
  return rows[0] ?? null;
}

export async function listVersions(resourceId: number): Promise<VersionRow[]> {
  const { rows } = await pool.query<VersionRow>(
    `SELECT id, version_no AS "versionNo", storage_path AS "storagePath", byte_size AS "byteSize",
            checksum, change_note AS "changeNote", to_char(created_at, 'YYYY-MM-DD HH24:MI') AS "createdAt"
     FROM resource_versions WHERE resource_id = $1 ORDER BY version_no DESC`,
    [resourceId],
  );
  return rows;
}

export async function revertToVersion(resourceId: number, versionId: number): Promise<void> {
  await pool.query(
    `UPDATE resources SET current_version_id = $2
     WHERE id = $1 AND EXISTS (SELECT 1 FROM resource_versions WHERE id = $2 AND resource_id = $1)`,
    [resourceId, versionId],
  );
}

export async function findResourceByChecksum(sum: string): Promise<number | null> {
  const { rows } = await pool.query<{ resource_id: number }>(
    `SELECT resource_id FROM resource_versions WHERE checksum = $1 LIMIT 1`,
    [sum],
  );
  return rows[0]?.resource_id ?? null;
}

export async function linkResource(resourceId: number, t: LinkTarget): Promise<void> {
  await pool.query(
    `INSERT INTO resource_links (resource_id, course_id, unit_id, lesson_plan_id, occurrence_id, group_id)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [resourceId, t.courseId ?? null, t.unitId ?? null, t.lessonPlanId ?? null, t.occurrenceId ?? null, t.groupId ?? null],
  );
}

export async function linkResourceToPlan(resourceId: number, planId: number): Promise<void> {
  await pool.query(
    `INSERT INTO resource_links (resource_id, lesson_plan_id)
     SELECT $1, $2 WHERE NOT EXISTS (
       SELECT 1 FROM resource_links WHERE resource_id = $1 AND lesson_plan_id = $2)`,
    [resourceId, planId],
  );
}

export async function unlinkResourceFromPlan(resourceId: number, planId: number): Promise<void> {
  await pool.query(`DELETE FROM resource_links WHERE resource_id = $1 AND lesson_plan_id = $2`, [resourceId, planId]);
}

export async function listResourcesForPlan(planId: number): Promise<LinkedResource[]> {
  const { rows } = await pool.query<LinkedResource>(
    `SELECT r.id AS "resourceId", r.title, r.kind, r.source FROM resource_links rl
     JOIN resources r ON r.id = rl.resource_id WHERE rl.lesson_plan_id = $1 AND r.active ORDER BY r.title`,
    [planId],
  );
  return rows;
}

/** The teacher's own SOURCE documents linked to a plan (uploaded/imported, not AI-generated, not
 *  images) — the candidates for "build the worksheet on my materials" (B4 preview, cheap: no extract). */
export async function listSourceDocsForPlan(planId: number): Promise<LinkedResource[]> {
  const { rows } = await pool.query<LinkedResource>(
    `SELECT r.id AS "resourceId", r.title, r.kind, r.source FROM resource_links rl
     JOIN resources r ON r.id = rl.resource_id
     WHERE rl.lesson_plan_id = $1 AND r.active AND r.source IN ('uploaded', 'imported') AND r.kind <> 'image'
     ORDER BY r.title`,
    [planId],
  );
  return rows;
}

export interface ResourceUsage {
  kind: 'plan' | 'unit' | 'group';
  title: string;
  courseId: number;
  courseName: string;
}

/** Where a resource is used — the lesson plans it's attached to and the units it's a source for. */
export async function listUsageForResource(resourceId: number): Promise<ResourceUsage[]> {
  const { rows } = await pool.query<ResourceUsage>(
    `SELECT 'plan' AS kind, lp.title, c.id AS "courseId", c.name AS "courseName"
     FROM resource_links rl
     JOIN lesson_plans lp ON lp.id = rl.lesson_plan_id
     JOIN courses c ON c.id = lp.course_id
     WHERE rl.resource_id = $1
     UNION ALL
     SELECT 'unit' AS kind, u.title, c.id AS "courseId", c.name AS "courseName"
     FROM resource_links rl
     JOIN units u ON u.id = rl.unit_id
     JOIN schemes_of_work s ON s.id = u.scheme_id
     JOIN courses c ON c.id = s.course_id
     WHERE rl.resource_id = $1
     UNION ALL
     SELECT 'group' AS kind, lp.title || ' (' || coalesce(g.name, 'class') || ')' AS title,
            c.id AS "courseId", c.name AS "courseName"
     FROM resource_links rl
     JOIN lesson_adaptations a ON a.id = rl.adaptation_id
     JOIN lesson_plans lp ON lp.id = a.lesson_plan_id
     JOIN group_courses gc ON gc.id = a.group_course_id
     JOIN courses c ON c.id = gc.course_id
     LEFT JOIN groups g ON g.id = gc.group_id
     WHERE rl.resource_id = $1
     ORDER BY kind, title`,
    [resourceId],
  );
  return rows;
}

// 5.3: import provenance. The bulk importer recorded each file's original folder path in its
// version's change_note ("imported from <relative path>") — that's how downloaded units are found.
export async function getImportedPaths(): Promise<string[]> {
  const { rows } = await pool.query<{ rel: string }>(
    `SELECT DISTINCT substring(change_note from 'imported from (.*)') AS rel
     FROM resource_versions WHERE change_note LIKE 'imported from %'`,
  );
  return rows.map((r) => r.rel).filter((r): r is string => !!r);
}

/** Uploaded/imported SOURCE files linked to a unit, with their original import path — the fallback
 *  for image carry-over when a plan has no per-plan source link (units converted before per-plan
 *  linking existed). The path's "Lesson N" folder is what lets us match a deck to its lesson. */
export async function listSourceFilesForUnit(unitId: number): Promise<Array<{ resourceId: number; title: string; path: string }>> {
  const { rows } = await pool.query<{ resourceId: number; title: string; path: string | null }>(
    `SELECT DISTINCT ON (r.id) r.id AS "resourceId", r.title,
            substring(v.change_note from 'imported from (.*)') AS path
     FROM resource_links rl
     JOIN resources r ON r.id = rl.resource_id
     JOIN resource_versions v ON v.resource_id = r.id
     WHERE rl.unit_id = $1 AND r.source IN ('uploaded', 'imported') AND v.change_note LIKE 'imported from %'
     ORDER BY r.id`,
    [unitId],
  );
  return rows.map((r) => ({ resourceId: Number(r.resourceId), title: r.title, path: r.path ?? '' }));
}

/** C3 convert de-dup: unit titles already created from this source folder (its files are linked to
 *  them as sources). Empty ⇒ never converted. Lets the convert flow warn before a duplicate run. */
export async function unitsFromFolder(folder: string): Promise<string[]> {
  const { rows } = await pool.query<{ title: string }>(
    `SELECT DISTINCT u.title
     FROM resource_links rl
     JOIN units u ON u.id = rl.unit_id
     JOIN resource_versions rv ON rv.resource_id = rl.resource_id
     WHERE rl.unit_id IS NOT NULL AND rv.change_note LIKE 'imported from ' || $1 || '/%'
     ORDER BY u.title`,
    [folder],
  );
  return rows.map((r) => r.title);
}

/** Distinct resources whose imported path sits under a folder — the unit's source files. */
export async function listResourceIdsForFolder(folder: string): Promise<number[]> {
  const { rows } = await pool.query<{ id: number }>(
    `SELECT DISTINCT rv.resource_id AS id
     FROM resource_versions rv
     WHERE rv.change_note LIKE 'imported from ' || $1 || '/%'`,
    [folder],
  );
  return rows.map((r) => Number(r.id));
}

/** Link a resource to one class's adaptation of a lesson (idempotent). */
export async function linkResourceToAdaptation(resourceId: number, adaptationId: number): Promise<void> {
  await pool.query(
    `INSERT INTO resource_links (resource_id, adaptation_id)
     SELECT $1, $2 WHERE NOT EXISTS (
       SELECT 1 FROM resource_links WHERE resource_id = $1 AND adaptation_id = $2)`,
    [resourceId, adaptationId],
  );
}

// Security (additional review): a limited TA must only open resources for lessons they may see —
// otherwise they could enumerate resource ids and read any class's materials. A resource is allowed if
// it is linked (to a plan, or that plan's adaptation for the right class) to an occurrence_course whose
// lesson is EITHER the named TA's own (tl.staff_id) OR happening today (covers shared-account TAs and
// the now/next view). Teachers are never restricted by this.
export async function taMayAccessResource(resourceId: number, taStaffId: number): Promise<boolean> {
  const { rows } = await pool.query(
    `SELECT 1
     FROM resource_links rl
     JOIN occurrence_courses oc
       ON oc.lesson_plan_id = rl.lesson_plan_id
       OR EXISTS (SELECT 1 FROM lesson_adaptations a
                  WHERE a.id = rl.adaptation_id AND a.lesson_plan_id = oc.lesson_plan_id AND a.group_course_id = oc.group_course_id)
     JOIN lesson_occurrences lo ON lo.id = oc.occurrence_id
     JOIN timetabled_lessons tl ON tl.id = lo.timetabled_lesson_id
     WHERE rl.resource_id = $1 AND NOT lo.is_test /* TEST-LAB-GUARD */ AND (($2 > 0 AND tl.staff_id = $2) OR lo.date = CURRENT_DATE)
     LIMIT 1`,
    [resourceId, taStaffId],
  );
  return rows.length > 0;
}

/** The adapted documents for one class's version of a lesson. */
export async function listResourcesForAdaptation(adaptationId: number): Promise<LinkedResource[]> {
  const { rows } = await pool.query<LinkedResource>(
    `SELECT r.id AS "resourceId", r.title, r.kind, r.source FROM resource_links rl
     JOIN resources r ON r.id = rl.resource_id WHERE rl.adaptation_id = $1 AND r.active ORDER BY r.title`,
    [adaptationId],
  );
  return rows;
}

/** Link a resource to a unit (idempotent) — source provenance for converted units (5.3). */
export async function linkResourceToUnit(resourceId: number, unitId: number): Promise<void> {
  await pool.query(
    `INSERT INTO resource_links (resource_id, unit_id)
     SELECT $1, $2 WHERE NOT EXISTS (
       SELECT 1 FROM resource_links WHERE resource_id = $1 AND unit_id = $2)`,
    [resourceId, unitId],
  );
}

