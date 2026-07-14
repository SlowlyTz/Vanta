import { WebSocketServer } from 'ws';
import { sessionMiddleware } from '../config/session.js';
import { startWatchPartyCleanup } from '../services/watch-party.service.js';
import { connectionRegistryMethods } from './watch-party/connectionRegistry.js';
import { countdownMethods } from './watch-party/countdowns.js';
import { messageHandlerMethods } from './watch-party/messageHandlers.js';
import { connectionLifecycleMethods } from './watch-party/connectionLifecycle.js';

export class WatchPartySocketHub {
  constructor() {
    this.wss = new WebSocketServer({ noServer: true });
    this.connectionsByParty = new Map(); // partyId -> Map<userId, Set<ws>>
    this.ownerDisconnectTimers = new Map(); // partyId -> Timeout
    this.countdownTimers = new Map(); // partyId -> Timeout
    this.lastSeekNotificationAt = new Map(); // partyId -> timestamp
  }

  attach(server) {
    server.on('upgrade', (req, socket, head) => {
      const url = new URL(req.url, 'http://localhost');
      if (!url.pathname.startsWith('/ws/watch-party/')) return;

      sessionMiddleware(req, {}, () => {
        if (!req.session?.userId) {
          socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
          socket.destroy();
          return;
        }

        this.wss.handleUpgrade(req, socket, head, ws => {
          this.wss.emit('connection', ws, req);
        });
      });
    });

    this.wss.on('connection', (ws, req) => {
      const url = new URL(req.url, 'http://localhost');
      const partyId = url.pathname.split('/').pop();
      const user = {
        userId: req.session.userId,
        username: req.session.username,
        accessToken: req.session.accessToken
      };

      this.handleConnection({ ws, partyId, user });
    });

    startWatchPartyCleanup();

    return this.wss;
  }
}

Object.assign(
  WatchPartySocketHub.prototype,
  connectionRegistryMethods,
  countdownMethods,
  messageHandlerMethods,
  connectionLifecycleMethods
);

export const watchPartySocketHub = new WatchPartySocketHub();

export function attachWatchPartySocketServer(server) {
  return watchPartySocketHub.attach(server);
}
