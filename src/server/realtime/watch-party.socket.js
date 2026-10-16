import { WebSocketServer } from 'ws';
import { sessionMiddleware } from '../config/session.js';
import { UserBanService } from '../services/user-ban.service.js';
import { WS_MAX_PAYLOAD, isAllowedOrigin, limitMessageRate, rejectUpgrade, startHeartbeat } from './hardening.js';
import { registerTokenDevice } from '../services/jellyfin/client.js';
import { startWatchPartyCleanup } from '../services/watch-party.service.js';
import { connectionRegistryMethods } from './watch-party/connectionRegistry.js';
import { countdownMethods } from './watch-party/countdowns.js';
import { messageHandlerMethods } from './watch-party/messageHandlers.js';
import { connectionLifecycleMethods } from './watch-party/connectionLifecycle.js';
import { waitingMethods } from './watch-party/waiting.js';
import { episodeSwitchMethods } from './watch-party/episodeSwitch.js';

export class WatchPartySocketHub {
  constructor() {
    this.wss = new WebSocketServer({ noServer: true, maxPayload: WS_MAX_PAYLOAD });
    this.connectionsByParty = new Map(); // partyId -> Map<userId, Set<ws>>
    this.countdownTimers = new Map(); // partyId -> Timeout
    this.lastSeekNotificationAt = new Map(); // partyId -> timestamp
    this.initWaiting();
    this.initEpisodeSwitch();
  }

  attach(server) {
    server.on('upgrade', (req, socket, head) => {
      const url = new URL(req.url, 'http://localhost');
      if (!url.pathname.startsWith('/ws/watch-party/')) return;
      if (!isAllowedOrigin(req)) {
        rejectUpgrade(socket, 403, 'Forbidden');
        return;
      }

      sessionMiddleware(req, {}, () => {
        // A banned user's session normally ends with the ban; this covers a
        // ban written by hand while the session was still around.
        if (!req.session?.userId || UserBanService.isBanned(req.session.userId)) {
          rejectUpgrade(socket, 401, 'Unauthorized');
          return;
        }

        this.wss.handleUpgrade(req, socket, head, ws => {
          this.wss.emit('connection', ws, req);
        });
      });
    });

    startHeartbeat(this.wss);

    this.wss.on('connection', (ws, req) => {
      limitMessageRate(ws);
      const url = new URL(req.url, 'http://localhost');
      const partyId = url.pathname.split('/').pop();
      registerTokenDevice(req.session.accessToken, req.session.deviceId);
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
  episodeSwitchMethods,
  connectionLifecycleMethods,
  waitingMethods
);

export const watchPartySocketHub = new WatchPartySocketHub();

export function attachWatchPartySocketServer(server) {
  return watchPartySocketHub.attach(server);
}
