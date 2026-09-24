import { WatchPartyService, isPartyAdmin } from '../../services/watch-party.service.js';
import { setTimeline, SWITCHING_STATUS } from '../../services/watch-party/helpers.js';
import { createNotification, ownerError } from './notifications.js';

// Moving the party to the next episode: every client loads the new episode
// paused at 0:00 and reports ready on its own (no click, no countdown); once
// all connected members are ready, or after a time limit, everyone starts
// together at a moment slightly in the future.

export { SWITCHING_STATUS };
export const EPISODE_START_LEAD_MS = 1_000;
export const MAX_SWITCH_WAIT_MS = 20_000;

export const episodeSwitchMethods = {
  initEpisodeSwitch() {
    this.episodeStartTimers = new Map();
    this.pendingEpisodeChanges = new Map();
  },

  async handleChangeEpisode({ partyId, user, itemId }) {
    // Two admins pressing "next episode" at once, or every admin's prompt
    // running out together, must only switch once.
    const party = WatchPartyService.parties.get(partyId);
    if (!itemId || this.pendingEpisodeChanges.get(partyId) === itemId) return;
    if (party?.status === SWITCHING_STATUS && party.playableItemId === itemId) return;
    this.pendingEpisodeChanges.set(partyId, itemId);

    try {
      const changed = await WatchPartyService.changeEpisode({
        partyId,
        userId: user.userId,
        accessToken: user.accessToken,
        itemId
      });
      this.stopWaiting?.(partyId);
      this.scheduleEpisodeStart(partyId);

      this.broadcastParty(partyId, {
        type: 'LOAD_MEDIA',
        itemId: changed.playableItemId,
        positionMs: 0,
        reason: 'episode-change',
        message: `${changed.itemSnapshot.name} wird geladen`
      });
      this.broadcastParty(partyId, {
        type: 'PARTY_UPDATED',
        party: WatchPartyService.serializeParty(changed)
      });
    } catch (error) {
      this.sendToUser(partyId, user.userId, { type: 'ERROR', message: error.message });
    } finally {
      if (this.pendingEpisodeChanges.get(partyId) === itemId) this.pendingEpisodeChanges.delete(partyId);
    }
  },

  scheduleEpisodeStart(partyId) {
    clearTimeout(this.episodeStartTimers.get(partyId));
    const timer = setTimeout(() => this.startEpisodeIfReady(partyId, { force: true }), MAX_SWITCH_WAIT_MS);
    timer.unref?.();
    this.episodeStartTimers.set(partyId, timer);
  },

  // Called whenever a member got ready or left during the switch.
  startEpisodeIfReady(partyId, { force = false } = {}) {
    const party = WatchPartyService.parties.get(partyId);
    if (party?.status !== SWITCHING_STATUS) return false;
    const connected = [...party.members.values()].filter(member => member.connected);
    if (!force && !connected.every(member => member.ready)) return false;

    clearTimeout(this.episodeStartTimers.get(partyId));
    this.episodeStartTimers.delete(partyId);
    setTimeline(party, { positionMs: 0, playing: true, anchorServerTimeMs: Date.now() + EPISODE_START_LEAD_MS });
    this.broadcastTimeline(partyId, party, { reason: 'episode-start' });
    this.broadcastParty(partyId, { type: 'PARTY_UPDATED', party: WatchPartyService.serializeParty(party) });
    return true;
  },

  // An admin cancelled the next-episode prompt: it closes for everyone and
  // stays closed for this episode, also for members who join later.
  handleNextEpisodeCancel({ partyId, user }) {
    const party = WatchPartyService.getPartyOrThrow(partyId);
    if (!isPartyAdmin(party, user.userId)) throw ownerError('Nur Admins können die nächste Folge abbrechen.');
    if (party.nextEpisodeCancelledFor === party.playableItemId) return;
    party.nextEpisodeCancelledFor = party.playableItemId;

    this.broadcastParty(partyId, { type: 'NEXT_EPISODE_CANCELLED', itemId: party.playableItemId });
    this.broadcastParty(partyId, createNotification('next_episode_cancelled', {
      userId: user.userId,
      username: party.members.get(user.userId)?.username || user.username
    }), { skipUserId: user.userId });
  }
};
