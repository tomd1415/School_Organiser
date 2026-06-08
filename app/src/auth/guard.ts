import type { FastifyReply, FastifyRequest } from 'fastify';

/** preHandler that redirects to /login unless the session is authenticated. */
export async function requireAuth(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  if (!req.session.get('authed')) {
    return reply.redirect('/login');
  }
}
