import { WatchPartyService, isPartyAdmin } from '../../services/watch-party.service.js';
import { ownerError, isPlaybackControlAllowed, createNotification } from './notifications.js';
import {
  getEffectivePosition,
  getSyncLeaderUserId,
  resolveAnchorTime,
  serializeTimeline,
  setTimeline,
  SYNC_CORRECTION_THRESHOLD_MS,
  SYNC_STABLE_MIN_MS
} from '../../services/watch-party/helpers.js';

export const messageHandlerMethods = {
  handleMessage({ partyId, user, message, ws }) {
    if (!message || typeof message.type !== 'string') return;
    const userId = user.userId;

    try {
      switch (message.type) {
        case 'PING':
          this.sendTo(ws, { type: 'PONG' });
          return;

        case 'TIME_PING':
          this.sendTo(ws, {
            type: 'TIME_PONG',
            clientSentAt: Number(message.clientSentAt) || 0,
            serverTimeMs: Date.now()
          });
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
            message: message.message,
            progress: message.progress
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
              durationMs: countdown.durationMs,
              positionMs: countdown.positionMs,
              timeline: serializeTimeline(countdown.party)
            });
            this.broadcastParty(partyId, {
              type: 'PARTY_UPDATED',
              party: WatchPartyService.serializeParty(countdown.party)
            });
            this.scheduleCountdownCompletion(partyId, countdown.startsAtServerTimeMs);
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
  },

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
  },

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
  },

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
  },

  handleOwnerControl({ partyId, userId, message }) {
    const party = WatchPartyService.getPartyOrThrow(partyId);
    if (!isPartyAdmin(party, userId)) {
      throw ownerError('Only party admins can control playback');
    }

    if (!isPlaybackControlAllowed(party)) {
      if (message.type === 'OWNER_SYNC') return;
      throw ownerError('Die Watch Party wurde noch nicht gestartet');
    }

    const now = Date.now();
    const anchorServerTimeMs = resolveAnchorTime(message.atServerTimeMs, now);
    const positionMs = Number(message.positionMs) || 0;

    if (message.type === 'OWNER_PLAY') {
      setTimeline(party, { positionMs, playing: true, anchorServerTimeMs });
      this.broadcastTimeline(partyId, party, { actorUserId: userId, reason: 'play' });
      this.broadcastParty(partyId, createNotification('owner_play'), { skipUserId: userId });
      return;
    }

    if (message.type === 'OWNER_PAUSE') {
      setTimeline(party, { positionMs, playing: false, anchorServerTimeMs });
      this.broadcastTimeline(partyId, party, { actorUserId: userId, reason: 'pause' });
      this.broadcastParty(partyId, createNotification('owner_pause'), { skipUserId: userId });
      return;
    }

    if (message.type === 'OWNER_SEEK') {
      setTimeline(party, { positionMs, anchorServerTimeMs });
      this.broadcastTimeline(partyId, party, { actorUserId: userId, reason: 'seek' });
      if (this.shouldSendSeekNotification(partyId, now)) {
        this.broadcastParty(partyId, createNotification('owner_seek', { positionMs: party.positionMs }), { skipUserId: userId });
      }
      return;
    }

    if (message.type === 'OWNER_SYNC') {
      this.handleLeaderHeartbeat({ partyId, party, userId, message, positionMs, anchorServerTimeMs });
    }
  },

  // The server timeline is authoritative and advances on its own. A heartbeat
  // only pulls it back when the leader has been playing smoothly for a while
  // and still disagrees by more than a second; a buffering or freshly seeked
  // leader must never drag everyone else along.
  handleLeaderHeartbeat({ partyId, party, userId, message, positionMs, anchorServerTimeMs }) {
    if (getSyncLeaderUserId(party) !== userId) return;
    if (party.status !== 'playing' || !message.playing || message.buffering) return;
    if (!(Number(message.stableMs) >= SYNC_STABLE_MIN_MS)) return;

    const expectedMs = getEffectivePosition(party, anchorServerTimeMs);
    if (Math.abs(positionMs - expectedMs) <= SYNC_CORRECTION_THRESHOLD_MS) return;

    setTimeline(party, { positionMs, anchorServerTimeMs });
    this.broadcastTimeline(partyId, party, { actorUserId: userId, reason: 'sync' });
  },

  broadcastTimeline(partyId, party, { actorUserId = null, reason }, options) {
    this.broadcastParty(partyId, {
      type: 'TIMELINE',
      timeline: serializeTimeline(party),
      actorUserId,
      reason
    }, options);
  }
};
