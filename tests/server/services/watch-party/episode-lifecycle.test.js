import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../../src/server/services/jellyfin/items.service.js', () => ({
  ItemsService: {
    getItemDetails: vi.fn(),
    getSeasons: vi.fn(),
    getEpisodes: vi.fn()
  }
}));

vi.mock('../../../../src/server/services/jellyfin/library.service.js', () => ({
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
    WatchPartyService.endedPartiesByOwner.clear();
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

  it('speichert beim Beenden einen Snapshot mit finalPositionMs, der 48h fortsetzbar ist', async () => {
    const created = await createTestParty();

    const ended = WatchPartyService.endParty({ partyId: created.id, ownerUserId: 'owner-1', positionMs: 45_000 });

    expect(ended.status).toBe('ended');
    expect(ended.finalPositionMs).toBe(45_000);
    expect(ended.resumeExpiresAt).toBeGreaterThan(Date.now());

    const resumable = WatchPartyService.getResumableForOwner('owner-1');
    expect(resumable).toMatchObject({ originalPartyId: created.id, finalPositionMs: 45_000 });
  });

  it('resumeEndedParty erzeugt eine neue Party-ID mit der gespeicherten Position', async () => {
    const created = await createTestParty();
    WatchPartyService.endParty({ partyId: created.id, ownerUserId: 'owner-1', positionMs: 30_000 });

    const resumed = WatchPartyService.resumeEndedParty({
      userId: 'owner-1',
      username: 'Alice',
      originalPartyId: created.id
    });

    expect(resumed.id).not.toBe(created.id);
    expect(resumed.positionMs).toBe(30_000);
    expect(resumed.status).toBe('lobby');
    expect(resumed.resumeFrom).toMatchObject({ originalPartyId: created.id, positionMs: 30_000 });

    expect(WatchPartyService.getResumableForOwner('owner-1')).toBeNull();
  });

  it('resumeEndedParty schlägt fehl, wenn keine fortsetzbare Party existiert', () => {
    expect(() => WatchPartyService.resumeEndedParty({
      userId: 'owner-1', username: 'Alice', originalPartyId: 'unknown'
    })).toThrow(expect.objectContaining({ status: 404 }));
  });
});
