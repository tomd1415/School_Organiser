// Phase 6.5: first-boot onboarding. A brand-new instance (no password configured anywhere) opens
// here: step 1 creates the teacher + password (stored in settings — the env var, if set, always
// wins); every later step is a guided trip through the Setup editors, tracked as a checklist.
// Once a password exists this page requires login like everything else.
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { esc, layout } from '../lib/html';
import { hashPassword } from '../lib/passwords';
import { configuredHash } from '../auth/routes';
import { getSetting, setSetting } from '../repos/settings';
import { pool } from '../db/pool';

interface Counts {
  years: number;
  currentYear: number;
  terms: number;
  periods: number;
  rooms: number;
  courses: number;
  groups: number;
  lessons: number;
  pupils: number;
  kit: number;
}

async function counts(): Promise<Counts> {
  const { rows } = await pool.query<Counts>(`
    SELECT (SELECT count(*)::int FROM academic_years) AS years,
           (SELECT count(*)::int FROM academic_years WHERE is_current) AS "currentYear",
           (SELECT count(*)::int FROM term_dates WHERE academic_year_id = (SELECT id FROM academic_years WHERE is_current)) AS terms,
           (SELECT count(*)::int FROM period_definitions WHERE academic_year_id = (SELECT id FROM academic_years WHERE is_current)) AS periods,
           (SELECT count(*)::int FROM rooms WHERE active) AS rooms,
           (SELECT count(*)::int FROM courses WHERE active) AS courses,
           (SELECT count(*)::int FROM groups WHERE active AND academic_year_id = (SELECT id FROM academic_years WHERE is_current)) AS groups,
           (SELECT count(*)::int FROM timetabled_lessons tl JOIN period_definitions p ON p.id = tl.period_definition_id
            WHERE p.academic_year_id = (SELECT id FROM academic_years WHERE is_current)) AS lessons,
           (SELECT count(*)::int FROM pupils WHERE active) AS pupils,
           (SELECT count(*)::int FROM equipment WHERE active) AS kit`);
  return rows[0]!;
}

function identityForm(csrf: string, error?: string): string {
  return layout({
    title: 'Welcome',
    body: `
      <section class="card narrow welcome">
        <h1>Welcome 👋</h1>
        <p class="muted">Let's set this instance up for you. Everything lives on this machine —
          one teacher, one instance, your data only.</p>
        ${error ? `<p class="error">${esc(error)}</p>` : ''}
        <form method="post" action="/welcome/identity">
          <input type="hidden" name="_csrf" value="${esc(csrf)}">
          <label>Your name <input type="text" name="name" required maxlength="100" placeholder="Mr T Duguid"></label>
          <label>School name <input type="text" name="school" required maxlength="200"></label>
          <label>Choose a password <input type="password" name="password" required minlength="8" autocomplete="new-password"></label>
          <label>…and again <input type="password" name="password2" required minlength="8" autocomplete="new-password"></label>
          <button type="submit">Create my instance →</button>
        </form>
      </section>`,
  });
}

export function registerWelcomeRoutes(app: FastifyInstance): void {
  app.get('/welcome', async (req, reply) => {
    const csrf = reply.generateCsrf();
    const hash = await configuredHash();
    if (!hash) return reply.type('text/html').send(identityForm(csrf));
    if (!req.session.get('authed')) return reply.redirect('/login');

    const c = await counts();
    const school = (await getSetting('school_name')) ?? '';
    const done = (await getSetting('setup_complete')) === 'true';
    const tick = (ok: boolean) => (ok ? '✅' : '⬜');
    const yearLink = `/setup?tab=year`;
    const item = (ok: boolean, label: string, href: string, hint: string) =>
      `<li>${tick(ok)} <a href="${href}">${label}</a> <span class="muted">— ${hint}</span></li>`;
    const coreDone = c.currentYear > 0 && c.terms > 0 && c.periods > 0 && c.courses > 0 && c.groups > 0 && c.lessons > 0;
    const body = `
      <section class="card welcome">
        <h1>Getting set up${school ? ` — ${esc(school)}` : ''}</h1>
        <p class="muted">Work through these in order — each opens the right editor. Come back here any time; nothing has to be finished in one go.</p>
        <ol class="welcome-list">
          ${item(c.currentYear > 0, '1 · Academic year', yearLink, c.years ? 'created ✓ — check the dates' : 'create this school year (it becomes current automatically)')}
          ${item(c.terms > 0, '2 · Terms, holidays & INSET', yearLink, c.terms ? `${c.terms} rows` : 'term dates drive the clock, the Now screen and lesson planning')}
          ${item(c.periods > 0, '3 · Day shape', '/setup?tab=day', c.periods ? `${c.periods} periods` : 'the periods and times of each weekday')}
          ${item(c.rooms > 0, '4 · Rooms & staff', '/setup?tab=people', c.rooms ? `${c.rooms} rooms` : 'your room(s); TAs can wait')}
          ${item(c.courses > 0, '5 · Courses', '/setup?tab=courses', c.courses ? `${c.courses} courses` : 'what you teach (Computing, Computer Skills…)')}
          ${item(c.groups > 0, '6 · Groups & pupils', '/setup?tab=groups', c.groups ? `${c.groups} groups` : 'your classes; pupil names are optional and never leave this machine')}
          ${item(c.lessons > 0, '7 · The timetable', '/setup?tab=timetable', c.lessons ? `${c.lessons} slots filled` : 'put each class into its weekly slots')}
          ${item(c.kit > 0, '8 · Kit list (optional)', '/kit', c.kit ? `${c.kit} items` : 'the classroom equipment — every AI planning feature plans within it')}
          ${item(c.pupils > 0, '9 · Pupil roster (optional)', '/pupils', c.pupils ? `${c.pupils} pupils` : 'names-only; needed for the redaction boundary if you use AI')}
          <li>${tick(false)} <span>10 · AI key (optional)</span> <span class="muted">— paste an Anthropic key in <a href="/settings">Settings → AI</a> (or set <code>ANTHROPIC_API_KEY</code> in <code>.env</code>); the app works fully without it</span></li>
        </ol>
        ${
          done
            ? '<p class="muted">Setup is marked complete — this page stays available from the Setup tab.</p>'
            : `<form method="post" action="/welcome/finish">
                <input type="hidden" name="_csrf" value="${csrf}">
                <button type="submit" ${coreDone ? '' : 'disabled title="finish steps 1–7 first"'}>Finish setup → go to the Now screen</button>
              </form>`
        }
      </section>`;
    return reply.type('text/html').send(layout({ title: 'Welcome', body, authed: true, csrfToken: csrf }));
  });

  app.post('/welcome/identity', { preHandler: app.csrfProtection }, async (req, reply) => {
    // Only ever available while NO password exists — afterwards this endpoint is dead.
    if (await configuredHash()) return reply.code(403).send('already set up');
    const b = z
      .object({
        name: z.string().trim().min(1).max(100),
        school: z.string().trim().min(1).max(200),
        password: z.string().min(8).max(200),
        password2: z.string(),
      })
      .safeParse(req.body);
    if (!b.success) return reply.code(400).type('text/html').send(identityForm(reply.generateCsrf(), 'Check the fields — password needs 8+ characters.'));
    if (b.data.password !== b.data.password2) {
      return reply.code(400).type('text/html').send(identityForm(reply.generateCsrf(), "The passwords don't match."));
    }
    await pool.query(
      `INSERT INTO staff (name, role, is_self) SELECT $1, 'self', true WHERE NOT EXISTS (SELECT 1 FROM staff WHERE is_self)`,
      [b.data.name],
    );
    await setSetting('school_name', b.data.school);
    await setSetting('auth_password_hash', hashPassword(b.data.password));
    req.session.set('authed', true);
    return reply.redirect('/welcome');
  });

  app.post('/welcome/finish', { preHandler: app.csrfProtection }, async (req, reply) => {
    if (!req.session.get('authed')) return reply.redirect('/login');
    await setSetting('setup_complete', 'true');
    return reply.redirect('/');
  });
}
