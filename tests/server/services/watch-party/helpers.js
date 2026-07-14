import { WatchPartyService } from '../../../../src/server/services/watch-party.service.js';

export function movieItem(overrides = {}) {
  return {
    Id: 'movie-1',
    Name: 'Test Movie',
    Type: 'Movie',
    ProductionYear: 2024,
    ...overrides
  };
}

export function episodeItem(overrides = {}) {
  return {
    Id: 'episode-1',
    Name: 'Pilot',
    Type: 'Episode',
    SeriesName: 'Test Series',
    ...overrides
  };
}

export async function createTestParty(overrides = {}) {
  return WatchPartyService.createParty({
    userId: 'owner-1',
    username: 'Alice',
    accessToken: 'token',
    itemId: 'movie-1',
    ...overrides
  });
}

export async function joinAsViewer(partyId, userId = 'viewer-1', username = 'Bob') {
  return WatchPartyService.joinParty({ partyId, userId, username, accessToken: 'viewer-token' });
}

export function markConnected(partyId, userId) {
  return WatchPartyService.setConnected({ partyId, userId, connected: true });
}
