import session from 'express-session';
import env from './env.js';
import { SqliteSessionStore } from '../db/session-store.js';

// No cookie maxAge here: it ends with the browser session unless the login
// asked to stay signed in (see auth.routes.js), and rolling keeps that
// window fresh while the user is active.
export const sessionStore = new SqliteSessionStore();

const flushSessions = () => sessionStore.close();
process.once('SIGINT', flushSessions);
process.once('SIGTERM', flushSessions);
process.once('beforeExit', flushSessions);

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
