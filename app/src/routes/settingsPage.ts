// Phase 6.6: the Settings page — password change, school identity, the AI controls that used to
// need SQL, and a small data-health panel. Password: when the env var manages it (existing
// instances), the in-app form is disabled with an explanation; otherwise changes write to settings.
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../auth/guard';
import { esc, layout } from '../lib/html';
import { hashPassword, verifyPassword } from '../lib/passwords';
import { appConfig } from '../config/app';
import { getSetting, setSetting } from '../repos/settings';
import { pool } from '../db/pool';

export function registerSettingsRoutes(app: FastifyInstance): void {
  const guard = { preHandler: [requireAuth, app.csrfProtection] };

  app.get('/settings', { preHandler: requireAuth }, async (_req, reply) => {
    const csrf = reply.generateCsrf();
    let body: string;
    try {
      const envManaged = !!appConfig.APP_PASSWORD_HASH;
      const [school, aiEnabled, cap, mPlan, mDesign, mCheap] = await Promise.all([
        getSetting('school_name'),
        getSetting('ai_enabled'),
        getSetting('ai_month_cap_pence'),
        getSetting('ai_model_plan'),
        getSetting('ai_model_design'),
        getSetting('ai_model_cheap'),
      ]);
      const health = (
        await pool.query<{ years: number; current: string | null; aiMonth: number; dbMb: number }>(`
        SELECT (SELECT count(*)::int FROM academic_years) AS years,
               (SELECT name FROM academic_years WHERE is_current) AS current,
               (SELECT count(*)::int FROM ai_calls WHERE created_at > date_trunc('month', now())) AS "aiMonth",
               (SELECT pg_database_size(current_database()) / 1048576)::int AS "dbMb"`)
      ).rows[0]!;
      const aiKeySet = !!process.env.ANTHROPIC_API_KEY;
      body = `
      <section class="card setup" hx-headers='{"x-csrf-token":"${csrf}"}'>
        <h1>Settings</h1>

        <h2>School</h2>
        <label class="stop-label">School name
          <input class="stop-input" name="value" value="${esc(school ?? '')}"
            hx-post="/settings/school" hx-trigger="input changed delay:700ms, blur" hx-swap="none">
          <span class="note-status" id="school-status"></span>
        </label>

        <h2>Password</h2>
        ${
          envManaged
            ? '<p class="muted">This instance\'s password is managed by <code>APP_PASSWORD_HASH</code> in its <code>.env</code> file (regenerate with <code>npm run hash-password</code>). Remove that variable to manage it here instead.</p>'
            : `<form class="setup-add" hx-post="/settings/password" hx-target="#pw-result" hx-swap="innerHTML">
                <input type="password" name="current" placeholder="current password" required autocomplete="current-password">
                <input type="password" name="next" placeholder="new password (8+)" required minlength="8" autocomplete="new-password">
                <input type="password" name="next2" placeholder="new password again" required autocomplete="new-password">
                <button type="submit" class="btn-secondary">Change password</button>
              </form><div id="pw-result"></div>`
        }

        <h2>AI</h2>
        <p class="muted">Key: ${aiKeySet ? '✅ set (via .env)' : '— not set; all AI features degrade gracefully'} ·
          every call is redacted, safeguarding-withheld and audited regardless.</p>
        <div class="setup-add">
          <label><input type="checkbox"${aiEnabled !== 'false' ? ' checked' : ''}
            hx-post="/settings/ai" hx-vals='js:{"key":"ai_enabled","value":event.target.checked ? "true" : "false"}' hx-trigger="change" hx-swap="none"> AI features enabled</label>
          <label>Monthly cap (pence) <input class="setup-num" style="width:6rem" value="${esc(cap ?? '')}" placeholder="default"
            hx-post="/settings/ai" hx-vals='js:{"key":"ai_month_cap_pence","value":event.target.value}' hx-trigger="input changed delay:700ms, blur" hx-swap="none"></label>
        </div>
        <div class="setup-add">
          <label>Design model <input value="${esc(mDesign ?? '')}" placeholder="claude-opus-4-8"
            hx-post="/settings/ai" hx-vals='js:{"key":"ai_model_design","value":event.target.value}' hx-trigger="change" hx-swap="none"></label>
          <label>Planning model <input value="${esc(mPlan ?? '')}" placeholder="claude-sonnet-4-6"
            hx-post="/settings/ai" hx-vals='js:{"key":"ai_model_plan","value":event.target.value}' hx-trigger="change" hx-swap="none"></label>
          <label>Cheap model <input value="${esc(mCheap ?? '')}" placeholder="claude-haiku-4-5"
            hx-post="/settings/ai" hx-vals='js:{"key":"ai_model_cheap","value":event.target.value}' hx-trigger="change" hx-swap="none"></label>
        </div>
        <span class="note-status" id="ai-status"></span>

        <h2>Data health</h2>
        <ul class="rollover-checks">
          <li>${health.current ? `✅ current year: <strong>${esc(health.current)}</strong>` : '⚠ no current academic year set'} (${health.years} year${health.years === 1 ? '' : 's'} in the database)</li>
          <li>📦 database size: ~${health.dbMb} MB</li>
          <li>🤖 AI calls this month: ${health.aiMonth}</li>
          <li>💾 backups: run <code>scripts/backup.sh</code> on a schedule — restore drills are in <code>docs/RUNBOOK.md</code></li>
        </ul>
        <p class="muted">Setup checklist: <a href="/welcome">/welcome</a> · September: <a href="/setup/rollover">rollover wizard</a></p>
      </section>`;
    } catch {
      body = '<section class="card"><h1>Settings</h1><p class="muted">Unavailable — the database is not reachable.</p></section>';
    }
    return reply.type('text/html').send(layout({ title: 'Settings', body, authed: true, csrfToken: csrf }));
  });

  app.post('/settings/school', guard, async (req, reply) => {
    const b = z.object({ value: z.string().max(200) }).safeParse(req.body);
    if (!b.success) return reply.code(400).send('');
    await setSetting('school_name', b.data.value.trim());
    return reply.type('text/html').send('<span class="note-status saved" id="school-status" hx-swap-oob="true">saved ✓</span>');
  });

  app.post('/settings/ai', guard, async (req, reply) => {
    const b = z.object({ key: z.enum(['ai_enabled', 'ai_month_cap_pence', 'ai_model_plan', 'ai_model_design', 'ai_model_cheap']), value: z.string().max(100) }).safeParse(req.body);
    if (!b.success) return reply.code(400).send('');
    if (b.data.key === 'ai_month_cap_pence' && b.data.value.trim() !== '' && !(Number(b.data.value) > 0)) return reply.code(400).send('');
    await setSetting(b.data.key, b.data.value.trim());
    return reply.send('');
  });

  app.post('/settings/password', guard, async (req, reply) => {
    if (appConfig.APP_PASSWORD_HASH) return reply.code(403).send('managed by .env');
    const b = z.object({ current: z.string(), next: z.string().min(8).max(200), next2: z.string() }).safeParse(req.body);
    if (!b.success) return reply.type('text/html').send('<p class="error">New password needs 8+ characters.</p>');
    if (b.data.next !== b.data.next2) return reply.type('text/html').send("<p class='error'>The new passwords don't match.</p>");
    const stored = await getSetting('auth_password_hash');
    if (!stored || !verifyPassword(b.data.current, stored)) return reply.type('text/html').send('<p class="error">Current password is wrong.</p>');
    await setSetting('auth_password_hash', hashPassword(b.data.next));
    return reply.type('text/html').send('<p class="adapt-note">Password changed ✓</p>');
  });
}
