import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WatchPartyApi } from '../../../../src/public/js/api/watch-party.api.js';
import { MediaApi } from '../../../../src/public/js/api/media.api.js';
import { authStore } from '../../../../src/public/js/store/auth.store.js';
import { appStore } from '../../../../src/public/js/store/app.store.js';
import WatchPartyPage from '../../../../src/public/js/pages/watch-party.page.js';
import { makeParty, flush, timelineMessage, createFakeController } from './helpers.js';

vi.mock('../../../../src/public/js/api/watch-party.api.js', () => ({
  WatchPartyApi: {
    join: vi.fn(),
    setReady: vi.fn(),
    kick: vi.fn(),
    create: vi.fn(),
    get: vi.fn(),
    end: vi.fn(),
    resolveInviteUser: vi.fn(),
    sendInvitation: vi.fn()
  }
}));

vi.mock('../../../../src/public/js/api/media.api.js', () => ({
  MediaApi: {
    getItem: vi.fn(),
    getImageUrl: vi.fn().mockReturnValue('poster.jpg'),
    getPlayback: vi.fn(),
    reportPlayback: vi.fn(),
    getSeasons: vi.fn().mockResolvedValue([]),
    getEpisodes: vi.fn().mockResolvedValue([])
  }
}));

vi.mock('../../../../src/public/js/store/auth.store.js', () => ({
  authStore: { getState: vi.fn() }
}));

vi.mock('../../../../src/public/js/store/app.store.js', () => ({
  appStore: { showToast: vi.fn() }
}));

let capturedOnMessage = null;
const fakeSocket = { sendJson: vi.fn(), close: vi.fn() };

vi.mock('../../../../src/public/js/realtime/watch-party.socket.js', () => ({
  createWatchPartySocket: vi.fn(({ onMessage }) => {
    capturedOnMessage = onMessage;
    return fakeSocket;
  })
}));

const fakeController = createFakeController();

const { mountVantaPlayer } = vi.hoisted(() => ({ mountVantaPlayer: vi.fn() }));

vi.mock('/vendor/player/vanta-player.js', () => ({ mountVantaPlayer }));

mountVantaPlayer.mockResolvedValue(fakeController);

describe('WatchPartyPage · Player Sync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fakeController.reset();
    capturedOnMessage = null;
    window.location.hash = '#/watch-party/party-1';
  });

  afterEach(() => {
    document.documentElement.classList.remove('player-active');
    document.body.classList.remove('player-active');
  });

  it('pausiert den Player bei einer pausierten Zeitleiste', async () => {
    authStore.getState.mockReturnValue({ user: { id: 'owner-1', name: 'Alice' } });
    WatchPartyApi.join.mockResolvedValue({
      party: makeParty({ status: 'playing', positionMs: 5000 })
    });
    MediaApi.getItem.mockResolvedValue({ Id: 'movie-1', Name: 'Test Movie' });

    WatchPartyPage({ partyId: 'party-1' });
    await flush();
    await flush();

    expect(capturedOnMessage).toBeTruthy();
    expect(fakeController.player.paused).toBe(false);

    capturedOnMessage(timelineMessage({ positionMs: 8000, playing: false, actorUserId: 'viewer-1' }));
    await flush();

    expect(fakeController.syncPause).toHaveBeenCalled();
    expect(fakeController.player.paused).toBe(true);
    expect(fakeController.player.currentTime).toBe(8);
  });

  it('startet den Player an der berechneten Position bei einer laufenden Zeitleiste', async () => {
    authStore.getState.mockReturnValue({ user: { id: 'owner-1', name: 'Alice' } });
    WatchPartyApi.join.mockResolvedValue({
      party: makeParty({ status: 'playing', positionMs: 0 })
    });
    MediaApi.getItem.mockResolvedValue({ Id: 'movie-1', Name: 'Test Movie' });

    WatchPartyPage({ partyId: 'party-1' });
    await flush();
    await flush();

    capturedOnMessage(timelineMessage({ positionMs: 12000, playing: true, actorUserId: 'admin-2' }));
    await flush();
    await flush();

    // A jump of twelve seconds is a hard seek, aimed a little ahead of the timeline.
    expect(fakeController.player.currentTime).toBeGreaterThanOrEqual(12);
    expect(fakeController.player.currentTime).toBeLessThan(12.5);
    expect(fakeController.player.paused).toBe(false);
  });

  it('zerstört den Player und zeigt eine Meldung bei PARTY_ENDED', async () => {
    authStore.getState.mockReturnValue({ user: { id: 'viewer-1', name: 'Bob' } });
    WatchPartyApi.join.mockResolvedValue({
      party: makeParty({ status: 'playing', positionMs: 1000 })
    });
    MediaApi.getItem.mockResolvedValue({ Id: 'movie-1', Name: 'Test Movie' });

    const container = WatchPartyPage({ partyId: 'party-1' });
    await flush();
    await flush();

    capturedOnMessage({
      type: 'PARTY_ENDED',
      party: makeParty({ status: 'ended' }),
      message: 'Die Watch Party wurde vom Owner beendet.'
    });

    expect(fakeController.destroy).toHaveBeenCalled();
    expect(container.querySelector('.watch-party-ended-state').hidden).toBe(false);
    expect(container.querySelector('.watch-party-ended-state').textContent)
      .toContain('Die Watch Party wurde vom Owner beendet.');
  });

  it('ersetzt den Player und zeigt einen Toast bei LOAD_MEDIA mit reason=episode-change', async () => {
    authStore.getState.mockReturnValue({ user: { id: 'owner-1', name: 'Alice' } });
    WatchPartyApi.join.mockResolvedValue({
      party: makeParty({ status: 'playing', positionMs: 1000 })
    });
    MediaApi.getItem.mockResolvedValue({ Id: 'movie-1', Name: 'Test Movie' });

    WatchPartyPage({ partyId: 'party-1' });
    await flush();
    await flush();

    const firstMountCount = mountVantaPlayer.mock.calls.length;

    capturedOnMessage({
      type: 'LOAD_MEDIA',
      itemId: 'episode-2',
      positionMs: 0,
      reason: 'episode-change',
      message: 'Episode 2 wird abgespielt'
    });
    await flush();
    await flush();

    expect(appStore.showToast).toHaveBeenCalledWith('Episode 2 wird abgespielt', 'success');
    expect(fakeController.destroy).toHaveBeenCalled();
    expect(mountVantaPlayer.mock.calls.length).toBeGreaterThan(firstMountCount);
  });

  it('zeigt den Player sofort bei status=playing', async () => {
    authStore.getState.mockReturnValue({ user: { id: 'owner-1', name: 'Alice' } });
    WatchPartyApi.join.mockResolvedValue({
      party: makeParty({ status: 'playing', positionMs: 5000 })
    });
    MediaApi.getItem.mockResolvedValue({ Id: 'movie-1', Name: 'Test Movie' });

    const container = WatchPartyPage({ partyId: 'party-1' });
    await flush();
    await flush();

    expect(container.querySelector('.watch-party-lobby').hidden).toBe(true);
    expect(document.body.classList.contains('player-active')).toBe(true);
    expect(mountVantaPlayer).toHaveBeenCalledWith(
      expect.objectContaining({ resumePosition: 5 })
    );
  });

  it('zeigt beim Late Join in eine laufende Party bei blockiertem Autoplay ein Popup und startet beim Klick', async () => {
    authStore.getState.mockReturnValue({ user: { id: 'viewer-1', name: 'Bob' } });
    WatchPartyApi.join.mockResolvedValue({
      party: makeParty({ status: 'playing', positionMs: 5000 })
    });
    MediaApi.getItem.mockResolvedValue({ Id: 'movie-1', Name: 'Test Movie' });
    fakeController.blockNextPlay();

    const container = WatchPartyPage({ partyId: 'party-1' });
    await flush();
    await flush();

    const autoplayOverlay = container.querySelector('.watch-party-autoplay-overlay');
    expect(autoplayOverlay.hidden).toBe(false);
    expect(fakeController.player.paused).toBe(true);

    container.querySelector('.watch-party-autoplay-button').click();
    await flush();

    expect(fakeController.syncPlay).toHaveBeenLastCalledWith({ quiet: false });
    expect(fakeController.player.paused).toBe(false);
    expect(autoplayOverlay.hidden).toBe(true);
  });

  it('versucht bei blockiertem Autoplay nicht ständig erneut zu starten', async () => {
    vi.useFakeTimers();
    try {
      authStore.getState.mockReturnValue({ user: { id: 'viewer-1', name: 'Bob' } });
      WatchPartyApi.join.mockResolvedValue({ party: makeParty({ status: 'paused', positionMs: 5000 }) });
      MediaApi.getItem.mockResolvedValue({ Id: 'movie-1', Name: 'Test Movie' });

      const container = WatchPartyPage({ partyId: 'party-1' });
      await vi.advanceTimersByTimeAsync(50);

      fakeController.blockNextPlay();
      capturedOnMessage(timelineMessage({ positionMs: 5000, playing: true, actorUserId: 'owner-1' }));
      await vi.advanceTimersByTimeAsync(3000);

      expect(container.querySelector('.watch-party-autoplay-overlay').hidden).toBe(false);
      expect(fakeController.syncPlay).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('ignoriert das Echo des eigenen Befehls und veraltete Zeitleisten', async () => {
    authStore.getState.mockReturnValue({ user: { id: 'owner-1', name: 'Alice' } });
    WatchPartyApi.join.mockResolvedValue({ party: makeParty({ status: 'paused', positionMs: 5000 }) });
    MediaApi.getItem.mockResolvedValue({ Id: 'movie-1', Name: 'Test Movie' });

    WatchPartyPage({ partyId: 'party-1' });
    await flush();
    await flush();
    fakeController.player.currentTime = 9;
    fakeController.player.paused = false;
    fakeController.syncSeek.mockClear();

    capturedOnMessage(timelineMessage({ positionMs: 9000, playing: true, seq: 5, actorUserId: 'owner-1' }));
    capturedOnMessage(timelineMessage({ positionMs: 1000, playing: false, seq: 4, actorUserId: 'admin-2' }));
    await flush();

    expect(fakeController.syncSeek).not.toHaveBeenCalled();
    expect(fakeController.syncPause).not.toHaveBeenCalled();
  });

  it('stempelt eigene Steuerbefehle mit der Serverzeit', async () => {
    authStore.getState.mockReturnValue({ user: { id: 'owner-1', name: 'Alice' } });
    WatchPartyApi.join.mockResolvedValue({ party: makeParty({ status: 'paused', positionMs: 5000 }) });
    MediaApi.getItem.mockResolvedValue({ Id: 'movie-1', Name: 'Test Movie' });

    WatchPartyPage({ partyId: 'party-1' });
    await flush();
    await flush();

    const { watchParty } = mountVantaPlayer.mock.calls.at(-1)[0];
    watchParty.onOwnerSeek(42_000);

    expect(fakeSocket.sendJson).toHaveBeenCalledWith(expect.objectContaining({
      type: 'OWNER_SEEK',
      positionMs: 42_000,
      atServerTimeMs: expect.any(Number)
    }));
  });

  it('sendet Heartbeats nur als Sync-Leader und hört beim Leader-Wechsel auf', async () => {
    vi.useFakeTimers();
    try {
      authStore.getState.mockReturnValue({ user: { id: 'owner-1', name: 'Alice' } });
      WatchPartyApi.join.mockResolvedValue({
        party: makeParty({ status: 'playing', positionMs: 5000, syncLeaderUserId: 'owner-1' })
      });
      MediaApi.getItem.mockResolvedValue({ Id: 'movie-1', Name: 'Test Movie' });

      WatchPartyPage({ partyId: 'party-1' });
      await vi.advanceTimersByTimeAsync(50);

      const heartbeats = () => fakeSocket.sendJson.mock.calls.filter(([message]) => message.type === 'OWNER_SYNC');
      await vi.advanceTimersByTimeAsync(5000);
      expect(heartbeats()).toHaveLength(1);
      expect(heartbeats()[0][0]).toMatchObject({ buffering: false, stableMs: 0 });

      capturedOnMessage({
        type: 'PARTY_UPDATED',
        party: makeParty({ status: 'playing', positionMs: 5000, syncLeaderUserId: 'admin-2' })
      });
      await vi.advanceTimersByTimeAsync(15_000);
      expect(heartbeats()).toHaveLength(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('zeigt Sprünge anderer als Blase mit Namen und schickt eigene Sprünge mit Weite', async () => {
    authStore.getState.mockReturnValue({ user: { id: 'viewer-1', name: 'Bob' } });
    WatchPartyApi.join.mockResolvedValue({ party: makeParty({ status: 'playing', positionMs: 5000 }) });
    MediaApi.getItem.mockResolvedValue({ Id: 'movie-1', Name: 'Test Movie' });
    fakeController.showSeekFeedback = vi.fn();

    WatchPartyPage({ partyId: 'party-1' });
    await flush();
    await flush();

    capturedOnMessage({ ...timelineMessage({ positionMs: 15_000, seq: 9, actorUserId: 'owner-1', reason: 'seek' }), step: 10, actorName: 'Alice' });
    expect(fakeController.showSeekFeedback).toHaveBeenCalledWith(10, { by: 'Alice' });

    capturedOnMessage({ ...timelineMessage({ positionMs: 15_000, seq: 10, actorUserId: 'viewer-1', reason: 'seek' }), step: 10, actorName: 'Bob' });
    expect(fakeController.showSeekFeedback).toHaveBeenCalledTimes(1);

    const { watchParty } = mountVantaPlayer.mock.calls.at(-1)[0];
    watchParty.onOwnerSeek(30_000, { step: -10 });
    expect(fakeSocket.sendJson).toHaveBeenCalledWith(expect.objectContaining({ type: 'OWNER_SEEK', positionMs: 30_000, step: -10 }));
    delete fakeController.showSeekFeedback;
  });
});
