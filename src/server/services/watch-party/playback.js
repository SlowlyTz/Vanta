import { ItemsService } from '../jellyfin/items.service.js';
import { badRequest } from './errors.js';
import { assertPartyAdmin, READY_ROOM_STATUS, SWITCHING_STATUS, COUNTDOWN_MS, COUNTDOWN_LEAD_MS, createItemSnapshot, setTimeline } from './helpers.js';

export const playbackMethods = {
  canStart(party) {
    return party.status === READY_ROOM_STATUS
      && [...party.members.values()].length > 0
      && [...party.members.values()].every(member => member.ready === true);
  },

  beginCountdownIfReady({ partyId }) {
    const party = this.getPartyOrThrow(partyId);
    if (!this.canStart(party)) return null;

    const startsAtServerTimeMs = Date.now() + COUNTDOWN_LEAD_MS + COUNTDOWN_MS;
    setTimeline(party, { positionMs: party.positionMs || 0, anchorServerTimeMs: startsAtServerTimeMs });
    party.status = 'countdown';

    return {
      party,
      startsAtServerTimeMs,
      durationMs: COUNTDOWN_MS,
      positionMs: party.positionMs
    };
  },

  // The timeline was fixed when the countdown began (anchored at its end), so
  // the start only flips the status; clients have already started on their own.
  beginPlayback({ partyId }) {
    const party = this.parties.get(partyId);
    if (!party || party.status !== 'countdown') return null;

    party.status = 'playing';
    return party;
  },

  // Any admin may switch; the party then loads the episode everywhere and
  // starts once all members are ready (see realtime/watch-party/episodeSwitch.js).
  async changeEpisode({ partyId, userId, accessToken, itemId }) {
    const party = this.getPartyOrThrow(partyId);
    assertPartyAdmin(party, userId);
    if (party.status === 'ended') throw badRequest('Diese Watch Party wurde bereits beendet');

    const item = await ItemsService.getItemDetails(userId, accessToken, itemId);
    if (item.Type !== 'Episode') {
      throw badRequest('Nur Episoden können direkt gewechselt werden');
    }

    party.itemId = item.Id;
    party.playableItemId = item.Id;
    party.itemSnapshot = createItemSnapshot(item, item);
    setTimeline(party, { positionMs: 0, playing: false });
    party.status = SWITCHING_STATUS;
    party.waiting = null;
    party.nextEpisodeCancelledFor = null;

    for (const member of party.members.values()) {
      member.preloadState = 'waiting';
      member.preloadMessage = '';
      member.preloadProgress = 0;
      member.ready = false;
    }

    return party;
  }
};
