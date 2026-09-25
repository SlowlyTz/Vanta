import { WatchPartyService } from '../../services/watch-party.service.js';
import { getEffectivePosition, setTimeline } from '../../services/watch-party/helpers.js';

// "Wait for buffering": when a member's player has been stuck buffering for a
// few seconds while the party plays, the whole party pauses until that member
// (and anyone else still loading by then) has enough video buffered again,
// then everyone starts together. There is no time limit; an admin can always
// go on by hand, and the host can switch the wait off for the session.

export const BUFFERING_GRACE_MS = 3_000;
export const READY_BUFFER_MS = 3_000;
// A waited-for member who drops out gets this long to come back (network
// switch, reload) before the party goes on without them.
export const DISCONNECT_GRACE_MS = 20_000;
// Resuming is anchored a little in the future so every client starts at once.
export const RESUME_LEAD_MS = 1_000;

const timerKey = (partyId, userId) => `${partyId}:${userId}`;

export const waitingMethods = {
  initWaiting() {
    this.bufferingTimers = new Map();
    this.waitDropoutTimers = new Map();
  },

  // Called for every PLAYER_STATUS after it was stored on the member.
  trackBuffering({ partyId, userId, state, bufferedMs }) {
    const party = WatchPartyService.parties.get(partyId);
    if (!party) return;
    const key = timerKey(partyId, userId);

    if (party.waiting?.userIds.includes(userId)) {
      if (Number(bufferedMs) >= READY_BUFFER_MS || state === 'sync' || state === 'correcting') {
        this.finishWaitingFor(partyId, userId);
      }
      return;
    }

    if (state !== 'buffering') {
      clearTimeout(this.bufferingTimers.get(key));
      this.bufferingTimers.delete(key);
      return;
    }
    if (this.bufferingTimers.has(key)) return;

    const timer = setTimeout(() => {
      this.bufferingTimers.delete(key);
      const current = WatchPartyService.parties.get(partyId);
      const member = current?.members.get(userId);
      if (!current || !member?.connected || member.playbackState !== 'buffering') return;
      if (current.waitForBuffering === false || current.status !== 'playing') return;
      this.startWaiting(partyId, [userId]);
    }, BUFFERING_GRACE_MS);
    timer.unref?.();
    this.bufferingTimers.set(key, timer);
  },

  startWaiting(partyId, userIds) {
    const party = WatchPartyService.parties.get(partyId);
    if (!party) return;
    if (party.waiting) {
      party.waiting.userIds = [...new Set([...party.waiting.userIds, ...userIds])];
    } else {
      const now = Date.now();
      setTimeline(party, { positionMs: getEffectivePosition(party, now), playing: false, anchorServerTimeMs: now });
      party.waiting = { userIds: [...userIds], since: now };
      this.broadcastTimeline(partyId, party, { reason: 'wait' });
    }
    this.broadcastParty(partyId, { type: 'PARTY_UPDATED', party: WatchPartyService.serializeParty(party) });
  },

  // One member is ready (or gone for good). The party only goes on when nobody
  // it waits for is left and no other connected member is still loading the
  // paused position; those are waited for next instead of resuming into
  // another stall a few seconds later.
  finishWaitingFor(partyId, userId) {
    const party = WatchPartyService.parties.get(partyId);
    if (!party?.waiting) return;
    this.cancelWaitDropout(partyId, userId);
    party.waiting.userIds = party.waiting.userIds.filter(id => id !== userId);
    if (party.waiting.userIds.length === 0) {
      const stillLoading = [...party.members.values()]
        .filter(member => member.connected && member.playbackState === 'buffering' && member.userId !== userId)
        .map(member => member.userId);
      if (stillLoading.length) party.waiting.userIds = stillLoading;
    }
    if (party.waiting.userIds.length === 0) this.stopWaiting(partyId, { resume: true });
    else this.broadcastParty(partyId, { type: 'PARTY_UPDATED', party: WatchPartyService.serializeParty(party) });
  },

  // A waited-for member lost their connection: keep waiting a little while
  // for them to come back.
  scheduleWaitDropout(partyId, userId) {
    this.cancelWaitDropout(partyId, userId);
    const timer = setTimeout(() => {
      this.waitDropoutTimers.delete(timerKey(partyId, userId));
      const member = WatchPartyService.parties.get(partyId)?.members.get(userId);
      if (!member?.connected) this.finishWaitingFor(partyId, userId);
    }, DISCONNECT_GRACE_MS);
    timer.unref?.();
    this.waitDropoutTimers.set(timerKey(partyId, userId), timer);
  },

  cancelWaitDropout(partyId, userId) {
    const key = timerKey(partyId, userId);
    clearTimeout(this.waitDropoutTimers.get(key));
    this.waitDropoutTimers.delete(key);
  },

  // Ends the wait. With `resume` the party plays on together; without it (an
  // admin paused or played by hand) the admin's command stands.
  stopWaiting(partyId, { resume = false } = {}) {
    const party = WatchPartyService.parties.get(partyId);
    if (!party?.waiting) return;
    party.waiting.userIds.forEach(userId => this.cancelWaitDropout(partyId, userId));
    party.waiting = null;

    if (resume) {
      setTimeline(party, { positionMs: party.positionMs, playing: true, anchorServerTimeMs: Date.now() + RESUME_LEAD_MS });
      this.broadcastTimeline(partyId, party, { reason: 'resume' });
    }
    this.broadcastParty(partyId, { type: 'PARTY_UPDATED', party: WatchPartyService.serializeParty(party) });
  },

  setWaitForBuffering({ partyId, userId, enabled }) {
    const party = WatchPartyService.getPartyOrThrow(partyId);
    if (party.ownerUserId !== userId) {
      const error = new Error('Nur der Gastgeber kann das ändern.');
      error.status = 403;
      throw error;
    }
    party.waitForBuffering = Boolean(enabled);
    if (!party.waitForBuffering && party.waiting) {
      this.stopWaiting(partyId, { resume: true });
      return;
    }
    this.broadcastParty(partyId, { type: 'PARTY_UPDATED', party: WatchPartyService.serializeParty(party) });
  }
};
