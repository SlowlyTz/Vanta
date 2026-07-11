import { WebSocketServer } from 'ws';
import { sessionMiddleware } from '../config/session.js';
import { WatchPartyService, startWatchPartyCleanup } from '../services/watch-party.service.js';

function ownerError(message) {
  const error = new Error(message);
  error.status = 403;
  return error;
}

export class WatchPartySocketHub {
  constructor() {
    this.wss = new WebSocketServer({ noServer: true });
    this.connectionsByParty = new Map(); // partyId -> Map<userId, Set<ws>>
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
      const user = { userId: req.session.userId, username: req.session.username };

      this.handleConnection({ ws, partyId, user });
    });

    startWatchPartyCleanup();

    return this.wss;
  }

  handleConnection({ ws, partyId, user }) {
    let party;
    try {
      party = WatchPartyService.getPartyOrThrow(partyId);
    } catch (error) {
      this.sendTo(ws, { type: 'ERROR', message: error.message });
      ws.close();
      return;
    }

    if (!party.members.has(user.userId)) {
      this.sendTo(ws, { type: 'ERROR', message: 'Du bist kein Mitglied dieser Watch Party' });
      ws.close();
      return;
    }

    this.registerConnection(partyId, user.userId, ws);
    WatchPartyService.setConnected({ partyId, userId: user.userId, connected: true });
    this.broadcastParty(partyId, { type: 'PARTY_UPDATED', party: WatchPartyService.serializeParty(party) });

    ws.on('message', raw => {
      let message;
      try {
        message = JSON.parse(raw.toString());
      } catch {
        return;
      }
      this.handleMessage({ partyId, userId: user.userId, message, ws });
    });

    ws.on('close', () => {
      this.unregisterConnection(partyId, user.userId, ws);

      const stillConnected = this.connectionsByParty.get(partyId)?.get(user.userId)?.size > 0;
      if (stillConnected) return;

      WatchPartyService.setConnected({ partyId, userId: user.userId, connected: false });
      const currentParty = WatchPartyService.parties.get(partyId);
      if (currentParty) {
        this.broadcastParty(partyId, { type: 'PARTY_UPDATED', party: WatchPartyService.serializeParty(currentParty) });
      }
    });
  }

  handleMessage({ partyId, userId, message, ws }) {
    if (!message || typeof message.type !== 'string') return;

    try {
      switch (message.type) {
        case 'PING':
          this.sendTo(ws, { type: 'PONG' });
          return;

        case 'READY': {
          const party = WatchPartyService.setReady({ partyId, userId, ready: Boolean(message.ready) });
          this.broadcastParty(partyId, { type: 'PARTY_UPDATED', party });
          return;
        }

        case 'OWNER_START': {
          const party = WatchPartyService.startParty({ partyId, ownerUserId: userId });
          this.broadcastParty(partyId, {
            type: 'LOAD_MEDIA',
            itemId: party.playableItemId,
            positionMs: 0
          });
          this.broadcastParty(partyId, { type: 'PARTY_UPDATED', party: WatchPartyService.serializeParty(party) });
          return;
        }

        case 'OWNER_PLAY':
        case 'OWNER_PAUSE':
        case 'OWNER_SEEK':
        case 'OWNER_SYNC':
          this.handleOwnerControl({ partyId, userId, message });
          return;

        default:
          return;
      }
    } catch (error) {
      this.sendTo(ws, { type: 'ERROR', message: error.message });
    }
  }

  handleOwnerControl({ partyId, userId, message }) {
    const party = WatchPartyService.getPartyOrThrow(partyId);
    if (party.ownerUserId !== userId) {
      throw ownerError('Only the party owner can control playback');
    }

    const now = Date.now();

    if (message.type === 'OWNER_PLAY') {
      party.status = 'playing';
      party.positionMs = Number(message.positionMs) || 0;
      party.lastServerTimeMs = now;
      this.broadcastParty(partyId, { type: 'CONTROL', action: 'play', positionMs: party.positionMs, serverTimeMs: now });
      return;
    }

    if (message.type === 'OWNER_PAUSE') {
      party.status = 'paused';
      party.positionMs = Number(message.positionMs) || 0;
      party.lastServerTimeMs = now;
      this.broadcastParty(partyId, { type: 'CONTROL', action: 'pause', positionMs: party.positionMs, serverTimeMs: now });
      return;
    }

    if (message.type === 'OWNER_SEEK') {
      party.positionMs = Number(message.positionMs) || 0;
      party.lastServerTimeMs = now;
      this.broadcastParty(partyId, {
        type: 'CONTROL',
        action: 'seek',
        positionMs: party.positionMs,
        playing: party.status === 'playing',
        serverTimeMs: now
      });
      return;
    }

    if (message.type === 'OWNER_SYNC') {
      party.positionMs = Number(message.positionMs) || 0;
      party.status = message.playing ? 'playing' : 'paused';
      party.lastServerTimeMs = now;
      this.broadcastParty(partyId, {
        type: 'SYNC',
        positionMs: party.positionMs,
        playing: Boolean(message.playing),
        serverTimeMs: now
      }, { skipUserId: userId });
    }
  }

  registerConnection(partyId, userId, ws) {
    if (!this.connectionsByParty.has(partyId)) this.connectionsByParty.set(partyId, new Map());
    const byUser = this.connectionsByParty.get(partyId);
    if (!byUser.has(userId)) byUser.set(userId, new Set());
    byUser.get(userId).add(ws);
  }

  unregisterConnection(partyId, userId, ws) {
    const byUser = this.connectionsByParty.get(partyId);
    if (!byUser) return;
    const sockets = byUser.get(userId);
    if (!sockets) return;
    sockets.delete(ws);
    if (sockets.size === 0) byUser.delete(userId);
    if (byUser.size === 0) this.connectionsByParty.delete(partyId);
  }

  sendTo(ws, payload) {
    if (ws.readyState !== ws.OPEN) return;
    ws.send(JSON.stringify(payload));
  }

  sendToUser(partyId, userId, payload) {
    const sockets = this.connectionsByParty.get(partyId)?.get(userId);
    if (!sockets) return;
    for (const ws of sockets) this.sendTo(ws, payload);
  }

  closeUserConnections(partyId, userId) {
    const sockets = this.connectionsByParty.get(partyId)?.get(userId);
    if (!sockets) return;
    for (const ws of [...sockets]) ws.close();
  }

  broadcastParty(partyId, payload, { skipUserId } = {}) {
    const byUser = this.connectionsByParty.get(partyId);
    if (!byUser) return;
    for (const [userId, sockets] of byUser) {
      if (skipUserId && userId === skipUserId) continue;
      for (const ws of sockets) this.sendTo(ws, payload);
    }
  }
}

export const watchPartySocketHub = new WatchPartySocketHub();

export function attachWatchPartySocketServer(server) {
  return watchPartySocketHub.attach(server);
}
