import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./jellyfin/items.service.js', () => ({
  ItemsService: {
    getItemDetails: vi.fn(),
    getSeasons: vi.fn(),
    getEpisodes: vi.fn()
  }
}));

import { ItemsService } from './jellyfin/items.service.js';
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

describe('WatchPartyService', () => {
  beforeEach(() => {
    WatchPartyService.parties.clear();
    vi.clearAllMocks();
    ItemsService.getItemDetails.mockResolvedValue(movieItem());
  });

  it('erstellt eine Party mit dem Ersteller als Owner', async () => {
    const party = await WatchPartyService.createParty({
      userId: 'owner-1',
      username: 'Alice',
      accessToken: 'secret-token',
      itemId: 'movie-1'
    });

    expect(party.ownerUserId).toBe('owner-1');
    expect(party.currentUserRole).toBe('owner');
    expect(party.status).toBe('lobby');
    expect(party.members).toHaveLength(1);
    expect(party.members[0]).toMatchObject({ userId: 'owner-1', role: 'owner', ready: true });
  });

  it('fügt einen User per Join als Viewer hinzu', async () => {
    const created = await WatchPartyService.createParty({
      userId: 'owner-1',
      username: 'Alice',
      accessToken: 'token',
      itemId: 'movie-1'
    });

    const joined = WatchPartyService.joinParty({ partyId: created.id, userId: 'viewer-1', username: 'Bob' });

    expect(joined.members).toHaveLength(2);
    const viewer = joined.members.find(member => member.userId === 'viewer-1');
    expect(viewer).toMatchObject({ role: 'viewer', ready: false });
  });

  it('erlaubt dem Owner, ein Mitglied zu kicken', async () => {
    const created = await WatchPartyService.createParty({
      userId: 'owner-1',
      username: 'Alice',
      accessToken: 'token',
      itemId: 'movie-1'
    });
    WatchPartyService.joinParty({ partyId: created.id, userId: 'viewer-1', username: 'Bob' });

    const result = WatchPartyService.kickMember({
      partyId: created.id,
      actorUserId: 'owner-1',
      targetUserId: 'viewer-1'
    });

    expect(result.members.some(member => member.userId === 'viewer-1')).toBe(false);
  });

  it('verweigert Nicht-Owner das Kicken', async () => {
    const created = await WatchPartyService.createParty({
      userId: 'owner-1',
      username: 'Alice',
      accessToken: 'token',
      itemId: 'movie-1'
    });
    WatchPartyService.joinParty({ partyId: created.id, userId: 'viewer-1', username: 'Bob' });
    WatchPartyService.joinParty({ partyId: created.id, userId: 'viewer-2', username: 'Carl' });

    expect(() => WatchPartyService.kickMember({
      partyId: created.id,
      actorUserId: 'viewer-1',
      targetUserId: 'viewer-2'
    })).toThrow(expect.objectContaining({ status: 403 }));
  });

  it('erlaubt den Start nur, wenn alle Mitglieder ready sind', async () => {
    const created = await WatchPartyService.createParty({
      userId: 'owner-1',
      username: 'Alice',
      accessToken: 'token',
      itemId: 'movie-1'
    });
    WatchPartyService.joinParty({ partyId: created.id, userId: 'viewer-1', username: 'Bob' });

    expect(() => WatchPartyService.startParty({ partyId: created.id, ownerUserId: 'owner-1' }))
      .toThrow(expect.objectContaining({ status: 409 }));

    WatchPartyService.setReady({ partyId: created.id, userId: 'viewer-1', ready: true });

    const party = WatchPartyService.startParty({ partyId: created.id, ownerUserId: 'owner-1' });
    expect(party.status).toBe('paused');
    expect(party.positionMs).toBe(0);
  });

  it('serialisiert keine Access-Tokens im Party-State', async () => {
    const party = await WatchPartyService.createParty({
      userId: 'owner-1',
      username: 'Alice',
      accessToken: 'super-secret-token',
      itemId: 'movie-1'
    });

    const raw = JSON.stringify(party);
    expect(raw).not.toContain('super-secret-token');
    expect(raw).not.toContain('accessToken');
  });
});
