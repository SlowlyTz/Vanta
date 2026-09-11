import http from 'http';
import app from './src/server/app.js';
import env from './src/server/config/env.js';
import { attachAppSocketServer } from './src/server/realtime/app.socket.js';
import { attachWatchPartySocketServer } from './src/server/realtime/watch-party.socket.js';
import { getCatalog } from './src/server/services/catalog/index.js';

const PORT = env.PORT || 3000;
const server = http.createServer(app);

attachAppSocketServer(server);
attachWatchPartySocketServer(server);

server.listen(PORT, () => {
  console.log(`[Server] running on port ${PORT} in ${env.NODE_ENV} mode`);
});

// The catalogue mirror fills and refreshes itself in the background; a failure
// here must never keep the server from serving.
getCatalog()
  .then(({ scheduler }) => scheduler.start())
  .catch(error => console.error('[Catalog] could not start the catalogue sync:', error.message));
