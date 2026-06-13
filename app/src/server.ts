import { setDefaultResultOrder } from 'node:dns';

// The school network's IPv6 route intermittently blackholes while IPv4 stays fine; node then
// hangs on the AAAA record where curl's happy-eyeballs falls back. Prefer IPv4 outright.
setDefaultResultOrder('ipv4first');

import { join } from 'node:path';
import Fastify, { type FastifyInstance } from 'fastify';
import cookie from '@fastify/cookie';
import formbody from '@fastify/formbody';
import secureSession from '@fastify/secure-session';
import csrf from '@fastify/csrf-protection';
import fastifyStatic from '@fastify/static';
import multipart from '@fastify/multipart';
import { appConfig } from './config/app';
import { migrate } from './db/migrate';
import { registerAuthRoutes } from './auth/routes';
import { registerHealthRoutes } from './routes/health';
import { registerNowRoutes } from './routes/now';
import { registerTimetableRoutes } from './routes/timetable';
import { registerOverseeRoutes } from './routes/oversee';
import { registerPupilRoutes } from './routes/pupils';
import { registerLessonRoutes } from './routes/lesson';
import { registerNoteRoutes } from './routes/notes';
import { registerTaskRoutes } from './routes/tasks';
import { registerEventRoutes } from './routes/events';
import { registerTimeRoutes } from './routes/time';
import { registerTimerRoutes } from './routes/timer';
import { registerFocusRoutes } from './routes/focus';
import { registerPrepRoutes } from './routes/prep';
import { registerCapturedRoutes } from './routes/captured';
import { registerRecurringRoutes } from './routes/recurring';
import { registerSchemeRoutes } from './routes/schemes';
import { registerMapRoutes } from './routes/map';
import { registerKitRoutes } from './routes/kit';
import { registerSetupRoutes } from './routes/setup';
import { registerRolloverRoutes } from './routes/rollover';
import { registerWelcomeRoutes } from './routes/welcome';
import { registerSettingsRoutes } from './routes/settingsPage';
import { registerGroupHistoryRoutes } from './routes/groupHistory';
import { registerTaRoutes } from './routes/ta';
import { registerResourceRoutes } from './routes/resources';
import { registerPupilAuthRoutes } from './routes/pupilAuth';
import { registerMeRoutes } from './routes/me';
import { registerPupilWorkRoutes } from './routes/pupilWork';
import { isLimitedRole, roleAllows, ROLE_HOME } from './auth/lockdown';
import { pupilCfg } from './auth/pupilAccessCache';
import { generateDueInstances } from './repos/recurringTasks';
import { pollEmailOnce } from './services/emailPoll';
import { getSetting } from './repos/settings';
import { localParts } from './lib/time';

/** Build the Fastify instance with all plugins and routes, without listening. */
export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: appConfig.NODE_ENV !== 'test' });

  await app.register(formbody);
  await app.register(cookie);
  await app.register(secureSession, {
    key: Buffer.from(appConfig.SESSION_KEY, 'hex'),
    cookieName: 'organiser_session',
    cookie: {
      path: '/',
      httpOnly: true,
      sameSite: 'strict',
      secure: appConfig.COOKIE_SECURE,
      maxAge: 60 * 60 * 12, // 12 hours
    },
  });
  await app.register(csrf, {
    sessionPlugin: '@fastify/secure-session',
    getToken: (req) => {
      const body = req.body as Record<string, unknown> | undefined;
      const fromBody = typeof body?._csrf === 'string' ? body._csrf : undefined;
      const fromHeader = req.headers['x-csrf-token'];
      return fromBody ?? (typeof fromHeader === 'string' ? fromHeader : '');
    },
  });
  await app.register(fastifyStatic, {
    root: join(__dirname, '..', 'public'),
    prefix: '/static/',
  });
  await app.register(multipart, { limits: { fileSize: 500 * 1024 * 1024 } });

  // Limited roles (ta, pupil) are deny-by-default: anything off their allowlist bounces to
  // their home surface. Pupil sessions also idle out (shared classroom machines), and the
  // pupil-access master switch *evicts* live sessions when turned off — so the DPIA kill-switch
  // actually revokes access, not just blocks new logins. The settings are cached (and invalidated
  // by the Settings handlers) so the hook rarely hits the DB. See auth/pupilAccessCache.
  app.addHook('onRequest', async (req, reply) => {
    const role = req.session?.get?.('role');
    if (!isLimitedRole(role)) return;
    if (role === 'pupil' && !req.url.startsWith('/static/')) {
      const cfg = await pupilCfg();
      if (!cfg.accessOn) {
        // The teacher turned pupil access off (the DPIA gate) — kill the live session.
        req.session.delete();
        return reply.redirect('/pupil');
      }
      const last = Number(req.session.get('lastSeen') ?? 0);
      if (last && Date.now() - last > cfg.idleMins * 60_000) {
        req.session.delete();
        return reply.redirect('/pupil?timeout=1');
      }
      req.session.set('lastSeen', Date.now());
    }
    if (!roleAllows(role, req.url)) return reply.redirect(ROLE_HOME[role]);
  });

  registerHealthRoutes(app);
  registerAuthRoutes(app);
  registerNowRoutes(app);
  registerTimetableRoutes(app);
  registerOverseeRoutes(app);
  registerPupilRoutes(app);
  registerLessonRoutes(app);
  registerNoteRoutes(app);
  registerTaskRoutes(app);
  registerEventRoutes(app);
  registerTimeRoutes(app);
  registerTimerRoutes(app);
  registerFocusRoutes(app);
  registerPrepRoutes(app);
  registerCapturedRoutes(app);
  registerRecurringRoutes(app);
  registerSchemeRoutes(app);
  registerMapRoutes(app);
  registerKitRoutes(app);
  registerSetupRoutes(app);
  registerRolloverRoutes(app);
  registerWelcomeRoutes(app);
  registerSettingsRoutes(app);
  registerGroupHistoryRoutes(app);
  registerTaRoutes(app);
  registerResourceRoutes(app);
  registerPupilAuthRoutes(app);
  registerMeRoutes(app);
  registerPupilWorkRoutes(app);

  return app;
}

/** Materialise recurring-task instances on boot, then daily. No broker — a timer + the standalone npm script. */
function scheduleRecurring(app: FastifyInstance): void {
  const run = async (): Promise<void> => {
    try {
      const today = localParts(new Date(), 'Europe/London').isoDate;
      const n = await generateDueInstances(today);
      if (n > 0) app.log.info(`recurring: generated ${n} task instance(s)`);
    } catch (err) {
      app.log.error(err);
    }
  };
  void run();
  setInterval(() => void run(), 24 * 60 * 60 * 1000);
}

/** Email intake v2: poll the configured mailbox every few minutes (no-op until configured). */
function scheduleEmailPoll(app: FastifyInstance): void {
  const run = async (): Promise<void> => {
    try {
      if ((await getSetting('email_poll_enabled')) !== 'true') return;
      const r = await pollEmailOnce();
      if (r.imported) app.log.info(`email intake: imported ${r.imported} task(s)`);
      if (!r.ok) app.log.warn({ msg: r.message }, 'email intake poll failed');
    } catch (err) {
      app.log.error({ err }, 'email intake poll crashed');
    }
  };
  setTimeout(() => void run(), 15_000); // first poll shortly after boot
  setInterval(() => {
    void (async () => {
      const mins = Number(await getSetting('email_poll_minutes').catch(() => null)) || 5;
      // align: only fire when the minute slot matches the configured cadence
      if (new Date().getMinutes() % Math.max(1, Math.min(60, mins)) === 0) await run();
    })();
  }, 60_000);
}

/** Production entrypoint: migrate, then listen. */
export async function start(): Promise<void> {
  await migrate();
  const app = await buildApp();
  try {
    await app.listen({ port: appConfig.PORT, host: appConfig.HOST });
    scheduleRecurring(app);
    scheduleEmailPoll(app);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

if (require.main === module) {
  void start();
}
