import session from 'express-session';
import env from './env.js';
import { SqliteSessionStore } from '../db/session-store.js';

// No cookie maxAge here: it ends with the browser session unless the login
// asked to stay signed in (see auth.routes.js), and rolling keeps that
// window fresh while the user is active.
export const sessionStore = new SqliteSessionStore();

// SIGINT/SIGTERM are handled in src/server/main.js (src/server/shutdown.js), which
// writes the sessions before exiting; this covers a process that just ends.
process.once('beforeExit', () => sessionStore.close());

export const sessionMiddleware = session({
  store: sessionStore,
  secret: env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    secure: env.COOKIE_SECURE,
    httpOnly: true,
    sameSite: 'lax'
  }
});
