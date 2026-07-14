import { WatchPartyService, isPartyAdmin } from '../../services/watch-party.service.js';
import { ownerError, isPlaybackControlAllowed, createNotification } from './notifications.js';

export const messageHandlerMethods = {
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
};
