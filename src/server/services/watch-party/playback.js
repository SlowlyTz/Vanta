import { ItemsService } from '../jellyfin/items.service.js';
import { badRequest, conflict } from './errors.js';
import { assertOwner, READY_ROOM_STATUS, COUNTDOWN_MS, createItemSnapshot } from './helpers.js';

export const playbackMethods = {
  canStart(party) {
    return party.status === READY_ROOM_STATUS
      && [...party.members.values()].length > 0
      && [...party.members.values()].every(member => member.ready === true);
  },

  startParty({ partyId, ownerUserId }) {
    const party = this.getPartyOrThrow(partyId);
    assertOwner(party, ownerUserId);

    if (party.status === 'ended') throw badRequest('Diese Watch Party wurde bereits beendet');
    if (!this.canStart(party)) throw conflict('Not all members are ready');

    return this.beginCountdownIfReady({ partyId });
  },

  beginCountdownIfReady({ partyId }) {
    const party = this.getPartyOrThrow(partyId);
    if (!this.canStart(party)) return null;

    const now = Date.now();
    party.status = 'countdown';
    party.lastServerTimeMs = now;

    return {
      party,
      startsAtServerTimeMs: now + COUNTDOWN_MS,
      positionMs: party.positionMs || 0
    };
  },

  beginPlayback({ partyId, positionMs }) {
    const party = this.parties.get(partyId);
    if (!party || party.status !== 'countdown') return null;

    party.status = 'playing';
    party.positionMs = Number.isFinite(positionMs) ? positionMs : party.positionMs;
    party.lastServerTimeMs = Date.now();
    return party;
  },

  async changeEpisode({ partyId, ownerUserId, accessToken, itemId }) {
    const party = this.getPartyOrThrow(partyId);
    assertOwner(party, ownerUserId);

    const item = await ItemsService.getItemDetails(ownerUserId, accessToken, itemId);
    if (item.Type !== 'Episode') {
      throw badRequest('Nur Episoden können direkt gewechselt werden');
    }

    party.itemId = item.Id;
    party.playableItemId = item.Id;
    party.itemSnapshot = createItemSnapshot(item, item);
    party.positionMs = 0;
    party.status = 'paused';
    party.lastServerTimeMs = Date.now();

    for (const member of party.members.values()) {
      member.preloadState = 'waiting';
      member.preloadMessage = '';
      member.ready = false;
    }

    return party;
  }
};
