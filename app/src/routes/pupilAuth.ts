// Phase 8.2: the SEND-friendly pupil login — class code → tap your name → PIN. A standalone,
// zero-navigation surface. Gated on the teacher having enabled pupil access (DPIA sign-off).
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { esc } from '../lib/html';
import { getSetting } from '../repos/settings';
import { allowAttempt } from '../auth/rateLimit';
import { listLoginNames, pupilInGroup, resolveGroupByCode, verifyPin, getPupilName } from '../repos/pupilCredentials';
import { getPupilSessionState } from '../repos/pupils';
import { marksEnabled } from '../auth/marksGate';
import { resumeDevice, pupilPrimaryGroup, pupilGroupInSlot, devicesEnabledForGroup } from '../repos/pupilDevices';
import { resolveNow } from '../services/clock';
import { getClockContext } from '../repos/clock';

const DEVICE_COOKIE = 'pupil_device';

// The class a remembered device should resume into: the pupil's group whose lesson is on RIGHT NOW
// (so a multi-class pupil lands in the actual lesson), else their primary enrolment. Keeps the device
// itself pupil-bound (school-wide) while fixing the wrong-class landing.
async function resumeGroupFor(pupilId: number): Promise<number | null> {
  try {
    const state = resolveNow(new Date(), await getClockContext());
    if (state.isSchoolDay && state.current) {
      const g = await pupilGroupInSlot(pupilId, state.weekday, state.current.slotOrder);
      if (g) return g;
    }
  } catch {
    /* fall through to primary */
  }
  return pupilPrimaryGroup(pupilId);
}

export async function pupilAccessEnabled(): Promise<boolean> {
  return (await getSetting('pupil_access_enabled').catch(() => null)) === 'true';
}

// The reading-help toolbar (10.11/10.12/10.13) — on every pupil page (login + work). Pure
// client-side; choices persist in localStorage and are applied before paint by the head script.
const A11Y_BAR = `<div class="a11y-bar" role="toolbar" aria-label="Reading help">
  <span class="a11y-title">Reading help:</span>
  <button type="button" class="a11y-btn" data-a11y="text-down" title="Smaller text" aria-label="Smaller text">A−</button>
  <button type="button" class="a11y-btn" data-a11y="text-up" title="Bigger text" aria-label="Bigger text">A+</button>
  <button type="button" class="a11y-btn" data-a11y="speak" title="Read aloud — then tap any words to hear them" aria-pressed="false">🔊 Read aloud</button>
  <button type="button" class="a11y-btn" data-a11y="font" title="Easy-read font" aria-pressed="false">Aa easy-read</button>
  <button type="button" class="a11y-btn" data-a11y="contrast" title="High contrast" aria-pressed="false">◐ Contrast</button>
  <button type="button" class="a11y-btn" data-a11y="theme" title="Dark / light mode" aria-pressed="false">🌙 Dark</button>
  <button type="button" class="a11y-btn" data-a11y="motion" title="Calm — less movement" aria-pressed="false">🌊 Calm</button>
  <span class="a11y-speak-hint">Tap any words to hear them.</span>
</div>`;

// 💡 SEND-friendly help for the screenshot-paste tasks: how to screenshot + paste on each device,
// plus a practice box to try it safely. Always in the pupil layout; opened from a "❓ how?" link on
// any paste zone (pupil.js). Pure client-side — the practice box uploads nothing.
const PASTE_HELP = `<div id="paste-help" class="paste-help" role="dialog" aria-modal="true" aria-label="How to add a screenshot" hidden>
  <div class="paste-help-card">
    <button type="button" class="paste-help-x" aria-label="Close">✕</button>
    <h2>📸 How to add a screenshot of your work</h2>
    <ol class="paste-help-steps">
      <li><strong>Take a screenshot</strong> of your work:
        <ul>
          <li>On a <strong>Chromebook</strong>: hold <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>Show windows</kbd>, then drag a box around your work.</li>
          <li>On <strong>Windows</strong>: hold <kbd>⊞ Windows</kbd>+<kbd>Shift</kbd>+<kbd>S</kbd>, then drag a box around your work.</li>
          <li>On a <strong>Mac</strong>: hold <kbd>⌘</kbd>+<kbd>Shift</kbd>+<kbd>4</kbd>, then drag a box around your work.</li>
        </ul>
      </li>
      <li><strong>Click the green box</strong> on your worksheet.</li>
      <li>Hold <kbd>Ctrl</kbd>+<kbd>V</kbd> (or <kbd>⌘</kbd>+<kbd>V</kbd> on a Mac) to <strong>paste</strong> it in. You can also drag a picture file in, or click the box to choose one.</li>
    </ol>
    <div class="paste-help-practice">
      <p><strong>🧪 Practice here first</strong> — take a screenshot, click this box, then paste:</p>
      <div class="paste-practice" tabindex="0" role="button">Click here, then press Ctrl/⌘ + V to try it.</div>
    </div>
    <button type="button" class="pupil-go paste-help-done">Got it!</button>
  </div>
</div>`;

export function pupilLayout(body: string, csrf: string): string {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>My work · School Organiser</title>
<script>
// Apply saved reading-help preferences BEFORE first paint (no flash). Tiny + inline by necessity.
(function () { try { var d = document.documentElement, s = localStorage;
  ['textscale','font','contrast','motion','speak','theme'].forEach(function (k) { var v = s.getItem('a11y.' + k); if (v) d.setAttribute('data-' + k, v); });
} catch (e) {} })();
</script>
<link rel="stylesheet" href="/static/styles.css"></head>
<body class="pupil-body">
  ${A11Y_BAR}
  <main class="pupil-main" hx-headers='{"x-csrf-token":"${esc(csrf)}"}'>${body}</main>
  ${PASTE_HELP}
  <script src="/static/htmx.min.js"></script>
  <script src="/static/pupil.js"></script>
</body></html>`;
}

function codeForm(csrf: string, note?: string): string {
  return `<section class="pupil-card">
    <h1>Log in to your work</h1>
    ${note ? `<p class="pupil-note">${esc(note)}</p>` : ''}
    <form id="pupil-step" hx-post="/pupil/names" hx-target="#pupil-step" hx-swap="outerHTML">
      <input type="hidden" name="_csrf" value="${esc(csrf)}">
      <label class="pupil-label">Class code
        <input name="code" class="pupil-code" autocomplete="off" autocapitalize="characters" autofocus required placeholder="e.g. 8PFA-31">
      </label>
      <button type="submit" class="pupil-go">Next →</button>
    </form>
  </section>`;
}

export function registerPupilAuthRoutes(app: FastifyInstance): void {
  app.get('/pupil', async (req, reply) => {
    // A logged-in pupil goes straight to their work.
    if (req.session.get('role') === 'pupil') return reply.redirect('/me');
    const csrf = reply.generateCsrf();
    if (!(await pupilAccessEnabled())) {
      return reply.type('text/html').send(pupilLayout('<section class="pupil-card"><h1>Not available yet</h1><p class="pupil-note">Pupil log-in isn’t switched on. Ask your teacher.</p></section>', csrf));
    }
    // 9.6 — a remembered device: one-tap "Continue as Alex 👋", with a clear "Not me".
    const deviceSecret = req.cookies?.[DEVICE_COOKIE];
    if (deviceSecret && (await marksEnabled())) {
      const pupilId = await resumeDevice(deviceSecret);
      const grp = pupilId ? await resumeGroupFor(pupilId) : null;
      // Re-check the class still allows remembered devices — a teacher who turned it off (and the
      // revoke) means this device should fall back to the normal login.
      if (pupilId && grp && (await devicesEnabledForGroup(grp))) {
        const who = (await getPupilName(pupilId)) ?? 'me';
        return reply.type('text/html').send(
          pupilLayout(
            `<section class="pupil-card"><h1>Continue as ${esc(who)} 👋</h1>
              <form hx-post="/pupil/resume" hx-target="#pupil-step" hx-swap="outerHTML">
                <input type="hidden" name="_csrf" value="${esc(csrf)}">
                <button type="submit" class="pupil-go" id="pupil-step">Continue →</button>
              </form>
              <p><a class="link" href="/pupil/forget">Not me — someone else</a></p></section>`,
            csrf,
          ),
        );
      }
    }
    const timedOut = z.object({ timeout: z.string().optional() }).safeParse(req.query);
    const note = timedOut.success && timedOut.data.timeout ? 'You were logged out after a break. Log in again to carry on.' : undefined;
    return reply.type('text/html').send(pupilLayout(codeForm(csrf, note), csrf));
  });

  // Resume a remembered device → restore the pupil session (pupilId only; class via enrolment).
  app.post('/pupil/resume', { preHandler: app.csrfProtection }, async (req, reply) => {
    // Pupil access is the master gate for ANY pupil session — check it FIRST so turning access off
    // (the DPIA kill-switch) blocks a remembered-device resume even if the marks flag lags behind.
    if (!(await pupilAccessEnabled())) return reply.redirect('/pupil');
    if (!(await marksEnabled())) return reply.redirect('/pupil');
    const secret = req.cookies?.[DEVICE_COOKIE];
    const pupilId = secret ? await resumeDevice(secret) : null;
    if (!pupilId) {
      reply.clearCookie(DEVICE_COOKIE, { path: '/' });
      return reply.redirect('/pupil');
    }
    const groupId = await resumeGroupFor(pupilId);
    if (!groupId || !(await devicesEnabledForGroup(groupId))) {
      reply.clearCookie(DEVICE_COOKIE, { path: '/' });
      reply.header('HX-Redirect', '/pupil');
      return reply.type('text/html').send('');
    }
    req.session.set('authed', true);
    req.session.set('role', 'pupil');
    req.session.set('pupilId', pupilId);
    req.session.set('pupilGroupId', groupId);
    req.session.set('pupilEpoch', (await getPupilSessionState(pupilId))?.epoch ?? 0); // BUG-017 revocation
    req.session.set('lastSeen', Date.now());
    reply.header('HX-Redirect', '/me');
    return reply.type('text/html').send('');
  });

  app.get('/pupil/forget', async (_req, reply) => {
    reply.clearCookie(DEVICE_COOKIE, { path: '/' });
    return reply.redirect('/pupil');
  });

  app.post('/pupil/names', { preHandler: app.csrfProtection }, async (req, reply) => {
    if (!(await pupilAccessEnabled())) return reply.redirect('/pupil');
    const csrf = reply.generateCsrf();
    // Throttle class-code guessing — without this, a script can sweep codes and harvest each
    // matched class's roster (the names list is intentionally shown, but not to be brute-forced).
    // A per-minute burst cap AND a daily cap (10.28) — the latter stops a slow all-day sweep.
    if (!allowAttempt(`code:${req.ip}`, 20, 60_000) || !allowAttempt(`codeday:${req.ip}`, 300, 86_400_000)) {
      return reply.type('text/html').send(stepError(csrf, 'Too many tries — wait a while and start again.'));
    }
    const b = z.object({ code: z.string().min(1).max(40) }).safeParse(req.body);
    if (!b.success) return reply.type('text/html').send(stepError(csrf, 'Type your class code.'));
    const group = await resolveGroupByCode(b.data.code);
    if (!group) return reply.type('text/html').send(stepError(csrf, "That code didn't match a class. Check it and try again."));
    const names = await listLoginNames(group.groupId);
    if (names.length === 0) {
      return reply.type('text/html').send(stepError(csrf, 'No logins are set up for this class yet — ask your teacher.'));
    }
    const buttons = names
      .map(
        (n) => `<button type="button" class="pupil-name-btn" hx-post="/pupil/pin" hx-vals='{"pupil":"${n.pupilId}","group":"${group.groupId}"}' hx-target="#pupil-step" hx-swap="outerHTML">${esc(n.displayName)}</button>`,
      )
      .join('');
    return reply.type('text/html').send(`<section id="pupil-step" class="pupil-step" hx-headers='{"x-csrf-token":"${esc(csrf)}"}'>
      <h2>Tap your name</h2>
      <div class="pupil-names">${buttons}</div>
      <button type="button" class="link" hx-get="/pupil/restart" hx-target="#pupil-step" hx-swap="outerHTML">← back</button>
    </section>`);
  });

  app.post('/pupil/pin', { preHandler: app.csrfProtection }, async (req, reply) => {
    if (!(await pupilAccessEnabled())) return reply.redirect('/pupil');
    const csrf = reply.generateCsrf();
    if (!allowAttempt(`pinname:${req.ip}`, 30, 60_000)) {
      return reply.type('text/html').send(stepError(csrf, 'Too many tries — wait a minute and start again.'));
    }
    const b = z.object({ pupil: z.coerce.number().int().positive(), group: z.coerce.number().int().positive() }).safeParse(req.body);
    if (!b.success) return reply.type('text/html').send(stepError(csrf, 'Something went wrong — start again.'));
    // Only reveal a name for a pupil actually enrolled in the class whose code was used — without
    // this, any LAN host could iterate ids and harvest the whole school's display names.
    if (!(await pupilInGroup(b.data.pupil, b.data.group))) {
      return reply.type('text/html').send(stepError(csrf, 'Something went wrong — start again.'));
    }
    const name = (await getPupilName(b.data.pupil)) ?? 'you';
    return reply.type('text/html').send(pinForm(csrf, b.data.pupil, b.data.group, name));
  });

  app.post('/pupil/login', { preHandler: app.csrfProtection }, async (req, reply) => {
    if (!(await pupilAccessEnabled())) return reply.redirect('/pupil');
    const csrf = reply.generateCsrf();
    if (!allowAttempt(`pin:${req.ip}`, 12, 60_000)) {
      return reply.type('text/html').send(stepError(csrf, 'Too many tries — wait a minute, then start again.'));
    }
    const b = z
      .object({ pupil: z.coerce.number().int().positive(), group: z.coerce.number().int().positive(), pin: z.string().min(1).max(20) })
      .safeParse(req.body);
    if (!b.success) return reply.type('text/html').send(stepError(csrf, 'Type your PIN.'));
    const name = (await getPupilName(b.data.pupil)) ?? 'you';
    const inGroup = await pupilInGroup(b.data.pupil, b.data.group);
    const r = inGroup ? await verifyPin(b.data.pupil, b.data.pin) : ({ ok: false, reason: 'wrong' } as const);
    if (!r.ok) {
      // One generic message for wrong-PIN / not-in-group / disabled (so the response can't be used
      // to probe which pupils have an active credential); only "locked" is distinct — it's
      // actionable and only reachable after real failed attempts on an existing account.
      const msg =
        r.reason === 'locked'
          ? 'That PIN is locked after too many tries. Ask your teacher to unlock it.'
          : "That didn't work — check your PIN, or ask your teacher.";
      return reply.type('text/html').send(pinForm(csrf, b.data.pupil, b.data.group, name, msg));
    }
    // NB: do NOT clear the per-IP attempt counter on success — the key is shared across pupils on
    // an IP, so clearing would let an attacker reset the brake by logging into their own account
    // and then spray PINs at classmates. The durable per-pupil lockout still protects each victim.
    req.session.set('authed', true);
    req.session.set('role', 'pupil');
    req.session.set('pupilId', b.data.pupil);
    req.session.set('pupilGroupId', b.data.group);
    req.session.set('pupilEpoch', (await getPupilSessionState(b.data.pupil))?.epoch ?? 0); // BUG-017 revocation
    req.session.set('lastSeen', Date.now());
    reply.header('HX-Redirect', '/me');
    return reply.type('text/html').send('');
  });

  app.get('/pupil/restart', async (_req, reply) => {
    const csrf = reply.generateCsrf();
    return reply.type('text/html').send(`<form id="pupil-step" hx-post="/pupil/names" hx-target="#pupil-step" hx-swap="outerHTML" hx-headers='{"x-csrf-token":"${esc(csrf)}"}'>
      <input type="hidden" name="_csrf" value="${esc(csrf)}">
      <label class="pupil-label">Class code
        <input name="code" class="pupil-code" autocomplete="off" autocapitalize="characters" autofocus required placeholder="e.g. 8PFA-31">
      </label>
      <button type="submit" class="pupil-go">Next →</button>
    </form>`);
  });
}

function stepError(csrf: string, msg: string): string {
  return `<section id="pupil-step" class="pupil-step" hx-headers='{"x-csrf-token":"${esc(csrf)}"}'>
    <p class="pupil-error">${esc(msg)}</p>
    <button type="button" class="pupil-go" hx-get="/pupil/restart" hx-target="#pupil-step" hx-swap="outerHTML">Start again</button>
  </section>`;
}

function pinForm(csrf: string, pupilId: number, groupId: number, name: string, error?: string): string {
  return `<section id="pupil-step" class="pupil-step" hx-headers='{"x-csrf-token":"${esc(csrf)}"}'>
    <h2>Hi ${esc(name)} 👋</h2>
    <p class="pupil-note">Type your PIN.</p>
    ${error ? `<p class="pupil-error">${esc(error)}</p>` : ''}
    <form hx-post="/pupil/login" hx-target="#pupil-step" hx-swap="outerHTML">
      <input type="hidden" name="_csrf" value="${esc(csrf)}">
      <input type="hidden" name="pupil" value="${pupilId}">
      <input type="hidden" name="group" value="${groupId}">
      <input name="pin" class="pupil-pin" inputmode="numeric" autocomplete="off" pattern="[0-9]*" autofocus required placeholder="PIN">
      <button type="submit" class="pupil-go">Go →</button>
      ${pinKeypad()}
    </form>
    <button type="button" class="link" hx-get="/pupil/restart" hx-target="#pupil-step" hx-swap="outerHTML">← not me</button>
  </section>`;
}

// 10.14 — a picture PIN: an opt-in emoji keypad where each picture is a fixed digit, so a
// pre-literacy / EAL pupil can be told "tap dog, cat, sun" instead of reading numbers. It enters the
// SAME numeric PIN (no new credential); pupil.js maps taps → digits in the PIN box.
const DIGIT_EMOJI = ['🍎', '🐶', '🐱', '⭐', '🌞', '🐟', '🌈', '🚀', '🎈', '🦋']; // index = digit 0–9
function pinKeypad(): string {
  const key = (d: number): string => `<button type="button" class="pin-key" data-digit="${d}"><span class="pe">${DIGIT_EMOJI[d]}</span><span class="pd">${d}</span></button>`;
  const keys = [1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map(key).join('');
  return `<details class="pin-pictures">
    <summary>🖼️ Use pictures</summary>
    <div class="pin-pad" data-pinpad>${keys}<button type="button" class="pin-key pin-back" data-pin-back>⌫</button></div>
  </details>`;
}
