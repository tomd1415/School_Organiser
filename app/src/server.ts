import { join } from 'node:path';
import Fastify, { type FastifyInstance } from 'fastify';
import cookie from '@fastify/cookie';
import formbody from '@fastify/formbody';
import secureSession from '@fastify/secure-session';
import csrf from '@fastify/csrf-protection';
import fastifyStatic from '@fastify/static';
import { appConfig } from './config/app';
import { migrate } from './db/migrate';
import { registerAuthRoutes } from './auth/routes';
import { registerHealthRoutes } from './routes/health';
import { registerNowRoutes } from './routes/now';
import { registerTimetableRoutes } from './routes/timetable';
import { registerLessonRoutes } from './routes/lesson';

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

  registerHealthRoutes(app);
  registerAuthRoutes(app);
  registerNowRoutes(app);
  registerTimetableRoutes(app);
  registerLessonRoutes(app);

  return app;
}

/** Production entrypoint: migrate, then listen. */
export async function start(): Promise<void> {
  await migrate();
  const app = await buildApp();
  try {
    await app.listen({ port: appConfig.PORT, host: appConfig.HOST });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

if (require.main === module) {
  void start();
}
