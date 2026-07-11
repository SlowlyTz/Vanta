import http from 'http';
import app from './src/server/app.js';
import env from './src/server/config/env.js';
import { attachWatchPartySocketServer } from './src/server/realtime/watch-party.socket.js';

const PORT = env.PORT || 3000;
const server = http.createServer(app);

attachWatchPartySocketServer(server);

server.listen(PORT, () => {
  console.log(`[Server] running on port ${PORT} in ${env.NODE_ENV} mode`);
});
