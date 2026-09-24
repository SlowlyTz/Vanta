import { vi } from 'vitest';

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

export function timelineMessage({
  positionMs = 0,
  playing = true,
  seq = 1,
  anchorServerTimeMs = Date.now(),
  actorUserId = null,
  reason = playing ? 'play' : 'pause'
} = {}) {
  return {
    type: 'TIMELINE',
    timeline: { positionMs, playing, anchorServerTimeMs, seq },
    actorUserId,
    reason
  };
}

// Stands in for the player controller: the sync calls move a plain player
// object, so tests can assert where the page put playback.
export function createFakeController() {
  const player = { currentTime: 0, paused: true, playbackRate: 1 };
  const controller = {
    player,
    blocked: false,
    prepareInitialPlayback: vi.fn(),
    updateWatchPartyAccess: vi.fn(),
    destroy: vi.fn(),
    getSyncState: vi.fn(),
    syncSeek: vi.fn(),
    syncPlay: vi.fn(),
    syncPause: vi.fn(),
    setSyncRate: vi.fn(),
    unlockPlayback: vi.fn(),
    getBufferedAhead: vi.fn(),
    // Like the player: the share of four seconds buffered at the position.
    getLoadProgress: vi.fn(position => ({
      fraction: Math.min(1, (Number(controller.getBufferedAhead(position)) || 0) / 4),
      etaSeconds: null,
      approx: false
    })),
    blockNextPlay() {
      controller.syncPlay.mockImplementationOnce(async () => {
        controller.blocked = true;
        const error = new Error('Autoplay blockiert');
        error.name = 'NotAllowedError';
        throw error;
      });
    },
    reset() {
      player.currentTime = 0;
      player.paused = true;
      player.playbackRate = 1;
      controller.blocked = false;
      controller.prepareInitialPlayback.mockReset().mockResolvedValue(undefined);
      controller.updateWatchPartyAccess.mockReset();
      controller.destroy.mockReset().mockResolvedValue(undefined);
      controller.getSyncState.mockReset().mockImplementation(() => ({
        ready: true,
        currentTime: player.currentTime,
        paused: player.paused,
        busy: false,
        rate: player.playbackRate,
        stableMs: 0,
        autoplayBlocked: controller.blocked
      }));
      controller.syncSeek.mockReset().mockImplementation(seconds => { player.currentTime = seconds; });
      controller.syncPlay.mockReset().mockImplementation(async () => {
        player.paused = false;
        controller.blocked = false;
      });
      controller.syncPause.mockReset().mockImplementation(() => { player.paused = true; });
      controller.setSyncRate.mockReset().mockImplementation(rate => { player.playbackRate = rate; });
      controller.unlockPlayback.mockReset().mockResolvedValue(true);
      controller.getBufferedAhead.mockReset().mockReturnValue(10);
    }
  };
  controller.reset();
  return controller;
}
