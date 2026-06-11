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
import { registerResourceRoutes } from './routes/resources';
import { generateDueInstances } from './repos/recurringTasks';
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
  registerResourceRoutes(app);

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

/** Production entrypoint: migrate, then listen. */
export async function start(): Promise<void> {
  await migrate();
  const app = await buildApp();
  try {
    await app.listen({ port: appConfig.PORT, host: appConfig.HOST });
    scheduleRecurring(app);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

if (require.main === module) {
  void start();
}
