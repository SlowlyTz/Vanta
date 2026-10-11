import http from 'http';
import app from './src/server/app.js';
import env from './src/server/config/env.js';
import { attachAppSocketServer } from './src/server/realtime/app.socket.js';
import { attachWatchPartySocketServer } from './src/server/realtime/watch-party.socket.js';
import { getCatalog } from './src/server/services/catalog/index.js';
import { flushDatabase } from './src/server/db/database.js';
import { sessionStore } from './src/server/config/session.js';
import { createShutdown } from './src/server/shutdown.js';

const PORT = env.PORT || 3000;
const server = http.createServer(app);

const appSockets = attachAppSocketServer(server);
const watchPartySockets = attachWatchPartySocketServer(server);

server.listen(PORT, () => {
  console.log(`[Server] running on port ${PORT} in ${env.NODE_ENV} mode`);
});

// The catalogue mirror fills and refreshes itself in the background; a failure
// here must never keep the server from serving.
let catalogScheduler = null;
getCatalog()
  .then(({ scheduler }) => {
    catalogScheduler = scheduler;
    scheduler.start();
  })
  .catch(error => console.error('[Catalog] could not start the catalogue sync:', error.message));

const shutdown = createShutdown({
  server,
  socketServers: [appSockets, watchPartySockets],
  stopJobs: [() => catalogScheduler?.stop()],
  flushes: [flushDatabase, () => sessionStore.close()]
});
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
