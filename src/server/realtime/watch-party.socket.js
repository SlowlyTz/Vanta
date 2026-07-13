import crypto from 'crypto';
import { WebSocketServer } from 'ws';
import { sessionMiddleware } from '../config/session.js';
import { WatchPartyService, startWatchPartyCleanup, getPartyEffectivePosition, isPartyAdmin } from '../services/watch-party.service.js';

const OWNER_DISCONNECT_GRACE_MS = 30_000;
const SEEK_NOTIFICATION_THROTTLE_MS = 800;

function ownerError(message) {
  const error = new Error(message);
  error.status = 403;
  return error;
}

function isPlaybackControlAllowed(party) {
  return party.status === 'playing' || party.status === 'paused';
}

function formatNotificationPosition(positionMs) {
  const totalSeconds = Math.max(0, Math.floor((Number(positionMs) || 0) / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function createNotification(type, { username, positionMs } = {}) {
  const messages = {
    member_joined: `${username} ist beigetreten.`,
    member_rejoined: `${username} ist beigetreten.`,
    member_left: `${username} hat die Watch Party verlassen.`,
    owner_play: 'Der Admin hat die Wiedergabe gestartet.',
    owner_pause: 'Der Admin hat pausiert.',
    owner_seek: `Der Admin hat zu ${formatNotificationPosition(positionMs)} gespult.`,
    member_promoted: `${username} ist jetzt Admin.`,
    member_banned: `${username} wurde aus der Watch Party gebannt.`
  };

  return {
    type: 'NOTIFICATION',
    notification: {
      id: crypto.randomUUID(),
      type,
      icon: type === 'member_rejoined' ? 'member_joined' : type,
      message: messages[type] || 'Watch Party aktualisiert.',
      createdAt: Date.now()
    }
  };
}

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

    const member = party.members.get(user.userId);
    const wasConnected = Boolean(member.connected);
    const wasSeenBefore = Boolean(member.hasConnectedOnce);

    this.registerConnection(partyId, user.userId, ws);
    WatchPartyService.setConnected({ partyId, userId: user.userId, connected: true });
    member.hasConnectedOnce = true;

    if (party.ownerUserId === user.userId) {
      this.cancelOwnerDisconnectTimer(partyId);
    }

    this.sendTo(ws, {
      type: 'PARTY_STATE',
      party: WatchPartyService.serializeParty(party, user.userId),
      effectivePositionMs: getPartyEffectivePosition(party),
      serverTimeMs: Date.now()
    });

    if (!wasConnected) {
      this.broadcastParty(
        partyId,
        createNotification(wasSeenBefore ? 'member_rejoined' : 'member_joined', { username: member.username }),
        { skipUserId: user.userId }
      );
    }

    this.broadcastParty(partyId, { type: 'PARTY_UPDATED', party: WatchPartyService.serializeParty(party) });

    ws.on('message', raw => {
      let message;
      try {
        message = JSON.parse(raw.toString());
      } catch {
        return;
      }
      this.handleMessage({ partyId, user, message, ws });
    });

    ws.on('close', () => {
      this.unregisterConnection(partyId, user.userId, ws);

      const stillConnected = this.connectionsByParty.get(partyId)?.get(user.userId)?.size > 0;
      if (stillConnected) return;

      WatchPartyService.setConnected({ partyId, userId: user.userId, connected: false });
      const currentParty = WatchPartyService.parties.get(partyId);
      if (!currentParty) return;

      if (currentParty.ownerUserId === user.userId && currentParty.status !== 'ended') {
        this.scheduleOwnerDisconnectEnd(partyId, user.userId);
      }

      this.broadcastParty(
        partyId,
        createNotification('member_left', { username: user.username }),
        { skipUserId: user.userId }
      );

      this.broadcastParty(partyId, { type: 'PARTY_UPDATED', party: WatchPartyService.serializeParty(currentParty) });
    });
  }

  handleMessage({ partyId, user, message, ws }) {
    if (!message || typeof message.type !== 'string') return;
    const userId = user.userId;

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

        case 'PRELOAD_STATE': {
          const party = WatchPartyService.setPreloadState({
            partyId,
            userId,
            state: message.state,
            message: message.message
          });
          this.broadcastParty(partyId, { type: 'PARTY_UPDATED', party });
          return;
        }

        case 'PLAYER_READY_STATE': {
          const party = WatchPartyService.setPlayerReady({
            partyId,
            userId,
            ready: false,
            state: message.state,
            message: message.message
          });
          this.broadcastParty(partyId, { type: 'PARTY_UPDATED', party: WatchPartyService.serializeParty(party) });
          return;
        }

        case 'PLAYER_READY': {
          const party = WatchPartyService.setPlayerReady({
            partyId,
            userId,
            ready: true,
            state: 'ready',
            message: 'Bereit'
          });
          this.broadcastParty(partyId, { type: 'PARTY_UPDATED', party: WatchPartyService.serializeParty(party) });

          const countdown = WatchPartyService.beginCountdownIfReady({ partyId });
          if (countdown) {
            this.broadcastParty(partyId, {
              type: 'COUNTDOWN',
              startsAtServerTimeMs: countdown.startsAtServerTimeMs,
              positionMs: countdown.positionMs
            });
            this.broadcastParty(partyId, {
              type: 'PARTY_UPDATED',
              party: WatchPartyService.serializeParty(countdown.party)
            });
            this.scheduleCountdownCompletion(partyId, countdown.startsAtServerTimeMs, countdown.positionMs);
          }
          return;
        }

        case 'OWNER_OPEN_READY_ROOM': {
          const party = WatchPartyService.openReadyRoom({ partyId, ownerUserId: userId });
          this.broadcastParty(partyId, {
            type: 'PARTY_UPDATED',
            party: WatchPartyService.serializeParty(party)
          });
          return;
        }

        case 'OWNER_START': {
          const party = WatchPartyService.openReadyRoom({ partyId, ownerUserId: userId });
          this.broadcastParty(partyId, {
            type: 'PARTY_UPDATED',
            party: WatchPartyService.serializeParty(party)
          });
          return;
        }

        case 'OWNER_CHANGE_EPISODE':
          this.handleChangeEpisode({ partyId, user, itemId: message.itemId });
          return;

        case 'OWNER_PLAY':
        case 'OWNER_PAUSE':
        case 'OWNER_SEEK':
        case 'OWNER_SYNC':
          this.handleOwnerControl({ partyId, userId, message });
          return;

        case 'ADMIN_PROMOTE_MEMBER':
          this.handleAdminPromoteMember({ partyId, user, message });
          return;

        case 'ADMIN_BAN_MEMBER':
          this.handleAdminBanMember({ partyId, user, message });
          return;

        default:
          return;
      }
    } catch (error) {
      this.sendTo(ws, { type: 'ERROR', message: error.message });
    }
  }

  async handleChangeEpisode({ partyId, user, itemId }) {
    try {
      const party = await WatchPartyService.changeEpisode({
        partyId,
        ownerUserId: user.userId,
        accessToken: user.accessToken,
        itemId
      });

      this.broadcastParty(partyId, {
        type: 'LOAD_MEDIA',
        itemId: party.playableItemId,
        positionMs: 0,
        reason: 'episode-change',
        message: `${party.itemSnapshot.name} wird abgespielt`
      });

      this.broadcastParty(partyId, {
        type: 'PARTY_UPDATED',
        party: WatchPartyService.serializeParty(party)
      });
    } catch (error) {
      this.sendToUser(partyId, user.userId, { type: 'ERROR', message: error.message });
    }
  }

  handleAdminPromoteMember({ partyId, user, message }) {
    const party = WatchPartyService.promoteMember({
      partyId,
      actorUserId: user.userId,
      targetUserId: message.targetUserId
    });

    const promoted = party.members.find(member => member.userId === message.targetUserId);

    this.broadcastParty(partyId, {
      type: 'PARTY_UPDATED',
      party
    });

    this.broadcastParty(partyId, createNotification('member_promoted', {
      username: promoted?.username || 'Ein Nutzer'
    }));
  }

  handleAdminBanMember({ partyId, user, message }) {
    const result = WatchPartyService.banMember({
      partyId,
      actorUserId: user.userId,
      targetUserId: message.targetUserId
    });

    this.sendToUser(partyId, message.targetUserId, {
      type: 'BANNED_FROM_PARTY',
      message: 'Du wurdest aus dieser Watch Party ausgeschlossen.'
    });

    this.closeUserConnections(partyId, message.targetUserId);

    this.broadcastParty(partyId, {
      type: 'PARTY_UPDATED',
      party: result.party
    });

    this.broadcastParty(partyId, createNotification('member_banned', {
      username: result.bannedUser.username
    }));
  }

  scheduleCountdownCompletion(partyId, startsAtServerTimeMs, positionMs) {
    this.cancelCountdown(partyId);

    const delay = Math.max(0, startsAtServerTimeMs - Date.now());
    const timer = setTimeout(() => {
      this.countdownTimers.delete(partyId);
      const party = WatchPartyService.beginPlayback({ partyId, positionMs });
      if (!party) return;

      this.broadcastParty(partyId, {
        type: 'CONTROL',
        action: 'play',
        positionMs: party.positionMs,
        serverTimeMs: party.lastServerTimeMs
      });
      this.broadcastParty(partyId, { type: 'PARTY_UPDATED', party: WatchPartyService.serializeParty(party) });
    }, delay);
    timer.unref?.();
    this.countdownTimers.set(partyId, timer);
  }

  cancelCountdown(partyId) {
    const timer = this.countdownTimers.get(partyId);
    if (timer) {
      clearTimeout(timer);
      this.countdownTimers.delete(partyId);
    }
  }

  scheduleOwnerDisconnectEnd(partyId, ownerUserId) {
    this.cancelOwnerDisconnectTimer(partyId);

    const timer = setTimeout(() => {
      this.ownerDisconnectTimers.delete(partyId);
      const party = WatchPartyService.parties.get(partyId);
      if (!party || party.status === 'ended') return;

      const ownerConnected = party.members.get(ownerUserId)?.connected;
      if (ownerConnected) return;

      this.cancelCountdown(partyId);
      const ended = WatchPartyService.endParty({ partyId, ownerUserId, reason: 'owner-disconnected' });

      this.broadcastParty(partyId, {
        type: 'PARTY_ENDED',
        party: ended,
        message: 'Die Watch Party wurde beendet, weil der Owner die Verbindung verloren hat.'
      });
    }, OWNER_DISCONNECT_GRACE_MS);
    timer.unref?.();
    this.ownerDisconnectTimers.set(partyId, timer);
  }

  cancelOwnerDisconnectTimer(partyId) {
    const timer = this.ownerDisconnectTimers.get(partyId);
    if (timer) {
      clearTimeout(timer);
      this.ownerDisconnectTimers.delete(partyId);
    }
  }

  handleOwnerControl({ partyId, userId, message }) {
    const party = WatchPartyService.getPartyOrThrow(partyId);
    if (!isPartyAdmin(party, userId)) {
      throw ownerError('Only party admins can control playback');
    }

    const now = Date.now();

    if (!isPlaybackControlAllowed(party)) {
      if (message.type === 'OWNER_SYNC') return;
      throw ownerError('Die Watch Party wurde noch nicht gestartet');
    }

    if (message.type === 'OWNER_PLAY') {
      party.status = 'playing';
      party.positionMs = Number(message.positionMs) || 0;
      party.lastServerTimeMs = now;
      this.broadcastParty(partyId, { type: 'CONTROL', action: 'play', positionMs: party.positionMs, serverTimeMs: now });
      this.broadcastParty(partyId, createNotification('owner_play'));
      return;
    }

    if (message.type === 'OWNER_PAUSE') {
      party.status = 'paused';
      party.positionMs = Number(message.positionMs) || 0;
      party.lastServerTimeMs = now;
      this.broadcastParty(partyId, { type: 'CONTROL', action: 'pause', positionMs: party.positionMs, serverTimeMs: now });
      this.broadcastParty(partyId, createNotification('owner_pause'));
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
      if (this.shouldSendSeekNotification(partyId, now)) {
        this.broadcastParty(partyId, createNotification('owner_seek', { positionMs: party.positionMs }));
      }
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

  shouldSendSeekNotification(partyId, now) {
    const previous = this.lastSeekNotificationAt.get(partyId) || 0;
    if (now - previous < SEEK_NOTIFICATION_THROTTLE_MS) return false;
    this.lastSeekNotificationAt.set(partyId, now);
    return true;
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
