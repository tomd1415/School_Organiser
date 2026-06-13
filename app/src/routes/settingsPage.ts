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
import { pollEmailOnce } from '../services/emailPoll';
import { pool } from '../db/pool';
import { createTaAccount, deleteTaAccount, listTaAccounts, setTaAccountActive, setTaAccountPassword, type TaAccount } from '../repos/taAccounts';

function renderTaAccount(a: TaAccount, staff: { id: number; name: string }[]): string {
  const staffName = a.staffId != null ? (staff.find((s) => s.id === a.staffId)?.name ?? null) : null;
  return `<li class="pupil${a.active ? '' : ' inactive'}" id="ta-acct-${a.id}">
    <span class="pupil-name">${esc(a.name)}</span>
    ${staffName ? `<span class="muted">↔ ${esc(staffName)}</span>` : '<span class="muted">no staff link</span>'}
    <button type="button" class="link" hx-post="/settings/ta-account/${a.id}/active" hx-vals='{"active":"${a.active ? 'false' : 'true'}"}' hx-target="#ta-acct-${a.id}" hx-swap="outerHTML">${a.active ? 'disable' : 'enable'}</button>
    <button type="button" class="link" hx-post="/settings/ta-account/${a.id}/password" hx-prompt="New password for ${esc(a.name)} (8+ characters)" hx-target="#ta-acct-${a.id}" hx-swap="outerHTML">reset password</button>
    <button type="button" class="link danger" hx-post="/settings/ta-account/${a.id}/delete" hx-confirm="Delete ${esc(a.name)}'s login?" hx-target="#ta-acct-${a.id}" hx-swap="outerHTML">✕</button>
  </li>`;
}

export function registerSettingsRoutes(app: FastifyInstance): void {
  const guard = { preHandler: [requireAuth, app.csrfProtection] };

  app.get('/settings', { preHandler: requireAuth }, async (_req, reply) => {
    const csrf = reply.generateCsrf();
    let body: string;
    try {
      const envManaged = !!appConfig.APP_PASSWORD_HASH;
      const [school, aiEnabled, cap, mPlan, mDesign, mCheap, emHost, emPort, emUser, emPass, emFolder, emTls, emOn, emMins, emLast] = await Promise.all([
        getSetting('school_name'),
        getSetting('ai_enabled'),
        getSetting('ai_month_cap_pence'),
        getSetting('ai_model_plan'),
        getSetting('ai_model_design'),
        getSetting('ai_model_cheap'),
        getSetting('email_imap_host'),
        getSetting('email_imap_port'),
        getSetting('email_imap_user'),
        getSetting('email_imap_password'),
        getSetting('email_imap_folder'),
        getSetting('email_imap_tls'),
        getSetting('email_poll_enabled'),
        getSetting('email_poll_minutes'),
        getSetting('email_last_poll'),
      ]);
      const [pupilOn, pupilIdle, dpiaAck, taLegacy, taAccounts, staffRows] = await Promise.all([
        getSetting('pupil_access_enabled'),
        getSetting('pupil_idle_minutes'),
        getSetting('pupil_dpia_ack'),
        getSetting('ta_password_hash'),
        listTaAccounts(),
        pool.query<{ id: number; name: string }>(`SELECT id, name FROM staff WHERE NOT is_self ORDER BY name`).then((r) => r.rows),
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

        <h2>TA access</h2>
        <p class="muted">Each TA gets their <strong>own password</strong> for the normal login page and lands on a
          <strong>read-only view of the current lesson</strong> (plan + resources, peek at the next) with a feedback form —
          nothing else is reachable. Feedback shows on your lesson page and feeds the adapt-next-lesson AI
          (safeguarding-flagged feedback stays out of AI). Linking a TA to their staff row adds a
          <strong>"my upcoming lessons"</strong> tab to their view.</p>
        <ul class="pupil-list" id="ta-accounts">${taAccounts.map((a) => renderTaAccount(a, staffRows)).join('') || '<li class="muted">No TA accounts yet.</li>'}</ul>
        <form class="setup-add" hx-post="/settings/ta-account" hx-target="#ta-accounts" hx-swap="beforeend" hx-on::after-request="if(event.detail.successful) this.reset()">
          <input name="name" placeholder="TA name" required maxlength="80">
          <select name="staff">
            <option value="">— staff link (optional) —</option>
            ${staffRows.map((s) => `<option value="${s.id}">${esc(s.name)}</option>`).join('')}
          </select>
          <input type="password" name="password" placeholder="their password (8+)" minlength="8" required autocomplete="new-password">
          <button type="submit" class="btn-secondary">Add TA account</button>
        </form>
        <div id="ta-pw-result">${
          taLegacy && taLegacy.trim() !== ''
            ? `<p class="muted">⚠ The old <strong>shared TA password</strong> is still set and still works.
                Once every TA has their own account above, retire it:
                <button type="button" class="link danger" hx-post="/settings/ta-password" hx-vals='{"clear":"1"}' hx-target="#ta-pw-result" hx-swap="innerHTML">clear shared password</button></p>`
            : ''
        }</div>

        <h2>Pupil access</h2>
        <p class="muted">Pupils log in with <strong>class code → tap your name → PIN</strong> and see only <code>/me</code>:
          their class's live worksheet to type into, a Done ✓ button and a quick lesson-feedback widget. Manage PINs and
          class codes on the <a href="/pupils">Pupils page</a>.</p>
        ${
          pupilOn === 'true'
            ? `<p class="adapt-note">✅ Pupil access is <strong>enabled</strong>${dpiaAck ? ` (DPIA sign-off acknowledged ${esc(dpiaAck.slice(0, 10))})` : ''}.
                <button type="button" class="link danger" hx-post="/settings/pupil-access" hx-vals='{"enable":"false"}' hx-swap="none" hx-on::after-request="location.reload()">Disable</button></p>`
            : `<div class="setup-add">
                <p class="muted"><strong>Off by default — the DPIA gate.</strong> Pupil credentials are a new category of personal data:
                  the DPIA's [CONFIRM] items must be completed and <strong>signed by the DPO and SLT</strong> before any pupil can log in
                  (docs/DPIA.md §8).</p>
                <form hx-post="/settings/pupil-access" hx-swap="none" hx-on::after-request="location.reload()">
                  <input type="hidden" name="enable" value="true">
                  <label><input type="checkbox" name="ack" value="yes" required> the DPIA has been signed off by the DPO and SLT</label>
                  <button type="submit" class="btn-secondary">Enable pupil access</button>
                </form>
              </div>`
        }
        <div class="setup-add">
          <label>Pupil idle logout <input class="setup-num" style="width:4rem" value="${esc(pupilIdle ?? '20')}"
            hx-post="/settings/pupil-idle" hx-vals='js:{"value":event.target.value}' hx-trigger="input changed delay:700ms, blur" hx-swap="none"> min
            <span class="muted">(classroom-only use → relaxed default)</span></label>
          <span class="note-status" id="pupil-status"></span>
        </div>

        <h2>Email intake</h2>
        <p class="muted">Emails arriving in this mailbox become inbox tasks automatically (the paste box still works too).
          Use a <strong>dedicated or forwarded mailbox</strong>, not your main school account — set an Outlook rule that
          forwards the mail you want as tasks. Only unread mail is imported; imported mail is marked read.</p>
        <div class="setup-add" id="email-intake-fields">
          <label>IMAP host <input name="email_imap_host" value="${esc(emHost ?? '')}" placeholder="imap.gmail.com"
            hx-post="/settings/email?key=email_imap_host" hx-trigger="input changed delay:700ms, change" hx-swap="none"></label>
          <label>Port <input class="setup-num" style="width:5rem" name="email_imap_port" value="${esc(emPort ?? '')}" placeholder="993"
            hx-post="/settings/email?key=email_imap_port" hx-trigger="input changed delay:700ms, change" hx-swap="none"></label>
          <label>User <input name="email_imap_user" value="${esc(emUser ?? '')}" placeholder="organiser.intake@gmail.com" autocomplete="off"
            hx-post="/settings/email?key=email_imap_user" hx-trigger="input changed delay:700ms, change" hx-swap="none"></label>
          <label>Password <input type="password" name="email_imap_password" value="${esc(emPass ?? '')}" placeholder="app password" autocomplete="new-password"
            hx-post="/settings/email?key=email_imap_password" hx-trigger="input changed delay:700ms, change" hx-swap="none"></label>
          <label>Folder <input name="email_imap_folder" value="${esc(emFolder ?? '')}" placeholder="INBOX"
            hx-post="/settings/email?key=email_imap_folder" hx-trigger="input changed delay:700ms, change" hx-swap="none"></label>
          <span class="note-status" id="email-status"></span>
        </div>
        <div class="setup-add">
          <label><input type="checkbox" name="email_poll_enabled" value="true"${emOn === 'true' ? ' checked' : ''}
            hx-post="/settings/email?key=email_poll_enabled" hx-trigger="change" hx-swap="none"> poll automatically</label>
          <label>every <input class="setup-num" style="width:4rem" name="email_poll_minutes" value="${esc(emMins ?? '5')}"
            hx-post="/settings/email?key=email_poll_minutes" hx-trigger="input changed delay:700ms, change" hx-swap="none"> min</label>
          <label><input type="checkbox" name="email_imap_tls" value="true"${emTls !== 'false' ? ' checked' : ''}
            hx-post="/settings/email?key=email_imap_tls" hx-trigger="change" hx-swap="none"> TLS</label>
          <button type="button" class="btn-secondary" title="saves whatever is typed above first, then polls"
            hx-post="/settings/email/test" hx-include="#email-intake-fields" hx-target="#email-test-result" hx-swap="innerHTML" hx-disabled-elt="this">Poll now / test</button>
        </div>
        <div id="email-test-result">${emLast ? `<p class="muted">last poll: ${esc(emLast)}</p>` : ''}</div>

        <h2>Data health</h2>
        <ul class="rollover-checks">
          <li>${health.current ? `✅ current year: <strong>${esc(health.current)}</strong>` : '⚠ no current academic year set'} (${health.years} year${health.years === 1 ? '' : 's'} in the database)</li>
          <li>📦 database size: ~${health.dbMb} MB</li>
          <li>🤖 AI calls this month: ${health.aiMonth}</li>
          <li>💾 backups: run <code>scripts/backup.sh</code> on a schedule — restore drills are in <code>docs/RUNBOOK.md</code></li>
        </ul>
        <p class="muted">Setup checklist: <a href="/welcome">/welcome</a> · September: <a href="/setup/rollover">rollover wizard</a></p>
      </section>`;
    } catch (err) {
      app.log.error({ err }, 'page render failed (shown as unavailable)');
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


  const EMAIL_KEYS = ['email_imap_host', 'email_imap_port', 'email_imap_user', 'email_imap_password', 'email_imap_folder', 'email_imap_tls', 'email_poll_enabled', 'email_poll_minutes'] as const;
  const EMAIL_BOOLS = new Set(['email_imap_tls', 'email_poll_enabled']);

  // The field posts itself under its own name; the key rides in the query. An absent checkbox
  // value means unticked → 'false'.
  app.post('/settings/email', guard, async (req, reply) => {
    const q = z.object({ key: z.enum(EMAIL_KEYS) }).safeParse(req.query);
    if (!q.success) return reply.code(400).send('');
    const body = (req.body ?? {}) as Record<string, unknown>;
    const raw = body[q.data.key];
    const value = typeof raw === 'string' ? raw.trim().slice(0, 300) : EMAIL_BOOLS.has(q.data.key) ? 'false' : '';
    await setSetting(q.data.key, value);
    return reply.type('text/html').send('<span class="note-status saved" id="email-status" hx-swap-oob="true">saved ✓</span>');
  });

  // Poll-now first SAVES whatever is currently typed in the fields (hx-include sends them), so
  // "type the details, hit test" can never race the autosaves and report "not configured".
  app.post('/settings/email/test', guard, async (req, reply) => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    for (const key of EMAIL_KEYS) {
      const raw = body[key];
      if (typeof raw === 'string' && raw.trim() !== '') await setSetting(key, raw.trim().slice(0, 300));
    }
    const r = await pollEmailOnce();
    return reply
      .type('text/html')
      .send(`<p class="${r.ok ? 'adapt-note' : 'error'}">${r.ok ? '✓ ' : ''}${r.message.replace(/</g, '&lt;')}</p>`);
  });


  app.post('/settings/ta-password', guard, async (req, reply) => {
    const b = z.object({ next: z.string().max(200).default(''), clear: z.string().optional() }).safeParse(req.body);
    if (!b.success) return reply.code(400).send('');
    if (b.data.clear === '1') {
      await setSetting('ta_password_hash', '');
      return reply.type('text/html').send('<p class="adapt-note">TA access disabled.</p>');
    }
    if (b.data.next.length < 8) return reply.type('text/html').send('<p class="error">TA password needs 8+ characters.</p>');
    await setSetting('ta_password_hash', hashPassword(b.data.next));
    return reply.type('text/html').send('<p class="adapt-note">TA password set ✓ — share it with your TAs; they log in on the normal page.</p>');
  });

  // ── Named TA accounts (8.1) ────────────────────────────────────────────────────────────────
  const staffList = async (): Promise<{ id: number; name: string }[]> =>
    (await pool.query<{ id: number; name: string }>(`SELECT id, name FROM staff WHERE NOT is_self ORDER BY name`)).rows;

  app.post('/settings/ta-account', guard, async (req, reply) => {
    const b = z
      .object({ name: z.string().trim().min(1).max(80), staff: z.string().default(''), password: z.string().min(8).max(200) })
      .safeParse(req.body);
    if (!b.success) return reply.code(400).type('text/html').send('');
    const staffId = b.data.staff !== '' ? Number(b.data.staff) : null;
    try {
      const acct = await createTaAccount(b.data.name, hashPassword(b.data.password), staffId);
      return reply.type('text/html').send(renderTaAccount(acct, await staffList()));
    } catch {
      return reply.code(400).type('text/html').send('<li class="error">That name is already taken.</li>');
    }
  });

  app.post('/settings/ta-account/:id/active', guard, async (req, reply) => {
    const p = z.object({ id: z.coerce.number().int().positive() }).safeParse(req.params);
    const b = z.object({ active: z.enum(['true', 'false']) }).safeParse(req.body);
    if (!p.success || !b.success) return reply.code(400).send('');
    await setTaAccountActive(p.data.id, b.data.active === 'true');
    const acct = (await listTaAccounts()).find((a) => a.id === p.data.id);
    return reply.type('text/html').send(acct ? renderTaAccount(acct, await staffList()) : '');
  });

  app.post('/settings/ta-account/:id/password', guard, async (req, reply) => {
    const p = z.object({ id: z.coerce.number().int().positive() }).safeParse(req.params);
    if (!p.success) return reply.code(400).send('');
    const prompt = (req.headers['hx-prompt'] ?? '') as string;
    const acct = (await listTaAccounts()).find((a) => a.id === p.data.id);
    if (!acct) return reply.code(404).send('');
    if (prompt.length < 8) {
      return reply.type('text/html').send(renderTaAccount(acct, await staffList()).replace('</li>', ' <span class="error">password needs 8+ characters</span></li>'));
    }
    await setTaAccountPassword(p.data.id, hashPassword(prompt));
    return reply.type('text/html').send(renderTaAccount(acct, await staffList()).replace('</li>', ' <span class="note-status saved">password set ✓</span></li>'));
  });

  app.post('/settings/ta-account/:id/delete', guard, async (req, reply) => {
    const p = z.object({ id: z.coerce.number().int().positive() }).safeParse(req.params);
    if (!p.success) return reply.code(400).send('');
    await deleteTaAccount(p.data.id);
    return reply.type('text/html').send('');
  });

  // ── Pupil access (8.2): the DPIA-gated master switch ──────────────────────────────────────
  app.post('/settings/pupil-access', guard, async (req, reply) => {
    const b = z.object({ enable: z.enum(['true', 'false']), ack: z.string().optional() }).safeParse(req.body);
    if (!b.success) return reply.code(400).send('');
    if (b.data.enable === 'true') {
      if (b.data.ack !== 'yes') return reply.code(400).type('text/html').send('<p class="error">Tick the DPIA sign-off box first.</p>');
      await setSetting('pupil_access_enabled', 'true');
      await setSetting('pupil_dpia_ack', new Date().toISOString());
    } else {
      await setSetting('pupil_access_enabled', 'false');
    }
    return reply.send('');
  });

  app.post('/settings/pupil-idle', guard, async (req, reply) => {
    const b = z.object({ value: z.string().max(10) }).safeParse(req.body);
    if (!b.success || (b.data.value.trim() !== '' && !(Number(b.data.value) >= 1))) return reply.code(400).send('');
    await setSetting('pupil_idle_minutes', b.data.value.trim());
    return reply.type('text/html').send('<span class="note-status saved" id="pupil-status" hx-swap-oob="true">saved ✓</span>');
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
