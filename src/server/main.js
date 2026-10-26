// Server process: HTTP server, WebSockets, background jobs and shutdown.
import http from 'http';
import app from './app.js';
import env from './config/env.js';
import { attachAppSocketServer, notifyNotificationsChanged } from './realtime/app.socket.js';
import { appEvents, NOTIFICATIONS_CHANGED } from './services/events.js';
import { attachWatchPartySocketServer } from './realtime/watch-party.socket.js';
import { getCatalog } from './services/catalog/index.js';
import { flushDatabase } from './db/database.js';
import { sessionStore } from './config/session.js';
import { createShutdown } from './shutdown.js';
import { rejectUnknownUpgrades } from './realtime/hardening.js';
import { NotificationTriggers } from './services/notification-triggers.js';
import { KnownUsersService } from './services/known-users.service.js';
import { startWatchPartyCleanup } from './services/watch-party.service.js';
import { watchPartySocketHub } from './realtime/watch-party.socket.js';

const PORT = env.PORT || 3000;
const server = http.createServer(app);

const appSockets = attachAppSocketServer(server);
appEvents.on(NOTIFICATIONS_CHANGED, notifyNotificationsChanged);
const watchPartySockets = attachWatchPartySocketServer(server);
rejectUnknownUpgrades(server, path => path === '/ws/app' || path.startsWith('/ws/watch-party/'));

server.listen(PORT, () => {
  console.log(`[Server] running on port ${PORT} in ${env.NODE_ENV} mode`);
  // A new version tells those who asked for it (once per version).
  NotificationTriggers.appStarted();
});

// Accounts with a stored session stay invitable after a restart.
sessionStore.ready
  .then(store => store.liveSessions().forEach(({ sess }) => KnownUsersService.remember({ userId: sess.userId, username: sess.username })))
  .catch(error => console.warn('[Sessions] known users not restored:', error.message));

// The catalogue mirror fills and refreshes itself in the background; a failure
// here must never keep the server from serving.
let catalogScheduler = null;
getCatalog()
  .then(({ scheduler }) => {
    catalogScheduler = scheduler;
    scheduler.start();
  })
  .catch(error => console.error('[Catalog] could not start the catalogue sync:', error.message));

// Parties nobody is in any more end; the hub drops their timers and sockets.
const partyCleanup = startWatchPartyCleanup({ onRemoved: partyId => watchPartySocketHub.forgetParty(partyId) });

const shutdown = createShutdown({
  server,
  socketServers: [appSockets, watchPartySockets],
  stopJobs: [() => catalogScheduler?.stop(), () => clearInterval(partyCleanup)],
  flushes: [flushDatabase, () => sessionStore.close()]
});
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// A rejected promise nobody awaited is a bug, but not a reason to stop
// serving everyone; it is logged with its stack. An uncaught exception leaves
// the process in an unknown state: the databases are written, then it exits
// and the process manager starts it again.
process.on('unhandledRejection', (reason) => {
  console.error('[Unhandled Rejection]', reason instanceof Error ? reason.stack : reason);
});
process.on('uncaughtException', (error) => {
  console.error('[Uncaught Exception]', error?.stack || error);
  for (const flush of [flushDatabase, () => sessionStore.close()]) {
    try { flush(); } catch (flushError) { console.error('[Shutdown] flush failed:', flushError?.message); }
  }
  process.exit(1);
});
