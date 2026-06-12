import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { appConfig } from '../config/app';
import { verifyPassword } from '../lib/passwords';
import { getSetting } from '../repos/settings';
import { esc, layout } from '../lib/html';

/** The configured password hash: the env var wins (existing instances); otherwise the value the
 * onboarding wizard wrote to settings; null on a brand-new instance (→ /welcome). */
export async function configuredHash(): Promise<string | null> {
  if (appConfig.APP_PASSWORD_HASH) return appConfig.APP_PASSWORD_HASH;
  try {
    return (await getSetting('auth_password_hash')) || null;
  } catch {
    return null;
  }
}

function loginPage(csrfToken: string, error?: string): string {
  return layout({
    title: 'Log in',
    body: `
      <section class="card narrow">
        <h1>Log in</h1>
        ${error ? `<p class="error">${esc(error)}</p>` : ''}
        <form method="post" action="/login">
          <input type="hidden" name="_csrf" value="${esc(csrfToken)}">
          <label>Password
            <input type="password" name="password" autocomplete="current-password" autofocus required>
          </label>
          <button type="submit">Log in</button>
        </form>
      </section>`,
  });
}

export function registerAuthRoutes(app: FastifyInstance): void {
  app.get('/login', async (_req, reply) => {
    if (!(await configuredHash())) return reply.redirect('/welcome'); // brand-new instance
    const token = reply.generateCsrf();
    return reply.type('text/html').send(loginPage(token));
  });

  app.post('/login', { preHandler: app.csrfProtection }, async (req, reply) => {
    const parsed = z.object({ password: z.string().min(1) }).safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).type('text/html').send(loginPage(reply.generateCsrf(), 'Enter a password.'));
    }
    const hash = await configuredHash();
    if (!hash || !verifyPassword(parsed.data.password, hash)) {
      return reply.code(401).type('text/html').send(loginPage(reply.generateCsrf(), 'Incorrect password.'));
    }
    req.session.set('authed', true);
    return reply.redirect('/');
  });

  app.post('/logout', { preHandler: app.csrfProtection }, async (req, reply) => {
    req.session.delete();
    return reply.redirect('/login');
  });
}
