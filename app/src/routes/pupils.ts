import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../auth/guard';
import { esc, layout } from '../lib/html';
import { createPupil, listPupils, setPupilActive, type RosterEntry } from '../repos/pupils';
import { aiKeyConfigured } from '../llm/client';
import { getSetting } from '../repos/settings';
import {
  listGroupLogins,
  setGroupLoginCode,
  setPupilPin,
  setPupilCredentialEnabled,
  unlockPupil,
  type GroupLogins,
  type PupilLoginRow,
} from '../repos/pupilCredentials';

function renderPupil(p: RosterEntry): string {
  return `<li class="pupil${p.active ? '' : ' inactive'}" id="pupil-${p.id}">
    <span class="pupil-name">${esc(p.displayName)}</span>
    <span class="muted pupil-token">${esc(p.aiToken)}</span>
    <button type="button" class="link" hx-post="/pupils/${p.id}/${p.active ? 'deactivate' : 'activate'}" hx-target="#pupil-${p.id}" hx-swap="outerHTML">${p.active ? 'archive' : 'restore'}</button>
  </li>`;
}

function renderLoginPupil(groupId: number, p: PupilLoginRow): string {
  const status = !p.hasPin
    ? '<span class="muted">no PIN</span>'
    : p.locked
      ? '<span class="pin-locked">🔒 locked</span>'
      : p.enabled
        ? `<span class="pin-ok">● PIN ${p.pin ? esc(p.pin) : 'set'}</span>`
        : `<span class="muted">disabled${p.pin ? ` (PIN ${esc(p.pin)})` : ''}</span>`;
  return `<li class="pupil" id="login-${p.pupilId}">
    <span class="pupil-name">${esc(p.displayName)}</span> ${status}
    <button type="button" class="link" hx-post="/pupils/${p.pupilId}/pin" hx-prompt="New 4–6 digit PIN for ${esc(p.displayName)}" hx-target="#login-${p.pupilId}" hx-swap="outerHTML">${p.hasPin ? 'reset PIN' : 'set PIN'}</button>
    ${p.hasPin ? `<button type="button" class="link" hx-post="/pupils/${p.pupilId}/pin-enabled" hx-vals='{"enabled":"${p.enabled ? 'false' : 'true'}"}' hx-target="#login-${p.pupilId}" hx-swap="outerHTML">${p.enabled ? 'disable' : 'enable'}</button>` : ''}
    ${p.locked ? `<button type="button" class="link" hx-post="/pupils/${p.pupilId}/unlock" hx-target="#login-${p.pupilId}" hx-swap="outerHTML">unlock</button>` : ''}
  </li>`;
}

function renderLoginGroup(g: GroupLogins): string {
  return `<div class="login-group" id="login-group-${g.groupId}">
    <h3>${esc(g.groupName)}
      <a class="link" href="/pupils/cards/${g.groupId}" target="_blank" rel="noopener">🖨 login cards</a>
    </h3>
    <label class="stop-label">Class code
      <input class="stop-input" name="code" value="${esc(g.loginCode ?? '')}" placeholder="e.g. ${esc(g.groupName)}-31" autocomplete="off"
        hx-post="/pupils/group/${g.groupId}/code" hx-trigger="input changed delay:700ms, blur" hx-swap="none">
      <span class="note-status" id="code-${g.groupId}-status"></span>
    </label>
    <ul class="pupil-list">${g.pupils.map((p) => renderLoginPupil(g.groupId, p)).join('') || '<li class="muted">No pupils enrolled.</li>'}</ul>
  </div>`;
}

export function registerPupilRoutes(app: FastifyInstance): void {
  const guard = { preHandler: [requireAuth, app.csrfProtection] };
  const idParam = z.object({ id: z.coerce.number().int().positive() });

  app.get('/pupils', { preHandler: requireAuth }, async (_req, reply) => {
    const csrf = reply.generateCsrf();
    let body: string;
    try {
      const pupils = await listPupils();
      const keyNote = (await aiKeyConfigured())
        ? ''
        : ' <strong>No AI key is configured yet</strong>, so nothing is sent anywhere regardless.';
      body = `<section class="card" hx-headers='{"x-csrf-token":"${csrf}"}'>
        <h1>Pupils (roster)</h1>
        <p class="muted">Names are stored <strong>locally only</strong>. Each gets a stable token
          (<code>PUPIL_1</code>…) — the only thing any AI feature ever sees in place of the name.${keyNote}</p>
        <form class="pupil-add" hx-post="/pupils" hx-target="#pupil-list" hx-swap="afterbegin" hx-on::after-request="this.reset()">
          <input type="text" name="name" placeholder="Pupil name…" autocomplete="off" required>
          <button type="submit" class="btn-secondary">Add</button>
        </form>
        <ul class="pupil-list" id="pupil-list">${pupils.map(renderPupil).join('')}</ul>
      </section>`;

      // Phase 8.2: pupil logins, grouped by class. Shown once pupil access is enabled in Settings.
      const pupilOn = (await getSetting('pupil_access_enabled').catch(() => null)) === 'true';
      const logins = pupilOn ? await listGroupLogins() : [];
      const loginSection = `<section class="card" hx-headers='{"x-csrf-token":"${csrf}"}'>
        <h1>Pupil logins</h1>
        ${
          pupilOn
            ? `<p class="muted">Each class needs a <strong>code</strong>; each pupil a <strong>PIN</strong>. Pupils log in at
                 <a href="/pupil" target="_blank" rel="noopener">/pupil</a> with class code → tap name → PIN. Print login cards per class.</p>
               ${logins.map(renderLoginGroup).join('') || '<p class="muted">No classes in the current year yet.</p>'}`
            : `<p class="muted">Pupil access is <strong>off</strong>. Turn it on in <a href="/settings">Settings → Pupil access</a>
                 once the DPIA is signed off; PIN and class-code controls appear here then.</p>`
        }
      </section>`;
      body += loginSection;
    } catch (err) {
      app.log.error({ err }, 'page render failed (shown as unavailable)');
      body = `<section class="card"><h1>Pupils</h1><p class="muted">Unavailable — the database is not reachable.</p></section>`;
    }
    return reply.type('text/html').send(layout({ title: 'Pupils', body, authed: true, csrfToken: csrf }));
  });

  app.post('/pupils', guard, async (req, reply) => {
    const b = z.object({ name: z.string().trim().min(1).max(120) }).safeParse(req.body);
    if (!b.success) return reply.code(400).send('');
    return reply.type('text/html').send(renderPupil(await createPupil(b.data.name)));
  });

  for (const [verb, active] of [
    ['activate', true],
    ['deactivate', false],
  ] as const) {
    app.post(`/pupils/:id/${verb}`, guard, async (req, reply) => {
      const id = idParam.safeParse(req.params);
      if (!id.success) return reply.code(400).send('');
      await setPupilActive(id.data.id, active);
      const p = (await listPupils()).find((x) => x.id === id.data.id);
      return reply.type('text/html').send(p ? renderPupil(p) : '');
    });
  }

  // ── Phase 8.2: pupil login admin (PINs, class codes, lockout, login cards) ──────────────────
  const pinGate = async (reply: import('fastify').FastifyReply): Promise<boolean> => {
    if ((await getSetting('pupil_access_enabled').catch(() => null)) !== 'true') {
      reply.code(403).type('text/html').send('<li class="error">Enable pupil access in Settings first.</li>');
      return false;
    }
    return true;
  };
  const oneLogin = async (pupilId: number, groupId: number): Promise<PupilLoginRow | null> =>
    (await listGroupLogins()).find((g) => g.groupId === groupId)?.pupils.find((p) => p.pupilId === pupilId) ?? null;
  const groupOfPupil = async (pupilId: number): Promise<GroupLogins | null> =>
    (await listGroupLogins()).find((g) => g.pupils.some((p) => p.pupilId === pupilId)) ?? null;

  app.post('/pupils/:id/pin', guard, async (req, reply) => {
    if (!(await pinGate(reply))) return;
    const id = idParam.safeParse(req.params);
    if (!id.success) return reply.code(400).send('');
    const pin = ((req.headers['hx-prompt'] ?? '') as string).trim();
    const g = await groupOfPupil(id.data.id);
    if (!g) return reply.code(404).send('');
    if (!/^\d{4,6}$/.test(pin)) {
      const row = g.pupils.find((p) => p.pupilId === id.data.id)!;
      return reply.type('text/html').send(renderLoginPupil(g.groupId, row).replace('</li>', ' <span class="error">PIN must be 4–6 digits</span></li>'));
    }
    await setPupilPin(id.data.id, pin);
    const row = (await oneLogin(id.data.id, g.groupId))!;
    return reply.type('text/html').send(renderLoginPupil(g.groupId, row).replace('</li>', ' <span class="note-status saved">PIN set ✓</span></li>'));
  });

  app.post('/pupils/:id/pin-enabled', guard, async (req, reply) => {
    if (!(await pinGate(reply))) return;
    const id = idParam.safeParse(req.params);
    const b = z.object({ enabled: z.enum(['true', 'false']) }).safeParse(req.body);
    if (!id.success || !b.success) return reply.code(400).send('');
    await setPupilCredentialEnabled(id.data.id, b.data.enabled === 'true');
    const g = await groupOfPupil(id.data.id);
    const row = g ? await oneLogin(id.data.id, g.groupId) : null;
    return reply.type('text/html').send(g && row ? renderLoginPupil(g.groupId, row) : '');
  });

  app.post('/pupils/:id/unlock', guard, async (req, reply) => {
    if (!(await pinGate(reply))) return;
    const id = idParam.safeParse(req.params);
    if (!id.success) return reply.code(400).send('');
    await unlockPupil(id.data.id);
    const g = await groupOfPupil(id.data.id);
    const row = g ? await oneLogin(id.data.id, g.groupId) : null;
    return reply.type('text/html').send(g && row ? renderLoginPupil(g.groupId, row) : '');
  });

  app.post('/pupils/group/:id/code', guard, async (req, reply) => {
    if ((await getSetting('pupil_access_enabled').catch(() => null)) !== 'true') return reply.code(403).send('');
    const id = idParam.safeParse(req.params);
    const b = z.object({ code: z.string().max(40) }).safeParse(req.body);
    if (!id.success || !b.success) return reply.code(400).send('');
    if (b.data.code.trim() !== '' && !/^[A-Za-z0-9-]{3,40}$/.test(b.data.code.trim())) {
      return reply.type('text/html').send(`<span class="note-status" id="code-${id.data.id}-status" hx-swap-oob="true">letters, numbers, –</span>`);
    }
    try {
      await setGroupLoginCode(id.data.id, b.data.code);
      return reply.type('text/html').send(`<span class="note-status saved" id="code-${id.data.id}-status" hx-swap-oob="true">saved ✓</span>`);
    } catch {
      return reply.type('text/html').send(`<span class="note-status" id="code-${id.data.id}-status" hx-swap-oob="true">that code is taken</span>`);
    }
  });

  // Printable login cards for a class (one per pupil with a PIN) — A6-ish cards, code + name.
  app.get('/pupils/cards/:id', { preHandler: requireAuth }, async (req, reply) => {
    const id = idParam.safeParse(req.params);
    if (!id.success) return reply.code(400).send('');
    const g = (await listGroupLogins()).find((x) => x.groupId === id.data.id);
    if (!g) return reply.code(404).type('text/html').send('Class not found.');
    const cards = g.pupils
      .filter((p) => p.hasPin)
      .map(
        (p) => `<div class="login-card">
          <div class="lc-school">School Organiser — my login</div>
          <div class="lc-row"><span class="lc-k">Web page</span><span class="lc-v">${esc((req.headers.host ?? '') + '/pupil')}</span></div>
          <div class="lc-row"><span class="lc-k">Class code</span><span class="lc-v big">${esc(g.loginCode ?? '(set a code)')}</span></div>
          <div class="lc-row"><span class="lc-k">Your name</span><span class="lc-v">${esc(p.displayName)}</span></div>
          <div class="lc-row"><span class="lc-k">PIN</span><span class="lc-v big">${p.pin ? esc(p.pin) : '____ (reset PIN to show)'}</span></div>
          <div class="lc-note">Keep your PIN to yourself.</div>
        </div>`,
      )
      .join('');
    const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Login cards · ${esc(g.groupName)}</title>
      <link rel="stylesheet" href="/static/styles.css"></head>
      <body class="cards-page"><div class="cards-toolbar"><button onclick="window.print()">🖨 Print</button> ${esc(g.groupName)} — login cards</div>
      <div class="login-cards">${cards || '<p>No pupils have a PIN yet — set PINs first.</p>'}</div></body></html>`;
    return reply.type('text/html').send(html);
  });
}
