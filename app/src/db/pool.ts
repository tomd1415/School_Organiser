import { Pool, type PoolClient, types } from 'pg';
import { dbConfig } from '../config/db';

// BIGINT (int8, OID 20) arrives as a string by default, which made `row.id === someNumber`
// silently false in four separate places. Every BIGINT here is a BIGSERIAL id or a byte count,
// none of which approach 2^53, so parse once globally instead of coercing at each comparison.
types.setTypeParser(20, (v) => Number(v));

// A single shared pool. pg connects lazily on first query, so importing this
// module never requires a live database (the Phase 0 smoke tests rely on that).
export const pool = new Pool({ connectionString: dbConfig.DATABASE_URL });

// Something that can run a query — the shared pool OR a transaction-scoped client. A repo write that may
// need to compose into a caller's transaction takes `db: Executor = pool`: it runs on the pool by default
// but joins a transaction when one is threaded in.
export type Executor = Pool | PoolClient;

/** Run `fn` inside ONE transaction on a dedicated client: BEGIN, COMMIT on success, ROLLBACK on throw.
 *  Lets several repo writes succeed-or-fail together (e.g. a destination write + its completion marker). */
export async function withTransaction<T>(fn: (db: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}
