import { WebSocketServer } from 'ws';
import { sessionMiddleware } from '../config/session.js';
import { BUILD_ID } from '../config/build.js';

export class AppSocketHub {
  constructor() {
    this.wss = new WebSocketServer({ noServer: true });
    this.connectionsByUser = new Map(); // userId -> Set<ws>
  }

  attach(server) {
    server.on('upgrade', (req, socket, head) => {
      const url = new URL(req.url, 'http://localhost');
      if (url.pathname !== '/ws/app') return;

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
      const user = {
        userId: req.session.userId,
        username: req.session.username
      };

      this.register(user.userId, ws);
      this.sendTo(ws, { type: 'APP_SOCKET_READY', serverTimeMs: Date.now(), build: BUILD_ID });

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
