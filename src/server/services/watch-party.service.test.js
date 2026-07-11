import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./jellyfin/items.service.js', () => ({
  ItemsService: {
    getItemDetails: vi.fn(),
    getSeasons: vi.fn(),
    getEpisodes: vi.fn()
  }
}));

vi.mock('./jellyfin/library.service.js', () => ({
  LibraryService: {
    getMovies: vi.fn(),
    getSeries: vi.fn()
  }
}));

import { ItemsService } from './jellyfin/items.service.js';
import { LibraryService } from './jellyfin/library.service.js';
import { WatchPartyService } from './watch-party.service.js';

function movieItem(overrides = {}) {
  return {
    Id: 'movie-1',
    Name: 'Test Movie',
    Type: 'Movie',
    ProductionYear: 2024,
    ...overrides
  };
}

function episodeItem(overrides = {}) {
  return {
    Id: 'episode-1',
    Name: 'Pilot',
    Type: 'Episode',
    SeriesName: 'Test Series',
    ...overrides
  };
}

async function createTestParty(overrides = {}) {
  return WatchPartyService.createParty({
    userId: 'owner-1',
    username: 'Alice',
    accessToken: 'token',
    itemId: 'movie-1',
    ...overrides
  });
}

async function joinAsViewer(partyId, userId = 'viewer-1', username = 'Bob') {
  return WatchPartyService.joinParty({ partyId, userId, username, accessToken: 'viewer-token' });
}

describe('WatchPartyService', () => {
  beforeEach(() => {
    WatchPartyService.parties.clear();
    WatchPartyService.endedPartiesByOwner.clear();
    vi.clearAllMocks();
    ItemsService.getItemDetails.mockResolvedValue(movieItem());
  });

  it('erstellt eine Party mit dem Ersteller als Owner', async () => {
    const party = await createTestParty();

    expect(party.ownerUserId).toBe('owner-1');
    expect(party.currentUserRole).toBe('owner');
    expect(party.status).toBe('lobby');
    expect(party.members).toHaveLength(1);
    expect(party.members[0]).toMatchObject({ userId: 'owner-1', role: 'owner', preloadState: 'waiting' });
  });

  it('fügt einen User per Join als Viewer hinzu, nachdem der Access-Check erfolgreich war', async () => {
    const created = await createTestParty();

    const joined = await joinAsViewer(created.id);

    expect(ItemsService.getItemDetails).toHaveBeenCalledWith('viewer-1', 'viewer-token', created.playableItemId);
    expect(joined.members).toHaveLength(2);
    const viewer = joined.members.find(member => member.userId === 'viewer-1');
    expect(viewer).toMatchObject({ role: 'viewer', ready: false, preloadState: 'waiting' });
  });

  it('lehnt den Join ab, wenn der Access-Check für das Medium fehlschlägt', async () => {
    const created = await createTestParty();
    ItemsService.getItemDetails.mockRejectedValueOnce(new Error('403 upstream'));

    await expect(WatchPartyService.joinParty({
      partyId: created.id,
      userId: 'viewer-1',
      username: 'Bob',
      accessToken: 'bad-token'
    })).rejects.toMatchObject({ status: 403 });
  });

  it('erlaubt dem Owner, ein Mitglied zu kicken', async () => {
    const created = await createTestParty();
    await joinAsViewer(created.id);

    const result = WatchPartyService.kickMember({
      partyId: created.id,
      actorUserId: 'owner-1',
      targetUserId: 'viewer-1'
    });

    expect(result.members.some(member => member.userId === 'viewer-1')).toBe(false);
  });

  it('verweigert Nicht-Owner das Kicken', async () => {
    const created = await createTestParty();
    await joinAsViewer(created.id, 'viewer-1');
    await joinAsViewer(created.id, 'viewer-2', 'Carl');

    expect(() => WatchPartyService.kickMember({
      partyId: created.id,
      actorUserId: 'viewer-1',
      targetUserId: 'viewer-2'
    })).toThrow(expect.objectContaining({ status: 403 }));
  });

  it('erlaubt den Start nur, wenn alle Mitglieder ready sind, und startet einen Countdown', async () => {
    const created = await createTestParty();
    await joinAsViewer(created.id);

    expect(() => WatchPartyService.startParty({ partyId: created.id, ownerUserId: 'owner-1' }))
      .toThrow(expect.objectContaining({ status: 409 }));

    WatchPartyService.setPreloadState({ partyId: created.id, userId: 'viewer-1', state: 'ready' });

    const { party, startsAtServerTimeMs, positionMs } = WatchPartyService.startParty({ partyId: created.id, ownerUserId: 'owner-1' });
    expect(party.status).toBe('countdown');
    expect(positionMs).toBe(0);
    expect(startsAtServerTimeMs).toBeGreaterThan(Date.now());
  });

  it('wechselt von countdown zu playing über beginPlayback', async () => {
    const created = await createTestParty();
    WatchPartyService.startParty({ partyId: created.id, ownerUserId: 'owner-1' });

    const party = WatchPartyService.beginPlayback({ partyId: created.id, positionMs: 0 });
    expect(party.status).toBe('playing');
  });

  it('setPreloadState("ready") setzt das Mitglied ready, "error" nicht', async () => {
    const created = await createTestParty();
    await joinAsViewer(created.id);

    const readyParty = WatchPartyService.setPreloadState({ partyId: created.id, userId: 'viewer-1', state: 'ready', message: 'Bereit' });
    expect(readyParty.members.find(m => m.userId === 'viewer-1').ready).toBe(true);

    const errorParty = WatchPartyService.setPreloadState({ partyId: created.id, userId: 'viewer-1', state: 'error', message: 'Kaputt' });
    expect(errorParty.members.find(m => m.userId === 'viewer-1').ready).toBe(false);
    expect(errorParty.members.find(m => m.userId === 'viewer-1').preloadMessage).toBe('Kaputt');
  });

  it('changeEpisode darf nur der Owner ausführen und aktualisiert playableItemId/positionMs', async () => {
    const created = await createTestParty();
    await joinAsViewer(created.id);
    WatchPartyService.setPreloadState({ partyId: created.id, userId: 'viewer-1', state: 'ready' });

    await expect(WatchPartyService.changeEpisode({
      partyId: created.id, ownerUserId: 'viewer-1', accessToken: 'x', itemId: 'episode-2'
    })).rejects.toMatchObject({ status: 403 });

    ItemsService.getItemDetails.mockResolvedValueOnce(episodeItem({ Id: 'episode-2', Name: 'Episode 2' }));

    const party = await WatchPartyService.changeEpisode({
      partyId: created.id, ownerUserId: 'owner-1', accessToken: 'owner-token', itemId: 'episode-2'
    });

    expect(party.playableItemId).toBe('episode-2');
    expect(party.itemSnapshot.name).toBe('Episode 2');
    expect(party.positionMs).toBe(0);
    expect(party.members.get('viewer-1').ready).toBe(false);
    expect(party.members.get('viewer-1').preloadState).toBe('waiting');
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

  it('startParty nutzt party.positionMs statt immer 0 (z.B. nach einem Resume)', async () => {
    const created = await createTestParty();
    WatchPartyService.endParty({ partyId: created.id, ownerUserId: 'owner-1', positionMs: 60_000 });
    const resumed = WatchPartyService.resumeEndedParty({ userId: 'owner-1', username: 'Alice', originalPartyId: created.id });

    const { positionMs } = WatchPartyService.startParty({ partyId: resumed.id, ownerUserId: 'owner-1' });
    expect(positionMs).toBe(60_000);
  });

  it('getSuggestions liefert eine limitierte Mischung aus Filmen und Serien', async () => {
    LibraryService.getMovies.mockResolvedValue([
      { Id: 'm1', Name: 'M1', Type: 'Movie' },
      { Id: 'm2', Name: 'M2', Type: 'Movie' }
    ]);
    LibraryService.getSeries.mockResolvedValue([
      { Id: 's1', Name: 'S1', Type: 'Series' }
    ]);

    const items = await WatchPartyService.getSuggestions({ userId: 'owner-1', accessToken: 'token', limit: 2 });

    expect(items).toHaveLength(2);
    items.forEach(item => {
      expect(['Movie', 'Series']).toContain(item.Type);
    });
  });

  it('serialisiert keine Access-Tokens im Party-State', async () => {
    const party = await createTestParty({ accessToken: 'super-secret-token' });

    const raw = JSON.stringify(party);
    expect(raw).not.toContain('super-secret-token');
    expect(raw).not.toContain('accessToken');
  });
});
