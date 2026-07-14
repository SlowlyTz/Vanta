export function makeParty(overrides = {}) {
  return {
    id: 'party-1',
    itemId: 'movie-1',
    playableItemId: 'movie-1',
    itemSnapshot: { name: 'Test Movie', type: 'Movie', seriesName: null, productionYear: 2024 },
    ownerUserId: 'owner-1',
    ownerName: 'Alice',
    status: 'lobby',
    positionMs: 0,
    lastServerTimeMs: Date.now(),
    members: [
      { userId: 'owner-1', username: 'Alice', role: 'owner', ready: true, connected: true },
      { userId: 'viewer-1', username: 'Bob', role: 'viewer', ready: false, connected: true }
    ],
    currentUserRole: null,
    ...overrides
  };
}

export async function flush() {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  await new Promise(resolve => setTimeout(resolve, 0));
}
