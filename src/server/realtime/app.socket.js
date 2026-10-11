import { WebSocketServer } from 'ws';
import { sessionMiddleware } from '../config/session.js';
import { UserBanService } from '../services/user-ban.service.js';
import { WS_MAX_PAYLOAD, isAllowedOrigin, limitMessageRate, rejectUpgrade, startHeartbeat } from './hardening.js';
import { BUILD_ID } from '../config/build.js';
import { APP_VERSION } from '../../public/js/shared/version.js';

// Application close code: the session is gone, reconnecting is pointless.
export const SESSION_ENDED_CLOSE = 4001;

export class AppSocketHub {
  constructor() {
    this.wss = new WebSocketServer({ noServer: true, maxPayload: WS_MAX_PAYLOAD });
    this.connectionsByUser = new Map(); // userId -> Set<ws>
  }

  attach(server) {
    server.on('upgrade', (req, socket, head) => {
      const url = new URL(req.url, 'http://localhost');
      if (url.pathname !== '/ws/app') return;
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
      const user = {
        userId: req.session.userId,
        username: req.session.username
      };

      this.register(user.userId, ws);
      this.sendTo(ws, { type: 'APP_SOCKET_READY', serverTimeMs: Date.now(), build: BUILD_ID, version: APP_VERSION });

      ws.on('close', () => this.unregister(user.userId, ws));
    });

    return this.wss;
  }

  register(userId, ws) {
    if (!this.connectionsByUser.has(userId)) {
      this.connectionsByUser.set(userId, new Set());
    }
    this.connectionsByUser.get(userId).add(ws);
  }

  unregister(userId, ws) {
    const sockets = this.connectionsByUser.get(userId);
    if (!sockets) return;
    sockets.delete(ws);
    if (sockets.size === 0) this.connectionsByUser.delete(userId);
  }

  sendTo(ws, payload) {
    if (ws.readyState !== ws.OPEN) return;
    ws.send(JSON.stringify(payload));
  }

  broadcast(payload) {
    for (const sockets of this.connectionsByUser.values()) {
      for (const ws of sockets) this.sendTo(ws, payload);
    }
  }

  sendToUser(userId, payload) {
    const sockets = this.connectionsByUser.get(userId);
    if (!sockets) return;
    for (const ws of sockets) this.sendTo(ws, payload);
  }

  // Tells every open app of one user that its session is over (a ban), then
  // hangs up; the client shows the login with the reason.
  endUserSessions(userId, payload) {
    const sockets = this.connectionsByUser.get(userId);
    if (!sockets) return;
    for (const ws of [...sockets]) {
      this.sendTo(ws, { type: 'SESSION_ENDED', ...payload });
      ws.close(SESSION_ENDED_CLOSE, 'Session ended');
    }
  }
}

export const appSocketHub = new AppSocketHub();

// Something that feeds the menu dots changed (a new request or report, a
// decision): every open app asks for its own summary again. The message
// carries nothing, so nobody learns about other people's requests from it.
export function notifyNotificationsChanged() {
  appSocketHub.broadcast({ type: 'NOTIFICATIONS_CHANGED' });
}

export function attachAppSocketServer(server) {
  return appSocketHub.attach(server);
}
