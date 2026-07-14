import { WatchPartyService } from '../../services/watch-party.service.js';

const OWNER_DISCONNECT_GRACE_MS = 30_000;
const SEEK_NOTIFICATION_THROTTLE_MS = 800;

export const countdownMethods = {
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
  },

  cancelCountdown(partyId) {
    const timer = this.countdownTimers.get(partyId);
    if (timer) {
      clearTimeout(timer);
      this.countdownTimers.delete(partyId);
    }
  },

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
  },

  cancelOwnerDisconnectTimer(partyId) {
    const timer = this.ownerDisconnectTimers.get(partyId);
    if (timer) {
      clearTimeout(timer);
      this.ownerDisconnectTimers.delete(partyId);
    }
  },

  shouldSendSeekNotification(partyId, now) {
    const previous = this.lastSeekNotificationAt.get(partyId) || 0;
    if (now - previous < SEEK_NOTIFICATION_THROTTLE_MS) return false;
    this.lastSeekNotificationAt.set(partyId, now);
    return true;
  }
};
