import '@fastify/secure-session';

// Declare the shape of our session so `session.get`/`set` are type-safe.
declare module '@fastify/secure-session' {
  interface SessionData {
    authed: boolean;
  }
}
