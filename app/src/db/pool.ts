import { Pool, types } from 'pg';
import { dbConfig } from '../config/db';

// BIGINT (int8, OID 20) arrives as a string by default, which made `row.id === someNumber`
// silently false in four separate places. Every BIGINT here is a BIGSERIAL id or a byte count,
// none of which approach 2^53, so parse once globally instead of coercing at each comparison.
types.setTypeParser(20, (v) => Number(v));

// A single shared pool. pg connects lazily on first query, so importing this
// module never requires a live database (the Phase 0 smoke tests rely on that).
export const pool = new Pool({ connectionString: dbConfig.DATABASE_URL });
