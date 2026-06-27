import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { appConfig } from '../config/app';
import { verifyPassword } from '../lib/passwords';
import { getSetting } from '../repos/settings';
import { verifyTaLogin } from '../repos/taAccounts';
import { allowAttempt, clearAttempts } from './rateLimit';
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
          <button type="submit" class="primary">Log in</button>
        </form>
      </section>`,
  });
}

export function registerAuthRoutes(app: FastifyInstance): void {
  app.get('/login', async (req, reply) => {
    if (!(await configuredHash())) return reply.redirect('/welcome'); // brand-new instance
    const token = reply.generateCsrf();
    // A teacher session that idled out (10.3) lands here with ?timeout=1 — say so kindly.
    const timedOut = z.object({ timeout: z.string().optional() }).safeParse(req.query);
    const note = timedOut.success && timedOut.data.timeout ? 'You were logged out after a period of inactivity. Log in again to carry on.' : undefined;
    return reply.type('text/html').send(loginPage(token, note));
  });

  app.post('/login', { preHandler: app.csrfProtection }, async (req, reply) => {
    // Rate-limit by caller address: 10 attempts a minute is generous for humans, hostile to scripts.
    if (!allowAttempt(`login:${req.ip}`, 10, 60_000)) {
      return reply.code(429).type('text/html').send(loginPage(reply.generateCsrf(), 'Too many attempts — wait a minute and try again.'));
    }
    const parsed = z.object({ password: z.string().min(1) }).safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).type('text/html').send(loginPage(reply.generateCsrf(), 'Enter a password.'));
    }
    const hash = await configuredHash();
    if (hash && verifyPassword(parsed.data.password, hash)) {
      clearAttempts(`login:${req.ip}`);
      req.session.set('authed', true);
      req.session.set('role', 'teacher');
      return reply.redirect('/');
    }
    // Named TA accounts (8.1) — each TA has their own password, set on the Settings page.
    const ta = await verifyTaLogin(parsed.data.password).catch(() => null);
    if (ta) {
      // BUG-040: a lower-privilege (TA) success must NOT clear the shared IP attempt counter — otherwise
      // a TA who knows their own password could reset the brake and brute-force the teacher password.
      req.session.set('authed', true);
      req.session.set('role', 'ta');
      req.session.set('taName', ta.name);
      req.session.set('taStaffId', ta.staffId ?? 0);
      req.session.set('taAccountId', ta.id); // BUG-016 revocation (named accounts)
      req.session.set('taEpoch', ta.epoch);
      return reply.redirect('/ta');
    }
    // Legacy shared TA password — still honoured until the teacher clears it in Settings.
    const taHash = await getSetting('ta_password_hash').catch(() => null);
    if (taHash && taHash.trim() !== '' && verifyPassword(parsed.data.password, taHash)) {
      // BUG-040: as above — a shared-TA success must not reset the teacher-login brake.
      req.session.set('authed', true);
      req.session.set('role', 'ta');
      return reply.redirect('/ta');
    }
    return reply.code(401).type('text/html').send(loginPage(reply.generateCsrf(), 'Incorrect password.'));
  });

  app.post('/logout', { preHandler: app.csrfProtection }, async (req, reply) => {
    const wasPupil = req.session.get('role') === 'pupil';
    req.session.delete();
    return reply.redirect(wasPupil ? '/pupil' : '/login');
  });
}
