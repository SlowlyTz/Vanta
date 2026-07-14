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
import { LibraryService } from '../../../../src/server/services/jellyfin/library.service.js';
import { WatchPartyService } from '../../../../src/server/services/watch-party.service.js';
import { movieItem, createTestParty } from './helpers.js';

describe('WatchPartyService · Sonstiges', () => {
  beforeEach(() => {
    WatchPartyService.parties.clear();
    WatchPartyService.endedPartiesByOwner.clear();
    vi.clearAllMocks();
    ItemsService.getItemDetails.mockResolvedValue(movieItem());
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
