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
import { dbConfig } from './config/db';
import { migrate } from './db/migrate';
import { registerAuthRoutes } from './auth/routes';
import { registerHealthRoutes } from './routes/health';
import { registerNowRoutes } from './routes/now';
import { registerUiGalleryRoutes } from './routes/uiGallery';
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
import { registerPlannerRoutes } from './routes/planner';
import { registerKitRoutes } from './routes/kit';
import { registerConceptRoutes } from './routes/concepts';
import { registerNoteCaptureRoutes } from './routes/noteCapture';
import { registerCoverageRoutes } from './routes/coverage';
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
import { registerMarkModalRoutes } from './routes/markModal';
import { registerMarkingPageRoutes } from './routes/markingPage';
import { registerAtlRoutes } from './routes/atl';
import { registerFreeRoutes } from './routes/free';
import { registerClubRoutes } from './routes/club';
import { registerPedagogyRoutes } from './routes/pedagogyPage';
import { registerSafeguardingRoutes } from './routes/safeguarding';
import { registerSearchRoutes } from './routes/search';
import { registerAssessmentRoutes } from './routes/assessments';
import { registerAssessmentTakeRoutes } from './routes/assessmentTake';
import { registerAssessmentMarkRoutes } from './routes/assessmentMark';
import { runDueAttemptMarks } from './services/assessmentMarkQueue';
import { isLimitedRole, roleAllows, ROLE_HOME } from './auth/lockdown';
import { signLessonImages } from './lib/lessonImageSig';
import { pupilCfg } from './auth/pupilAccessCache';
import { getPupilSessionState } from './repos/pupils';
import { getTaAccountState } from './repos/taAccounts';
import { teacherIdleMins } from './auth/teacherIdleCache';
import { generateDueInstances } from './repos/recurringTasks';
import { coverageAtRisk } from './repos/brief';
import { buildBrief } from './services/brief';
import { runDueMarkJobs } from './services/markingQueue';
import { processPendingDeletions } from './repos/fileDeletions';
import { wipeTestOccurrences } from './repos/testLab';
import { pollEmailOnce } from './services/emailPoll';
import { getSetting, setSetting } from './repos/settings';
import { sweepReviews } from './services/reviewLesson';
import { setNavDailyOverride, setExperienceMode } from './lib/nav';
import { localParts } from './lib/time';

// BUG-045: turn the TRUST_PROXY string into the value Fastify's trust-proxy expects — false (dev, no
// proxy), true, a hop count, or a subnet/IP string. Behind Caddy (which replaces X-Forwarded-For with
// the real client) this makes req.ip the actual client, so the per-IP login/PIN rate limits work.
function trustProxyOption(v: string): boolean | number | string {
  if (v === '' || v === 'false') return false;
  if (v === 'true') return true;
  const n = Number(v);
  return Number.isInteger(n) && String(n) === v ? n : v; // hop count, else a subnet/IP literal
}

/** Build the Fastify instance with all plugins and routes, without listening. */
export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: appConfig.NODE_ENV !== 'test', trustProxy: trustProxyOption(appConfig.TRUST_PROXY) });

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
  // fileSize: a single big file; files/parts: a whole-folder import (webkitdirectory) is many parts.
  await app.register(multipart, { limits: { fileSize: 500 * 1024 * 1024, files: 4000, parts: 4100 } });

  // HTMX 2.x won't swap a 4xx/5xx response, so a thrown handler error leaves the panel silently
  // doing nothing. For HTMX requests, reply 200 with a small error fragment the target CAN swap,
  // so the teacher always sees "something went wrong" instead of a dead button.
  app.setErrorHandler((err, req, reply) => {
    req.log.error({ err }, 'request handler error');
    // Preserve a real client-error status (CSRF 403, validation 400, …) — only an unexpected
    // throw is a 500. HTMX won't swap a non-2xx body, so for HTMX requests reply 200 with a
    // fragment the target CAN swap (so the teacher sees "something went wrong", not a dead button)
    // — but keep that to genuine handler crashes, so a 4xx still surfaces as the real status.
    const code = (err as { statusCode?: number }).statusCode;
    const status = typeof code === 'number' && code >= 400 ? code : 500;
    if (req.headers['hx-request'] === 'true' && status >= 500) {
      // 10.8: a background autosave (hx-swap="none") swallows this fragment, so ALSO fire a client
      // event — app.js / the pupil script surface a "not saved" banner so typed work is never lost
      // silently. (HTMX dispatches HX-Trigger names as events on <body>.)
      reply.header('HX-Trigger', 'app:save-failed');
      return reply.code(200).type('text/html').send('<p class="error">Something went wrong — please try again.</p>');
    }
    return reply.code(status).type('text/html').send('<p class="error">Something went wrong.</p>');
  });

  // Limited roles (ta, pupil) are deny-by-default: anything off their allowlist bounces to
  // their home surface. Pupil sessions also idle out (shared classroom machines), and the
  // pupil-access master switch *evicts* live sessions when turned off — so the DPIA kill-switch
  // actually revokes access, not just blocks new logins. The settings are cached (and invalidated
  // by the Settings handlers) so the hook rarely hits the DB. See auth/pupilAccessCache.
  // 10.8: bounce a session-kill cleanly for BOTH navigations and background HTMX requests. HTMX
  // can't follow a bare 302 on an hx POST (the autosave silently fails), so send HX-Redirect.
  const bounce = (req: import('fastify').FastifyRequest, reply: import('fastify').FastifyReply, url: string): void => {
    if (req.headers['hx-request'] === 'true') {
      reply.header('HX-Redirect', url);
      void reply.code(200).type('text/html').send('');
    } else {
      void reply.redirect(url);
    }
  };

  // Background polls (the 30s Now clock + day timeline, 45s Focus, the live pupil-work grid) must NOT
  // count as user activity — else an unattended laptop never idles out (the DPIA R3 control was defeated).
  // The
  // idle timeout is still ENFORCED on these requests; only the lastSeen bump is skipped.
  const isBackgroundPoll = (url: string): boolean =>
    url.startsWith('/now/clock') || url.startsWith('/now/timeline') || url.startsWith('/focus/inner') || /\/pupil-work(\?|$)/.test(url);

  app.addHook('onRequest', async (req, reply) => {
    const role = req.session?.get?.('role');
    const poll = isBackgroundPoll(req.url);
    // Teacher idle-logout (10.3): the privileged session must also time out on an unattended
    // classroom laptop — the control the threat model/DPIA R3 already claim. Pupils idle out below;
    // this covers the teacher role (the most-privileged session). Configurable; 0 disables.
    if (role === 'teacher' && !req.url.startsWith('/static/')) {
      const mins = await teacherIdleMins();
      if (mins > 0) {
        const last = Number(req.session.get('lastSeen') ?? 0);
        if (last && Date.now() - last > mins * 60_000) {
          req.session.delete();
          return bounce(req, reply, '/login?timeout=1');
        }
        if (!poll) req.session.set('lastSeen', Date.now());
      }
    }
    if (!isLimitedRole(role)) return;
    if (role === 'pupil' && !req.url.startsWith('/static/')) {
      const cfg = await pupilCfg();
      if (!cfg.accessOn) {
        // The teacher turned pupil access off (the DPIA gate) — kill the live session.
        req.session.delete();
        return bounce(req, reply, '/pupil');
      }
      // Per-pupil revocation (BUG-017): archived/erased (no row or inactive) or a bumped epoch (PIN
      // reset / disable) kills this self-contained session immediately, not just at next login.
      const pid = Number(req.session.get('pupilId') ?? 0);
      const st = pid ? await getPupilSessionState(pid) : null;
      if (!st || !st.active || st.epoch !== Number(req.session.get('pupilEpoch') ?? 0)) {
        req.session.delete();
        return bounce(req, reply, '/pupil');
      }
      const last = Number(req.session.get('lastSeen') ?? 0);
      if (last && Date.now() - last > cfg.idleMins * 60_000) {
        req.session.delete();
        return bounce(req, reply, '/pupil?timeout=1');
      }
      if (!poll) req.session.set('lastSeen', Date.now());
    }
    // Per-TA revocation (BUG-016): a named account that's been disabled / deleted (no row or inactive)
    // or re-passworded (bumped epoch) loses its live session immediately; a legacy shared-password TA
    // loses it when the teacher clears the shared password.
    if (role === 'ta' && !req.url.startsWith('/static/')) {
      const accId = Number(req.session.get('taAccountId') ?? 0);
      if (accId) {
        const st = await getTaAccountState(accId);
        if (!st || !st.active || st.epoch !== Number(req.session.get('taEpoch') ?? 0)) {
          req.session.delete();
          return bounce(req, reply, '/login');
        }
      } else if ((((await getSetting('ta_password_hash').catch(() => null)) ?? '').trim() === '')) {
        req.session.delete();
        return bounce(req, reply, '/login');
      }
    }
    if (!roleAllows(role, req.url)) return reply.redirect(ROLE_HOME[role]);
  });

  // BUG-003: sign every /lesson-image URL in the HTML we send a limited role, so their browser can only
  // request images the server actually rendered for them — the route rejects an unsigned/forged id for
  // pupils/TAs. Teachers are unrestricted, so their HTML is left untouched.
  app.addHook('onSend', async (req, reply, payload) => {
    const role = req.session?.get?.('role');
    if (!isLimitedRole(role) || typeof payload !== 'string') return payload;
    const ct = reply.getHeader('content-type');
    if (typeof ct === 'string' && ct.includes('text/html') && payload.includes('/lesson-image/')) {
      return signLessonImages(payload, Date.now());
    }
    return payload;
  });

  registerHealthRoutes(app);
  registerAuthRoutes(app);
  registerNowRoutes(app);
  registerUiGalleryRoutes(app);
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
  registerPlannerRoutes(app);
  registerKitRoutes(app);
  registerConceptRoutes(app);
  registerNoteCaptureRoutes(app);
  registerCoverageRoutes(app);
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
  registerMarkModalRoutes(app);
  registerMarkingPageRoutes(app);
  registerAtlRoutes(app);
  registerFreeRoutes(app);
  registerClubRoutes(app);
  registerPedagogyRoutes(app);
  registerSafeguardingRoutes(app);
  registerSearchRoutes(app);
  registerAssessmentRoutes(app);
  registerAssessmentTakeRoutes(app);
  registerAssessmentMarkRoutes(app);

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

/** 10.9: run any due open-marking jobs on boot (catching up on what was queued while the process
 * was down), then every 30s. Durable + idempotent — replaces the old in-memory setTimeout. */
function scheduleMarkingQueue(app: FastifyInstance): void {
  const run = async (): Promise<void> => {
    try {
      const n = await runDueMarkJobs();
      if (n > 0) app.log.info(`marking: ran ${n} due open-mark job(s)`);
    } catch (err) {
      app.log.error({ err }, 'marking queue sweep crashed');
    }
  };
  void run(); // boot sweep — catch up on jobs that came due during downtime
  setInterval(() => void run(), 30_000);
}

/** Phase 4: drain due assessment open-mark jobs on boot then every 30s (mirrors scheduleMarkingQueue). */
function scheduleAssessmentMarkQueue(app: FastifyInstance): void {
  const run = async (): Promise<void> => {
    try {
      const n = await runDueAttemptMarks();
      if (n > 0) app.log.info(`assessment marking: ran ${n} due open-mark job(s)`);
    } catch (err) {
      app.log.error({ err }, 'assessment mark queue sweep crashed');
    }
  };
  void run();
  setInterval(() => void run(), 30_000);
}

/** BUG-044: retry any outstanding resource-file deletions (e.g. a pupil screenshot whose unlink failed
 * during disposal). Idempotent + durable — runs on boot (catching up after a crash) then every 15 min. */
function schedulePendingDeletions(app: FastifyInstance): void {
  const run = async (): Promise<void> => {
    try {
      const r = await processPendingDeletions();
      if (r.cleared > 0 || r.failed > 0) app.log.info(`file deletions: cleared ${r.cleared}, ${r.failed} still pending`);
    } catch (err) {
      app.log.error({ err }, 'pending-file-deletion sweep crashed');
    }
  };
  void run(); // boot sweep — finish deletions interrupted by a restart
  setInterval(() => void run(), 15 * 60 * 1000);
}

/** Test Lab: sweep away STALE test runs (is_test occurrences older than ~1 day, by created_at) on boot
 * then every 6h — catches a teacher who closed the tab without hitting "Reset". created_at-based, not
 * date-based, because a Test Lab run can be dated anything (a date-based reaper would miss far-future runs). */
function scheduleTestLabReaper(app: FastifyInstance): void {
  const run = async (): Promise<void> => {
    try {
      const n = await wipeTestOccurrences(true);
      if (n > 0) app.log.info(`test lab: reaped ${n} stale test run(s)`);
    } catch (err) {
      app.log.error({ err }, 'test-lab reaper crashed');
    }
  };
  void run();
  setInterval(() => void run(), 6 * 60 * 60 * 1000);
}

/** Wave 7.1: compute the morning brief on boot then daily, logging a one-line summary. This is the
 * seam scheduled AI work (7.2 reviewer sweep, 7.3 spaced retrieval) will hook onto. Read-only. */
function scheduleMorningBrief(app: FastifyInstance): void {
  const run = async (): Promise<void> => {
    try {
      const today = localParts(new Date(), 'Europe/London').isoDate;
      const items = buildBrief({ today, coverage: await coverageAtRisk(), nextSchoolDay: null, markingClasses: 0 });
      const risks = items.filter((i) => i.level !== 'info').length;
      if (risks > 0) app.log.info(`morning brief: ${risks} coverage risk(s) flagged`);
    } catch (err) {
      app.log.error({ err }, 'morning brief job crashed');
    }
  };
  void run();
  setInterval(() => void run(), 24 * 60 * 60 * 1000);
}

/** Wave 7.2: the off-by-default nightly reviewer sweep. NEVER on boot (no spend on restart); ticks
 * every 30 min but only acts once per calendar day in a 4–7am window, claiming the day BEFORE spending
 * so a restart can't double-spend. Capped per run; the monthly £-cap is the backstop. */
function scheduleReviewSweep(app: FastifyInstance): void {
  const run = async (): Promise<void> => {
    const daily = Number(await getSetting('ai_review_sweep_daily').catch(() => null)) || 0;
    if (daily <= 0) return; // off by default — no AI spend
    const today = localParts(new Date(), 'Europe/London').isoDate;
    const prev = (await getSetting('ai_review_sweep_last').catch(() => null)) ?? '';
    if (prev === today) return; // already swept today
    const hour = new Date().getHours();
    if (hour < 4 || hour >= 8) return; // only the early-morning window
    // BUG-048: claim the day BEFORE spending so a restart/overlapping tick can't double-spend — but if
    // the work then FAILS, RELEASE the claim (restore the prior value) so a later tick in the window
    // retries instead of silently losing the day. sweepReviews is per-lesson idempotent (a lesson with an
    // open review is skipped), so a retry tops up toward the cap rather than re-reviewing what's done.
    await setSetting('ai_review_sweep_last', today);
    try {
      const r = await sweepReviews(Math.min(daily, 10));
      if (r.reviewed > 0) app.log.info(`review sweep: reviewed ${r.reviewed} lesson(s)${r.stopped ? ' (stopped at cap)' : ''}`);
    } catch (err) {
      await setSetting('ai_review_sweep_last', prev).catch(() => {}); // release for retry
      app.log.error({ err }, 'review sweep crashed — released the day for a later retry');
    }
  };
  setInterval(() => void run(), 30 * 60 * 1000); // every 30 min, gated to once/day in the AM window
}

/** Production entrypoint: migrate, then listen. */
export async function start(): Promise<void> {
  // BUG-032: refuse to run in production on the built-in default DB password — a footgun if the operator
  // forgot to set DB_PASSWORD (the installer generates a random one). Dev/test keep the default freely.
  if (appConfig.NODE_ENV === 'production' && /:organiser@/.test(dbConfig.DATABASE_URL)) {
    console.error('Refusing to start: DATABASE_URL still uses the default DB password "organiser". Set a strong DB_PASSWORD in app/.env (deploy/install.sh generates one) and restart.');
    process.exit(1);
  }
  await migrate();
  const app = await buildApp();
  // Prime the teacher-configurable daily-nav set (idea 6) + the Rail & Stage experience switch from
  // settings, once, into the write-through values layout() reads (it is synchronous and can't await).
  try {
    const navRaw = await getSetting('nav_daily');
    if (navRaw) setNavDailyOverride(JSON.parse(navRaw) as string[]);
  } catch (err) {
    app.log.warn({ err }, 'nav_daily preload failed; using the default daily set');
  }
  try {
    setExperienceMode(await getSetting('experience'));
  } catch (err) {
    app.log.warn({ err }, 'experience preload failed; defaulting to everyday');
  }
  try {
    await app.listen({ port: appConfig.PORT, host: appConfig.HOST });
    scheduleRecurring(app);
    scheduleEmailPoll(app);
    scheduleMarkingQueue(app);
    scheduleAssessmentMarkQueue(app);
    schedulePendingDeletions(app);
    scheduleMorningBrief(app);
    scheduleReviewSweep(app);
    scheduleTestLabReaper(app);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

if (require.main === module) {
  void start();
}
