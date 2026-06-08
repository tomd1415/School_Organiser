import type { FastifyInstance } from 'fastify';
import { pool } from '../db/pool';

/** Liveness + DB check. Always 200 so a reverse proxy can see the app is up. */
export function registerHealthRoutes(app: FastifyInstance): void {
  app.get('/health', async (_req, reply) => {
    let db: 'up' | 'down' = 'down';
    try {
      await pool.query('SELECT 1');
      db = 'up';
    } catch {
      db = 'down';
    }
    return reply.send({ status: 'ok', db, phase: 0 });
  });
}
