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
import { movieItem, createTestParty, joinAsViewer } from './helpers.js';

describe('WatchPartyService · Membership', () => {
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

  it('erlaubt maximal 4 Mitglieder inklusive Owner und lehnt ein fünftes neues Mitglied ab', async () => {
    const created = await createTestParty();
    await joinAsViewer(created.id, 'viewer-1', 'Bob');
    await joinAsViewer(created.id, 'viewer-2', 'Carl');
    await joinAsViewer(created.id, 'viewer-3', 'Dana');

    await expect(joinAsViewer(created.id, 'viewer-4', 'Eve')).rejects.toMatchObject({ status: 409 });
  });

  it('erlaubt neuen Mitgliedern den Join, während die Party bereits playing oder paused ist', async () => {
    const created = await createTestParty();
    const party = WatchPartyService.parties.get(created.id);

    party.status = 'playing';
    const joinedPlaying = await joinAsViewer(created.id, 'viewer-1', 'Bob');
    expect(joinedPlaying.members.some(m => m.userId === 'viewer-1')).toBe(true);

    party.status = 'paused';
    const joinedPaused = await joinAsViewer(created.id, 'viewer-2', 'Carl');
    expect(joinedPaused.members.some(m => m.userId === 'viewer-2')).toBe(true);
  });

  it('lehnt den Join ab, wenn die Party bereits beendet ist', async () => {
    const created = await createTestParty();
    WatchPartyService.endParty({ partyId: created.id, ownerUserId: 'owner-1' });

    await expect(joinAsViewer(created.id, 'viewer-1', 'Bob')).rejects.toMatchObject({ status: 400 });
  });

  it('erlaubt Rejoin eines existierenden Mitglieds, auch wenn die Party voll ist', async () => {
    const created = await createTestParty();
    await joinAsViewer(created.id, 'viewer-1', 'Bob');
    await joinAsViewer(created.id, 'viewer-2', 'Carl');
    await joinAsViewer(created.id, 'viewer-3', 'Dana');

    const rejoined = await joinAsViewer(created.id, 'viewer-1', 'Bob');
    expect(rejoined.members).toHaveLength(4);
  });
});
