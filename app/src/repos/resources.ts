// SQL for the hosted resource store: resources, their versions, and links.
import { pool } from '../db/pool';
import type { LinkTarget } from '../services/resource';

export interface ResourceRow {
  id: number;
  title: string;
  kind: string;
  mimeType: string | null;
  source: string;
  versionNo: number | null;
  byteSize: number | null;
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
}

const RES_COLS = `r.id, r.title, r.kind, r.mime_type AS "mimeType", r.source,
                  v.version_no AS "versionNo", v.byte_size AS "byteSize"`;

export async function createResource(title: string, kind: string, mimeType: string | null, source: string): Promise<number> {
  const { rows } = await pool.query<{ id: number }>(
    `INSERT INTO resources (title, kind, mime_type, source) VALUES ($1, $2, $3, $4) RETURNING id`,
    [title, kind, mimeType, source],
  );
  const id = rows[0]?.id;
  if (id === undefined) throw new Error('failed to create resource');
  return id;
}

/** Append a version (version_no = max+1) and make it current. */
export async function addVersion(
  resourceId: number,
  storagePath: string,
  byteSize: number,
  sum: string,
  author: 'teacher' | 'ai',
  changeNote: string | null,
): Promise<number> {
  const { rows } = await pool.query<{ id: number }>(
    `INSERT INTO resource_versions (resource_id, version_no, storage_path, byte_size, checksum, author, change_note)
     VALUES ($1, COALESCE((SELECT max(version_no) + 1 FROM resource_versions WHERE resource_id = $1), 1), $2, $3, $4, $5, $6)
     RETURNING id`,
    [resourceId, storagePath, byteSize, sum, author, changeNote],
  );
  const vid = rows[0]?.id;
  if (vid === undefined) throw new Error('failed to add version');
  await pool.query(`UPDATE resources SET current_version_id = $2 WHERE id = $1`, [resourceId, vid]);
  return vid;
}

export async function getResource(id: number): Promise<ResourceRow | null> {
  const { rows } = await pool.query<ResourceRow>(
    `SELECT ${RES_COLS} FROM resources r LEFT JOIN resource_versions v ON v.id = r.current_version_id WHERE r.id = $1`,
    [id],
  );
  return rows[0] ?? null;
}

export async function listResources(limit = 200): Promise<ResourceRow[]> {
  const { rows } = await pool.query<ResourceRow>(
    `SELECT ${RES_COLS} FROM resources r LEFT JOIN resource_versions v ON v.id = r.current_version_id
     WHERE r.active ORDER BY r.id DESC LIMIT $1`,
    [limit],
  );
  return rows;
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

export async function listResourcesForPlan(planId: number): Promise<LinkedResource[]> {
  const { rows } = await pool.query<LinkedResource>(
    `SELECT r.id AS "resourceId", r.title, r.kind FROM resource_links rl
     JOIN resources r ON r.id = rl.resource_id WHERE rl.lesson_plan_id = $1 AND r.active ORDER BY r.title`,
    [planId],
  );
  return rows;
}

export async function listResourcesForCourse(courseId: number): Promise<LinkedResource[]> {
  const { rows } = await pool.query<LinkedResource>(
    `SELECT r.id AS "resourceId", r.title, r.kind FROM resource_links rl
     JOIN resources r ON r.id = rl.resource_id WHERE rl.course_id = $1 AND r.active ORDER BY r.title`,
    [courseId],
  );
  return rows;
}
