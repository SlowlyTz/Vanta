import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../../src/server/services/jellyfin/items.service.js', () => ({ queryUserItems: vi.fn(async () => ({ Items: [] })),
  ItemsService: {
    getItemDetails: vi.fn(),
    getSeasons: vi.fn(),
    getEpisodes: vi.fn()
  }
}));

vi.mock('../../../../src/server/services/browse/library.service.js', () => ({
  LibraryService: {
    getMovies: vi.fn(),
    getSeries: vi.fn()
  }
}));

import { ItemsService } from '../../../../src/server/services/jellyfin/items.service.js';
import { WatchPartyService } from '../../../../src/server/services/watch-party.service.js';
import { movieItem, episodeItem, createTestParty, joinAsViewer } from './helpers.js';

describe('WatchPartyService · Episode und Lifecycle', () => {
  beforeEach(() => {
    WatchPartyService.parties.clear();
    vi.clearAllMocks();
    ItemsService.getItemDetails.mockResolvedValue(movieItem());
  });

  it('changeEpisode dürfen nur Admins ausführen und lädt die Folge für alle neu', async () => {
    const created = await createTestParty();
    await joinAsViewer(created.id);

    await expect(WatchPartyService.changeEpisode({
      partyId: created.id, userId: 'viewer-1', accessToken: 'x', itemId: 'episode-2'
    })).rejects.toMatchObject({ status: 403 });

    ItemsService.getItemDetails.mockResolvedValueOnce(episodeItem({ Id: 'episode-2', Name: 'Episode 2' }));
    WatchPartyService.parties.get(created.id).nextEpisodeCancelledFor = created.playableItemId;

    const party = await WatchPartyService.changeEpisode({
      partyId: created.id, userId: 'owner-1', accessToken: 'owner-token', itemId: 'episode-2'
    });

    expect(party.playableItemId).toBe('episode-2');
    expect(party.itemSnapshot.name).toBe('Episode 2');
    expect(party.positionMs).toBe(0);
    expect(party.status).toBe('switching');
    expect(party.nextEpisodeCancelledFor).toBeNull();
    expect(party.members.get('viewer-1').ready).toBe(false);
    expect(party.members.get('viewer-1').preloadState).toBe('waiting');

    WatchPartyService.promoteMember({ partyId: created.id, actorUserId: 'owner-1', targetUserId: 'viewer-1' });
    ItemsService.getItemDetails.mockResolvedValueOnce(episodeItem({ Id: 'episode-3', Name: 'Episode 3' }));
    const byAdmin = await WatchPartyService.changeEpisode({
      partyId: created.id, userId: 'viewer-1', accessToken: 'x', itemId: 'episode-3'
    });
    expect(byAdmin.playableItemId).toBe('episode-3');
  });

  it('beendet eine Party mit der letzten Position', async () => {
    const created = await createTestParty();

    const ended = WatchPartyService.endParty({ partyId: created.id, ownerUserId: 'owner-1', positionMs: 45_000 });

    expect(ended.status).toBe('ended');
    expect(ended.finalPositionMs).toBe(45_000);
  });

  describe('Lebensdauer', () => {
    const at = (offsetMs) => Date.now() + offsetMs;

    it('lebt weiter, solange jemand verbunden ist, auch ohne den Owner und über Stunden', async () => {
      const created = await createTestParty();
      await WatchPartyService.joinParty({ partyId: created.id, userId: 'viewer-1', username: 'Bob', accessToken: 'x' });
      WatchPartyService.setConnected({ partyId: created.id, userId: 'viewer-1', connected: true });

      WatchPartyService.cleanupExpired(at(12 * 60 * 60 * 1000));
      expect(WatchPartyService.parties.has(created.id)).toBe(true);
    });

    it('ist tot, wenn 5 Minuten niemand mehr drin war', async () => {
      const created = await createTestParty();
      WatchPartyService.setConnected({ partyId: created.id, userId: 'owner-1', connected: true });
      WatchPartyService.setConnected({ partyId: created.id, userId: 'owner-1', connected: false });

      WatchPartyService.cleanupExpired(at(4 * 60 * 1000));
      expect(WatchPartyService.parties.has(created.id)).toBe(true);
      expect(WatchPartyService.getRecentPartiesForUser('owner-1')).toHaveLength(1);

      WatchPartyService.cleanupExpired(at(5 * 60 * 1000 + 1));
      expect(WatchPartyService.parties.has(created.id)).toBe(false);
      expect(WatchPartyService.getRecentPartiesForUser('owner-1')).toEqual([]);
    });
  });
});
