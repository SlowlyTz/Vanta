import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../../src/server/services/jellyfin/items.service.js', () => ({
  ItemsService: { getItemDetails: vi.fn(), getSeasons: vi.fn(), getEpisodes: vi.fn() }
}));
vi.mock('../../../../src/server/services/jellyfin/library.service.js', () => ({
  LibraryService: { getMovies: vi.fn(), getSeries: vi.fn() }
}));

import { ItemsService } from '../../../../src/server/services/jellyfin/items.service.js';
import { WatchPartyService } from '../../../../src/server/services/watch-party.service.js';
import { movieItem, createTestParty, joinAsViewer } from './helpers.js';

describe('WatchPartyService · Zuletzt dabei', () => {
  beforeEach(() => {
    WatchPartyService.parties.clear();
    WatchPartyService.endedPartiesByOwner.clear();
    WatchPartyService.recentPartiesByUser.clear();
    vi.clearAllMocks();
    ItemsService.getItemDetails.mockResolvedValue(movieItem());
  });

  it('listet besuchte Partys, neueste zuerst, mit Titel, Gastgeber und Plätzen', async () => {
    const first = await createTestParty();
    const second = await createTestParty({ userId: 'owner-2', username: 'Cleo' });
    await joinAsViewer(first.id);
    await new Promise(resolve => setTimeout(resolve, 2));
    await joinAsViewer(second.id);

    const recent = WatchPartyService.getRecentPartiesForUser('viewer-1');
    expect(recent.map(party => party.id)).toEqual([second.id, first.id]);
    expect(recent[0]).toMatchObject({
      itemSnapshot: expect.objectContaining({ name: 'Test Movie' }),
      ownerName: 'Cleo',
      status: 'lobby',
      memberCount: 2,
      maxMembers: 4,
      role: 'viewer',
      full: false
    });
    expect(WatchPartyService.getRecentPartiesForUser('owner-1').map(party => party.id)).toEqual([first.id]);
  });

  it('behält gekickte Partys, lässt gebannte, beendete und gelöschte weg', async () => {
    const kicked = await createTestParty();
    const banned = await createTestParty({ userId: 'owner-2', username: 'Cleo' });
    const ended = await createTestParty({ userId: 'owner-3', username: 'Dan' });
    const removed = await createTestParty({ userId: 'owner-4', username: 'Eve' });
    for (const party of [kicked, banned, ended, removed]) await joinAsViewer(party.id);

    WatchPartyService.kickMember({ partyId: kicked.id, actorUserId: 'owner-1', targetUserId: 'viewer-1' });
    WatchPartyService.banMember({ partyId: banned.id, actorUserId: 'owner-2', targetUserId: 'viewer-1' });
    WatchPartyService.endParty({ partyId: ended.id, ownerUserId: 'owner-3', positionMs: 0 });
    WatchPartyService.parties.delete(removed.id);

    const recent = WatchPartyService.getRecentPartiesForUser('viewer-1');
    expect(recent.map(party => party.id)).toEqual([kicked.id]);
    expect(recent[0]).toMatchObject({ role: null, full: false });

    WatchPartyService.pruneRecentParties();
    expect([...WatchPartyService.recentPartiesByUser.get('viewer-1').keys()]).not.toContain(removed.id);
  });

  it('meldet eine volle Party für jemanden, der kein Mitglied mehr ist', async () => {
    const party = await createTestParty();
    await joinAsViewer(party.id);
    WatchPartyService.kickMember({ partyId: party.id, actorUserId: 'owner-1', targetUserId: 'viewer-1' });
    for (const id of ['a', 'b', 'c']) await joinAsViewer(party.id, id, id.toUpperCase());

    expect(WatchPartyService.getRecentPartiesForUser('viewer-1')[0]).toMatchObject({ memberCount: 4, full: true });
  });
});
