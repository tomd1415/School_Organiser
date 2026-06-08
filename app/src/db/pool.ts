import { Pool } from 'pg';
import { dbConfig } from '../config/db';

// A single shared pool. pg connects lazily on first query, so importing this
// module never requires a live database (the Phase 0 smoke tests rely on that).
export const pool = new Pool({ connectionString: dbConfig.DATABASE_URL });
